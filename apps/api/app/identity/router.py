"""Identity API routes implementing Contract C-01 (API-ID-01 GET /api/v1/me)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.identity.dependencies import get_current_user
from app.identity.models import User
from app.identity.schemas import UserSelf
from app.identity.service import build_user_self_dto

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
) -> UserSelf:
    """Return the authenticated user's internal profile and server-computed contexts."""
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["ETag"] = f'"{current_user.row_version}"'
    return build_user_self_dto(current_user)
