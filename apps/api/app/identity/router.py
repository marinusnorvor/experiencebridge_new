"""Identity API routes implementing Contract C-01 (API-ID-01 GET /api/v1/me) and Student Profile."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.identity.dependencies import get_current_user
from app.identity.models import User
from app.identity.schemas import StudentProfileRead, StudentProfileUpsert, UserSelf
from app.identity.service import (
    build_student_profile_dto,
    build_user_self_dto,
    upsert_student_profile,
)

router = APIRouter(tags=["Identity & Authorization"])


@router.get(
    "/me",
    response_model=UserSelf,
    summary="Get authenticated user profile and effective contexts",
    description=(
        "Verify the caller's session and resolve the internal "
        "ExperienceBridge user record in PostgreSQL, and return the user's profile, "
        "active role grants, and effective portal contexts (API-ID-01)."
    ),
    responses={
        401: {"description": "Missing, invalid, or expired authentication credentials."},
        403: {"description": "Authenticated user account is suspended or disabled."},
    },
)
def get_current_user_profile(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSelf:
    """Return the authenticated user's internal profile and server-computed contexts."""
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["ETag"] = f'"{current_user.row_version}"'
    return build_user_self_dto(current_user, db=db)


@router.get(
    "/me/student-profile",
    response_model=StudentProfileRead,
    summary="Get authenticated student profile",
    description=(
        "Return the authenticated student's editable profile fields together with "
        "account identity attributes."
    ),
)
def get_my_student_profile(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentProfileRead:
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["ETag"] = f'"{current_user.row_version}"'
    return build_student_profile_dto(current_user, db=db)


@router.put(
    "/me/student-profile",
    response_model=StudentProfileRead,
    summary="Update authenticated student profile",
    description=(
        "Persist editable student profile fields (display_name, headline, bio, academic "
        "details, availability, links, self-reported skills, and top projects) while "
        "keeping email and identity subject governed by the account."
    ),
)
def put_my_student_profile(
    body: StudentProfileUpsert,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.core.commands import execute

    result = execute(
        db,
        current_user,
        request,
        body,
        lambda: None,
        lambda: upsert_student_profile(db, current_user, request, body),
    )
    response.headers["Cache-Control"] = "no-store, private"
    if isinstance(result, dict) and "row_version" in result:
        response.headers["ETag"] = f'"{result["row_version"]}"'
    return result


import uuid
from datetime import datetime, timezone
from fastapi import Query
from sqlalchemy import func, select
from app.core.errors import AppError
from app.identity.models import UserRoleGrant
from app.identity.password_models import PasswordCredential
from app.identity.password_security import hash_password, normalize_email, validate_password
from app.identity.schemas import (
    AdminCreateUserRequest,
    AdminGrantRoleRequest,
    AdminRoleType,
    AdminUserOversight,
    AdminUserOversightPage,
)
from app.identity.service import get_active_role_grants


def require_admin(user: User) -> None:
    if "platform_admin" not in get_active_role_grants(user):
        raise AppError(status_code=403, code="FORBIDDEN", message="An active platform administrator is required.")


@router.get(
    "/admin/users",
    response_model=AdminUserOversightPage,
    summary="List all users with roles and status (platform_admin required)",
)
@router.get(
    "/admin/oversight/users",
    response_model=AdminUserOversightPage,
    include_in_schema=False,
)
def admin_list_users(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    role: AdminRoleType | None = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> AdminUserOversightPage:
    require_admin(current_user)
    response.headers["Cache-Control"] = "no-store, private"

    from sqlalchemy.orm import selectinload

    users_query = select(User).options(selectinload(User.role_grants))
    if role:
        users_query = users_query.where(
            User.id.in_(
                select(UserRoleGrant.user_id).where(
                    UserRoleGrant.role == role,
                    UserRoleGrant.revoked_at.is_(None),
                )
            )
        )
    count_query = select(func.count(User.id))
    if role:
        count_query = count_query.where(
            User.id.in_(
                select(UserRoleGrant.user_id).where(
                    UserRoleGrant.role == role,
                    UserRoleGrant.revoked_at.is_(None),
                )
            )
        )
    total = db.scalar(count_query) or 0
    users = db.scalars(
        users_query.order_by(User.created_at.desc(), User.id).offset(offset).limit(limit)
    ).all()
    items = [
        AdminUserOversight(
            id=u.id,
            email=u.email,
            display_name=u.display_name,
            account_status=u.account_status,
            roles=[g.role for g in u.role_grants if g.revoked_at is None],
            created_at=u.created_at,
        )
        for u in users
    ]
    return AdminUserOversightPage(items=items, total=total)


@router.post(
    "/admin/users",
    response_model=AdminUserOversight,
    status_code=201,
    summary="Create a new user account with credentials and role (platform_admin required)",
)
def admin_create_user(
    body: AdminCreateUserRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdminUserOversight:
    require_admin(current_user)
    response.headers["Cache-Control"] = "no-store, private"

    email = normalize_email(body.email)
    validate_password(body.password)
    name = body.display_name.strip()
    if not name or len(name) > 160:
        raise AppError(status_code=422, code="VALIDATION_ERROR", message="Display name must contain 1 to 160 characters.")

    existing_user = db.execute(
        select(User).where(func.lower(func.trim(User.email)) == email)
    ).scalar_one_or_none()
    existing_cred = db.execute(
        select(PasswordCredential).where(PasswordCredential.normalized_email == email)
    ).scalar_one_or_none()
    if existing_user is not None or existing_cred is not None:
        raise AppError(status_code=409, code="CONFLICT", message="An account with this email address already exists.")

    now = datetime.now(timezone.utc)
    new_user_id = uuid.uuid4()
    issuer = "https://auth.experiencebridge.internal"
    new_user = User(
        id=new_user_id,
        identity_issuer=issuer,
        identity_subject=str(uuid.uuid4()),
        display_name=name,
        email=email,
        email_verified_at=now,
        account_status="active",
        created_at=now,
        updated_at=now,
        row_version=1,
    )
    db.add(new_user)
    db.flush()

    cred = PasswordCredential(
        user_id=new_user_id,
        normalized_email=email,
        password_hash=hash_password(body.password),
        created_at=now,
        updated_at=now,
    )
    db.add(cred)

    roles: list[str] = []
    if body.role:
        grant = UserRoleGrant(
            id=uuid.uuid4(),
            user_id=new_user_id,
            role=body.role,
            granted_by_user_id=current_user.id,
            granted_at=now,
            revoked_at=None,
            reason=f"Account created by admin {current_user.email or current_user.display_name}",
        )
        db.add(grant)
        roles.append(body.role)

    from app.core.commands import audit
    audit(db, current_user, request, "admin.user_created", new_user, target_email=email, initial_role=body.role)
    db.commit()

    return AdminUserOversight(
        id=new_user.id,
        email=new_user.email,
        display_name=new_user.display_name,
        account_status=new_user.account_status,
        roles=roles,
        created_at=new_user.created_at,
    )


@router.post(
    "/admin/users/{user_id}/roles",
    response_model=AdminUserOversight,
    summary="Grant a global role to an existing user (platform_admin required)",
)
def admin_grant_user_role(
    user_id: uuid.UUID,
    body: AdminGrantRoleRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdminUserOversight:
    require_admin(current_user)
    response.headers["Cache-Control"] = "no-store, private"

    target_user = db.get(User, user_id)
    if target_user is None:
        raise AppError(status_code=404, code="NOT_FOUND", message="Target user does not exist.")

    active_grant = db.execute(
        select(UserRoleGrant).where(
            UserRoleGrant.user_id == user_id,
            UserRoleGrant.role == body.role,
            UserRoleGrant.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if active_grant is None:
        grant = UserRoleGrant(
            id=uuid.uuid4(),
            user_id=user_id,
            role=body.role,
            granted_by_user_id=current_user.id,
            granted_at=now,
            revoked_at=None,
            reason=body.reason or f"Role granted by admin {current_user.email or current_user.display_name}",
        )
        db.add(grant)
        from app.core.commands import audit
        audit(db, current_user, request, "admin.role_granted", target_user, role=body.role, reason=body.reason)
        db.commit()
        db.refresh(target_user)

    roles = [g.role for g in target_user.role_grants if g.revoked_at is None]
    return AdminUserOversight(
        id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        account_status=target_user.account_status,
        roles=roles,
        created_at=target_user.created_at,
    )


@router.delete(
    "/admin/users/{user_id}/roles/{role}",
    response_model=AdminUserOversight,
    summary="Revoke a global role from a user (platform_admin required)",
)
def admin_revoke_user_role(
    user_id: uuid.UUID,
    role: str,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdminUserOversight:
    require_admin(current_user)
    response.headers["Cache-Control"] = "no-store, private"

    target_user = db.get(User, user_id)
    if target_user is None:
        raise AppError(status_code=404, code="NOT_FOUND", message="Target user does not exist.")

    if role == "platform_admin" and target_user.id == current_user.id:
        other_admins_count = db.scalar(
            select(func.count(UserRoleGrant.id)).where(
                UserRoleGrant.role == "platform_admin",
                UserRoleGrant.revoked_at.is_(None),
                UserRoleGrant.user_id != current_user.id,
            )
        ) or 0
        if other_admins_count == 0:
            raise AppError(status_code=400, code="BAD_REQUEST", message="Cannot revoke the last remaining platform administrator role.")

    active_grant = db.execute(
        select(UserRoleGrant).where(
            UserRoleGrant.user_id == user_id,
            UserRoleGrant.role == role,
            UserRoleGrant.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if active_grant is not None:
        active_grant.revoked_at = datetime.now(timezone.utc)
        from app.core.commands import audit
        audit(db, current_user, request, "admin.role_revoked", target_user, role=role)
        db.commit()
        db.refresh(target_user)

    roles = [g.role for g in target_user.role_grants if g.revoked_at is None]
    return AdminUserOversight(
        id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        account_status=target_user.account_status,
        roles=roles,
        created_at=target_user.created_at,
    )
