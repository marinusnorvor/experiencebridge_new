"""Integration tests for ExperienceBridge Admin Portal endpoints and workflows."""

from __future__ import annotations

import uuid
from uuid import UUID
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.database.session import get_db
from app.identity.models import UserRoleGrant
from app.main import create_app
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _make_clerk_settings, _mint_jwt


@pytest.fixture
def admin_workflow(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'admin_workflow.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)

    def make_app():
        app = create_app(_make_clerk_settings())
        app.state.clerk_signing_key_resolver = lambda _: RSA_PUBLIC_JWK.key

        def database():
            with sessions() as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise

        app.dependency_overrides[get_db] = database
        return app

    with TestClient(make_app()) as client:
        actors = {}
        for role_name in ("admin", "student", "org_owner", "unauthorized_user"):
            token = _mint_jwt(sub=f"user_admin_{role_name}")
            client.headers["Authorization"] = f"Bearer {token}"
            res = client.get("/api/v1/me")
            assert res.status_code == 200, res.text
            actors[role_name] = {"token": token, "id": res.json()["id"]}

        with sessions() as db:
            # Grant admin role
            db.add(UserRoleGrant(user_id=UUID(actors["admin"]["id"]), role="platform_admin", reason="Test admin"))
            # Grant student role
            db.add(UserRoleGrant(user_id=UUID(actors["student"]["id"]), role="student", reason="Test student"))
            db.commit()

        yield client, actors, sessions

    engine.dispose()


def set_actor(client: TestClient, actors: dict, name: str):
    client.headers["Authorization"] = f"Bearer {actors[name]['token']}"


def test_admin_stats_and_unauthorized_access(admin_workflow):
    client, actors, sessions = admin_workflow

    # Non-admin actor is rejected
    set_actor(client, actors, "student")
    denied = client.get("/api/v1/admin/stats")
    assert denied.status_code == 403, denied.text

    set_actor(client, actors, "org_owner")
    denied_org = client.get("/api/v1/admin/stats")
    assert denied_org.status_code == 403

    # Admin actor gets accurate aggregate statistics
    set_actor(client, actors, "admin")
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 200, res.text
    data = res.json()

    assert "organizations" in data
    assert "projects" in data
    assert "mentors" in data
    assert "applications" in data
    assert "participations" in data
    assert "users" in data
    assert "total_audit_events" in data
    assert data["users"]["total"] >= 4


def test_admin_audit_logs(admin_workflow):
    client, actors, sessions = admin_workflow

    # Non-admin is rejected
    set_actor(client, actors, "student")
    assert client.get("/api/v1/admin/audit-logs").status_code == 403

    # Org owner creates an organization
    set_actor(client, actors, "org_owner")
    org_res = client.post(
        "/api/v1/organizations",
        json={"display_name": "Acme Labs", "description": "Cutting edge research lab."},
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert org_res.status_code == 201, org_res.text
    org = org_res.json()

    # Admin inspects audit logs
    set_actor(client, actors, "admin")
    logs_res = client.get("/api/v1/admin/audit-logs")
    assert logs_res.status_code == 200, logs_res.text
    logs = logs_res.json()
    assert logs["total"] >= 1
    assert any(item["event_type"] == "organization.created" for item in logs["items"])

    # Filter by event_type
    filtered_res = client.get("/api/v1/admin/audit-logs?event_type=organization.created")
    assert filtered_res.status_code == 200
    filtered = filtered_res.json()
    assert all(item["event_type"] == "organization.created" for item in filtered["items"])


def test_admin_organizations_and_projects_oversight(admin_workflow):
    client, actors, sessions = admin_workflow

    # Non-admin cannot view all orgs or projects
    set_actor(client, actors, "unauthorized_user")
    assert client.get("/api/v1/admin/organizations").status_code == 403
    assert client.get("/api/v1/admin/projects").status_code == 403

    # Org owner creates an organization
    set_actor(client, actors, "org_owner")
    org_res = client.post(
        "/api/v1/organizations",
        json={"display_name": "Tech Corp", "description": "Innovative software systems."},
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert org_res.status_code == 201
    org = org_res.json()

    # Admin lists organizations
    set_actor(client, actors, "admin")
    orgs_res = client.get("/api/v1/admin/organizations")
    assert orgs_res.status_code == 200
    org_items = orgs_res.json()["items"]
    assert any(o["id"] == org["id"] for o in org_items)

    # Filter by status
    draft_orgs = client.get("/api/v1/admin/organizations?status=draft").json()["items"]
    assert any(o["id"] == org["id"] for o in draft_orgs)

    # Admin lists projects
    projects_res = client.get("/api/v1/admin/projects")
    assert projects_res.status_code == 200
    assert "items" in projects_res.json()


def test_admin_user_oversight(admin_workflow):
    client, actors, sessions = admin_workflow

    # Non-admin is rejected
    set_actor(client, actors, "student")
    assert client.get("/api/v1/admin/oversight/users").status_code == 403

    # Admin retrieves users
    set_actor(client, actors, "admin")
    users_res = client.get("/api/v1/admin/oversight/users")
    assert users_res.status_code == 200, users_res.text
    data = users_res.json()
    assert data["total"] >= 4
    admin_user = next((u for u in data["items"] if u["id"] == actors["admin"]["id"]), None)
    assert admin_user is not None
    assert "platform_admin" in admin_user["roles"]

    # Role filter
    student_users = client.get("/api/v1/admin/oversight/users?role=student").json()
    assert any(u["id"] == actors["student"]["id"] for u in student_users["items"])
    assert not any(u["id"] == actors["admin"]["id"] for u in student_users["items"])


def test_admin_application_and_participation_oversight(admin_workflow):
    client, actors, sessions = admin_workflow

    # Non-admin access denied
    set_actor(client, actors, "student")
    assert client.get("/api/v1/admin/oversight/applications").status_code == 403
    assert client.get("/api/v1/admin/oversight/participations").status_code == 403

    # Admin access succeeds
    set_actor(client, actors, "admin")
    apps_res = client.get("/api/v1/admin/oversight/applications")
    assert apps_res.status_code == 200
    assert "items" in apps_res.json()

    parts_res = client.get("/api/v1/admin/oversight/participations")
    assert parts_res.status_code == 200
    assert "items" in parts_res.json()
