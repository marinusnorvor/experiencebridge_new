"""FastAPI routes for password authentication."""
from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache
import logging
import hashlib
import hmac
import ipaddress
import os
import time

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.database.session import get_db
from app.identity.auth_accounts import authenticate, register_account, request_email, reset_password, verify_email
from app.identity.auth_config import AuthConfig
from app.identity.auth_email import AuthMailer, DevelopmentMailer, ResendMailer, link_for
from app.identity.auth_repository import check_csrf_context, create_session, increment_rate_limit, issue_csrf_context, resolve_session, revoke_session
from app.identity.password_security import hash_password, normalize_email

router = APIRouter(prefix="/auth", tags=["Password Authentication"])
GENERIC = {"message": "If eligible, check your email for next steps."}
logger = logging.getLogger("experiencebridge.auth")


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    return hash_password("dummy synthetic password")


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EmailBody(StrictBody):
    email: str = Field(min_length=3, max_length=320)


class RegistrationBody(EmailBody):
    password: str = Field(min_length=12, max_length=1024)
    display_name: str = Field(min_length=1, max_length=160)


class LoginBody(EmailBody):
    password: str = Field(min_length=1, max_length=1024)


class TokenBody(StrictBody):
    token: str = Field(min_length=20, max_length=256)


class ResetBody(TokenBody):
    new_password: str = Field(min_length=12, max_length=1024)


class DevelopmentMailboxBody(EmailBody):
    purpose: str = Field(pattern="^(verify-email|reset-password)$")


def get_auth_config(request: Request) -> AuthConfig:
    config = getattr(request.app.state, "auth_config", None)
    if not isinstance(config, AuthConfig):
        try:
            settings = getattr(request.app.state, "settings", None)
            config = AuthConfig.from_environment(getattr(settings, "app_env", None))
        except (ValueError, TypeError):
            raise AppError(status_code=503, code="TEMPORARY_UNAVAILABLE", message="Authentication is not configured.")
        request.app.state.auth_config = config
    return config


def get_mailer(request: Request) -> AuthMailer:
    mailer = getattr(request.app.state, "auth_mailer", None)
    if mailer is None:
        config = get_auth_config(request)
        if config.email_api_key and config.email_from:
            mailer = ResendMailer(config.email_api_key, config.email_from, config.frontend_origin)
        elif config.environment in {"development", "test"}:
            mailer = DevelopmentMailer()
        else:
            raise AppError(status_code=503, code="TEMPORARY_UNAVAILABLE", message="Authentication email is unavailable.")
        request.app.state.auth_mailer = mailer
    return mailer


@router.post("/dev-mailbox", include_in_schema=False)
def development_mailbox(body: DevelopmentMailboxBody, request: Request, response: Response):
    """Read a local sink only with explicit local opt-in and a private secret."""
    settings = getattr(request.app.state, "settings", None)
    secret = os.environ.get("AUTH_DEV_MAILBOX_SECRET", "")
    supplied = request.headers.get("x-dev-mailbox-secret", "")
    client = request.client.host if request.client else ""
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    try:
        loopback = ipaddress.ip_address(client).is_loopback
    except ValueError:
        loopback = False
    if (getattr(settings, "app_env", None) != "development" or os.environ.get("AUTH_DEV_MAILBOX_ENABLED") != "true"
            or os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV") or not loopback
            or host not in {"localhost", "127.0.0.1"} or request.headers.get("origin")
            or any(request.headers.get(name) for name in ("forwarded", "x-forwarded-for", "x-real-ip"))
            or len(secret.encode()) < 32 or not hmac.compare_digest(secret.encode(), supplied.encode())):
        raise AppError(status_code=404, code="NOT_FOUND", message="Not found.")
    config = get_auth_config(request)
    mailer = get_mailer(request)
    if not isinstance(mailer, DevelopmentMailer):
        raise AppError(status_code=404, code="NOT_FOUND", message="Not found.")
    try:
        email = normalize_email(body.email)
    except ValueError:
        raise AppError(status_code=422, code="VALIDATION_ERROR", message="Invalid email address.")
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    for recipient, purpose, token in reversed(mailer.messages):
        if recipient == email and purpose == body.purpose:
            return {"link": link_for(config.frontend_origin, purpose, token)}
    raise AppError(status_code=404, code="NOT_FOUND", message="No local message found.")


def _cookie(response: Response, name: str, value: str, config: AuthConfig, max_age: int) -> None:
    response.set_cookie(name, value, max_age=max_age, secure=config.secure_cookies, httponly=True, samesite="lax", path="/")


def _clear(response: Response, name: str, config: AuthConfig) -> None:
    response.delete_cookie(name, secure=config.secure_cookies, httponly=True, samesite="lax", path="/")


def require_csrf(request: Request, db: Session, config: AuthConfig) -> None:
    if request.headers.get("origin") != config.frontend_origin:
        raise AppError(status_code=403, code="FORBIDDEN", message="Request origin is not permitted.")
    context = request.cookies.get(config.preauth_cookie)
    csrf = request.headers.get("x-csrf-token")
    if not context or not csrf or not check_csrf_context(db, context, csrf, request.cookies.get(config.session_cookie)):
        raise AppError(status_code=403, code="FORBIDDEN", message="Request verification failed.")


def _trusted_client_ip(request: Request, config: AuthConfig) -> str:
    """Return the client IP used for rate limiting.

    Staging/production normally require the signed headers added by the Next.js
    gateway. When Vercel Services routes ``/api/*`` straight to this function the
    gateway never runs, so on Vercel (``VERCEL=1``) an unsigned request falls back
    to Vercel's edge-set ``x-vercel-forwarded-for`` header.
    """
    ip = request.client.host if request.client else "unknown"
    if config.environment not in {"staging", "production"}:
        return ip
    forbidden = AppError(status_code=403, code="FORBIDDEN", message="Request verification failed.")
    if not request.headers.get("x-eb-proxy-signature") and os.environ.get("VERCEL") == "1":
        forwarded = request.headers.get("x-vercel-forwarded-for", "").split(",")[0].strip()
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            raise forbidden
    client_ip = request.headers.get("x-eb-client-ip", "")
    timestamp = request.headers.get("x-eb-proxy-time", "")
    signature = request.headers.get("x-eb-proxy-signature", "")
    try:
        ipaddress.ip_address(client_ip)
        if abs(int(time.time()) - int(timestamp)) > 60 or not config.proxy_secret:
            raise ValueError("Untrusted proxy identity")
        expected = hmac.new(config.proxy_secret.encode(), f"{timestamp}.{client_ip}.{request.method}.{request.url.path}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Untrusted proxy identity")
    except (ValueError, TypeError):
        raise forbidden
    return client_ip


def _limit(db: Session, request: Request, config: AuthConfig, *, email: str, scope: str) -> bool:
    """Persist limits even if later validation or authentication fails."""
    normalized = normalize_email(email)
    interval, per_email, per_ip = (900, 5, 30) if scope == "login" else (3600, 3, 20)
    ip = _trusted_client_ip(request, config)
    email_count = increment_rate_limit(db, secret=config.rate_limit_secret, scope=f"{scope}:email", identity=normalized, window_seconds=interval)
    ip_count = increment_rate_limit(db, secret=config.rate_limit_secret, scope=f"{scope}:ip", identity=ip, window_seconds=interval)
    db.commit()
    if ip_count > per_ip or (scope == "login" and email_count > per_email):
        raise AppError(status_code=429, code="RATE_LIMITED", message="Too many requests. Try again later.")
    return email_count <= per_email


def _deliver(mailer: AuthMailer, delivery: tuple[str, str, str] | None) -> None:
    if delivery:
        try:
            mailer.send_link(recipient=delivery[0], purpose=delivery[1], token=delivery[2])
        except Exception as exc:
            # The public response must not reveal whether an account exists.
            # Never log the exception body, destination, link, or token.
            logger.error("Authentication email delivery failed: %s", type(exc).__name__)


@router.get("/csrf")
def csrf(request: Request, response: Response, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config)):
    session = request.cookies.get(config.session_cookie)
    if session and resolve_session(db, session) is None:
        _clear(response, config.session_cookie, config)
        session = None
    context, token = issue_csrf_context(db, session)
    db.commit()
    _cookie(response, config.preauth_cookie, context, config, 1800)
    response.headers["Cache-Control"] = "no-store"
    return {"csrf_token": token}


@router.post("/register", status_code=202)
def register(body: RegistrationBody, request: Request, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config), mailer: AuthMailer = Depends(get_mailer)):
    require_csrf(request, db, config)
    try:
        if _limit(db, request, config, email=body.email, scope="register"):
            delivery = register_account(db, email=body.email, password=body.password, display_name=body.display_name, issuer=config.identity_issuer)
            db.commit()
            _deliver(mailer, delivery)
    except ValueError:
        raise AppError(status_code=422, code="VALIDATION_ERROR", message="Invalid registration fields.")
    return {"message": "Account created. You can now sign in."}


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config)):
    require_csrf(request, db, config)
    try:
        _limit(db, request, config, email=body.email, scope="login")
        user = authenticate(db, email=body.email, password=body.password, dummy_hash=_dummy_hash())
    except ValueError:
        raise AppError(status_code=401, code="AUTH_REQUIRED", message="Invalid email or password.")
    if user is None:
        raise AppError(status_code=401, code="AUTH_REQUIRED", message="Invalid email or password.")
    old = request.cookies.get(config.session_cookie)
    if old:
        revoke_session(db, old)
    session = create_session(db, user.id)
    db.commit()
    _cookie(response, config.session_cookie, session, config, 86400)
    _clear(response, config.preauth_cookie, config)
    return {"message": "Signed in."}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config)):
    require_csrf(request, db, config)
    old = request.cookies.get(config.session_cookie)
    if old:
        revoke_session(db, old)
    db.commit()
    _clear(response, config.session_cookie, config)
    _clear(response, config.preauth_cookie, config)


@router.post("/verify-email")
def verify(body: TokenBody, request: Request, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config)):
    require_csrf(request, db, config)
    if not verify_email(db, body.token):
        raise AppError(status_code=400, code="BAD_REQUEST", message="This link is invalid or expired.")
    db.commit()
    return {"message": "Email verified."}


def _request_link(purpose: str) -> Callable:
    def handler(body: EmailBody, request: Request, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config), mailer: AuthMailer = Depends(get_mailer)):
        require_csrf(request, db, config)
        try:
            if _limit(db, request, config, email=body.email, scope=purpose):
                delivery = request_email(db, email=body.email, purpose=purpose)
                db.commit()
                _deliver(mailer, delivery)
        except ValueError:
            raise AppError(status_code=422, code="VALIDATION_ERROR", message="Invalid email address.")
        return GENERIC
    return handler


router.add_api_route("/resend-verification", _request_link("verify_email"), methods=["POST"], status_code=202)
router.add_api_route("/forgot-password", _request_link("reset_password"), methods=["POST"], status_code=202)


@router.post("/reset-password")
def reset(body: ResetBody, request: Request, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config)):
    require_csrf(request, db, config)
    try:
        success = reset_password(db, body.token, body.new_password)
    except ValueError:
        raise AppError(status_code=422, code="VALIDATION_ERROR", message="Invalid password.")
    if not success:
        raise AppError(status_code=400, code="BAD_REQUEST", message="This link is invalid or expired.")
    db.commit()
    return {"message": "Password reset."}
