"""Session identity and server-authoritative authorization on Neon staging."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends
from fastapi.testclient import TestClient

from app.identity.dependencies import require_global_role
from app.identity.models import User, UserRoleGrant
from app.mentorship.models import MentorProfile
from app.organizations.models import Organization, OrganizationMembership
from app.tests.auth_workflow_helpers import ORIGIN, register_actor, staging_workflow


def test_anonymous_and_forged_tokens_are_rejected(staging_workflow):
    _, make_app = staging_workflow
    with TestClient(make_app(), base_url=ORIGIN) as client:
        for header in (None, "Basic dXNlcjpwYXNz", "Bearer not-a-valid-jwt"):
            response = client.get("/api/v1/me", headers={"Authorization": header} if header else {})
            assert response.status_code == 401
            assert response.json()["error"]["code"] == "AUTH_REQUIRED"
        client.cookies.set("__Host-eb_session", "forged-opaque-session", domain="frontend.example.invalid", path="/")
        response = client.get("/api/v1/me")
        assert response.status_code == 401
        assert "forged-opaque-session" not in response.text


def test_registration_rejects_client_asserted_roles_and_verification(staging_workflow):
    _, make_app = staging_workflow
    with TestClient(make_app(), base_url=ORIGIN) as client:
        csrf = client.get("/api/v1/auth/csrf").json()["csrf_token"]
        body = {"email": "synthetic-spoof@example.invalid", "password": "a synthetic test password", "display_name": "Synthetic", "role": "platform_admin", "email_verified": True}
        response = client.post("/api/v1/auth/register", json=body, headers={"Origin": ORIGIN, "X-CSRF-Token": csrf})
        assert response.status_code == 422


def test_session_user_self_and_server_authoritative_roles(staging_workflow):
    sessions, make_app = staging_workflow
    app = make_app()
    @app.get("/api/v1/_test/admin-only")
    def admin_only(user=Depends(require_global_role("platform_admin"))):
        return {"admin_user_id": str(user.id)}
    with TestClient(app, base_url=ORIGIN) as client:
        actor = register_actor(client, "role-spoof")
        first = client.get("/api/v1/me?role=platform_admin&context=admin", headers={"X-ExperienceBridge-Role": "platform_admin"})
        assert first.status_code == 200
        body = first.json()
        assert body["identity_issuer"] == "https://identity.example.invalid"
        assert body["identity_subject"]
        assert body["display_name"] == "Synthetic role-spoof"
        assert body["email"] == actor["email"] and body["email_verified_at"] is not None
        assert body["account_status"] == "active"
        assert body["role_grants"] == [] and body["effective_contexts"] == []
        assert body["row_version"] == 1
        assert actor["cookies"]["__Host-eb_session"] not in first.text
        assert client.get("/api/v1/me").json()["id"] == body["id"]
        denied = client.get("/api/v1/_test/admin-only")
        assert denied.status_code == 403 and denied.json()["error"]["code"] == "FORBIDDEN"
        with sessions() as db:
            user = db.get(User, UUID(actor["id"]))
            db.add(UserRoleGrant(user_id=user.id, role="student", reason="Synthetic onboarding"))
            grant = UserRoleGrant(user_id=user.id, role="platform_admin", reason="Synthetic grant")
            db.add(grant)
            db.commit()
            grant_id = grant.id
        granted = client.get("/api/v1/me").json()
        assert granted["role_grants"] == ["student", "platform_admin"]
        assert granted["effective_contexts"] == ["student", "admin"]
        assert client.get("/api/v1/_test/admin-only").json()["admin_user_id"] == actor["id"]
        with sessions() as db:
            db.get(UserRoleGrant, grant_id).revoked_at = datetime.now(timezone.utc)
            db.commit()
        revoked = client.get("/api/v1/me").json()
        assert revoked["role_grants"] == ["student"] and revoked["effective_contexts"] == ["student"]
        assert client.get("/api/v1/_test/admin-only").status_code == 403
        with sessions() as db:
            db.get(User, UUID(actor["id"])).account_status = "suspended"
            db.commit()
        suspended = client.get("/api/v1/me")
        assert suspended.status_code == 403 and suspended.json()["error"]["code"] == "FORBIDDEN"


def test_effective_contexts_respect_membership_and_mentor_profile(staging_workflow):
    sessions, make_app = staging_workflow
    with TestClient(make_app(), base_url=ORIGIN) as client:
        actor = register_actor(client, "contexts")
        assert client.get("/api/v1/me").json()["effective_contexts"] == []
        with sessions() as db:
            user_id = UUID(actor["id"])
            org = Organization(display_name="Synthetic civic hub", description="Synthetic test", created_by_user_id=user_id, verification_status="submitted", data_origin="synthetic")
            db.add(org)
            db.flush()
            db.add(OrganizationMembership(organization_id=org.id, user_id=user_id, role="owner", status="active"))
            db.add(MentorProfile(user_id=user_id, bio="Synthetic mentor", skills=["Python"], availability_text="4 hours/week", weekly_review_capacity=3, directory_opt_in=True, eligibility_status="approved"))
            db.commit()
        assert client.get("/api/v1/me").json()["effective_contexts"] == ["mentor", "organization"]


def test_openapi_marks_me_as_cookie_security(staging_workflow):
    _, make_app = staging_workflow
    schema = make_app().openapi()
    operation = schema["paths"]["/api/v1/me"]["get"]
    assert operation["security"] == [{"SessionCookie": []}]
    assert schema["components"]["securitySchemes"]["SessionCookie"]["in"] == "cookie"
    assert all(param["name"] != "Authorization" for param in operation.get("parameters", []))
