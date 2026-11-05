"""Server-side session authentication and contextual role checks."""
from collections.abc import Callable
from fastapi import Depends, Request, Security
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.database.session import get_db
from app.identity.auth_config import AuthConfig
from app.identity.auth_repository import resolve_session
from app.identity.auth_router import get_auth_config, require_csrf
from app.identity.models import GlobalUserRole, User
from app.identity.service import get_active_role_grants

session_cookie_scheme = APIKeyCookie(name="__Host-eb_session", scheme_name="SessionCookie", auto_error=False)

def get_active_settings(request: Request) -> Settings:
    settings = getattr(request.app.state, "settings", None)
    return settings if isinstance(settings, Settings) else get_settings()

def get_current_user(request: Request, db: Session = Depends(get_db), config: AuthConfig = Depends(get_auth_config), _cookie: str | None = Security(session_cookie_scheme)) -> User:
    token = request.cookies.get(config.session_cookie)
    if not token:
        raise AppError(status_code=401, code="AUTH_REQUIRED", message="Sign in to continue.")
    user = resolve_session(db, token, allow_inactive=True)
    if user is None:
        raise AppError(status_code=401, code="AUTH_REQUIRED", message="Your session is invalid or expired.")
    if user.account_status != "active":
        raise AppError(status_code=403, code="FORBIDDEN", message="This account is unavailable.")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        require_csrf(request, db, config)
    db.commit()
    request.state.current_user = user
    return user

def require_global_role(required_role: GlobalUserRole) -> Callable[[User], User]:
    def check(user: User = Depends(get_current_user)) -> User:
        if required_role not in get_active_role_grants(user):
            raise AppError(status_code=403, code="FORBIDDEN", message="You do not have permission for this action.")
        return user
    return check
