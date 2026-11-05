"""Unit tests for automatic super administrator account bootstrap and synchronization."""

import pytest
from pydantic import SecretStr
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings
from app.database.base import Base
from app.identity.models import User, UserRoleGrant
from app.identity.password_models import PasswordCredential
from app.identity.password_security import verify_password
from app.identity.super_admin import bootstrap_super_admin


@pytest.fixture
def sqlite_db():
    engine = create_engine("sqlite:///:memory:")
    # Create required tables for identity models
    User.__table__.create(engine)
    UserRoleGrant.__table__.create(engine)
    PasswordCredential.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_bootstrap_skipped_when_credentials_missing(sqlite_db):
    settings = Settings(
        app_env="test",
        neon_branch="test",
        super_admin_email=None,
        super_admin_password=None,
    )
    result = bootstrap_super_admin(sqlite_db, settings)
    assert result is None
    assert sqlite_db.scalar(select(User)) is None


def test_bootstrap_creates_super_admin_with_platform_admin_role(sqlite_db):
    settings = Settings(
        app_env="test",
        neon_branch="test",
        super_admin_email="superadmin@experiencebridge.org",
        super_admin_password=SecretStr("SuperAdminSecurePass123!"),
        super_admin_name="Main Super Administrator",
    )
    user = bootstrap_super_admin(sqlite_db, settings)
    assert user is not None
    assert user.email == "superadmin@experiencebridge.org"
    assert user.display_name == "Main Super Administrator"
    assert user.account_status == "active"
    assert user.email_verified_at is not None

    cred = sqlite_db.scalar(select(PasswordCredential).where(PasswordCredential.user_id == user.id))
    assert cred is not None
    assert cred.normalized_email == "superadmin@experiencebridge.org"
    assert verify_password(cred.password_hash, "SuperAdminSecurePass123!")

    grant = sqlite_db.scalar(select(UserRoleGrant).where(UserRoleGrant.user_id == user.id))
    assert grant is not None
    assert grant.role == "platform_admin"
    assert grant.revoked_at is None


def test_bootstrap_is_idempotent_and_updates_password_when_changed(sqlite_db):
    settings_v1 = Settings(
        app_env="test",
        neon_branch="test",
        super_admin_email="superadmin@experiencebridge.org",
        super_admin_password=SecretStr("InitialPassword123!"),
    )
    user_v1 = bootstrap_super_admin(sqlite_db, settings_v1)
    assert user_v1 is not None

    settings_v2 = Settings(
        app_env="test",
        neon_branch="test",
        super_admin_email="superadmin@experiencebridge.org",
        super_admin_password=SecretStr("UpdatedPassword456!"),
    )
    user_v2 = bootstrap_super_admin(sqlite_db, settings_v2)
    assert user_v2.id == user_v1.id

    cred = sqlite_db.scalar(select(PasswordCredential).where(PasswordCredential.user_id == user_v2.id))
    assert verify_password(cred.password_hash, "UpdatedPassword456!")
    assert not verify_password(cred.password_hash, "InitialPassword123!")


def test_bootstrap_restores_revoked_platform_admin_role(sqlite_db):
    settings = Settings(
        app_env="test",
        neon_branch="test",
        super_admin_email="superadmin@experiencebridge.org",
        super_admin_password=SecretStr("SuperAdminSecurePass123!"),
    )
    user = bootstrap_super_admin(sqlite_db, settings)
    assert user is not None

    grant = sqlite_db.scalar(select(UserRoleGrant).where(UserRoleGrant.user_id == user.id))
    grant.revoked_at = grant.granted_at
    sqlite_db.commit()

    user_recheck = bootstrap_super_admin(sqlite_db, settings)
    active_grants = sqlite_db.scalars(
        select(UserRoleGrant).where(
            UserRoleGrant.user_id == user_recheck.id,
            UserRoleGrant.role == "platform_admin",
            UserRoleGrant.revoked_at.is_(None),
        )
    ).all()
    assert len(active_grants) == 1

