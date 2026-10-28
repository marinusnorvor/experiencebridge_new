"""Identity domain service: local user resolution, provisioning, and context projection."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.core.errors import AppError
from app.identity.models import ALLOWED_GLOBAL_USER_ROLES, GlobalUserRole, User, UserRoleGrant
from app.identity.schemas import PortalContextName, UserSelf, VerifiedIdentityClaims

logger = logging.getLogger("experiencebridge.api")

CLERK_API_BASE_URL = "https://api.clerk.com/v1"


def fetch_clerk_user_profile_fallback(
    subject: str,
    *,
    settings: Settings,
) -> tuple[str | None, str | None, bool]:
    """Optionally fetch basic display_name and email from Clerk Backend API when absent in JWT.

    Never blocks authentication if Clerk Backend API is unreachable or unconfigured.
    """
    if settings.clerk_secret_key is None or settings.app_env == "test":
        return None, None, False

    secret = settings.clerk_secret_key.get_secret_value().strip()
    if not secret:
        return None, None, False

    try:
        response = httpx.get(
            f"{CLERK_API_BASE_URL}/users/{subject}",
            headers={"Authorization": f"Bearer {secret}"},
            timeout=3.0,
        )
        if response.status_code != 200:
            return None, None, False
        data = response.json()
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        username = (data.get("username") or "").strip()
        display_name: str | None = None
        if first_name or last_name:
            display_name = f"{first_name} {last_name}".strip()[:160]
        elif username:
            display_name = username[:160]

        primary_email_id = data.get("primary_email_address_id")
        email: str | None = None
        email_verified = False
        for item in data.get("email_addresses") or ():
            if isinstance(item, dict) and (
                item.get("id") == primary_email_id or email is None
            ):
                raw_email = item.get("email_address")
                if isinstance(raw_email, str) and "@" in raw_email:
                    email = raw_email.strip().lower()
                    verification = item.get("verification") or {}
                    email_verified = (
                        isinstance(verification, dict)
                        and verification.get("status") == "verified"
                    )
                    if item.get("id") == primary_email_id:
                        break
        return display_name, email, email_verified
    except Exception as exc:
        logger.debug("Optional Clerk user profile lookup skipped: %s", exc.__class__.__name__)
        return None, None, False


def derive_default_display_name(
    claims: VerifiedIdentityClaims,
    *,
    fallback_display_name: str | None = None,
    fallback_email: str | None = None,
) -> str:
    """Choose a safe non-empty display name (max 160 chars) for a local user record."""
    for candidate in (claims.display_name, fallback_display_name):
        if candidate and candidate.strip():
            return candidate.strip()[:160]

    email = claims.email or fallback_email
    if email and "@" in email:
        local_part = email.split("@", 1)[0].strip()
        if local_part:
            return local_part[:160]

    return "ExperienceBridge User"


def resolve_or_provision_user(
    db: Session,
    claims: VerifiedIdentityClaims,
    *,
    settings: Settings,
) -> User:
    """Resolve verified (identity_issuer, identity_subject) to a local User or create one.

    Enforces:
    - UQ(identity_issuer, identity_subject)
    - Suspended or disabled accounts are rejected with 403 FORBIDDEN
    - No self-service role grants are created automatically
    """
    stmt = (
        select(User)
        .options(selectinload(User.role_grants))
        .where(
            User.identity_issuer == claims.issuer,
            User.identity_subject == claims.subject,
        )
    )
    user = db.execute(stmt).scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if user is None:
        fb_name: str | None = None
        fb_email: str | None = None
        fb_verified = False
        if not claims.display_name or not claims.email:
            fb_name, fb_email, fb_verified = fetch_clerk_user_profile_fallback(
                claims.subject,
                settings=settings,
            )

        effective_email = claims.email or fb_email
        is_verified = claims.email_verified or fb_verified
        display_name = derive_default_display_name(
            claims,
            fallback_display_name=fb_name,
            fallback_email=effective_email,
        )

        new_user = User(
            identity_issuer=claims.issuer,
            identity_subject=claims.subject,
            display_name=display_name,
            email=effective_email,
            email_verified_at=now if (effective_email and is_verified) else None,
            account_status="active",
            created_at=now,
            updated_at=now,
            row_version=1,
        )
        try:
            with db.begin_nested():
                db.add(new_user)
                db.flush()
            db.commit()
        except IntegrityError:
            db.rollback()

        user = db.execute(stmt).scalar_one()
    else:
        updated = False
        if claims.email and claims.email != user.email:
            user.email = claims.email
            user.email_verified_at = now if claims.email_verified else None
            updated = True
        elif claims.email_verified and user.email and user.email_verified_at is None:
            user.email_verified_at = now
            updated = True
        if (
            claims.display_name
            and user.display_name == "ExperienceBridge User"
            and claims.display_name != user.display_name
        ):
            user.display_name = claims.display_name[:160]
            updated = True

        if updated:
            user.updated_at = now
            user.row_version = (user.row_version or 1) + 1
            db.commit()
            db.refresh(user)

    if user.account_status != "active":
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message=f"Your ExperienceBridge account is currently {user.account_status}.",
        )

    return user


def get_active_role_grants(user: User) -> list[GlobalUserRole]:
    """Return active (non-revoked) global role grants for a user."""
    roles: list[GlobalUserRole] = []
    seen: set[str] = set()
    for grant in user.role_grants:
        if (
            isinstance(grant, UserRoleGrant)
            and grant.revoked_at is None
            and grant.role in ALLOWED_GLOBAL_USER_ROLES
            and grant.role not in seen
        ):
            seen.add(grant.role)
            roles.append(grant.role)  # type: ignore[arg-type]
    return roles


def compute_effective_contexts(active_roles: list[GlobalUserRole]) -> list[PortalContextName]:
    """Compute effective portal contexts from server-verified role grants.

    Note: Organization contexts will additionally incorporate active organization_memberships
    once the organizations schema is migrated (ADR-003).
    """
    contexts: list[PortalContextName] = []
    if "student" in active_roles:
        contexts.append("student")
    if "mentor_candidate" in active_roles:
        contexts.append("mentor")
    if "platform_admin" in active_roles:
        contexts.append("admin")
    return contexts


def build_user_self_dto(user: User) -> UserSelf:
    """Project an internal User ORM instance into the canonical UserSelf response DTO."""
    active_roles = get_active_role_grants(user)
    effective_contexts = compute_effective_contexts(active_roles)
    return UserSelf(
        id=user.id,
        identity_issuer=user.identity_issuer,
        identity_subject=user.identity_subject,
        display_name=user.display_name,
        email=user.email,
        email_verified_at=user.email_verified_at,
        account_status=user.account_status,  # type: ignore[arg-type]
        role_grants=active_roles,
        effective_contexts=effective_contexts,
        created_at=user.created_at,
        updated_at=user.updated_at,
        row_version=user.row_version,
    )
