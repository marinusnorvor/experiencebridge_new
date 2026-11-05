"""Opt-in router tests using synthetic data in one rolled-back staging transaction."""
from urllib.parse import urlsplit
import os
import uuid

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, insert, update
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import normalize_sqlalchemy_postgres_url
from app.core.config import Settings
from app.database.session import get_db
from app.identity.auth_config import AuthConfig
from app.identity.auth_email import DevelopmentMailer
from app.identity.dependencies import require_global_role
from app.identity.models import User, UserRoleGrant
from app.organizations.models import Organization, OrganizationMembership
from app.main import create_app


def test_draft_router_synthetic_flow_on_verified_staging():
    url = os.environ.get("EB_AUTH_STAGING_TEST_URL")
    if not url:
        pytest.skip("Explicit verified staging connection not provided")
    if not ((urlsplit(url).hostname or "").startswith("ep-ancient-truth-zavsgzpz-pooler.") and (urlsplit(url).hostname or "").endswith(".aws.neon.tech")):
        pytest.fail("Refusing a connection other than the verified staging pooled endpoint")
    engine = create_engine(normalize_sqlalchemy_postgres_url(url), poolclass=NullPool, hide_parameters=True)
    with engine.connect() as connection:
        outer = connection.begin()
        try:
            app = create_app(Settings(_env_file=None, APP_ENV="test", NEON_BRANCH="test"))
            app.state.auth_config = AuthConfig("test", "https://frontend.example.invalid", "https://identity.example.invalid", "synthetic-secret-32-bytes-minimum", None, None)
            app.state.auth_mailer = DevelopmentMailer()
            @app.get("/test-admin")
            def admin_only(user=Depends(require_global_role("platform_admin"))):
                return {"id": str(user.id)}

            def test_db():
                with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                    yield db

            app.dependency_overrides[get_db] = test_db
            with TestClient(app, base_url="https://frontend.example.invalid") as client:
                email = f"eb-auth-test-{uuid.uuid4().hex}@example.invalid"
                origin = {"Origin": "https://frontend.example.invalid"}
                assert client.post("/api/v1/auth/login", json={"email": email, "password": "synthetic password"}, headers=origin).status_code == 403
                csrf = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                headers = {**origin, "X-CSRF-Token": csrf}
                body = {"email": email, "password": "a synthetic test password", "display_name": "Synthetic Test"}
                reg_res = client.post("/api/v1/auth/register", json=body, headers=headers)
                assert reg_res.status_code == 202
                assert reg_res.json() == {"message": "Account created. You can now sign in."}
                assert len(app.state.auth_mailer.messages) == 0
                assert client.post("/api/v1/auth/login", json={"email": email, "password": body["password"]}, headers=headers).status_code == 200
                assert "__Host-eb_session" in client.cookies
                profile = client.get("/api/v1/me")
                assert profile.status_code == 200 and profile.json()["email"] == email
                assert "admin" not in profile.json()["effective_contexts"]
                assert client.get("/test-admin").status_code == 403
                user_id = uuid.UUID(profile.json()["id"])
                org_id = uuid.uuid4()
                connection.execute(insert(UserRoleGrant).values(user_id=user_id, role="student", reason="synthetic test"))
                connection.execute(insert(UserRoleGrant).values(user_id=user_id, role="mentor_candidate", reason="synthetic test"))
                connection.execute(insert(UserRoleGrant).values(user_id=user_id, role="platform_admin", reason="synthetic test"))
                connection.execute(insert(Organization).values(id=org_id, display_name="Synthetic test organization", description="Synthetic", created_by_user_id=user_id, verification_status="draft", data_origin="synthetic"))
                assert client.get(f"/api/v1/organizations/{org_id}").status_code == 404
                connection.execute(insert(OrganizationMembership).values(id=uuid.uuid4(), organization_id=org_id, user_id=user_id, role="owner", status="active"))
                assert client.get(f"/api/v1/organizations/{org_id}").status_code == 200
                assert client.get("/test-admin").status_code == 200
                assert set(client.get("/api/v1/me").json()["effective_contexts"]) == {"student", "mentor", "organization", "admin"}
                connection.execute(update(OrganizationMembership).where(OrganizationMembership.organization_id == org_id).values(status="removed"))
                assert "organization" not in client.get("/api/v1/me").json()["effective_contexts"]
                assert client.get(f"/api/v1/organizations/{org_id}").status_code == 404
                connection.execute(update(User).where(User.id == user_id).values(account_status="suspended"))
                assert client.get("/api/v1/me").status_code == 403
                connection.execute(update(User).where(User.id == user_id).values(account_status="active"))
                csrf = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                headers["X-CSRF-Token"] = csrf
                original_session = client.cookies.get("__Host-eb_session")
                assert client.post("/api/v1/auth/login", json={"email": email, "password": body["password"]}, headers=headers).status_code == 200
                assert client.cookies.get("__Host-eb_session") != original_session
                with TestClient(app, base_url="https://frontend.example.invalid") as old_client:
                    old_client.cookies.set("__Host-eb_session", original_session, domain="frontend.example.invalid", path="/")
                    assert old_client.get("/api/v1/me").status_code == 401
                headers["X-CSRF-Token"] = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                assert client.post("/api/v1/auth/forgot-password", json={"email": email}, headers=headers).status_code == 202
                reset_token = app.state.auth_mailer.messages[-1][2]
                assert client.post("/api/v1/auth/reset-password", json={"token": reset_token, "new_password": "a new synthetic password"}, headers=headers).status_code == 200
                assert client.get("/api/v1/me").status_code == 401
                headers["X-CSRF-Token"] = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                assert client.post("/api/v1/auth/reset-password", json={"token": reset_token, "new_password": "another synthetic password"}, headers=headers).status_code == 400
                assert client.post("/api/v1/auth/login", json={"email": email, "password": "a new synthetic password"}, headers=headers).status_code == 200
                headers["X-CSRF-Token"] = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                assert client.post("/api/v1/auth/logout", headers={**headers, "Origin": "https://evil.example.invalid"}).status_code == 403
                logged_out_token = client.cookies.get("__Host-eb_session")
                assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
                assert "__Host-eb_session" not in client.cookies
                assert client.get("/api/v1/me").status_code == 401
                with TestClient(app, base_url="https://frontend.example.invalid") as old_client:
                    old_client.cookies.set("__Host-eb_session", logged_out_token, domain="frontend.example.invalid", path="/")
                    assert old_client.get("/api/v1/me").status_code == 401
                headers["X-CSRF-Token"] = client.get("/api/v1/auth/csrf").json()["csrf_token"]
                assert client.post("/api/v1/auth/login", json={"email": email, "password": "wrong synthetic password"}, headers=headers).status_code == 401
                assert client.post("/api/v1/auth/login", json={"email": email, "password": "wrong synthetic password"}, headers=headers).status_code == 401
                limited = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong synthetic password"}, headers=headers)
                assert limited.status_code == 429 and limited.headers.get("Retry-After")
        finally:
            outer.rollback()
    engine.dispose()
