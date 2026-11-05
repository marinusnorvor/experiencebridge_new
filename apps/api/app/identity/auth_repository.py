"""Database operations used by password authentication.

Callers own transaction boundaries. No operation returns raw stored session tokens.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hmac
import hashlib
import uuid

from sqlalchemy import delete, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.identity.models import User
from app.identity.password_models import AuthCsrfContext, AuthRateLimit, AuthSession, AuthToken
from app.identity.password_security import new_token, normalize_email, token_digest, token_matches


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_session(db: Session, user_id: uuid.UUID, now: datetime | None = None) -> str:
    now = now or utcnow()
    token = new_token()
    db.add(AuthSession(token_hash=token_digest(token), user_id=user_id, created_at=now, last_seen_at=now, expires_at=now + timedelta(hours=24)))
    db.flush()
    return token


def resolve_session(db: Session, token: str, now: datetime | None = None, *, allow_inactive: bool = False) -> User | None:
    now = now or utcnow()
    digest = token_digest(token)
    record = db.execute(select(AuthSession).where(AuthSession.token_hash == digest).with_for_update()).scalar_one_or_none()
    if record is None or record.revoked_at is not None or record.expires_at <= now or record.last_seen_at <= now - timedelta(minutes=30):
        return None
    user = db.get(User, record.user_id)
    if user is None or (user.account_status != "active" and not allow_inactive):
        return None
    if record.last_seen_at <= now - timedelta(minutes=5):
        record.last_seen_at = now
    return user


def revoke_session(db: Session, token: str, now: datetime | None = None) -> None:
    db.execute(update(AuthSession).where(AuthSession.token_hash == token_digest(token), AuthSession.revoked_at.is_(None)).values(revoked_at=now or utcnow()))


def revoke_user_sessions(db: Session, user_id: uuid.UUID, now: datetime | None = None) -> None:
    db.execute(update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).values(revoked_at=now or utcnow()))


def issue_action_token(db: Session, user_id: uuid.UUID, purpose: str, now: datetime | None = None) -> str:
    if purpose not in {"verify_email", "reset_password"}:
        raise ValueError("Invalid token purpose")
    now = now or utcnow()
    # Earlier links become unusable without deleting the historical hash immediately.
    db.execute(update(AuthToken).where(AuthToken.user_id == user_id, AuthToken.purpose == purpose, AuthToken.consumed_at.is_(None)).values(consumed_at=now))
    token = new_token()
    duration = timedelta(hours=24) if purpose == "verify_email" else timedelta(minutes=30)
    user = db.get(User, user_id)
    if user is None or not user.email:
        raise ValueError("Action tokens require an existing email address")
    db.add(AuthToken(token_hash=token_digest(token), user_id=user_id, purpose=purpose, email_hash=token_digest(normalize_email(user.email)), created_at=now, expires_at=now + duration))
    db.flush()
    return token


def consume_action_token(db: Session, token: str, purpose: str, now: datetime | None = None) -> uuid.UUID | None:
    now = now or utcnow()
    digest = token_digest(token)
    candidate = db.execute(select(AuthToken.email_hash, User.email, User.id).join(User, User.id == AuthToken.user_id).where(AuthToken.token_hash == digest)).one_or_none()
    if candidate is None or not candidate.email_hash or not candidate.email:
        return None
    try:
        email = normalize_email(candidate.email)
    except ValueError:
        return None
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:email, 0))"), {"email": email})
    user = db.execute(select(User).where(User.id == candidate.id).with_for_update()).scalar_one_or_none()
    if user is None or not user.email:
        return None
    try:
        current_email_hash = token_digest(normalize_email(user.email))
    except ValueError:
        return None
    if not hmac.compare_digest(candidate.email_hash, current_email_hash):
        return None
    result = db.execute(update(AuthToken).where(AuthToken.token_hash == digest, AuthToken.purpose == purpose, AuthToken.consumed_at.is_(None), AuthToken.expires_at > now, AuthToken.email_hash == current_email_hash).values(consumed_at=now).returning(AuthToken.user_id))
    return result.scalar_one_or_none()


def issue_csrf_context(db: Session, session_token: str | None, now: datetime | None = None) -> tuple[str, str]:
    now = now or utcnow()
    context, csrf = new_token(), new_token()
    session_hash = token_digest(session_token) if session_token else None
    if session_hash and resolve_session(db, session_token, now) is None:
        session_hash = None
    db.add(AuthCsrfContext(context_hash=token_digest(context), csrf_hash=token_digest(csrf), session_hash=session_hash, expires_at=now + timedelta(minutes=30)))
    db.flush()
    return context, csrf


def check_csrf_context(db: Session, context: str, csrf: str, session_token: str | None, now: datetime | None = None) -> bool:
    row = db.get(AuthCsrfContext, token_digest(context))
    if row is None or row.expires_at <= (now or utcnow()) or not token_matches(csrf, row.csrf_hash):
        return False
    expected = token_digest(session_token) if session_token else None
    return row.session_hash == expected


def increment_rate_limit(db: Session, *, secret: str, scope: str, identity: str, window_seconds: int, now: datetime | None = None) -> int:
    if not secret or window_seconds <= 0:
        raise ValueError("Rate limit secret and positive window are required")
    now = now or utcnow()
    start = datetime.fromtimestamp(int(now.timestamp()) // window_seconds * window_seconds, timezone.utc)
    key = hmac.new(secret.encode(), f"{scope}\0{identity}".encode(), hashlib.sha256).hexdigest()
    statement = pg_insert(AuthRateLimit).values(id=uuid.uuid4(), bucket_key=key, window_start=start, expires_at=start + timedelta(seconds=window_seconds), count=1)
    statement = statement.on_conflict_do_update(index_elements=[AuthRateLimit.bucket_key, AuthRateLimit.window_start], set_={"count": AuthRateLimit.count + 1}).returning(AuthRateLimit.count)
    return db.execute(statement).scalar_one()


def cleanup_expired_auth_records(db: Session, now: datetime | None = None, *, batch_size: int = 500) -> None:
    """Delete a bounded batch per auth table after the seven-day retention window."""
    if not 1 <= batch_size <= 10000:
        raise ValueError("Cleanup batch size must be between 1 and 10000")
    cutoff = (now or utcnow()) - timedelta(days=7)
    contexts = select(AuthCsrfContext.context_hash).where(AuthCsrfContext.expires_at < cutoff).order_by(AuthCsrfContext.expires_at).limit(batch_size)
    tokens = select(AuthToken.token_hash).where(AuthToken.expires_at < cutoff, (AuthToken.consumed_at.is_(None) | (AuthToken.consumed_at < cutoff))).order_by(AuthToken.expires_at).limit(batch_size)
    buckets = select(AuthRateLimit.id).where(AuthRateLimit.expires_at < cutoff).order_by(AuthRateLimit.expires_at).limit(batch_size)
    db.execute(delete(AuthCsrfContext).where(AuthCsrfContext.context_hash.in_(contexts)))
    db.execute(delete(AuthToken).where(AuthToken.token_hash.in_(tokens)))
    db.execute(delete(AuthRateLimit).where(AuthRateLimit.id.in_(buckets)))
    # Do not delete a session while any CSRF context still references it.
    referenced = select(AuthCsrfContext.session_hash).where(AuthCsrfContext.session_hash.is_not(None))
    sessions = select(AuthSession.token_hash).where(AuthSession.expires_at < cutoff, (AuthSession.revoked_at.is_(None) | (AuthSession.revoked_at < cutoff)), ~AuthSession.token_hash.in_(referenced)).order_by(AuthSession.expires_at).limit(batch_size)
    db.execute(delete(AuthSession).where(AuthSession.token_hash.in_(sessions)))
