"""Hermetic tests for admin user creation and role governance endpoints."""

import uuid
from datetime import datetime, timezone
import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, selectinload, Session as DBSession

from app.core.commands import AuditEvent
from app.core.config import Settings
from app.database.session import get_db
from app.identity.dependencies import get_current_user
from app.identity.models import User, UserRoleGrant
from app.identity.password_models import PasswordCredential
from app.identity.password_security import verify_password
from app.main import create_app


@pytest.fixture
def test_setup():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    User.__table__.create(engine)
    UserRoleGrant.__table__.create(engine)
    PasswordCredential.__table__.create(engine)
    AuditEvent.__table__.create(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()

    now = datetime.now(timezone.utc)
    admin_id = uuid.uuid4()
    admin_user = User(
        id=admin_id,
        identity_issuer="https://auth.experiencebridge.internal",
        identity_subject="admin-subj",
        display_name="Admin User",
        email="admin@experiencebridge.org",
        account_status="active",
        created_at=now,
        updated_at=now,
        row_version=1,
    )
    session.add(admin_user)
    session.flush()
    session.add(
        UserRoleGrant(
            id=uuid.uuid4(),
            user_id=admin_id,
            role="platform_admin",
            granted_by_user_id=admin_id,
            granted_at=now,
            revoked_at=None,
        )
    )
    session.commit()

    student_id = uuid.uuid4()
    student_user = User(
        id=student_id,
        identity_issuer="https://auth.experiencebridge.internal",
        identity_subject="student-subj",
        display_name="Student User",
        email="student@experiencebridge.org",
        account_status="active",
        created_at=now,
        updated_at=now,
        row_version=1,
    )
    session.add(student_user)
    session.flush()
    session.add(
        UserRoleGrant(
            id=uuid.uuid4(),
            user_id=student_id,
            role="student",
            granted_by_user_id=admin_id,
            granted_at=now,
            revoked_at=None,
        )
    )
    session.commit()

    settings = Settings(app_env="test", neon_branch="test")
    app = create_app(settings)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    yield app, Session, admin_id, student_id

    session.close()
    engine.dispose()


def make_user_override(target_id: uuid.UUID):
    def _override(db: DBSession = Depends(get_db)):
        return db.scalar(
            select(User).options(selectinload(User.role_grants)).where(User.id == target_id)
        )
    return _override


def test_admin_users_endpoint_requires_platform_admin(test_setup):
    app, Session, admin_id, student_id = test_setup

    # Regular student cannot access
    app.dependency_overrides[get_current_user] = make_user_override(student_id)
    with TestClient(app) as client:
        res = client.get("/api/v1/admin/users")
        assert res.status_code == 403

    # Platform admin can access
    app.dependency_overrides[get_current_user] = make_user_override(admin_id)
    with TestClient(app) as client:
        res = client.get("/api/v1/admin/users")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2
        emails = [item["email"] for item in data["items"]]
        assert "admin@experiencebridge.org" in emails
        assert "student@experiencebridge.org" in emails


def test_admin_create_user_and_grant_role(test_setup):
    app, Session, admin_id, student_id = test_setup

    # Regular student cannot create accounts
    app.dependency_overrides[get_current_user] = make_user_override(student_id)
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/admin/users",
            json={
                "email": "newadmin@experiencebridge.org",
                "password": "SecurePassword123!",
                "display_name": "New Admin Person",
                "role": "platform_admin",
            },
        )
        assert res.status_code == 403

    # Admin can create accounts
    app.dependency_overrides[get_current_user] = make_user_override(admin_id)
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/admin/users",
            json={
                "email": "newadmin@experiencebridge.org",
                "password": "SecurePassword123!",
                "display_name": "New Admin Person",
                "role": "platform_admin",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "newadmin@experiencebridge.org"
        assert data["display_name"] == "New Admin Person"
        assert "platform_admin" in data["roles"]

        # Verify password in database
        with Session() as db:
            cred = db.scalar(
                select(PasswordCredential).where(
                    PasswordCredential.normalized_email == "newadmin@experiencebridge.org"
                )
            )
            assert cred is not None
            assert verify_password(cred.password_hash, "SecurePassword123!")


def test_admin_grant_and_revoke_role(test_setup):
    app, Session, admin_id, student_id = test_setup
    app.dependency_overrides[get_current_user] = make_user_override(admin_id)

    with TestClient(app) as client:
        # Grant mentor_candidate role to student
        res = client.post(
            f"/api/v1/admin/users/{student_id}/roles",
            json={"role": "mentor_candidate", "reason": "Passed mentor screening"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "mentor_candidate" in data["roles"]
        assert "student" in data["roles"]

        # Revoke mentor_candidate role
        res_del = client.delete(f"/api/v1/admin/users/{student_id}/roles/mentor_candidate")
        assert res_del.status_code == 200
        data_del = res_del.json()
        assert "mentor_candidate" not in data_del["roles"]
        assert "student" in data_del["roles"]


def test_admin_cannot_revoke_last_platform_admin(test_setup):
    app, Session, admin_id, student_id = test_setup
    app.dependency_overrides[get_current_user] = make_user_override(admin_id)

    with TestClient(app) as client:
        # Attempting to revoke own platform_admin when being the only admin
        res = client.delete(f"/api/v1/admin/users/{admin_id}/roles/platform_admin")
        assert res.status_code == 400
        assert "Cannot revoke the last remaining platform administrator role" in res.json()["error"]["message"]
