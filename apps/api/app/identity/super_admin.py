"""Automatic bootstrap and synchronization of super administrator account from environment."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.identity.models import User, UserRoleGrant
from app.identity.password_models import PasswordCredential
from app.identity.password_security import (
    hash_password,
    normalize_email,
    validate_password,
    verify_password,
)

logger = logging.getLogger("experiencebridge.identity.super_admin")


def bootstrap_super_admin(db: Session, settings: Settings) -> User | None:
    """Idempotently bootstrap or synchronize the super administrator account.

    If SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are provided in the environment/settings,
    this creates or updates the designated user with active 'platform_admin' role grant
    and Argon2id password hash.
    """
    raw_email = settings.super_admin_email
    raw_password = settings.super_admin_password
    if not raw_email or not raw_password:
        logger.debug("Super admin environment credentials not configured; skipping bootstrap.")
        return None

    email = normalize_email(raw_email)
    password_str = raw_password.get_secret_value().strip()
    if not password_str:
        logger.warning("SUPER_ADMIN_PASSWORD was configured but empty; skipping bootstrap.")
        return None

    validate_password(password_str)
    now = datetime.now(timezone.utc)
    issuer = "https://auth.experiencebridge.internal"

    user = db.execute(
        select(User).where(func.lower(func.trim(User.email)) == email)
    ).scalar_one_or_none()

    if user is None:
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            identity_issuer=issuer,
            identity_subject=f"superadmin-{user_id}",
            display_name=settings.super_admin_name or "Super Administrator",
            email=email,
            email_verified_at=now,
            account_status="active",
            created_at=now,
            updated_at=now,
            row_version=1,
        )
        db.add(user)
        db.flush()

        credential = PasswordCredential(
            user_id=user_id,
            normalized_email=email,
            password_hash=hash_password(password_str),
            created_at=now,
            updated_at=now,
        )
        db.add(credential)

        role_grant = UserRoleGrant(
            id=uuid.uuid4(),
            user_id=user_id,
            role="platform_admin",
            granted_by_user_id=user_id,
            granted_at=now,
            revoked_at=None,
            reason="Environment super admin bootstrap",
        )
        db.add(role_grant)
        db.commit()
        logger.info("Successfully bootstrapped super administrator account (%s)", email)
        return user

    credential = db.execute(
        select(PasswordCredential).where(PasswordCredential.user_id == user.id)
    ).scalar_one_or_none()

    if credential is None:
        credential = PasswordCredential(
            user_id=user.id,
            normalized_email=email,
            password_hash=hash_password(password_str),
            created_at=now,
            updated_at=now,
        )
        db.add(credential)
        logger.info("Created missing password credentials for super administrator.")
    elif not verify_password(credential.password_hash, password_str):
        credential.password_hash = hash_password(password_str)
        credential.updated_at = now
        logger.info("Updated super administrator password from environment configuration.")

    if user.account_status != "active":
        user.account_status = "active"
        user.updated_at = now

    active_admin_grant = db.execute(
        select(UserRoleGrant).where(
            UserRoleGrant.user_id == user.id,
            UserRoleGrant.role == "platform_admin",
            UserRoleGrant.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if active_admin_grant is None:
        role_grant = UserRoleGrant(
            id=uuid.uuid4(),
            user_id=user.id,
            role="platform_admin",
            granted_by_user_id=user.id,
            granted_at=now,
            revoked_at=None,
            reason="Environment super admin synchronization",
        )
        db.add(role_grant)
        logger.info("Restored platform_admin role grant for super administrator (%s)", email)

    db.commit()
    logger.info("Super administrator account (%s) synchronized and verified.", email)
    return user

