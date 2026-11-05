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
from app.tests.auth_workflow_helpers import staging_workflow, register_actor, activate, ORIGIN


@pytest.fixture
def admin_workflow(staging_workflow):
    sessions, make_app = staging_workflow
    with TestClient(make_app(), base_url=ORIGIN) as client:
        actors = {name: register_actor(client, name) for name in ("admin", "student", "org_owner", "unauthorized_user")}
        with sessions() as db:
            db.add(UserRoleGrant(user_id=UUID(actors["admin"]["id"]), role="platform_admin", reason="Synthetic test administrator"))
            db.add(UserRoleGrant(user_id=UUID(actors["student"]["id"]), role="student", reason="Synthetic test student"))
            db.commit()
        yield client, actors, sessions


def set_actor(client: TestClient, actors: dict, name: str):
    activate(client, actors[name])


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


def test_cross_portal_project_and_mentor_synchronization(admin_workflow):
    client, actors, sessions = admin_workflow

    # 1. Org owner creates an organization
    set_actor(client, actors, "org_owner")
    org_res = client.post(
        "/api/v1/organizations",
        json={"display_name": "Animgow Studio", "description": "Creative design and engineering studio."},
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert org_res.status_code == 201, org_res.text
    org = org_res.json()

    # 2. Org owner creates a draft project
    proj_body = {
        "title": "Brand Design & Web Portal",
        "description": "Design an interactive portfolio site with accessible color contrast.",
        "capacity": 2,
        "org_reviewer_user_id": actors["org_owner"]["id"],
        "scope_in": "Responsive homepage and project showcase.",
        "scope_out": "No e-commerce checkout.",
        "estimated_minutes": 180,
        "start_on": "2026-11-15",
        "due_on": "2026-12-01",
        "milestones": [
            {
                "title": "Design System & Wireframes",
                "acceptance_criteria": ["Accessible typography", "WCAG 2.1 AA compliant"],
                "due_on": "2026-11-20",
            }
        ],
    }
    proj_res = client.post(
        f"/api/v1/organizations/{org['id']}/projects",
        json=proj_body,
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{org["row_version"]}"'},
    )
    assert proj_res.status_code == 201, proj_res.text
    project = proj_res.json()
    assert project["status"] == "draft"

    # 3. Moderation queue check: Draft MUST NOT appear in publication review queue
    set_actor(client, actors, "admin")
    queue_res = client.get("/api/v1/admin/projects/pending")
    assert queue_res.status_code == 200, queue_res.text
    pending_items = queue_res.json()["items"]
    assert not any(item["project"]["id"] == project["id"] for item in pending_items)

    # 4. Registry check: Draft DOES appear in admin's all-projects directory with organization metadata!
    all_res = client.get("/api/v1/admin/projects")
    assert all_res.status_code == 200, all_res.text
    all_items = all_res.json()["items"]
    found_item = next((item for item in all_items if item["project"]["id"] == project["id"]), None)
    assert found_item is not None
    assert found_item["project"]["status"] == "draft"
    assert found_item["organization_name"] == "Animgow Studio"
    assert found_item["terms"] is None

    # 5. Student public feed check: Draft is NOT discoverable by students
    set_actor(client, actors, "student")
    student_res = client.get("/api/v1/projects")
    assert student_res.status_code == 200, student_res.text
    student_items = student_res.json()["items"]
    assert not any(p["id"] == project["id"] for p in student_items)

    # 6. Org verification workflow: submit and verify
    set_actor(client, actors, "org_owner")
    submit_org_res = client.post(
        f"/api/v1/organizations/{org['id']}/submit-verification",
        json={},
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{org["row_version"]}"'},
    )
    assert submit_org_res.status_code == 200, submit_org_res.text
    org_updated = submit_org_res.json()

    set_actor(client, actors, "admin")
    verify_res = client.post(
        f"/api/v1/admin/organizations/{org['id']}/decisions",
        json={"decision": "verify", "explanation": "Legitimate enterprise entity verified via official registry."},
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{org_updated["row_version"]}"'},
    )
    assert verify_res.status_code == 200, verify_res.text

    # 7. Terms snapshot and submission for review
    set_actor(client, actors, "org_owner")
    terms_res = client.post(
        f"/api/v1/projects/{project['id']}/terms-versions",
        json={
            "fee_amount": "500.00",
            "payment_terms": "Fixed student compensation upon milestone completion.",
            "ip_ownership_terms": "Student retains portfolio display rights; org receives commercial license.",
            "confidentiality_terms": "Synthetic and non-confidential project assets only.",
            "mentor_plan": "Bi-weekly review and guidance by assigned technical mentor.",
        },
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{project["row_version"]}"'},
    )
    assert terms_res.status_code == 201, terms_res.text
    terms = terms_res.json()

    submit_review_res = client.post(
        f"/api/v1/projects/{project['id']}/submit-review",
        json={"terms_version_id": terms["id"]},
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{project["row_version"] + 1}"'},
    )
    assert submit_review_res.status_code == 200, submit_review_res.text
    submitted_proj = submit_review_res.json()
    assert submitted_proj["status"] == "pending_review"

    # 8. Admin moderation queue now contains the project with complete terms snapshot
    set_actor(client, actors, "admin")
    queue_res2 = client.get("/api/v1/admin/projects/pending")
    assert queue_res2.status_code == 200
    pending_items2 = queue_res2.json()["items"]
    moderation_item = next((item for item in pending_items2 if item["project"]["id"] == project["id"]), None)
    assert moderation_item is not None
    assert moderation_item["organization_name"] == "Animgow Studio"
    assert moderation_item["terms"] is not None
    assert moderation_item["terms"]["id"] == terms["id"]

    # 9. Admin approves and publishes the project
    decision_res = client.post(
        f"/api/v1/admin/projects/{project['id']}/decisions",
        json={
            "decision": "approve",
            "explanation": "Compensation, IP terms, and student safeguarding policies fully approved.",
            "terms_version_id": terms["id"],
            "snapshot_hash": terms["content_hash"],
        },
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{submitted_proj["row_version"]}"'},
    )
    assert decision_res.status_code == 200, decision_res.text
    published_proj = decision_res.json()
    assert published_proj["status"] == "open"

    # 10. Student now discovers the published project
    set_actor(client, actors, "student")
    student_res2 = client.get("/api/v1/projects")
    assert student_res2.status_code == 200
    student_items2 = student_res2.json()["items"]
    discovered = next((p for p in student_items2 if p["id"] == project["id"]), None)
    assert discovered is not None
    assert discovered["title"] == "Brand Design & Web Portal"

    # 11. Mentor eligibility lifecycle: Create profile -> Admin vet -> Approved
    set_actor(client, actors, "unauthorized_user")
    mentor_res = client.put(
        "/api/v1/me/mentor-profile",
        json={
            "bio": "Senior UX Engineer specializing in accessible design systems.",
            "skills": ["UI/UX", "Figma", "Design Systems"],
            "availability_text": "5 hours per week for code and design review",
            "weekly_review_capacity": 3,
            "directory_opt_in": True,
        },
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert mentor_res.status_code in (200, 201), mentor_res.text
    mentor_profile = mentor_res.json()
    assert mentor_profile["eligibility_status"] == "pending"

    # Admin inspects mentor queue
    set_actor(client, actors, "admin")
    mentors_queue = client.get("/api/v1/admin/mentors")
    assert mentors_queue.status_code == 200
    assert any(m["user_id"] == actors["unauthorized_user"]["id"] for m in mentors_queue.json()["items"])

    # Admin approves mentor
    mentor_decide_res = client.post(
        f"/api/v1/admin/mentors/{actors['unauthorized_user']['id']}/eligibility",
        json={"decision": "approve", "explanation": "Verified professional portfolio and design background."},
        headers={"Idempotency-Key": str(uuid.uuid4()), "If-Match": f'"{mentor_profile["row_version"]}"'},
    )
    assert mentor_decide_res.status_code == 200, mentor_decide_res.text
    assert mentor_decide_res.json()["eligibility_status"] == "approved"

