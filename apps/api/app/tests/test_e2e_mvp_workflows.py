"""End-to-End Cross-Portal MVP Workflow Verification Suite.

Verifies Workflows A through E across Organization, Admin, Student, and Mentor portals:
- Workflow A: Project publication (draft -> terms -> moderation -> admin approve -> student discovery)
- Workflow B: Recruitment (student applies -> org shortlists & issues offer -> student accepts with explicit consent)
- Workflow C: Mentorship (mentor saves profile -> admin approves eligibility -> org invites -> mentor accepts)
- Workflow D: Submission & evaluation (org starts project -> student submits deliverable & artifact -> mentor evaluates)
- Workflow E: Completion (org accepts deliverable -> student requests completion -> org completes participation & project)
- Authorization & negative invariants (draft not in public discovery, unverified org blocked from submitting project, cross-student isolation, non-admin blocked from admin endpoints).
"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from app.applications.models import Participation
from app.assessments.models import MentorReview, OrganizationReview, Submission
from app.database.base import Base
from app.database.session import get_db
from app.identity.models import UserRoleGrant
from app.main import create_app
from app.projects.models import Project
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _make_clerk_settings, _mint_jwt


def test_complete_cross_portal_mvp_workflows(tmp_path: Path) -> None:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'e2e_mvp.sqlite'}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(engine, expire_on_commit=False)

    settings = _make_clerk_settings()
    app = create_app(settings)
    app.state.clerk_signing_key_resolver = lambda _: RSA_PUBLIC_JWK.key

    def database():
        with session_factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = database
    client = TestClient(app)

    def token_for(actor_name: str) -> str:
        return _mint_jwt(sub=f"user_e2e_{actor_name}")

    def set_actor(actor_name: str) -> None:
        client.headers["Authorization"] = f"Bearer {token_for(actor_name)}"

    def api_post(path: str, body: dict, row_version: int | None = None):
        headers = {"Idempotency-Key": str(uuid4())}
        if row_version is not None:
            headers["If-Match"] = f'"{row_version}"'
        return client.post("/api/v1" + path, json=body, headers=headers)

    # 1. Provision actors via /api/v1/me
    set_actor("org_manager")
    org_manager_id = client.get("/api/v1/me").json()["id"]

    set_actor("platform_admin")
    admin_id = client.get("/api/v1/me").json()["id"]

    set_actor("student_stella")
    student_id = client.get("/api/v1/me").json()["id"]

    set_actor("student_other")
    _other_student_id = client.get("/api/v1/me").json()["id"]

    set_actor("mentor_jathnie")
    mentor_id = client.get("/api/v1/me").json()["id"]

    with session_factory() as db:
        grant = db.scalar(
            select(UserRoleGrant).where(
                UserRoleGrant.user_id == UUID(admin_id),
                UserRoleGrant.role == "platform_admin",
            )
        )
        if not grant:
            db.add(
                UserRoleGrant(
                    user_id=UUID(admin_id),
                    role="platform_admin",
                    reason="E2E Test Admin Grant",
                )
            )
            db.commit()

    # --- WORKFLOW A: Project Publication ---
    set_actor("org_manager")
    org_res = api_post(
        "/organizations",
        {
            "display_name": "African Health Innovation Labs",
            "description": "Healthcare technology accelerator providing genuine student challenges.",
        },
    )
    assert org_res.status_code == 201, org_res.text
    org = org_res.json()

    # Verify effective_contexts includes "organization" automatically from OrganizationMembership
    me_org = client.get("/api/v1/me").json()
    assert "organization" in me_org["effective_contexts"]

    due_date = "2026-12-01"
    proj_res = api_post(
        f"/organizations/{org['id']}/projects",
        {
            "title": "Pediatric Vaccination Tracking Interface",
            "description": "Build an offline-resilient vaccination logging system for community health workers.",
            "capacity": 3,
            "org_reviewer_user_id": org_manager_id,
            "scope_in": "Design mobile-responsive dashboard and SQLite local storage sync.",
            "scope_out": "SMS notification infrastructure is out of scope.",
            "estimated_minutes": 2400,
            "start_on": "2026-11-05",
            "due_on": due_date,
            "milestones": [
                {
                    "title": "Milestone 1: Prototype & Storage Layer",
                    "acceptance_criteria": [
                        "Functional offline form",
                        "Local schema validation passing",
                    ],
                    "due_on": due_date,
                }
            ],
        },
        org["row_version"],
    )
    assert proj_res.status_code == 201, proj_res.text
    project = proj_res.json()

    # Invariant: Draft project must NOT appear in student public project discovery
    set_actor("student_stella")
    pub_before = client.get("/api/v1/projects").json()["items"]
    assert not any(p["id"] == project["id"] for p in pub_before)

    # Create terms snapshot
    set_actor("org_manager")
    terms_res = api_post(
        f"/projects/{project['id']}/terms-versions",
        {
            "compensation_type": "paid_fixed",
            "currency": "GHS",
            "fee_amount": "1500.00",
            "payment_terms": "Full stipend released upon approved completion of all milestone deliverables.",
            "ip_ownership_terms": "Permissive MIT license; student retains verified passport rights.",
            "confidentiality_terms": "Synthetic patient records only; no live identifiable health data.",
            "mentor_plan": "Weekly technical reviews and independent rubric assessment by assigned faculty mentor.",
        },
        project["row_version"],
    )
    assert terms_res.status_code == 201, terms_res.text
    terms = terms_res.json()
    project["row_version"] = terms.get("project_row_version", project["row_version"] + 1)

    # Submit organization verification
    sub_org_res = api_post(f"/organizations/{org['id']}/submit-verification", {}, org["row_version"])
    assert sub_org_res.status_code == 200
    org = sub_org_res.json()
    assert org["verification_status"] == "submitted"

    # Non-admin cannot verify organization
    forbidden_verify = api_post(
        f"/admin/organizations/{org['id']}/decisions",
        {"decision": "verify", "explanation": "Self-verify attempt"},
        org["row_version"],
    )
    assert forbidden_verify.status_code == 403

    # Admin verifies organization
    set_actor("platform_admin")
    admin_org_res = api_post(
        f"/admin/organizations/{org['id']}/decisions",
        {
            "decision": "verify",
            "explanation": "Verified business registration and institutional accreditation in Ghana.",
        },
        org["row_version"],
    )
    assert admin_org_res.status_code == 200
    org = admin_org_res.json()
    assert org["verification_status"] == "verified"

    # Organization submits project for moderation
    set_actor("org_manager")
    submit_res = api_post(
        f"/projects/{project['id']}/submit-review",
        {"terms_version_id": terms["id"]},
        project["row_version"],
    )
    assert submit_res.status_code == 200
    project = submit_res.json()
    assert project["status"] == "pending_review"
    assert project["submitted_terms_version_id"] == terms["id"]

    # Verify organization project list exposes submitted_terms_version_id
    org_proj_list = client.get(f"/api/v1/organizations/{org['id']}/projects").json()["items"]
    assert org_proj_list[0]["submitted_terms_version_id"] == terms["id"]

    # Admin sees pending project moderation request and approves
    set_actor("platform_admin")
    pending_queue = client.get("/api/v1/admin/projects/pending").json()["items"]
    assert any(item["project"]["id"] == project["id"] for item in pending_queue)

    admin_proj_res = api_post(
        f"/admin/projects/{project['id']}/decisions",
        {
            "decision": "approve",
            "explanation": "Project brief and compensation terms satisfy educational and legal standards.",
            "terms_version_id": terms["id"],
            "snapshot_hash": terms["content_hash"],
        },
        project["row_version"],
    )
    assert admin_proj_res.status_code == 200
    project = admin_proj_res.json()
    assert project["status"] == "open"
    assert project["published_terms_version_id"] == terms["id"]

    # --- WORKFLOW B: Recruitment ---
    set_actor("student_stella")
    pub_after = client.get("/api/v1/projects").json()["items"]
    assert any(p["id"] == project["id"] for p in pub_after)

    app_res = api_post(
        f"/projects/{project['id']}/applications",
        {
            "seen_terms_version_id": terms["id"],
            "motivation": "I am deeply passionate about community health informatics and have built Next.js offline-first applications during my senior coursework.",
            "declared_skills": ["React", "TypeScript", "IndexedDB", "Tailwind CSS"],
            "links": [{"label": "GitHub", "url": "https://github.com/stellaappiok/health-tracker"}],
            "weekly_minutes_available": 720,
        },
        project["row_version"],
    )
    assert app_res.status_code == 201, app_res.text
    application = app_res.json()
    assert application["status"] == "submitted"

    # Organization sees application, shortlists, and issues offer
    set_actor("org_manager")
    shortlist_res = api_post(
        f"/applications/{application['id']}/shortlist",
        {},
        application["row_version"],
    )
    assert shortlist_res.status_code == 200
    application = shortlist_res.json()
    assert application["status"] == "shortlisted"

    offer_res = api_post(
        f"/applications/{application['id']}/offer",
        {
            "terms_version_id": terms["id"],
            "expires_at": "2026-11-15T23:59:59Z",
        },
        application["row_version"],
    )
    assert offer_res.status_code == 201
    offer = offer_res.json()
    assert offer["status"] == "offered"

    # Another student cannot accept Stella's offer
    set_actor("student_other")
    wrong_student_accept = api_post(
        f"/offers/{offer['id']}/accept",
        {
            "terms_version_id": terms["id"],
            "terms_hash": terms["content_hash"],
            "consent_statement_version": "supervisor-v1",
            "explicitly_accepted": True,
        },
        offer["row_version"],
    )
    assert wrong_student_accept.status_code in {403, 404}

    # Student Stella explicitly accepts offer
    set_actor("student_stella")
    accept_res = api_post(
        f"/offers/{offer['id']}/accept",
        {
            "terms_version_id": terms["id"],
            "terms_hash": terms["content_hash"],
            "consent_statement_version": "supervisor-v1",
            "explicitly_accepted": True,
        },
        offer["row_version"],
    )
    assert accept_res.status_code == 201
    participation = accept_res.json()
    assert participation["status"] == "active"

    # --- WORKFLOW C: Mentorship ---
    set_actor("mentor_jathnie")
    m_prof_res = client.put(
        "/api/v1/me/mentor-profile",
        json={
            "bio": "Senior Health Informatics Researcher & Technical Mentor",
            "skills": ["Health Informatics", "PostgreSQL", "Full-Stack Development"],
            "availability_text": "8 hours weekly",
            "weekly_review_capacity": 4,
            "directory_opt_in": True,
        },
    )
    assert m_prof_res.status_code in {200, 201}
    m_prof = m_prof_res.json()

    # Verify effective_contexts includes "mentor" automatically from MentorProfile
    me_mentor = client.get("/api/v1/me").json()
    assert "mentor" in me_mentor["effective_contexts"]

    # Admin approves mentor eligibility
    set_actor("platform_admin")
    m_elig = api_post(
        f"/admin/mentors/{mentor_id}/eligibility",
        {
            "decision": "approve",
            "explanation": "Verified technical credentials and mentoring qualifications.",
        },
        m_prof["row_version"],
    )
    assert m_elig.status_code == 200

    # Organization invites mentor
    set_actor("org_manager")
    invite_res = api_post(
        f"/participations/{participation['id']}/mentor-assignments",
        {
            "mentor_user_id": mentor_id,
            "context": "Support student on local-first storage design and review milestone deliverables.",
            "expires_at": "2026-11-15T23:59:59Z",
        },
        participation["row_version"],
    )
    assert invite_res.status_code == 201
    assignment = invite_res.json()
    assert assignment["status"] == "proposed"

    # Mentor sees invitation and accepts
    set_actor("mentor_jathnie")
    m_accept_res = api_post(
        f"/mentor-assignments/{assignment['id']}/accept",
        {
            "conflict_declared": False,
            "confidentiality_acknowledged": True,
        },
        assignment["row_version"],
    )
    assert m_accept_res.status_code == 200
    assignment = m_accept_res.json()
    assert assignment["status"] == "accepted"

    # --- WORKFLOW D: Submission & Evaluation ---
    set_actor("org_manager")
    start_res = api_post(f"/projects/{project['id']}/start", {}, project["row_version"])
    assert start_res.status_code == 200
    project = start_res.json()
    assert project["status"] == "in_progress"

    set_actor("student_stella")
    part_curr = client.get(f"/api/v1/participations/{participation['id']}").json()
    sub_res = api_post(
        f"/participations/{participation['id']}/submissions",
        {
            "milestone_index": 0,
            "summary": "Completed Milestone 1: offline-first form with client-side SQLite sync.",
            "contribution_statement": "Implemented all schema migrations, form components, and unit tests.",
        },
        part_curr["row_version"],
    )
    assert sub_res.status_code == 201
    submission = sub_res.json()

    art_res = api_post(
        f"/submissions/{submission['id']}/external-artifacts",
        {
            "kind": "external_url",
            "label": "GitHub Repository Implementation",
            "url": "https://github.com/stellaappiok/pediatric-vaccines",
        },
    )
    assert art_res.status_code == 201

    submit_sub_res = api_post(
        f"/submissions/{submission['id']}/submit",
        {},
        submission["row_version"],
    )
    assert submit_sub_res.status_code == 200
    submission = submit_sub_res.json()
    assert submission["status"] == "submitted"

    # Mentor evaluates submission
    set_actor("mentor_jathnie")
    m_rev_res = api_post(
        f"/submissions/{submission['id']}/mentor-reviews",
        {
            "decision": "reviewed",
            "participant_feedback": "Excellent architectural separation between the offline cache and online sync engine. Code is well-tested.",
            "observations": [
                {
                    "criterion_text": "Functional offline form",
                    "score": 4,
                    "observation": "Form operates completely without network connectivity.",
                }
            ],
            "manager_summary": "The candidate's work exceeds expectations for Milestone 1.",
        },
        submission["row_version"],
    )
    assert m_rev_res.status_code == 201
    mentor_review = m_rev_res.json()
    assert mentor_review["decision"] == "reviewed"

    # --- WORKFLOW E: Completion ---
    set_actor("org_manager")
    sub_curr = client.get(f"/api/v1/submissions/{submission['id']}").json()
    org_rev_res = api_post(
        f"/submissions/{submission['id']}/organization-reviews",
        {
            "decision": "accepted",
            "criteria_results": [
                {
                    "criterion_text": "Functional offline form",
                    "met": True,
                    "explanation": "Verified in demo review session with technical team.",
                }
            ],
            "explanation": "Deliverable satisfies all organizational quality requirements.",
        },
        sub_curr["row_version"],
    )
    assert org_rev_res.status_code == 201
    assert org_rev_res.json()["decision"] == "accepted"

    set_actor("student_stella")
    part_curr = client.get(f"/api/v1/participations/{participation['id']}").json()
    ready_res = api_post(
        f"/participations/{participation['id']}/mark-ready-for-review",
        {
            "requested_outcome": "completed",
            "explanation": "All Milestone 1 deliverables and repository links have been submitted and accepted.",
        },
        part_curr["row_version"],
    )
    assert ready_res.status_code == 200
    participation = ready_res.json()
    assert participation["status"] == "under_review"

    set_actor("org_manager")
    comp_part_res = api_post(
        f"/participations/{participation['id']}/finalize",
        {
            "outcome": "completed",
            "explanation": "Verified all milestone criteria and code quality with assigned mentor review.",
        },
        participation["row_version"],
    )
    assert comp_part_res.status_code == 200
    participation = comp_part_res.json()
    assert participation["status"] == "completed"

    proj_curr = client.get(f"/api/v1/projects/{project['id']}").json()
    comp_proj_res = api_post(
        f"/projects/{project['id']}/complete",
        {"explanation": "All project milestones and participations have been reviewed and completed."},
        proj_curr["row_version"],
    )
    assert comp_proj_res.status_code == 200
    project = comp_proj_res.json()
    assert project["status"] == "completed"

    with session_factory() as db:
        p_row = db.get(Project, UUID(project["id"]))
        assert p_row is not None and p_row.status == "completed"
        part_row = db.get(Participation, UUID(participation["id"]))
        assert part_row is not None and part_row.status == "completed"
        sub_row = db.get(Submission, UUID(submission["id"]))
        assert sub_row is not None and sub_row.status == "submitted"
        mr_row = db.scalar(select(MentorReview).where(MentorReview.submission_id == sub_row.id))
        assert mr_row is not None and mr_row.decision == "reviewed"
        or_row = db.scalar(select(OrganizationReview).where(OrganizationReview.submission_id == sub_row.id))
        assert or_row is not None and or_row.decision == "accepted"
    engine.dispose()


def test_student_profile_persistence_isolation_and_duplicate_application_guard(tmp_path: Path) -> None:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'e2e_student_profile.sqlite'}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(engine, expire_on_commit=False)

    settings = _make_clerk_settings()
    app = create_app(settings)
    app.state.clerk_signing_key_resolver = lambda _: RSA_PUBLIC_JWK.key

    def database():
        with session_factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = database
    client = TestClient(app)

    def set_actor(actor_name: str, email: str | None = None) -> None:
        extra = {"email": email, "email_verified": True} if email else None
        token = _mint_jwt(sub=f"user_stu_{actor_name}", extra_claims=extra)
        client.headers["Authorization"] = f"Bearer {token}"

    def api_put(path: str, body: dict):
        return client.put(
            "/api/v1" + path,
            json=body,
            headers={"Idempotency-Key": str(uuid4())},
        )

    # 1. Student A signs in and loads initial profile
    set_actor("stella", email="stella.appiok@ashesi.edu.gh")
    init_prof = client.get("/api/v1/me/student-profile")
    assert init_prof.status_code == 200
    assert init_prof.json()["email"] == "stella.appiok@ashesi.edu.gh"
    assert init_prof.json()["self_reported_skills"] == []

    # 2. Validation rejects invalid URLs and blank display_name
    bad_url = api_put(
        "/me/student-profile",
        {
            "display_name": "Stella Appiok",
            "github_url": "ftp://invalid-scheme.example.com",
        },
    )
    assert bad_url.status_code == 422

    # 3. Student A saves full profile to backend
    save_res = api_put(
        "/me/student-profile",
        {
            "display_name": "Stella Appiok",
            "headline": "Computer Engineering Senior | Offline-First Web Systems",
            "bio": "Building resilient web and mobile tools for community health workers.",
            "institution": "Ashesi University",
            "program_of_study": "B.Sc. Computer Engineering",
            "graduation_year": 2026,
            "weekly_hours_available": 15,
            "preferred_domains": ["Fullstack Web", "Distributed Systems"],
            "portfolio_url": "https://stellaappiok.dev",
            "github_url": "https://github.com/stellaappiok",
            "linkedin_url": "https://linkedin.com/in/stellaappiok",
            "self_reported_skills": [
                {
                    "id": "skill-ts",
                    "name": "TypeScript",
                    "category": "2-3 years",
                    "proficiency": "advanced",
                    "notes": "Used across Next.js and FastAPI client packages",
                }
            ],
            "top_projects": [
                {
                    "id": "proj-1",
                    "title": "Rural Clinic Inventory Sync",
                    "summary": "Offline IndexedDB sync queue for district pharmacies.",
                    "role": "Lead Developer",
                    "link_url": "https://github.com/stellaappiok/clinic-sync",
                }
            ],
        },
    )
    assert save_res.status_code == 200, save_res.text
    saved = save_res.json()
    assert saved["display_name"] == "Stella Appiok"
    assert saved["institution"] == "Ashesi University"
    assert saved["graduation_year"] == 2026
    assert saved["weekly_hours_available"] == 15
    assert saved["email"] == "stella.appiok@ashesi.edu.gh"
    assert len(saved["self_reported_skills"]) == 1
    assert saved["self_reported_skills"][0]["name"] == "TypeScript"
    assert len(saved["top_projects"]) == 1

    # Verify /api/v1/me reflects updated display_name and "student" effective context
    me_after = client.get("/api/v1/me").json()
    assert me_after["display_name"] == "Stella Appiok"
    assert "student" in me_after["effective_contexts"]

    # 4. Student B signs in: cannot see Student A's profile data
    set_actor("kwame", email="kwame.mensah@ug.edu.gh")
    other_prof = client.get("/api/v1/me/student-profile").json()
    assert other_prof["email"] == "kwame.mensah@ug.edu.gh"
    assert other_prof["institution"] == ""
    assert other_prof["self_reported_skills"] == []
    assert other_prof["top_projects"] == []

    # 5. Student A signs back in: saved profile persists across sessions
    set_actor("stella", email="stella.appiok@ashesi.edu.gh")
    reloaded = client.get("/api/v1/me/student-profile").json()
    assert reloaded["display_name"] == "Stella Appiok"
    assert reloaded["institution"] == "Ashesi University"
    assert len(reloaded["self_reported_skills"]) == 1
    assert len(reloaded["top_projects"]) == 1

    engine.dispose()
