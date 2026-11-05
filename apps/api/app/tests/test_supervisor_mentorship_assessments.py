"""Checkpoints 3 and 4: mentorship, milestone submissions, independent evaluations, and completion."""

import importlib.util
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, select
from sqlalchemy.orm import sessionmaker

from app.applications.models import Participation
from app.applications.schemas import CONSENT_VERSION
from app.assessments.models import Artifact, MentorReview, OrganizationReview, Submission
from app.database.base import Base
from app.database.session import get_db
from app.identity.models import User, UserRoleGrant
from app.main import create_app
from app.mentorship.models import MentorAssignment, MentorProfile
from app.projects.models import Project
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _make_clerk_settings, _mint_jwt
from app.tests.test_supervisor_applications import application_body, open_project
from app.tests.test_supervisor_projects import actor, post


@pytest.fixture
def workflow(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'workflow_mentorship.db'}", connect_args={"check_same_thread": False})

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
        for name in ("owner", "reviewer", "admin", "student", "mentor", "outsider"):
            token = _mint_jwt(sub=f"user_cp3_{name}")
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


def setup_active_participation(workflow):
    client, actors, _, _ = workflow
    org, project, terms = open_project(workflow, capacity=1)

    # Student applies
    actor(client, actors, "student")
    app = post(client, f'/projects/{project["id"]}/applications', application_body(terms["id"]), project["row_version"]).json()

    # PM issues offer
    actor(client, actors, "owner")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    offer = post(client, f'/applications/{app["id"]}/offer', {"terms_version_id": terms["id"], "expires_at": expires_at}, app["row_version"]).json()

    # Student accepts offer -> active participation
    actor(client, actors, "student")
    part = post(
        client,
        f'/offers/{offer["id"]}/accept',
        {
            "terms_version_id": terms["id"],
            "terms_hash": terms["content_hash"],
            "consent_statement_version": CONSENT_VERSION,
            "explicitly_accepted": True,
        },
        offer["row_version"],
    ).json()

    return org, project, terms, part


def setup_approved_mentor(workflow):
    client, actors, _, _ = workflow
    actor(client, actors, "mentor")
    profile = client.put(
        "/api/v1/me/mentor-profile",
        json={
            "bio": "Experienced technical mentor with industry background.",
            "skills": ["Python", "FastAPI", "Mentoring"],
            "availability_text": "5 hours per week",
            "weekly_review_capacity": 4,
            "directory_opt_in": True,
        },
    ).json()
    # Admin approves mentor
    actor(client, actors, "admin")
    approved = post(
        client,
        f'/admin/mentors/{actors["mentor"]["id"]}/eligibility',
        {"decision": "approve", "explanation": "Synthetic mentor vetted."},
        profile["row_version"],
    ).json()
    assert approved["eligibility_status"] == "approved"
    return approved


@pytest.mark.parametrize("scenario", ["complete", "newer_revision", "partial"])
def test_full_mentorship_submission_review_and_completion_lifecycle(workflow, scenario):
    client, actors, sessions, _ = workflow
    org, project, terms, part = setup_active_participation(workflow)
    setup_approved_mentor(workflow)

    # 1. PM cannot start project without accepted mentor
    actor(client, actors, "owner")
    start_fail = post(client, f'/projects/{project["id"]}/start', {}, project["row_version"])
    assert start_fail.status_code == 409
    assert start_fail.json()["error"]["code"] == "MENTOR_REQUIRED"

    # 2. PM proposes mentor assignment
    expires_at = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    assignment_res = post(
        client,
        f'/participations/{part["id"]}/mentor-assignments',
        {
            "mentor_user_id": actors["mentor"]["id"],
            "context": "Supervising frontend milestone deliverable.",
            "expires_at": expires_at,
        },
        part["row_version"],
    )
    assert assignment_res.status_code == 201, assignment_res.text
    assignment = assignment_res.json()
    assert assignment["status"] == "proposed"

    # 3. Mentor accepts assignment
    actor(client, actors, "mentor")
    accept_assign = post(
        client,
        f'/mentor-assignments/{assignment["id"]}/accept',
        {"conflict_declared": False, "confidentiality_acknowledged": True},
        assignment["row_version"],
    )
    assert accept_assign.status_code == 200, accept_assign.text
    assert accept_assign.json()["status"] == "accepted"

    assert client.get(f'/api/v1/participations/{part["id"]}').status_code == 200
    actor(client, actors, "outsider")
    assert client.get(f'/api/v1/participations/{part["id"]}').status_code == 404

    # 4. PM starts project -> in_progress
    actor(client, actors, "owner")
    started = post(client, f'/projects/{project["id"]}/start', {}, project["row_version"])
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "in_progress"

    # 5. Student creates draft submission
    actor(client, actors, "student")
    part = client.get(f'/api/v1/participations/{part["id"]}').json()
    early_ready = post(client, f'/participations/{part["id"]}/mark-ready-for-review',
        {"requested_outcome": "completed", "explanation": "Synthetic premature completion request."}, part["row_version"])
    assert early_ready.status_code == 409
    assert early_ready.json()["error"]["code"] == "COMPLETION_BLOCKED"
    assert client.get(f'/api/v1/participations/{part["id"]}').json()["status"] == "active"
    sub_res = post(
        client,
        f'/participations/{part["id"]}/submissions',
        {
            "milestone_index": 0,
            "summary": "Completed responsive layout and keyboard accessibility.",
            "contribution_statement": "Designed and coded the entire semantic HTML and CSS structure.",
        },
        part["row_version"],
    )
    assert sub_res.status_code == 201, sub_res.text
    submission = sub_res.json()
    assert submission["status"] == "draft"

    # 6. Student cannot submit without an artifact
    empty_submit = post(client, f'/submissions/{submission["id"]}/submit', {}, submission["row_version"])
    assert empty_submit.status_code == 422

    # 7. Student attaches external artifact and submits
    art_res = post(
        client,
        f'/submissions/{submission["id"]}/external-artifacts',
        {
            "kind": "external_url",
            "label": "Deployed preview site",
            "url": "https://example.com/demo-preview",
        },
    )
    assert art_res.status_code == 201, art_res.text

    submitted = post(client, f'/submissions/{submission["id"]}/submit', {}, submission["row_version"])
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "submitted"
    assert len(submitted.json()["artifacts"]) == 1

    # 8. Org reviewer cannot accept before mentor review
    actor(client, actors, "owner")  # owner is also org reviewer in fixture
    early_org_rev = post(
        client,
        f'/submissions/{submission["id"]}/organization-reviews',
        {
            "decision": "accepted",
            "criteria_results": [{"criterion_text": "Keyboard navigation", "met": True, "explanation": "Passes Tab order."}],
            "explanation": "Deliverable matches requirements.",
        },
        submitted.json()["row_version"],
    )
    assert early_org_rev.status_code == 409
    assert early_org_rev.json()["error"]["code"] == "INVALID_STATE"

    # 9. Mentor reviews submission
    actor(client, actors, "mentor")
    m_rev = post(
        client,
        f'/submissions/{submission["id"]}/mentor-reviews',
        {
            "decision": "reviewed",
            "observations": [{"criterion_text": "Code cleanliness", "score": 5, "observation": "Semantic structure followed."}],
            "participant_feedback": "Great focus on WCAG 2.1 compliance and clear separation of concerns.",
            "manager_summary": "Deliverable satisfies core architectural standards.",
        },
        submitted.json()["row_version"],
    )
    assert m_rev.status_code == 201, m_rev.text
    assert m_rev.json()["decision"] == "reviewed"

    # 10. Organization reviewer reviews and accepts deliverable
    actor(client, actors, "owner")
    sub_refreshed = client.get(f'/api/v1/submissions/{submission["id"]}').json()
    o_rev = post(
        client,
        f'/submissions/{submission["id"]}/organization-reviews',
        {
            "decision": "accepted",
            "criteria_results": [{"criterion_text": "Keyboard navigation", "met": True, "explanation": "Tab order validated."}],
            "explanation": "Deliverable accepted for project completion.",
        },
        sub_refreshed["row_version"],
    )
    assert o_rev.status_code == 201, o_rev.text
    assert o_rev.json()["decision"] == "accepted"

    outcome = "partially_completed" if scenario == "partial" else "completed"
    # 11. Student marks ready for review
    actor(client, actors, "student")
    part = client.get(f'/api/v1/participations/{part["id"]}').json()
    if scenario == "newer_revision":
        revision = post(client, f'/participations/{part["id"]}/submissions', {
            "milestone_index": 0, "summary": "Synthetic new unfinished revision of deliverable.",
            "contribution_statement": "Synthetic new work not independently reviewed yet.",
        }, part["row_version"])
        assert revision.status_code == 201
        assert revision.json()["revision_no"] == 2
        blocked = post(client, f'/participations/{part["id"]}/mark-ready-for-review', {
            "requested_outcome": "completed", "explanation": "Synthetic completion with an unfinished revision.",
        }, part["row_version"])
        assert blocked.status_code == 409
        assert blocked.json()["error"]["code"] == "COMPLETION_BLOCKED"
        return
    ready = post(
        client,
        f'/participations/{part["id"]}/mark-ready-for-review',
        {"requested_outcome": outcome, "explanation": "Synthetic completion outcome requested by the student."},
        part["row_version"],
    )
    assert ready.status_code == 200, ready.text
    assert ready.json()["status"] == "under_review"

    # 12. PM finalizes participation
    actor(client, actors, "owner")
    finalized = post(
        client,
        f'/participations/{part["id"]}/finalize',
        {"outcome": outcome, "explanation": "Synthetic participation outcome recorded by the manager."},
        ready.json()["row_version"],
    )
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["status"] == outcome

    # 13. PM completes project
    proj_completed = post(
        client,
        f'/projects/{project["id"]}/complete',
        {"explanation": "Project deliverables fulfilled and verified."},
        started.json()["row_version"],
    )
    if scenario == "partial":
        assert proj_completed.status_code == 409
        assert proj_completed.json()["error"]["code"] == "COMPLETION_BLOCKED"
        with sessions() as db:
            assert db.get(Participation, UUID(part["id"])).status == "partially_completed"
        return
    assert proj_completed.status_code == 200, proj_completed.text
    assert proj_completed.json()["status"] == "completed"

    # Verify final states in DB
    with sessions() as db:
        p = db.get(Project, UUID(project["id"]))
        assert p.status == "completed"
        part_row = db.get(Participation, UUID(part["id"]))
        assert part_row.status == "completed"
        assert len(db.scalars(select(MentorReview)).all()) == 1
        assert len(db.scalars(select(OrganizationReview)).all()) == 1


def test_mentor_conflict_check_rejects_org_member(workflow):
    client, actors, _, _ = workflow
    org, project, _, part = setup_active_participation(workflow)

    # Attempt to assign the organization owner as mentor -> FORBIDDEN (403)
    actor(client, actors, "owner")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    assign_conflict = post(
        client,
        f'/participations/{part["id"]}/mentor-assignments',
        {
            "mentor_user_id": actors["owner"]["id"],
            "context": "Cannot mentor own organization project.",
            "expires_at": expires_at,
        },
        part["row_version"],
    )
    assert assign_conflict.status_code == 403


def load_migration_0004():
    path = Path(__file__).resolve().parents[2] / "alembic/versions/20261031_0004_supervisor_mentorship_assessments.py"
    spec = importlib.util.spec_from_file_location("supervisor_migration_0004", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_mentorship_assessments_migration_upgrade_downgrade_and_postgres_sql():
    from app.tests.test_supervisor_applications import load_migration_0003
    from app.tests.test_supervisor_projects import load_migration as load_migration_0002

    migration_0002 = load_migration_0002()
    migration_0003 = load_migration_0003()
    migration_0004 = load_migration_0004()

    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        Base.metadata.create_all(connection, tables=[User.__table__, UserRoleGrant.__table__])
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration_0002.upgrade()
            migration_0003.upgrade()
            migration_0004.upgrade()
            expected = {"mentor_profiles", "mentor_assignments", "submissions", "artifacts", "mentor_reviews", "organization_reviews"}
            assert expected.issubset(set(inspect(connection).get_table_names()))
            migration_0004.downgrade()
            assert not expected.intersection(set(inspect(connection).get_table_names()))

    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        migration_0004.upgrade()
    assert "CREATE TABLE mentor_profiles" in output.getvalue()
    assert "CREATE TABLE mentor_assignments" in output.getvalue()
    assert "CREATE TABLE submissions" in output.getvalue()
    assert "CREATE TABLE artifacts" in output.getvalue()
    assert "CREATE TABLE mentor_reviews" in output.getvalue()
    assert "CREATE TABLE organization_reviews" in output.getvalue()
    assert "DROP TABLE" not in output.getvalue()
    engine.dispose()


def test_mentor_directory_eligibility_and_assignment_recovery(workflow):
    client, actors, sessions, _ = workflow
    org, project, terms, part = setup_active_participation(workflow)
    actor(client, actors, "admin")
    missing = post(client, f'/admin/mentors/{actors["mentor"]["id"]}/eligibility',
        {"decision": "approve", "explanation": "Synthetic profile must exist before review."}, 1)
    assert missing.status_code == 404
    profile = setup_approved_mentor(workflow)
    assert any(p["id"] == profile["id"] for p in client.get("/api/v1/admin/mentors").json()["items"])
    actor(client, actors, "outsider")
    assert client.get("/api/v1/admin/mentors").status_code == 403
    assert client.get(f'/api/v1/organizations/{org["id"]}/mentors').status_code in (403, 404)
    assert client.get(f'/api/v1/participations/{part["id"]}/mentor-assignments').status_code in (403, 404)
    actor(client, actors, "owner")
    directory = client.get(f'/api/v1/organizations/{org["id"]}/mentors')
    assert directory.status_code == 200
    assert [p["user_id"] for p in directory.json()["items"]] == [actors["mentor"]["id"]]
    body = {"mentor_user_id": actors["mentor"]["id"], "context": "Synthetic independent milestone mentoring.",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()}
    assignment = post(client, f'/participations/{part["id"]}/mentor-assignments', body, part["row_version"])
    assert assignment.status_code == 201
    duplicate = post(client, f'/participations/{part["id"]}/mentor-assignments', body, part["row_version"])
    assert duplicate.status_code == 409
    with sessions() as db:
        row = db.get(MentorAssignment, UUID(assignment.json()["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    replacement = post(client, f'/participations/{part["id"]}/mentor-assignments', body, part["row_version"])
    assert replacement.status_code == 201, replacement.text
    actor(client, actors, "student")
    assignments = client.get(f'/api/v1/participations/{part["id"]}/mentor-assignments')
    assert {a["status"] for a in assignments.json()["items"]} == {"proposed", "expired"}
    actor(client, actors, "admin")
    suspended = post(client, f'/admin/mentors/{actors["mentor"]["id"]}/eligibility',
        {"decision": "suspend", "explanation": "Synthetic eligibility recheck test."}, profile["row_version"])
    assert suspended.status_code == 200
    actor(client, actors, "mentor")
    blocked = post(client, f'/mentor-assignments/{replacement.json()["id"]}/accept',
        {"conflict_declared": False, "confidentiality_acknowledged": True}, replacement.json()["row_version"])
    assert blocked.status_code == 403
    actor(client, actors, "owner")
    assert client.get(f'/api/v1/organizations/{org["id"]}/mentors').json()["items"] == []
    from app.organizations.models import OrganizationMembership
    with sessions() as db:
        membership = db.scalar(select(OrganizationMembership).where(OrganizationMembership.organization_id == UUID(org["id"]), OrganizationMembership.user_id == UUID(actors["owner"]["id"])))
        membership.status = "removed"
        db.commit()
    assert client.get(f'/api/v1/participations/{part["id"]}').status_code == 404
    assert client.get(f'/api/v1/mentor-assignments/{replacement.json()["id"]}').status_code in (403, 404)


def test_review_criteria_accept_the_same_length_as_project_milestones():
    from app.assessments.schemas import MentorObservation, OrganizationCriterionResult
    criterion = "Synthetic criterion " + "x" * 950
    assert MentorObservation(criterion_text=criterion, observation="Synthetic observation").criterion_text == criterion
    assert OrganizationCriterionResult(criterion_text=criterion, met=True, explanation="Synthetic acceptance").criterion_text == criterion
