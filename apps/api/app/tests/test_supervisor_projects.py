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
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _make_clerk_settings, _mint_jwt


@pytest.fixture
def workflow(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'workflow.db'}", connect_args={"check_same_thread": False})
    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
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
        for name in ("owner", "admin", "outsider"):
            token = _mint_jwt(sub=f"user_supervisor_{name}")
            client.headers["Authorization"] = f"Bearer {token}"
            result = client.get("/api/v1/me")
            assert result.status_code == 200
            actors[name] = {"token": token, "id": result.json()["id"]}
        with sessions() as db:
            db.add(UserRoleGrant(user_id=UUID(actors["admin"]["id"]), role="platform_admin", reason="Synthetic test administrator"))
            db.commit()
        yield client, actors, sessions, make_app
    engine.dispose()


def actor(client, actors, name):
    client.headers["Authorization"] = f'Bearer {actors[name]["token"]}'


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
        assert len(db.scalars(select(ModerationDecision)).all()) == 2
        assert len(db.scalars(select(AuditEvent)).all()) == 7
    # A new app, client and session read the same file-backed database, not localStorage.
    with TestClient(make_app()) as restarted:
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
    client.headers.pop("Authorization")
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
