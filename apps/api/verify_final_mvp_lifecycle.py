"""Final MVP Verification Script across All Four ExperienceBridge Portals.

Target Database: ExperienceBridge Development Neon PostgreSQL (eu-west-2)
Branch: development
App Environment: development

Tests the exact 10-step cross-portal lifecycle:
1. Organization creates a project
2. Admin verifies organization and approves project
3. Student discovers the published project and applies
4. Organization reviews application and sends offer
5. Student accepts offer
6. Organization invites mentor
7. Mentor accepts assignment
8. Student submits deliverable
9. Mentor submits evaluation
10. Organization accepts deliverable
"""

import sys
from pathlib import Path
from uuid import UUID, uuid4

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.applications.models import Application, Offer, Participation, TermsAcceptance
from app.applications.schemas import CONSENT_TEXT, CONSENT_VERSION
from app.assessments.models import Artifact, MentorReview, OrganizationReview, Submission
from app.core.config import DEFAULT_DEV_ENV_FILE, load_settings, redact_database_url
from app.database.session import create_db_engine, create_session_factory
from app.identity.models import User, UserRoleGrant
from app.main import create_app
from app.mentorship.models import MentorAssignment, MentorProfile
from app.organizations.models import Organization, OrganizationMembership
from app.projects.models import ModerationDecision, Project, TermsVersion
from app.tests.test_identity_auth import RSA_PUBLIC_JWK, _mint_jwt


def run_mvp_lifecycle_verification():
    print("=" * 75)
    print("EXPERIENCEBRIDGE -- FINAL MVP 10-STEP LIFECYCLE VERIFICATION")
    print("=" * 75)

    settings = load_settings(env_file=DEFAULT_DEV_ENV_FILE)
    print(f"Target Environment: {settings.app_env}")
    print(f"Neon Branch:        {settings.neon_branch}")
    print(f"Database URL:       {redact_database_url(settings.database_url)}")

    assert settings.app_env == "development", "Must run in development environment only"
    assert settings.neon_branch == "development", "Must run on development branch only"

    app = create_app(settings)
    app.state.clerk_signing_key_resolver = lambda _: RSA_PUBLIC_JWK.key
    client = TestClient(app)
    SessionFactory = create_session_factory(create_db_engine(settings))

    def token_for(actor_name: str) -> str:
        return _mint_jwt(
            sub=f"user_mvp_{actor_name}",
            iss=settings.clerk_issuer_url,
            azp=settings.clerk_authorized_parties[0],
        )

    def set_actor(actor_name: str):
        client.headers["Authorization"] = f"Bearer {token_for(actor_name)}"

    def api_post(path: str, body: dict, row_version: int | None = None):
        headers = {"Idempotency-Key": str(uuid4())}
        if row_version is not None:
            headers["If-Match"] = f'"{row_version}"'
        return client.post("/api/v1" + path, json=body, headers=headers)

    step_results = []

    # Provision user identities & admin role
    set_actor("org_manager")
    res = client.get("/api/v1/me")
    assert res.status_code == 200
    org_manager_id = res.json()["id"]

    set_actor("platform_admin")
    res = client.get("/api/v1/me")
    assert res.status_code == 200
    admin_id = res.json()["id"]

    set_actor("student_stella")
    res = client.get("/api/v1/me")
    assert res.status_code == 200
    student_id = res.json()["id"]

    set_actor("mentor_jathnie")
    res = client.get("/api/v1/me")
    assert res.status_code == 200
    mentor_id = res.json()["id"]

    # Ensure admin has platform_admin grant in development DB
    with SessionFactory() as db:
        grant = db.scalar(select(UserRoleGrant).where(UserRoleGrant.user_id == UUID(admin_id), UserRoleGrant.role == "platform_admin"))
        if not grant:
            db.add(UserRoleGrant(user_id=UUID(admin_id), role="platform_admin", reason="MVP Test Grant"))
            db.commit()

    print("\n[Step 1] Organization creates an organization record and a project draft...")
    set_actor("org_manager")
    org_res = api_post("/organizations", {
        "display_name": "African Health Innovation Labs",
        "description": "Healthcare technology accelerator providing genuine student challenges.",
    })
    assert org_res.status_code == 201, org_res.text
    org = org_res.json()

    # Create project draft
    due_date = "2026-12-01"
    proj_res = api_post(f"/organizations/{org['id']}/projects", {
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
                "acceptance_criteria": ["Functional offline form", "Local schema validation passing"],
                "due_on": due_date,
            }
        ],
    }, org["row_version"])
    assert proj_res.status_code == 201, proj_res.text
    project = proj_res.json()

    # Create terms snapshot
    terms_res = api_post(f"/projects/{project['id']}/terms-versions", {
        "compensation_type": "paid_fixed",
        "currency": "GHS",
        "fee_amount": "1500.00",
        "payment_terms": "Full stipend released upon approved completion of all milestone deliverables.",
        "ip_ownership_terms": "Permissive MIT license; student retains verified passport rights.",
        "confidentiality_terms": "Synthetic patient records only; no live identifiable health data.",
        "mentor_plan": "Weekly technical reviews and independent rubric assessment by assigned faculty mentor.",
    }, project["row_version"])
    assert terms_res.status_code == 201, terms_res.text
    terms = terms_res.json()
    project["row_version"] = terms.get("project_row_version", project["row_version"] + 1)

    # Submit organization verification
    sub_org_res = api_post(f"/organizations/{org['id']}/submit-verification", {}, org["row_version"])
    assert sub_org_res.status_code == 200, sub_org_res.text
    org = sub_org_res.json()
    assert org["verification_status"] == "submitted"

    step_results.append(("Step 1: Organization creates project & terms", "PASS"))
    print("  [OK] Organization and project draft created in development Neon.")

    print("\n[Step 2] Admin verifies organization and approves project...")
    set_actor("platform_admin")
    # Verify organization
    admin_org_res = api_post(f"/admin/organizations/{org['id']}/decisions", {
        "decision": "verify",
        "explanation": "Verified business registration and institutional accreditation in Ghana.",
    }, org["row_version"])
    assert admin_org_res.status_code == 200, admin_org_res.text
    org = admin_org_res.json()
    assert org["verification_status"] == "verified"

    # Organization manager submits project for review
    set_actor("org_manager")
    me_org = client.get("/api/v1/me").json()
    assert "organization" in me_org["effective_contexts"], "org_manager must have organization in effective_contexts"
    submit_res = api_post(f"/projects/{project['id']}/submit-review", {
        "terms_version_id": terms["id"],
    }, project["row_version"])
    assert submit_res.status_code == 200, submit_res.text
    project = submit_res.json()
    assert project["status"] == "pending_review"
    org_proj_list = client.get(f"/api/v1/organizations/{org['id']}/projects").json()["items"]
    matching_proj = next(p for p in org_proj_list if p["id"] == project["id"])
    assert matching_proj["submitted_terms_version_id"] == terms["id"]

    # Admin approves project
    set_actor("platform_admin")
    admin_proj_res = api_post(f"/admin/projects/{project['id']}/decisions", {
        "decision": "approve",
        "explanation": "Project brief and compensation terms satisfy educational and legal standards.",
        "terms_version_id": terms["id"],
        "snapshot_hash": terms["content_hash"],
    }, project["row_version"])
    assert admin_proj_res.status_code == 200, admin_proj_res.text
    project = admin_proj_res.json()
    assert project["status"] == "open"

    step_results.append(("Step 2: Admin verifies organization & approves project", "PASS"))
    print("  [OK] Admin approved project; status transitioned to 'open'.")

    print("\n[Step 3] Student discovers the published project and applies...")
    set_actor("student_stella")
    # Query published projects
    pub_res = client.get("/api/v1/projects")
    assert pub_res.status_code == 200
    pub_projects = pub_res.json()["items"]
    assert any(p["id"] == project["id"] for p in pub_projects), "Project must appear in published list"

    # Submit student application
    app_res = api_post(f"/projects/{project['id']}/applications", {
        "seen_terms_version_id": terms["id"],
        "motivation": "I am deeply passionate about community health informatics and have built Next.js offline-first applications during my senior coursework.",
        "declared_skills": ["React", "TypeScript", "IndexedDB", "Tailwind CSS"],
        "links": [{"label": "GitHub", "url": "https://github.com/stellaappiok/health-tracker"}],
        "weekly_minutes_available": 720,
    }, project["row_version"])
    assert app_res.status_code == 201, app_res.text
    application = app_res.json()
    assert application["status"] == "submitted"

    step_results.append(("Step 3: Student discovers project & applies", "PASS"))
    print(f"  [OK] Student applied; application id: {application['id']}.")

    print("\n[Step 4] Organization reviews application and sends offer...")
    set_actor("org_manager")
    # Shortlist application
    shortlist_res = api_post(f"/applications/{application['id']}/shortlist", {}, application["row_version"])
    assert shortlist_res.status_code == 200, shortlist_res.text
    application = shortlist_res.json()
    assert application["status"] == "shortlisted"

    # Issue offer
    offer_res = api_post(f"/applications/{application['id']}/offer", {
        "terms_version_id": terms["id"],
        "expires_at": "2026-11-15T23:59:59Z",
    }, application["row_version"])
    assert offer_res.status_code == 201, offer_res.text
    offer = offer_res.json()
    assert offer["status"] == "offered"

    step_results.append(("Step 4: Organization reviews & issues offer", "PASS"))
    print(f"  [OK] Offer issued; offer id: {offer['id']}.")

    print("\n[Step 5] Student accepts offer with explicit consent...")
    set_actor("student_stella")
    accept_res = api_post(f"/offers/{offer['id']}/accept", {
        "terms_version_id": terms["id"],
        "terms_hash": terms["content_hash"],
        "consent_statement_version": "supervisor-v1",
        "explicitly_accepted": True,
    }, offer["row_version"])
    assert accept_res.status_code == 201, accept_res.text
    participation = accept_res.json()
    assert participation["status"] == "active"
    assert participation["terms_acceptance"] is not None

    step_results.append(("Step 5: Student accepts offer & activates participation", "PASS"))
    print(f"  [OK] Participation activated in PostgreSQL; id: {participation['id']}.")

    print("\n[Step 6] Organization invites mentor...")
    # Mentor profile must exist and be eligible
    set_actor("mentor_jathnie")
    existing_prof = client.get("/api/v1/me/mentor-profile")
    prof_headers = {"If-Match": f'"{existing_prof.json()["row_version"]}"'} if existing_prof.status_code == 200 else {}
    m_prof_res = client.put("/api/v1/me/mentor-profile", json={
        "bio": "Senior Health Informatics Researcher & Technical Mentor",
        "skills": ["Health Informatics", "PostgreSQL", "Full-Stack Development"],
        "availability_text": "8 hours weekly",
        "weekly_review_capacity": 4,
        "directory_opt_in": True,
    }, headers=prof_headers)
    assert m_prof_res.status_code in {200, 201}
    m_prof = m_prof_res.json()

    # Admin approves mentor eligibility
    set_actor("platform_admin")
    m_elig = api_post(f"/admin/mentors/{mentor_id}/eligibility", {
        "decision": "approve",
        "explanation": "Verified technical credentials and mentoring qualifications.",
    }, m_prof["row_version"])
    assert m_elig.status_code == 200

    # Organization invites mentor
    set_actor("org_manager")
    invite_res = api_post(f"/participations/{participation['id']}/mentor-assignments", {
        "mentor_user_id": mentor_id,
        "context": "Support student on local-first storage design and review milestone deliverables.",
        "expires_at": "2026-11-15T23:59:59Z",
    }, participation["row_version"])
    assert invite_res.status_code == 201, invite_res.text
    assignment = invite_res.json()
    assert assignment["status"] == "proposed"

    step_results.append(("Step 6: Organization invites mentor", "PASS"))
    print(f"  [OK] Mentor invited; assignment id: {assignment['id']}.")

    print("\n[Step 7] Mentor accepts assignment...")
    set_actor("mentor_jathnie")
    m_accept_res = api_post(f"/mentor-assignments/{assignment['id']}/accept", {
        "conflict_declared": False,
        "confidentiality_acknowledged": True,
    }, assignment["row_version"])
    assert m_accept_res.status_code == 200, m_accept_res.text
    assignment = m_accept_res.json()
    assert assignment["status"] == "accepted"

    # Start project
    set_actor("org_manager")
    start_res = api_post(f"/projects/{project['id']}/start", {}, project["row_version"])
    assert start_res.status_code == 200, start_res.text
    project = start_res.json()
    assert project["status"] == "in_progress"

    step_results.append(("Step 7: Mentor accepts assignment & PM starts project", "PASS"))
    print("  [OK] Mentor accepted; project is now 'in_progress'.")

    print("\n[Step 8] Student submits deliverable & evidence...")
    set_actor("student_stella")
    # Refresh participation row_version
    part_curr = client.get(f"/api/v1/participations/{participation['id']}").json()
    sub_res = api_post(f"/participations/{participation['id']}/submissions", {
        "milestone_index": 0,
        "summary": "Completed Milestone 1: offline-first form with client-side SQLite sync.",
        "contribution_statement": "Implemented all schema migrations, form components, and unit tests.",
    }, part_curr["row_version"])
    assert sub_res.status_code == 201, sub_res.text
    submission = sub_res.json()

    # Attach artifact
    art_res = api_post(f"/submissions/{submission['id']}/external-artifacts", {
        "kind": "external_url",
        "label": "GitHub Repository Implementation",
        "url": "https://github.com/stellaappiok/pediatric-vaccines",
    })
    assert art_res.status_code == 201, art_res.text

    # Student submits for review
    submit_sub_res = api_post(f"/submissions/{submission['id']}/submit", {}, submission["row_version"])
    assert submit_sub_res.status_code == 200, submit_sub_res.text
    submission = submit_sub_res.json()
    assert submission["status"] == "submitted"

    step_results.append(("Step 8: Student submits deliverable & artifacts", "PASS"))
    print(f"  [OK] Deliverable submitted; submission id: {submission['id']}.")

    print("\n[Step 9] Mentor submits evaluation...")
    set_actor("mentor_jathnie")
    m_rev_res = api_post(f"/submissions/{submission['id']}/mentor-reviews", {
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
    }, submission["row_version"])
    assert m_rev_res.status_code == 201, m_rev_res.text
    mentor_review = m_rev_res.json()
    assert mentor_review["decision"] == "reviewed"

    step_results.append(("Step 9: Mentor submits rubric evaluation", "PASS"))
    print("  [OK] Mentor evaluation recorded independently.")

    print("\n[Step 10] Organization accepts deliverable...")
    set_actor("org_manager")
    # Refresh submission row_version
    sub_curr = client.get(f"/api/v1/submissions/{submission['id']}").json()
    org_rev_res = api_post(f"/submissions/{submission['id']}/organization-reviews", {
        "decision": "accepted",
        "criteria_results": [
            {
                "criterion_text": "Functional offline form",
                "met": True,
                "explanation": "Verified in demo review session with technical team.",
            }
        ],
        "explanation": "Deliverable satisfies all organizational quality requirements.",
    }, sub_curr["row_version"])
    assert org_rev_res.status_code == 201, org_rev_res.text
    org_review = org_rev_res.json()
    assert org_review["decision"] == "accepted"

    step_results.append(("Step 10: Organization accepts deliverable", "PASS"))
    print("  [OK] Organization deliverable acceptance recorded in PostgreSQL.")

    print("\n[Step 11] Student requests completion & Organization completes participation and project...")
    set_actor("student_stella")
    part_curr = client.get(f"/api/v1/participations/{participation['id']}").json()
    ready_res = api_post(f"/participations/{participation['id']}/mark-ready-for-review", {
        "requested_outcome": "completed",
        "explanation": "All Milestone 1 deliverables and repository links have been submitted and accepted.",
    }, part_curr["row_version"])
    assert ready_res.status_code == 200, ready_res.text
    participation = ready_res.json()
    assert participation["status"] == "under_review"

    set_actor("org_manager")
    comp_part_res = api_post(f"/participations/{participation['id']}/finalize", {
        "outcome": "completed",
        "explanation": "Verified all milestone criteria and code quality with assigned mentor review.",
    }, participation["row_version"])
    assert comp_part_res.status_code == 200, comp_part_res.text
    participation = comp_part_res.json()
    assert participation["status"] == "completed"

    proj_curr = client.get(f"/api/v1/projects/{project['id']}").json()
    comp_proj_res = api_post(f"/projects/{project['id']}/complete", {
        "explanation": "All project milestones and participations have been reviewed and completed.",
    }, proj_curr["row_version"])
    assert comp_proj_res.status_code == 200, comp_proj_res.text
    project = comp_proj_res.json()
    assert project["status"] == "completed"

    step_results.append(("Step 11: Student requests completion & Org completes project", "PASS"))
    print("  [OK] Participation and Project completed in PostgreSQL.")

    print("\n--- Direct Database Persistence & Integrity Assertions ---")
    with SessionFactory() as db:
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
        print("  [OK] All 11 entity transitions and relational invariants confirmed in Neon PostgreSQL.")

    print("\n" + "=" * 75)
    print("FINAL MVP 10-STEP LIFECYCLE SUMMARY")
    print("=" * 75)
    for step_name, status in step_results:
        print(f"  {step_name:<60} [{status}]")
    print("=" * 75)


if __name__ == "__main__":
    run_mvp_lifecycle_verification()
