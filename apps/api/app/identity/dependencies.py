"""FastAPI authentication and contextual authorization dependencies (ADR-002)."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.database.session import get_db
from app.identity.clerk_verifier import (
    SigningKeyResolver,
    extract_bearer_token,
    verify_clerk_jwt,
)
from app.identity.models import GlobalUserRole, User
from app.identity.schemas import VerifiedIdentityClaims
from app.identity.service import get_active_role_grants, resolve_or_provision_user


def get_active_settings(request: Request) -> Settings:
    """Return the Settings instance bound to the FastAPI app state (or default settings)."""
    app_settings = getattr(request.app.state, "settings", None)
    if isinstance(app_settings, Settings):
        return app_settings
    return get_settings()


def get_signing_key_resolver(request: Request) -> SigningKeyResolver | None:
    """Return an optional test signing-key resolver attached to app.state."""
    return getattr(request.app.state, "clerk_signing_key_resolver", None)


def verify_clerk_token(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    settings: Settings = Depends(get_active_settings),
    signing_key_resolver: SigningKeyResolver | None = Depends(get_signing_key_resolver),
) -> VerifiedIdentityClaims:
    """Verify the Bearer JWT in the Authorization header using Clerk JWKS."""
    token = extract_bearer_token(authorization)
    claims = verify_clerk_jwt(
        token,
        settings=settings,
        signing_key_resolver=signing_key_resolver,
    )
    request.state.verified_identity = claims
    return claims


def get_current_user(
    request: Request,
    claims: VerifiedIdentityClaims = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_active_settings),
) -> User:
    """Resolve verified Clerk identity claims to an active internal User record in Neon."""
    user = resolve_or_provision_user(db, claims, settings=settings)
    request.state.current_user = user
    return user


def require_global_role(required_role: GlobalUserRole) -> Callable[[User], User]:
    """Dependency factory enforcing that the authenticated user holds an active global role grant.

    Never trusts client-supplied role headers or query parameters.
    """

    def _check_role(user: User = Depends(get_current_user)) -> User:
        active_roles = get_active_role_grants(user)
        if required_role not in active_roles:
            raise AppError(
                status_code=403,
                code="FORBIDDEN",
                message=f"Access requires an active '{required_role}' role grant.",
            )
        return user

    return _check_role
