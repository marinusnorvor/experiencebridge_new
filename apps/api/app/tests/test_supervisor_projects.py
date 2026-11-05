"""Real authenticated HTTP calls against disposable SQL databases; never touches Neon."""

import importlib.util
import io
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, select
from sqlalchemy.orm import sessionmaker

from app.core.commands import AuditEvent
from app.database.base import Base
from app.database.session import get_db
from app.identity.models import UserRoleGrant
from app.main import create_app
from app.projects.models import ModerationDecision, Project, TermsVersion
from app.tests.auth_workflow_helpers import staging_workflow, register_actor, activate, ORIGIN, PASSWORD


@pytest.fixture
def workflow(staging_workflow):
    sessions, make_app = staging_workflow
    with TestClient(make_app(), base_url=ORIGIN) as client:
        actors = {name: register_actor(client, name) for name in ("owner", "admin", "outsider")}
        with sessions() as db:
            db.add(UserRoleGrant(user_id=UUID(actors["admin"]["id"]), role="platform_admin", reason="Synthetic test administrator"))
            db.commit()
        yield client, actors, sessions, make_app


def actor(client, actors, name):
    activate(client, actors[name])


def post(client, path, body, version=None, key=None):
    headers = {"Idempotency-Key": key or str(uuid4())}
    if version is not None:
        headers["If-Match"] = f'"{version}"'
    return client.post("/api/v1" + path, json=body, headers=headers)


def organization(workflow):
    client, actors, *_ = workflow
    actor(client, actors, "owner")
    result = post(client, "/organizations", {"display_name": "Synthetic supervisor org", "description": "Synthetic organization for integration tests."})
    assert result.status_code == 201, result.text
    return result.json()


def verified_organization(workflow):
    client, actors, *_ = workflow
    org = organization(workflow)
    result = post(client, f'/organizations/{org["id"]}/submit-verification', {}, 1)
    assert result.status_code == 200, result.text
    actor(client, actors, "admin")
    result = post(client, f'/admin/organizations/{org["id"]}/decisions', {
        "decision": "verify", "explanation": "Synthetic organization checks completed for demonstration."}, 2)
    assert result.status_code == 200, result.text
    return result.json()


def project_body(actors):
    return {"title": "Synthetic website project", "description": "Build an informational site using only synthetic content.",
            "capacity": 1, "org_reviewer_user_id": actors["owner"]["id"],
            "scope_in": "One accessible information page.", "scope_out": "No live customer data or payments.",
            "estimated_minutes": 120, "start_on": "2026-11-01", "due_on": "2026-11-10",
            "milestones": [{"title": "Working information page", "acceptance_criteria": ["Accessible keyboard navigation"], "due_on": "2026-11-09"}]}


def draft_project(workflow):
    client, actors, *_ = workflow
    org = verified_organization(workflow)
    actor(client, actors, "owner")
    result = post(client, f'/organizations/{org["id"]}/projects', project_body(actors), org["row_version"])
    assert result.status_code == 201, result.text
    return org, result.json()


def terms_body():
    return {"fee_amount": "450.00", "payment_terms": "Synthetic terms only; no actual payment claim.",
            "ip_ownership_terms": "Synthetic work rights reviewed for demonstration.",
            "confidentiality_terms": "Use synthetic information only, no confidential material.",
            "mentor_plan": "An eligible mentor must explicitly accept supervision."}


def submitted_project(workflow):
    client, *_ = workflow
    org, project = draft_project(workflow)
    result = post(client, f'/projects/{project["id"]}/terms-versions', terms_body(), 1)
    assert result.status_code == 201, result.text
    terms = result.json()
    result = post(client, f'/projects/{project["id"]}/submit-review', {"terms_version_id": terms["id"]}, 2)
    assert result.status_code == 200, result.text
    return org, result.json(), terms


def test_publish_and_retrieve_after_app_restart(workflow):
    client, actors, sessions, make_app = workflow
    _, project, terms = submitted_project(workflow)
    actor(client, actors, "outsider")
    assert client.get(f'/api/v1/projects/{project["id"]}').status_code == 404
    assert client.get("/api/v1/projects").json()["items"] == []
    actor(client, actors, "admin")
    queue = client.get("/api/v1/admin/projects/pending")
    assert queue.status_code == 200
    assert queue.json()["items"][0]["terms"]["content_hash"] == terms["content_hash"]
    approved = post(client, f'/admin/projects/{project["id"]}/decisions', {
        "decision": "approve", "explanation": "Reviewed synthetic scope and compensation disclosure.",
        "terms_version_id": terms["id"], "snapshot_hash": terms["content_hash"]}, project["row_version"])
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "open"
    actor(client, actors, "owner")
    assert client.patch(f'/api/v1/projects/{project["id"]}', json=project_body(actors),
                        headers={"If-Match": '"4"'}).status_code == 409
    assert post(client, f'/projects/{project["id"]}/terms-versions', terms_body(), 4).status_code == 409
    with sessions() as db:
        assert db.get(Project, UUID(project["id"])).status == "open"
        assert len(db.scalars(select(ModerationDecision).where(ModerationDecision.admin_user_id == UUID(actors["admin"]["id"]))).all()) == 2
        assert len(db.scalars(select(AuditEvent).where(AuditEvent.actor_user_id.in_([UUID(a["id"]) for a in actors.values()]))).all()) == 7
    # A new app and client read the same staging-backed state.
    with TestClient(make_app(), base_url=ORIGIN) as restarted:
        actor(restarted, actors, "outsider")
        listing = restarted.get("/api/v1/projects").json()["items"]
        assert listing[0]["id"] == project["id"]
        assert listing[0]["published_terms_version_id"] == terms["id"]
        detail = restarted.get(f'/api/v1/projects/{project["id"]}').json()
        assert detail["published_terms_version_id"] == terms["id"]
        assert listing[0]["data_origin"] == "synthetic"
        assert "org_reviewer_user_id" not in listing[0]
        read = restarted.get(f'/api/v1/projects/{project["id"]}/terms-versions/{terms["id"]}')
        assert read.status_code == 200
        assert read.json()["snapshot"]["terms"]["fee_amount"] == "450.00"
        actor(restarted, actors, "owner")
        org_projects = restarted.get(f'/api/v1/organizations/{project["organization_id"]}/projects').json()["items"]
        assert org_projects[0]["published_terms_version_id"] == terms["id"]
        assert org_projects[0]["submitted_terms_version_id"] == terms["id"]


def test_auth_tenant_and_independent_moderation(workflow):
    client, actors, sessions, _ = workflow
    org = organization(workflow)
    client.cookies.clear()
    assert client.get(f'/api/v1/organizations/{org["id"]}').status_code == 401
    actor(client, actors, "outsider")
    assert client.get(f'/api/v1/organizations/{org["id"]}').status_code == 404
    assert post(client, f'/organizations/{org["id"]}/projects', project_body(actors), 1).status_code == 404
    assert client.get("/api/v1/admin/organizations/pending").status_code == 403
    actor(client, actors, "owner")
    assert post(client, f'/organizations/{org["id"]}/submit-verification', {}, 1).status_code == 200
    with sessions() as db:
        db.add(UserRoleGrant(user_id=UUID(actors["owner"]["id"]), role="platform_admin"))
        db.commit()
    result = post(client, f'/admin/organizations/{org["id"]}/decisions', {
        "decision": "verify", "explanation": "Cannot moderate my own organization."}, 2)
    assert result.status_code == 403


def test_idempotency_conflict_and_revoked_membership(workflow):
    from app.organizations.models import OrganizationMembership
    client, actors, sessions, _ = workflow
    actor(client, actors, "owner")
    body = {"display_name": "Synthetic repeat", "description": "Repeated requests must create one organization."}
    key = str(uuid4())
    first = post(client, "/organizations", body, key=key)
    assert post(client, "/organizations", body, key=key).json() == first.json()
    assert post(client, "/organizations", {**body, "description": "Different content should not replay."}, key=key).status_code == 409
    org = first.json()
    submit_key = str(uuid4())
    assert post(client, f'/organizations/{org["id"]}/submit-verification', {}, 1, submit_key).status_code == 200
    assert post(client, f'/organizations/{org["id"]}/submit-verification', {}, 1, submit_key).status_code == 200
    with sessions() as db:
        membership = db.scalar(select(OrganizationMembership).where(OrganizationMembership.organization_id == UUID(org["id"])))
        membership.status = "removed"
        db.commit()
    assert post(client, f'/organizations/{org["id"]}/submit-verification', {}, 1, submit_key).status_code == 404


def test_stale_terms_missing_headers_and_invalid_inputs(workflow):
    client, actors, sessions, _ = workflow
    _, project = draft_project(workflow)
    path = f'/projects/{project["id"]}/terms-versions'
    assert post(client, path, terms_body()).status_code == 428
    assert post(client, path, terms_body(), 9).status_code == 412
    assert post(client, path, {**terms_body(), "fee_amount": "-1.00"}, 1).status_code == 422
    assert post(client, path, {**terms_body(), "fee_amount": 450.0}, 1).status_code == 422
    assert post(client, path, {**terms_body(), "compensation_type": "unpaid_commercial"}, 1).status_code == 422
    assert post(client, path, {**terms_body(), "created_by_user_id": actors["admin"]["id"]}, 1).status_code == 422
    terms = post(client, path, terms_body(), 1).json()
    changed = client.patch(f'/api/v1/projects/{project["id"]}', json={**project_body(actors), "title": "Changed draft title"}, headers={"If-Match": '"2"'})
    assert changed.status_code == 200, changed.text
    result = post(client, f'/projects/{project["id"]}/submit-review', {"terms_version_id": terms["id"]}, 3)
    assert result.status_code == 409
    assert result.json()["error"]["code"] == "TERMS_CHANGED"
    with sessions() as db:
        assert db.get(TermsVersion, UUID(terms["id"])).snapshot["title"] == "Synthetic website project"


def test_revision_request_and_mismatched_moderation_snapshot(workflow):
    client, actors, *_ = workflow
    _, project, terms = submitted_project(workflow)
    actor(client, actors, "admin")
    body = {"decision": "approve", "explanation": "A matching snapshot must be required.",
            "terms_version_id": terms["id"], "snapshot_hash": "0" * 64}
    wrong = post(client, f'/admin/projects/{project["id"]}/decisions', body, 3)
    assert wrong.status_code == 409
    requested = post(client, f'/admin/projects/{project["id"]}/decisions', {
        **body, "decision": "request_changes", "snapshot_hash": terms["content_hash"]}, 3)
    assert requested.status_code == 200
    assert requested.json()["status"] == "changes_requested"


def test_development_routes_fail_closed_outside_development(workflow):
    from app.identity.dependencies import get_active_settings
    from types import SimpleNamespace
    client, *_ = workflow
    client.app.dependency_overrides[get_active_settings] = lambda: SimpleNamespace(app_env="production", neon_branch="production")
    assert client.get("/api/v1/projects").status_code == 403


def load_migration():
    path = Path(__file__).resolve().parents[2] / "alembic/versions/20261031_0002_supervisor_projects.py"
    spec = importlib.util.spec_from_file_location("supervisor_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_upgrade_downgrade_and_postgres_sql():
    from app.identity.models import User, UserRoleGrant
    migration = load_migration()
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        Base.metadata.create_all(connection, tables=[User.__table__, UserRoleGrant.__table__])
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration.upgrade()
            cp1_tables = {
                "users", "user_role_grants", "organizations", "organization_memberships",
                "projects", "project_terms_versions", "moderation_decisions",
                "audit_events", "idempotency_records",
            }
            assert set(inspect(connection).get_table_names()) == cp1_tables
            migration.downgrade()
            assert set(inspect(connection).get_table_names()) == {"users", "user_role_grants"}
    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        migration.upgrade()
    assert "CREATE TABLE projects" in output.getvalue()
    assert "FOREIGN KEY" in output.getvalue()
    assert "DROP TABLE" not in output.getvalue()
    engine.dispose()


def test_organization_portal_15_step_project_creation_and_relogin_persistence(workflow):
    """Verifies Section 6 critical acceptance test: full 15-step Organization project lifecycle and re-login persistence."""
    client, actors, sessions, make_app = workflow

    # Steps 1-2: Sign in with the synthetic session, open Organization Portal, verify organization identity & membership
    org = verified_organization(workflow)
    actor(client, actors, "owner")
    me_res = client.get("/api/v1/me")
    assert me_res.status_code == 200
    assert "organization" in me_res.json()["effective_contexts"]
    my_orgs = client.get("/api/v1/me/organizations")
    assert my_orgs.status_code == 200
    assert [item["id"] for item in my_orgs.json()["items"]] == [org["id"]]

    # Initial dashboard state: 0 projects
    assert client.get(f'/api/v1/organizations/{org["id"]}/projects').json()["items"] == []

    # Steps 3-5: Create a project with valid details, save as draft, and capture backend-generated project ID
    initial_payload = {
        "title": "Synthetic Accessibility Audit Portal",
        "description": "Audit keyboard navigation and screen reader landmarks across synthetic components.",
        "capacity": 2,
        "org_reviewer_user_id": actors["owner"]["id"],
        "scope_in": "Audit main navigation, forms, and status banners.",
        "scope_out": "No production customer data or live third-party integrations.",
        "estimated_minutes": 240,
        "start_on": "2026-11-05",
        "due_on": "2026-11-20",
        "milestones": [
            {
                "title": "Milestone 1: Keyboard navigation audit",
                "acceptance_criteria": ["Tab order documented", "Focus traps resolved"],
                "due_on": "2026-11-12",
            },
            {
                "title": "Milestone 2: Remediation verification report",
                "acceptance_criteria": ["WCAG AA checklist completed"],
                "due_on": "2026-11-19",
            },
        ],
    }
    created_res = post(client, f'/organizations/{org["id"]}/projects', initial_payload, org["row_version"])
    assert created_res.status_code == 201, created_res.text
    created_project = created_res.json()
    project_id = created_project["id"]
    assert UUID(project_id)
    assert created_project["status"] == "draft"
    assert created_project["row_version"] == 1

    # Steps 6-8: Refresh the page, reopen the project, and confirm all supported fields persisted in the database
    refreshed_list = client.get(f'/api/v1/organizations/{org["id"]}/projects')
    assert refreshed_list.status_code == 200
    assert len(refreshed_list.json()["items"]) == 1
    reopened = client.get(f"/api/v1/projects/{project_id}")
    assert reopened.status_code == 200
    reopened_data = reopened.json()
    for field in ("title", "description", "capacity", "org_reviewer_user_id"):
        assert reopened_data[field] == initial_payload[field]
    for scope_field in ("scope_in", "scope_out", "estimated_minutes", "start_on", "due_on"):
        assert reopened_data["scope"][scope_field] == initial_payload[scope_field]
    assert len(reopened_data["scope"]["milestones"]) == len(initial_payload["milestones"])
    for actual_ms, expected_ms in zip(reopened_data["scope"]["milestones"], initial_payload["milestones"]):
        assert UUID(actual_ms["id"])
        assert actual_ms["title"] == expected_ms["title"]
        assert actual_ms["acceptance_criteria"] == expected_ms["acceptance_criteria"]
        assert actual_ms["due_on"] == expected_ms["due_on"]

    # Steps 9-10: Edit the project, save, refresh, and confirm the edits persisted
    edited_payload = {
        **initial_payload,
        "title": "Synthetic Accessibility & Contrast Audit Portal",
        "description": "Updated scope: includes WCAG 2.1 AA contrast verification and keyboard landmark audit.",
        "estimated_minutes": 300,
    }
    patch_res = client.patch(
        f"/api/v1/projects/{project_id}",
        json=edited_payload,
        headers={"If-Match": f'"{reopened_data["row_version"]}"'},
    )
    assert patch_res.status_code == 200, patch_res.text
    reopened_after_edit = client.get(f"/api/v1/projects/{project_id}").json()
    assert reopened_after_edit["title"] == edited_payload["title"]
    assert reopened_after_edit["description"] == edited_payload["description"]
    assert reopened_after_edit["scope"]["estimated_minutes"] == 300
    assert reopened_after_edit["row_version"] == 2

    # Steps 11-12: Create terms version, submit project for moderation, and confirm pending_review status is saved
    terms_res = post(
        client,
        f"/projects/{project_id}/terms-versions",
        terms_body(),
        reopened_after_edit["row_version"],
    )
    assert terms_res.status_code == 201, terms_res.text
    terms = terms_res.json()

    submit_res = post(
        client,
        f"/projects/{project_id}/submit-review",
        {"terms_version_id": terms["id"]},
        3,
    )
    assert submit_res.status_code == 200, submit_res.text
    submitted_data = submit_res.json()
    assert submitted_data["status"] == "pending_review"
    assert submitted_data["submitted_terms_version_id"] == terms["id"]

    # Step 13: Return to the dashboard and verify project counts update (1 total, 1 pending_review, 0 draft)
    dashboard_projects = client.get(f'/api/v1/organizations/{org["id"]}/projects').json()["items"]
    assert len(dashboard_projects) == 1
    assert dashboard_projects[0]["id"] == project_id
    assert dashboard_projects[0]["status"] == "pending_review"
    assert dashboard_projects[0]["submitted_terms_version_id"] == terms["id"]

    # Steps 14-15: Sign out and sign back in with a fresh session/token; confirm same org, project, and approval status remain visible
    with TestClient(make_app(), base_url=ORIGIN) as relogin_client:
        activate(relogin_client, actors["owner"])
        signed_in = relogin_client.post("/api/v1/auth/login", json={"email": actors["owner"]["email"], "password": PASSWORD})
        assert signed_in.status_code == 200, signed_in.text
        me_relogin = relogin_client.get("/api/v1/me")
        assert me_relogin.status_code == 200
        assert me_relogin.json()["id"] == actors["owner"]["id"]

        orgs_relogin = relogin_client.get("/api/v1/me/organizations").json()["items"]
        assert len(orgs_relogin) == 1
        assert orgs_relogin[0]["id"] == org["id"]
        assert orgs_relogin[0]["verification_status"] == "verified"

        projects_relogin = relogin_client.get(f'/api/v1/organizations/{org["id"]}/projects').json()["items"]
        assert len(projects_relogin) == 1
        assert projects_relogin[0]["id"] == project_id
        assert projects_relogin[0]["title"] == edited_payload["title"]
        assert projects_relogin[0]["status"] == "pending_review"
        assert projects_relogin[0]["submitted_terms_version_id"] == terms["id"]

        terms_relogin = relogin_client.get(f'/api/v1/projects/{project_id}/terms-versions/{terms["id"]}')
        assert terms_relogin.status_code == 200
        assert terms_relogin.json()["snapshot"]["title"] == edited_payload["title"]

        # Verify another user without membership cannot access this organization's private records
        activate(relogin_client, actors["outsider"])
        assert relogin_client.get(f'/api/v1/organizations/{org["id"]}/projects').status_code == 404
        assert relogin_client.get(f"/api/v1/projects/{project_id}").status_code == 404

