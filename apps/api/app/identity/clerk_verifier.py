"""Server-side Clerk JWT / JWKS verification (ADR-002)."""

from __future__ import annotations

import logging
from collections.abc import Callable
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from app.core.config import Settings
from app.core.errors import AppError
from app.identity.schemas import VerifiedIdentityClaims

logger = logging.getLogger("experiencebridge.api")

ALLOWED_JWT_ALGORITHMS: tuple[str, ...] = ("RS256",)
SigningKeyResolver = Callable[[str], Any]


@lru_cache(maxsize=8)
def get_jwk_client(jwks_url: str) -> PyJWKClient:
    """Return a cached PyJWKClient for a Clerk JWKS endpoint."""
    return PyJWKClient(
        jwks_url,
        cache_keys=True,
        max_cached_keys=16,
        cache_jwk_set=True,
        lifespan=300,
        timeout=5,
    )


def extract_bearer_token(authorization_header: str | None) -> str:
    """Extract a raw JWT from an HTTP Authorization: Bearer <token> header."""
    if not authorization_header or not authorization_header.strip():
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Authentication is required to access this resource.",
        )

    parts = authorization_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Authorization header must use the Bearer token scheme.",
        )

    token = parts[1].strip()
    if not token:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Bearer token must not be empty.",
        )
    return token


def _extract_display_name(payload: dict[str, Any]) -> str | None:
    for key in ("name", "full_name"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()[:160]

    first = payload.get("first_name") or payload.get("given_name")
    last = payload.get("last_name") or payload.get("family_name")
    parts = [
        p.strip()
        for p in (first if isinstance(first, str) else "", last if isinstance(last, str) else "")
        if p and p.strip()
    ]
    if parts:
        return " ".join(parts)[:160]

    username = payload.get("username")
    if isinstance(username, str) and username.strip():
        return username.strip()[:160]

    return None


def _extract_email(payload: dict[str, Any]) -> str | None:
    for key in ("email", "email_address", "primary_email_address"):
        val = payload.get(key)
        if isinstance(val, str) and "@" in val.strip():
            return val.strip().lower()
    return None


def verify_clerk_jwt(
    token: str,
    *,
    settings: Settings,
    signing_key_resolver: SigningKeyResolver | None = None,
) -> VerifiedIdentityClaims:
    """Cryptographically verify a Clerk session JWT and return normalized identity claims.

    Validates:
    - RS256 signature against Clerk JWKS (or injected test resolver)
    - Issuer (iss) matches CLERK_ISSUER_URL
    - Expiration (exp), not-before (nbf), and issued-at (iat)
    - Subject (sub) is present and non-empty
    - Audience (aud) when CLERK_AUDIENCE is configured
    - Authorized party (azp) matches allowed frontend origins when present or required
    """
    expected_issuer = settings.clerk_issuer_url
    jwks_url = settings.clerk_jwks_url

    if not expected_issuer or (signing_key_resolver is None and not jwks_url):
        raise AppError(
            status_code=503,
            code="TEMPORARY_UNAVAILABLE",
            message="Authentication verification is not configured on the server.",
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Invalid or malformed authentication token.",
        ) from exc

    alg = unverified_header.get("alg")
    if alg not in ALLOWED_JWT_ALGORITHMS:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Unsupported or insecure token signing algorithm.",
        )

    try:
        if signing_key_resolver is not None:
            signing_key = signing_key_resolver(token)
        else:
            assert jwks_url is not None
            jwk_client = get_jwk_client(jwks_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token).key
    except PyJWKClientError as exc:
        logger.warning("Clerk JWKS key resolution failed: %s", exc.__class__.__name__)
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Unable to verify authentication token signature.",
        ) from exc
    except InvalidTokenError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Invalid authentication token header.",
        ) from exc

    verify_aud = bool(settings.clerk_audience)
    required_claims = ["exp", "iat", "nbf", "sub", "iss"]
    if verify_aud:
        required_claims.append("aud")

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            signing_key,
            algorithms=list(ALLOWED_JWT_ALGORITHMS),
            issuer=expected_issuer,
            audience=settings.clerk_audience if verify_aud else None,
            leeway=settings.clerk_jwt_leeway_seconds,
            options={
                "require": required_claims,
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "verify_iss": True,
                "verify_aud": verify_aud,
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Your authentication session has expired. Please sign in again.",
        ) from exc
    except InvalidTokenError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Invalid authentication credentials.",
        ) from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Authentication token is missing a valid subject claim.",
        )

    issuer = payload.get("iss")
    if not isinstance(issuer, str) or issuer.rstrip("/") != expected_issuer.rstrip("/"):
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Authentication token issuer is not trusted.",
        )

    azp = payload.get("azp")
    allowed_parties = settings.effective_clerk_authorized_parties
    if azp is not None:
        if not isinstance(azp, str) or (allowed_parties and azp.rstrip("/") not in {p.rstrip("/") for p in allowed_parties}):
            raise AppError(
                status_code=401,
                code="AUTH_REQUIRED",
                message="Authentication token authorized party (azp) is not permitted.",
            )
    elif settings.clerk_authorized_parties:
        # When CLERK_AUTHORIZED_PARTIES is explicitly configured, require azp to be present.
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="Authentication token is missing required authorized party (azp) claim.",
        )

    session_id = payload.get("sid")
    email = _extract_email(payload)
    email_verified = payload.get("email_verified") is True
    display_name = _extract_display_name(payload)

    return VerifiedIdentityClaims(
        issuer=issuer.rstrip("/"),
        subject=subject.strip(),
        session_id=session_id.strip() if isinstance(session_id, str) and session_id.strip() else None,
        authorized_party=azp.strip() if isinstance(azp, str) and azp.strip() else None,
        email=email,
        email_verified=email_verified,
        display_name=display_name,
    )
