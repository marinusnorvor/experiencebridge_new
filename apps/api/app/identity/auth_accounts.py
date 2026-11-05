"""Transactional account operations for password authentication.

Delivery and HTTP responses are the caller's responsibility.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.identity.auth_repository import consume_action_token, issue_action_token, revoke_user_sessions
from app.identity.models import User
from app.identity.password_models import PasswordCredential
from app.identity.password_security import hash_password, normalize_email, password_needs_rehash, validate_password, verify_password


def _lock_email(db: Session, email: str) -> None:
    # All writers for either local credentials or legacy email mapping must use
    # this lock; disable Clerk provisioning before exposing the new flow.
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:email, 0))"), {"email": email})


def _matching_users(db: Session, email: str) -> list[User]:
    return list(db.execute(select(User).where(func.lower(func.trim(User.email)) == email).with_for_update()).scalars())


def register_account(db: Session, *, email: str, password: str, display_name: str, issuer: str) -> tuple[str, str, str] | None:
    """Create a local account or issue legacy recovery; return delivery instructions.

    Legacy accounts never receive the password supplied during registration. A verified
    owner must choose a password in the reset flow after receiving the link.
    """
    email = normalize_email(email)
    validate_password(password)
    name = display_name.strip()
    if not name or len(name) > 160:
        raise ValueError("Display name must contain 1 to 160 characters")
    _lock_email(db, email)
    users = _matching_users(db, email)
    credential = db.execute(select(PasswordCredential).where(PasswordCredential.normalized_email == email)).scalar_one_or_none()
    if users:
        if len(users) == 1 and users[0].account_status == "active" and users[0].email_verified_at is not None and credential is None:
            return email, "reset-password", issue_action_token(db, users[0].id, "reset_password")
        return None
    if credential is not None:
        return None
    now = datetime.now(timezone.utc)
    user_id = uuid.uuid4()
    user = User(id=user_id, identity_issuer=issuer, identity_subject=str(uuid.uuid4()), display_name=name, email=email, account_status="active", created_at=now, updated_at=now, row_version=1)
    db.add(user)
    db.flush()
    db.add(PasswordCredential(user_id=user_id, normalized_email=email, password_hash=hash_password(password), created_at=now, updated_at=now))
    db.flush()
    return None


def verify_email(db: Session, token: str) -> bool:
    now = datetime.now(timezone.utc)
    user_id = consume_action_token(db, token, "verify_email", now)
    if user_id is None:
        return False
    user = db.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one_or_none()
    if user is None or user.account_status != "active" or not user.email:
        return False
    user.email_verified_at = now
    user.updated_at = now
    return True


def request_email(db: Session, *, email: str, purpose: str) -> tuple[str, str, str] | None:
    email = normalize_email(email)
    if purpose not in {"verify_email", "reset_password"}:
        raise ValueError("Invalid email purpose")
    _lock_email(db, email)
    users = _matching_users(db, email)
    if len(users) != 1 or users[0].account_status != "active":
        return None
    user = users[0]
    credential = db.execute(select(PasswordCredential).where(PasswordCredential.normalized_email == email)).scalar_one_or_none()
    if purpose == "verify_email" and (credential is None or credential.user_id != user.id or user.email_verified_at is not None):
        return None
    if purpose == "reset_password":
        if credential is None and user.email_verified_at is None:
            return None
        if credential is not None and credential.user_id != user.id:
            return None
    token = issue_action_token(db, user.id, purpose)
    return email, "verify-email" if purpose == "verify_email" else "reset-password", token


def reset_password(db: Session, token: str, new_password: str) -> bool:
    validate_password(new_password)
    user_id = consume_action_token(db, token, "reset_password")
    if user_id is None:
        return False
    user = db.execute(select(User).where(User.id == user_id).with_for_update()).scalar_one_or_none()
    if user is None or user.account_status != "active" or not user.email:
        return False
    email = normalize_email(user.email)
    _lock_email(db, email)
    matches = _matching_users(db, email)
    if len(matches) != 1 or matches[0].id != user_id:
        return False
    credential = db.execute(select(PasswordCredential).where(PasswordCredential.normalized_email == email).with_for_update()).scalar_one_or_none()
    if credential is None and user.email_verified_at is None:
        return False
    if credential is not None and credential.user_id != user_id:
        return False
    now = datetime.now(timezone.utc)
    if credential is None:
        db.add(PasswordCredential(user_id=user_id, normalized_email=email, password_hash=hash_password(new_password), created_at=now, updated_at=now))
    else:
        credential.password_hash = hash_password(new_password)
        credential.updated_at = now
    revoke_user_sessions(db, user_id, now)
    return True


def authenticate(db: Session, *, email: str, password: str, dummy_hash: str) -> User | None:
    email = normalize_email(email)
    credential = db.execute(select(PasswordCredential).where(PasswordCredential.normalized_email == email)).scalar_one_or_none()
    valid = verify_password(credential.password_hash if credential else dummy_hash, password)
    if not credential or not valid:
        return None
    user = db.get(User, credential.user_id)
    if user is None or user.account_status != "active":
        return None
    if password_needs_rehash(credential.password_hash):
        credential.password_hash = hash_password(password)
        credential.updated_at = datetime.now(timezone.utc)
    return user
