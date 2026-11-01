"""Live verification script against development Neon database.

Verifies persistence, authorization, ETag precondition checking,
and state machine transitions across Checkpoints 1, 2, 3, and 4.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

# Ensure app is in sys.path
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


def run_verification():
    print("=" * 70)
    print("EXPERIENCEBRIDGE DEVELOPMENT NEON VERIFICATION")
    print("=" * 70)

    # 1. Load settings from development environment file
    dev_settings = load_settings(env_file=DEFAULT_DEV_ENV_FILE)
    print(f"App Environment: {dev_settings.app_env}")
    print(f"Neon Branch:     {dev_settings.neon_branch}")
    print(f"Database URL:    {redact_database_url(dev_settings.database_url)}")

    assert dev_settings.app_env == "development"
    assert dev_settings.neon_branch == "development"

    # 2. Create FastAPI app without database dependency overrides (connects to live dev Neon)
    app = create_app(dev_settings)
    app.state.clerk_signing_key_resolver = lambda _: RSA_PUBLIC_JWK.key

    client = TestClient(app)
    SessionFactory = create_session_factory(create_db_engine(dev_settings))

    # Helper functions
    def mint(name):
        return _mint_jwt(
            sub=f"user_dev_neon_verif_{name}",
            iss=dev_settings.clerk_issuer_url,
            azp=dev_settings.clerk_authorized_parties[0],
        )

    def actor(name):
        client.headers["Authorization"] = f"Bearer {mint(name)}"

    def post(path, body, version=None):
        headers = {"Idempotency-Key": str(uuid4())}
        if version is not None:
            headers["If-Match"] = f'"{version}"'
        return client.post("/api/v1" + path, json=body, headers=headers)

    verified_endpoints = []

    print("\n--- Phase 1: Identity & Role Grants ---")
    actor("owner")
    r = client.get("/api/v1/me")
    assert r.status_code == 200, r.text
    owner_id = r.json()["id"]
    verified_endpoints.append("GET /api/v1/me (UserSelf)")
    print(f"  Owner authenticated: {owner_id}")

    actor("admin")
    r = client.get("/api/v1/me")
    assert r.status_code == 200, r.text
    admin_id = r.json()["id"]
    print(f"  Admin authenticated: {admin_id}")

    actor("student")
    r = client.get("/api/v1/me")
    assert r.status_code == 200, r.text
    student_id = r.json()["id"]
    print(f"  Student authenticated: {student_id}")

    actor("mentor")
    r = client.get("/api/v1/me")
    assert r.status_code == 200, r.text
    mentor_id = r.json()["id"]
    print(f"  Mentor authenticated: {mentor_id}")

    # Ensure admin has platform_admin role in development DB
    with SessionFactory() as db:
        admin_grant = db.scalar(
            select(UserRoleGrant).where(
                UserRoleGrant.user_id == UUID(admin_id),
                UserRoleGrant.role == "platform_admin",
            )
        )
        if not admin_grant:
            db.add(UserRoleGrant(user_id=UUID(admin_id), role="platform_admin", reason="Live development verification"))
            db.commit()
            print("  Granted platform_admin to admin user.")

    print("\n--- Phase 2: Organization & Project Publication (Checkpoint 1) ---")
    actor("owner")
    org_res = post("/organizations", {
        "display_name": "Dev Neon Test Organization",
        "description": "Synthetic organization verified against development Neon database.",
    })
    assert org_res.status_code == 201, org_res.text
    org = org_res.json()
    verified_endpoints.append("POST /api/v1/organizations (201 Created)")
    print(f"  Created organization: {org['id']}")

    # Submit verification
    sub_org = post(f"/organizations/{org['id']}/submit-verification", {}, org["row_version"])
    assert sub_org.status_code == 200, sub_org.text
    verified_endpoints.append("POST /api/v1/organizations/{id}/submit-verification")
    print("  Submitted organization verification.")

    # Admin verifies organization
    actor("admin")
    admin_org = post(f"/admin/organizations/{org['id']}/decisions", {
        "decision": "verify",
        "explanation": "Verified development test organization.",
    }, sub_org.json()["row_version"])
    assert admin_org.status_code == 200, admin_org.text
    verified_endpoints.append("POST /api/v1/admin/organizations/{id}/decisions")
    print("  Admin verified organization.")

    # Create project
    actor("owner")
    proj_body = {
        "title": "Neon Dev Verification Project",
        "description": "Testing full persistence on development branch.",
        "capacity": 1,
        "org_reviewer_user_id": owner_id,
        "scope_in": "End to end verification workflow.",
        "scope_out": "No live payments.",
        "estimated_minutes": 180,
        "start_on": "2026-11-01",
        "due_on": "2026-11-15",
        "milestones": [
            {
                "title": "Core deliverable milestone",
                "acceptance_criteria": ["All tests pass on development branch"],
                "due_on": "2026-11-10",
            }
        ],
    }
    proj_res = post(f"/organizations/{org['id']}/projects", proj_body, admin_org.json()["row_version"])
    assert proj_res.status_code == 201, proj_res.text
    project = proj_res.json()
    verified_endpoints.append("POST /api/v1/organizations/{id}/projects (201 Created)")
    print(f"  Created draft project: {project['id']}")

    # Create terms version
    terms_res = post(f"/projects/{project['id']}/terms-versions", {
        "fee_amount": "500.00",
        "payment_terms": "Synthetic verification terms.",
        "ip_ownership_terms": "Standard demo license.",
        "confidentiality_terms": "No confidential data.",
        "mentor_plan": "Independent supervision required.",
    }, project["row_version"])
    assert terms_res.status_code == 201, terms_res.text
    terms = terms_res.json()
    verified_endpoints.append("POST /api/v1/projects/{id}/terms-versions (201 Created)")
    print(f"  Created terms version: {terms['id']} (hash: {terms['content_hash'][:16]}...)")

    # Submit review
    sub_proj = post(f"/projects/{project['id']}/submit-review", {"terms_version_id": terms["id"]}, terms["project_row_version"])
    assert sub_proj.status_code == 200, sub_proj.text
    verified_endpoints.append("POST /api/v1/projects/{id}/submit-review")
    print("  Submitted project for review.")

    # Admin approves project
    actor("admin")
    appr_proj = post(f"/admin/projects/{project['id']}/decisions", {
        "decision": "approve",
        "explanation": "Reviewed scope on development branch.",
        "terms_version_id": terms["id"],
        "snapshot_hash": terms["content_hash"],
    }, sub_proj.json()["row_version"])
    assert appr_proj.status_code == 200, appr_proj.text
    project = appr_proj.json()
    verified_endpoints.append("POST /api/v1/admin/projects/{id}/decisions")
    print("  Admin approved project -> status: open")

    print("\n--- Phase 3: Selection, Offer & Explicit Consent (Checkpoint 2) ---")
    # Student applies
    actor("student")
    app_res = post(f"/projects/{project['id']}/applications", {
        "seen_terms_version_id": terms["id"],
        "motivation": "Participating in development database verification.",
        "declared_skills": ["PostgreSQL", "FastAPI", "Python"],
        "links": [{"label": "GitHub", "url": "https://example.com/student"}],
        "weekly_minutes_available": 600,
    }, project["row_version"])
    assert app_res.status_code == 201, app_res.text
    application = app_res.json()
    verified_endpoints.append("POST /api/v1/projects/{id}/applications (201 Created)")
    print(f"  Student submitted application: {application['id']}")

    # PM issues offer
    actor("owner")
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    offer_res = post(f"/applications/{application['id']}/offer", {
        "terms_version_id": terms["id"],
        "expires_at": expires,
    }, application["row_version"])
    assert offer_res.status_code == 201, offer_res.text
    offer = offer_res.json()
    verified_endpoints.append("POST /api/v1/applications/{id}/offer (201 Created)")
    print(f"  PM issued offer: {offer['id']}")

    # Student accepts offer with exact terms & consent statement version
    actor("student")
    accept_res = post(f"/offers/{offer['id']}/accept", {
        "terms_version_id": terms["id"],
        "terms_hash": terms["content_hash"],
        "consent_statement_version": CONSENT_VERSION,
        "explicitly_accepted": True,
    }, offer["row_version"])
    assert accept_res.status_code == 201, accept_res.text
    participation = accept_res.json()
    verified_endpoints.append("POST /api/v1/offers/{id}/accept (201 Created)")
    print(f"  Student accepted offer -> created participation: {participation['id']}")

    print("\n--- Phase 4: Mentorship & Project Start (Checkpoint 3) ---")
    # Mentor registers profile and is approved by admin
    actor("mentor")
    existing_prof = client.get("/api/v1/me/mentor-profile")
    prof_headers = {}
    if existing_prof.status_code == 200:
        prof_headers["If-Match"] = f'"{existing_prof.json()["row_version"]}"'
    m_prof_res = client.put("/api/v1/me/mentor-profile", json={
        "bio": "Dev Neon Senior Technical Mentor",
        "skills": ["PostgreSQL", "Cloud Architecture"],
        "availability_text": "10 hours per week",
        "weekly_review_capacity": 5,
        "directory_opt_in": True,
    }, headers=prof_headers)
    assert m_prof_res.status_code in {200, 201}, m_prof_res.text
    m_prof = m_prof_res.json()
    verified_endpoints.append("PUT /api/v1/me/mentor-profile")
    print(f"  Mentor profile saved.")

    actor("admin")
    m_appr = post(f"/admin/mentors/{mentor_id}/eligibility", {
        "decision": "approve",
        "explanation": "Approved development mentor candidate.",
    }, m_prof["row_version"])
    assert m_appr.status_code == 200, m_appr.text
    verified_endpoints.append("POST /api/v1/admin/mentors/{id}/eligibility")
    print("  Admin approved mentor eligibility.")

    # PM assigns mentor
    actor("owner")
    m_assign_res = post(f"/participations/{participation['id']}/mentor-assignments", {
        "mentor_user_id": mentor_id,
        "context": "Supervise verification deliverable.",
        "expires_at": expires,
    }, participation["row_version"])
    assert m_assign_res.status_code == 201, m_assign_res.text
    assignment = m_assign_res.json()
    verified_endpoints.append("POST /api/v1/participations/{id}/mentor-assignments (201 Created)")
    print(f"  Assigned mentor to participation.")

    # Mentor accepts assignment
    actor("mentor")
    accept_assign = post(f"/mentor-assignments/{assignment['id']}/accept", {
        "conflict_declared": False,
        "confidentiality_acknowledged": True,
    }, assignment["row_version"])
    assert accept_assign.status_code == 200, accept_assign.text
    verified_endpoints.append("POST /api/v1/mentor-assignments/{id}/accept")
    print("  Mentor accepted assignment.")

    # PM starts project
    actor("owner")
    start_res = post(f"/projects/{project['id']}/start", {}, project["row_version"])
    assert start_res.status_code == 200, start_res.text
    project = start_res.json()
    verified_endpoints.append("POST /api/v1/projects/{id}/start")
    print("  PM started project -> status: in_progress")

    print("\n--- Phase 5: Submission, Independent Reviews & Finalization (Checkpoint 4) ---")
    # Student drafts submission
    actor("student")
    part_refreshed = client.get(f"/api/v1/participations/{participation['id']}").json()
    sub_res = post(f"/participations/{participation['id']}/submissions", {
        "milestone_index": 0,
        "summary": "Completed verified execution on development database.",
        "contribution_statement": "Verified all relational records, constraints, and audit trails.",
    }, part_refreshed["row_version"])
    assert sub_res.status_code == 201, sub_res.text
    submission = sub_res.json()
    verified_endpoints.append("POST /api/v1/participations/{id}/submissions (201 Created)")
    print(f"  Student created submission draft: {submission['id']}")

    # Attach artifact
    art_res = post(f"/submissions/{submission['id']}/external-artifacts", {
        "kind": "external_url",
        "label": "Verification Evidence Run",
        "url": "https://example.com/verification-run",
    })
    assert art_res.status_code == 201, art_res.text
    verified_endpoints.append("POST /api/v1/submissions/{id}/external-artifacts (201 Created)")
    print("  Attached external artifact.")

    # Submit deliverable
    sub_done = post(f"/submissions/{submission['id']}/submit", {}, submission["row_version"])
    assert sub_done.status_code == 200, sub_done.text
    submission = sub_done.json()
    verified_endpoints.append("POST /api/v1/submissions/{id}/submit")
    print("  Student submitted deliverable.")

    # Independent Mentor Review
    actor("mentor")
    m_rev = post(f"/submissions/{submission['id']}/mentor-reviews", {
        "decision": "reviewed",
        "observations": [{"criterion_text": "All tests pass on development branch", "score": 5, "observation": "Verified on live Neon."}],
        "participant_feedback": "Exceptional rigor and fidelity to backend contracts.",
        "manager_summary": "Deliverable satisfies all technical specifications.",
    }, submission["row_version"])
    assert m_rev.status_code == 201, m_rev.text
    verified_endpoints.append("POST /api/v1/submissions/{id}/mentor-reviews (201 Created)")
    print("  Mentor recorded independent review (decision: reviewed).")

    # Independent Organization Review
    actor("owner")
    sub_for_org = client.get(f"/api/v1/submissions/{submission['id']}").json()
    o_rev = post(f"/submissions/{submission['id']}/organization-reviews", {
        "decision": "accepted",
        "criteria_results": [{"criterion_text": "All tests pass on development branch", "met": True, "explanation": "Confirmed in development database."}],
        "explanation": "Deliverable accepted by host organization.",
    }, sub_for_org["row_version"])
    assert o_rev.status_code == 201, o_rev.text
    verified_endpoints.append("POST /api/v1/submissions/{id}/organization-reviews (201 Created)")
    print("  Organization accepted deliverable (decision: accepted).")

    # Student marks ready for review
    actor("student")
    part_for_ready = client.get(f"/api/v1/participations/{participation['id']}").json()
    ready_res = post(f"/participations/{participation['id']}/mark-ready-for-review", {
        "requested_outcome": "completed",
        "explanation": "Work completed and accepted by both reviewers.",
    }, part_for_ready["row_version"])
    assert ready_res.status_code == 200, ready_res.text
    verified_endpoints.append("POST /api/v1/participations/{id}/mark-ready-for-review")
    print("  Student marked participation ready for review.")

    # PM finalizes participation
    actor("owner")
    final_res = post(f"/participations/{participation['id']}/finalize", {
        "outcome": "completed",
        "explanation": "Confirmed qualifying milestone pair.",
    }, ready_res.json()["row_version"])
    assert final_res.status_code == 200, final_res.text
    verified_endpoints.append("POST /api/v1/participations/{id}/finalize")
    print("  PM finalized participation -> status: completed.")

    # PM completes project
    proj_done = post(f"/projects/{project['id']}/complete", {
        "explanation": "All requirements fulfilled on development branch.",
    }, project["row_version"])
    assert proj_done.status_code == 200, proj_done.text
    verified_endpoints.append("POST /api/v1/projects/{id}/complete")
    print("  PM completed project -> status: completed.")

    print("\n--- Phase 6: Direct Neon Database Verification ---")
    with SessionFactory() as db:
        p_row = db.get(Project, UUID(project["id"]))
        assert p_row is not None and p_row.status == "completed"
        part_row = db.get(Participation, UUID(participation["id"]))
        assert part_row is not None and part_row.status == "completed"
        ta_row = db.scalar(select(TermsAcceptance).where(TermsAcceptance.participation_id == part_row.id))
        assert ta_row is not None and ta_row.terms_hash == terms["content_hash"]
        sub_row = db.get(Submission, UUID(submission["id"]))
        assert sub_row is not None and sub_row.status == "submitted"
        mr_row = db.scalar(select(MentorReview).where(MentorReview.submission_id == sub_row.id))
        assert mr_row is not None and mr_row.decision == "reviewed"
        or_row = db.scalar(select(OrganizationReview).where(OrganizationReview.submission_id == sub_row.id))
        assert or_row is not None and or_row.decision == "accepted"
        print("  Direct database checks confirmed all persisted entities and invariants in PostgreSQL.")

    print("\n" + "=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY ON DEVELOPMENT NEON!")
    print(f"Total endpoints verified against live Neon: {len(verified_endpoints)}")
    print("=" * 70)
    return verified_endpoints


if __name__ == "__main__":
    run_verification()
