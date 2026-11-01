"""Checkpoint 2: student applications, offers, explicit consent, capacity and participations."""

import importlib.util
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, select
from sqlalchemy.orm import sessionmaker

from app.applications.models import Application, Offer, Participation, TermsAcceptance
from app.applications.schemas import CONSENT_TEXT, CONSENT_VERSION
from app.database.base import Base
from app.database.session import get_db
from app.identity.models import User, UserRoleGrant
from app.main import create_app
from app.projects.models import Project
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _make_clerk_settings, _mint_jwt
from app.tests.test_supervisor_projects import (
    actor,
    post,
    submitted_project,
)


@pytest.fixture
def workflow(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'workflow_apps.db'}", connect_args={"check_same_thread": False})

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
        for name in ("owner", "admin", "student1", "student2", "outsider"):
            token = _mint_jwt(sub=f"user_app_{name}")
            client.headers["Authorization"] = f"Bearer {token}"
            result = client.get("/api/v1/me")
            assert result.status_code == 200
            actors[name] = {"token": token, "id": result.json()["id"]}
        with sessions() as db:
            db.add(
                UserRoleGrant(
                    user_id=UUID(actors["admin"]["id"]),
                    role="platform_admin",
                    reason="Synthetic test administrator",
                )
            )
            db.commit()
        yield client, actors, sessions, make_app
    engine.dispose()


def open_project(workflow, capacity=1):
    client, actors, sessions, _ = workflow
    org, project, terms = submitted_project(workflow)
    if capacity != 1:
        with sessions() as db:
            p = db.get(Project, UUID(project["id"]))
            p.capacity = capacity
            db.commit()
            project["capacity"] = capacity
    actor(client, actors, "admin")
    approved = post(
        client,
        f'/admin/projects/{project["id"]}/decisions',
        {
            "decision": "approve",
            "explanation": "Reviewed synthetic scope.",
            "terms_version_id": terms["id"],
            "snapshot_hash": terms["content_hash"],
        },
        project["row_version"],
    )
    assert approved.status_code == 200, approved.text
    return org, approved.json(), terms


def application_body(terms_id):
    return {
        "seen_terms_version_id": terms_id,
        "motivation": "I have experience with accessible frontend development and want to participate.",
        "declared_skills": ["HTML", "CSS", "TypeScript"],
        "links": [{"label": "Portfolio", "url": "https://example.com/student-work"}],
        "weekly_minutes_available": 600,
    }


def test_full_application_offer_acceptance_and_participation_flow(workflow):
    client, actors, sessions, _ = workflow
    org, project, terms = open_project(workflow, capacity=2)

    # 1. Student1 applies
    actor(client, actors, "student1")
    app_res = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"])
    assert app_res.status_code == 201, app_res.text
    application = app_res.json()
    assert application["status"] == "submitted"
    assert application["data_origin"] == "synthetic"
    assert application["latest_offer"] is None
    assert application["participation_id"] is None

    # Student checks my applications & detail
    my_apps = client.get("/api/v1/me/applications").json()
    assert len(my_apps["items"]) == 1
    assert my_apps["items"][0]["id"] == application["id"]

    detail = client.get(f'/api/v1/applications/{application["id"]}').json()
    assert detail["observed_terms"]["id"] == terms["id"]

    # 2. PM views applications, starts review, shortlists
    actor(client, actors, "owner")
    proj_apps = client.get(f'/api/v1/projects/{project["id"]}/applications').json()
    assert len(proj_apps["items"]) == 1

    rev = post(client, f'/applications/{application["id"]}/start-review', {}, application["row_version"])
    assert rev.status_code == 200, rev.text
    assert rev.json()["status"] == "under_review"

    short = post(client, f'/applications/{application["id"]}/shortlist', {}, rev.json()["row_version"])
    assert short.status_code == 200, short.text
    assert short.json()["status"] == "shortlisted"

    # 3. PM issues offer
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    offer_res = post(
        client,
        f'/applications/{application["id"]}/offer',
        {"terms_version_id": terms["id"], "expires_at": expires_at},
        short.json()["row_version"],
    )
    assert offer_res.status_code == 201, offer_res.text
    offer = offer_res.json()
    assert offer["status"] == "offered"
    assert offer["terms_hash"] == terms["content_hash"]

    # 4. Student views offer
    actor(client, actors, "student1")
    my_offers = client.get("/api/v1/me/offers").json()
    assert len(my_offers["items"]) == 1
    assert my_offers["items"][0]["id"] == offer["id"]

    offer_detail = client.get(f'/api/v1/offers/{offer["id"]}').json()
    assert offer_detail["terms"]["id"] == terms["id"]
    assert offer_detail["consent_statement_version"] == CONSENT_VERSION
    assert offer_detail["consent_statement"] == CONSENT_TEXT

    # 5. Student accepts offer with exact terms and consent statement
    accept_res = post(
        client,
        f'/offers/{offer["id"]}/accept',
        {
            "terms_version_id": terms["id"],
            "terms_hash": terms["content_hash"],
            "consent_statement_version": CONSENT_VERSION,
            "explicitly_accepted": True,
        },
        offer["row_version"],
    )
    assert accept_res.status_code == 201, accept_res.text
    participation = accept_res.json()
    assert participation["status"] == "active"
    assert participation["offer_id"] == offer["id"]
    assert participation["terms_acceptance"]["terms_hash"] == terms["content_hash"]
    assert participation["terms_acceptance"]["consent_statement_version"] == CONSENT_VERSION

    # 6. Verify in database
    with sessions() as db:
        p_row = db.get(Participation, UUID(participation["id"]))
        assert p_row is not None
        assert p_row.status == "active"
        ta_row = db.scalar(select(TermsAcceptance).where(TermsAcceptance.participation_id == p_row.id))
        assert ta_row is not None
        assert ta_row.student_user_id == UUID(actors["student1"]["id"])
        off_row = db.get(Offer, UUID(offer["id"]))
        assert off_row.status == "accepted"

    # 7. Student checks my participations and detail
    my_parts = client.get("/api/v1/me/participations").json()
    assert len(my_parts["items"]) == 1
    assert my_parts["items"][0]["id"] == participation["id"]

    part_detail = client.get(f'/api/v1/participations/{participation["id"]}').json()
    assert part_detail["agreed_terms"]["id"] == terms["id"]

    # 8. PM checks project participations
    actor(client, actors, "owner")
    proj_parts = client.get(f'/api/v1/projects/{project["id"]}/participations').json()
    assert len(proj_parts["items"]) == 1

    # 9. Student withdraws participation
    actor(client, actors, "student1")
    withdrew = post(
        client,
        f'/participations/{participation["id"]}/withdraw',
        {"explanation": "Withdrawing due to exam schedule."},
        participation["row_version"],
    )
    assert withdrew.status_code == 200, withdrew.text
    assert withdrew.json()["status"] == "withdrawn"
    assert withdrew.json()["withdrawal_reason"] == "Withdrawing due to exam schedule."


def test_capacity_enforcement_and_overbooking_prevention(workflow):
    client, actors, _, _ = workflow
    _, project, terms = open_project(workflow, capacity=1)

    # Student 1 applies
    actor(client, actors, "student1")
    app1 = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"]).json()

    # Student 2 applies
    actor(client, actors, "student2")
    app2 = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"]).json()

    # PM issues offer to Student 1 (uses 1 capacity)
    actor(client, actors, "owner")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    offer1 = post(
        client,
        f'/applications/{app1["id"]}/offer',
        {"terms_version_id": terms["id"], "expires_at": expires_at},
        app1["row_version"],
    )
    assert offer1.status_code == 201

    # PM attempts to issue offer to Student 2 while capacity is 1 -> CAPACITY_EXCEEDED
    offer2 = post(
        client,
        f'/applications/{app2["id"]}/offer',
        {"terms_version_id": terms["id"], "expires_at": expires_at},
        app2["row_version"],
    )
    assert offer2.status_code == 409
    assert offer2.json()["error"]["code"] == "CAPACITY_EXCEEDED"

    # PM revokes offer 1
    revoked = post(
        client,
        f'/offers/{offer1.json()["id"]}/revoke',
        {"explanation": "Revoking offer to reallocate seat."},
        offer1.json()["row_version"],
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"

    # Now capacity is freed; PM issues offer to Student 2
    offer2_success = post(
        client,
        f'/applications/{app2["id"]}/offer',
        {"terms_version_id": terms["id"], "expires_at": expires_at},
        app2["row_version"],
    )
    assert offer2_success.status_code == 201


def test_duplicate_application_and_unauthorized_access(workflow):
    client, actors, _, _ = workflow
    _, project, terms = open_project(workflow, capacity=2)

    actor(client, actors, "student1")
    first = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"])
    assert first.status_code == 201

    # Duplicate application rejected
    dup = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"])
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "DUPLICATE_APPLICATION"

    # Outsider cannot view Student 1's application
    actor(client, actors, "outsider")
    assert client.get(f'/api/v1/applications/{first.json()["id"]}').status_code == 404
    assert client.get(f'/api/v1/projects/{project["id"]}/applications').status_code == 404

    # Outsider cannot start review or issue offer
    assert post(client, f'/applications/{first.json()["id"]}/start-review', {}, 1).status_code == 404


def test_expired_offer_and_declined_offer(workflow):
    client, actors, _, _ = workflow
    _, project, terms = open_project(workflow, capacity=2)

    actor(client, actors, "student1")
    app = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"]).json()

    actor(client, actors, "owner")
    # Expired timestamp (in the past) cannot be passed to create_offer
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    bad_create = post(client, f'/applications/{app["id"]}/offer', {"terms_version_id": terms["id"], "expires_at": past}, app["row_version"])
    assert bad_create.status_code == 422

    # Valid future expiry
    future = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    offer = post(client, f'/applications/{app["id"]}/offer', {"terms_version_id": terms["id"], "expires_at": future}, app["row_version"]).json()

    # Student declines offer
    actor(client, actors, "student1")
    decline = post(client, f'/offers/{offer["id"]}/decline', {"explanation": "Cannot take this project."}, offer["row_version"])
    assert decline.status_code == 200
    assert decline.json()["status"] == "declined"

    # Cannot accept declined offer
    accept = post(
        client,
        f'/offers/{offer["id"]}/accept',
        {
            "terms_version_id": terms["id"],
            "terms_hash": terms["content_hash"],
            "consent_statement_version": CONSENT_VERSION,
            "explicitly_accepted": True,
        },
        decline.json()["row_version"],
    )
    assert accept.status_code == 409
    assert accept.json()["error"]["code"] == "INVALID_STATE"


def test_application_withdrawal_revokes_live_offer(workflow):
    client, actors, _, _ = workflow
    _, project, terms = open_project(workflow, capacity=2)

    actor(client, actors, "student1")
    app = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"]).json()

    actor(client, actors, "owner")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    offer = post(client, f'/applications/{app["id"]}/offer', {"terms_version_id": terms["id"], "expires_at": expires_at}, app["row_version"]).json()

    # Student withdraws application
    actor(client, actors, "student1")
    withdrawn = post(client, f'/applications/{app["id"]}/withdraw', {"explanation": "Personal reasons."}, 2)
    assert withdrawn.status_code == 200
    assert withdrawn.json()["status"] == "withdrawn"

    # Offer was automatically revoked
    offer_detail = client.get(f'/api/v1/offers/{offer["id"]}').json()
    assert offer_detail["status"] == "revoked"


def load_migration_0003():
    path = Path(__file__).resolve().parents[2] / "alembic/versions/20261031_0003_supervisor_applications.py"
    spec = importlib.util.spec_from_file_location("supervisor_migration_0003", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_applications_migration_upgrade_downgrade_and_postgres_sql():
    from app.tests.test_supervisor_projects import load_migration as load_migration_0002

    migration_0002 = load_migration_0002()
    migration_0003 = load_migration_0003()
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        Base.metadata.create_all(connection, tables=[User.__table__, UserRoleGrant.__table__])
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration_0002.upgrade()
            migration_0003.upgrade()
            assert {"applications", "offers", "participations", "terms_acceptances"}.issubset(
                set(inspect(connection).get_table_names())
            )
            migration_0003.downgrade()
            assert not {"applications", "offers", "participations", "terms_acceptances"}.intersection(
                set(inspect(connection).get_table_names())
            )
    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        migration_0003.upgrade()
    assert "CREATE TABLE applications" in output.getvalue()
    assert "CREATE TABLE offers" in output.getvalue()
    assert "CREATE TABLE participations" in output.getvalue()
    assert "CREATE TABLE terms_acceptances" in output.getvalue()
    assert "DROP TABLE" not in output.getvalue()
    engine.dispose()
