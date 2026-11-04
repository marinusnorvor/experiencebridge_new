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
        "Verify the caller's Clerk session token, resolve or provision the internal "
        "ExperienceBridge user record in PostgreSQL, and return the user's profile, "
        "active role grants, and effective portal contexts (API-ID-01)."
    ),
    responses={
        401: {"description": "Missing, invalid, or expired Clerk authentication credentials."},
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
        "Clerk-governed identity attributes."
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
        "keeping Clerk-managed email and identity subject governed by Clerk."
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
