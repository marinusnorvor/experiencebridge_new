"""Seed SYNTHETIC BUILD-demo accounts and data through the public HTTP API.

Everything created here is clearly labelled synthetic demo data; it is not a
genuine organization, project, reviewer, payment or verified outcome.

Usage (PowerShell, from the repository root):

    $env:EB_DEMO_PASSWORD = "<choose a password of 12+ characters>"
    .\\apps\\api\\.venv\\Scripts\\python.exe apps/api/seed_demo.py               # accounts + one open project
    .\\apps\\api\\.venv\\Scripts\\python.exe apps/api/seed_demo.py --full        # also run the whole flow to a passport
    .\\apps\\api\\.venv\\Scripts\\python.exe apps/api/seed_demo.py --base-url https://<your-app>.vercel.app

--base-url defaults to http://localhost:3002 (the local Next.js origin). Requests use the
same /api/v1 paths as the browser.

EB_DEMO_PASSWORD (required) is the password for the three demo accounts.
SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD are read from the environment, falling back to
apps/api/.env.development.local. No password is ever printed.
Only works where the workflow routes are enabled (development/test, or EB_BUILD_DEMO_WORKFLOWS=true).
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx

ENV_FILE = Path(__file__).resolve().parent / ".env.development.local"
ACCOUNTS = {
    "org": ("demo.organization@example.com", "[DEMO] Ama Mensah (Organization)"),
    "student": ("demo.student@example.com", "[DEMO] Kofi Asante (Student)"),
    "mentor": ("demo.mentor@example.com", "[DEMO] Dr. Efua Owusu (Mentor)"),
}
ORG_NAME = "[DEMO] Accra Community Health Lab (synthetic)"


def env_value(name: str) -> str:
    if os.environ.get(name):
        return os.environ[name]
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key.strip() == name:
                return value.strip().strip('"').strip("'")
    raise SystemExit(f"{name} is not configured.")


class Actor:
    def __init__(self, base: str, label: str):
        self.base, self.label = base.rstrip("/"), label
        self.http = httpx.Client(base_url=self.base, headers={"Origin": self.base}, timeout=60)

    def _csrf(self) -> None:
        r = self.http.get("/api/v1/auth/csrf")
        check(r, f"{self.label}: csrf")
        self.http.headers["X-CSRF-Token"] = r.json()["csrf_token"]

    def register_and_login(self, email: str, password: str, name: str | None) -> dict:
        self._csrf()
        if name:
            check(self.http.post("/api/v1/auth/register", json={"email": email, "password": password, "display_name": name}), f"{self.label}: register", {202})
            self._csrf()
        check(self.http.post("/api/v1/auth/login", json={"email": email, "password": password}), f"{self.label}: sign in")
        self._csrf()  # session-bound CSRF token
        return self.get("/me")

    def get(self, path: str) -> dict:
        r = self.http.get("/api/v1" + path)
        check(r, f"{self.label}: GET {path}")
        return r.json()

    def post(self, path: str, body: dict, row_version: int | None = None, ok=(200, 201)) -> httpx.Response:
        headers = {"Idempotency-Key": str(uuid.uuid4())}
        if row_version is not None:
            headers["If-Match"] = f'"{row_version}"'
        r = self.http.post("/api/v1" + path, json=body, headers=headers)
        check(r, f"{self.label}: POST {path}", set(ok))
        return r


def check(r: httpx.Response, what: str, ok: set[int] | None = None) -> None:
    ok = ok or {200, 201}
    if r.status_code not in ok:
        raise SystemExit(f"FAIL  {what} -> HTTP {r.status_code}: {r.text[:400]}")
    print(f"ok    {what} -> {r.status_code}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:3002")
    parser.add_argument("--full", action="store_true", help="run apply -> offer -> mentor -> submit -> reviews -> completion")
    args = parser.parse_args()
    base = args.base_url
    demo_password = os.environ.get("EB_DEMO_PASSWORD", "")
    if len(demo_password) < 12:
        raise SystemExit("Set EB_DEMO_PASSWORD to a password of at least 12 characters for the demo accounts.")

    admin, org, student, mentor = (Actor(base, n) for n in ("admin", "org", "student", "mentor"))
    admin.register_and_login(env_value("SUPER_ADMIN_EMAIL"), env_value("SUPER_ADMIN_PASSWORD"), None)
    me_admin = admin.get("/me")
    if "platform_admin" not in (me_admin.get("global_roles") or []) and "admin" not in str(me_admin.get("effective_contexts")):
        print(f"WARN  super admin /me has no platform_admin role: {me_admin.get('global_roles')} {me_admin.get('effective_contexts')}")
    org_me = org.register_and_login(ACCOUNTS["org"][0], demo_password, ACCOUNTS["org"][1])
    student_me = student.register_and_login(ACCOUNTS["student"][0], demo_password, ACCOUNTS["student"][1])
    mentor_me = mentor.register_and_login(ACCOUNTS["mentor"][0], demo_password, ACCOUNTS["mentor"][1])

    # Organization (reuse if it already exists) and admin verification.
    mine = org.get("/me/organizations").get("items", [])
    organization = next((o for o in mine if o.get("display_name") == ORG_NAME), None)
    if organization is None:
        organization = org.post("/organizations", {"display_name": ORG_NAME, "description": "SYNTHETIC demo organization for the XANIX BUILD judging session. Not a real organization."}).json()
    if organization.get("verification_status") not in {"submitted", "verified"}:
        organization = org.post(f"/organizations/{organization['id']}/submit-verification", {}, organization["row_version"]).json()
    if organization.get("verification_status") != "verified":
        organization = admin.post(f"/admin/organizations/{organization['id']}/decisions", {"decision": "verify", "explanation": "SYNTHETIC demo verification for BUILD judging."}, organization["row_version"]).json()

    # Mentor profile and admin eligibility.
    existing = mentor.http.get("/api/v1/me/mentor-profile")
    put_headers = {"If-Match": f'"{existing.json()["row_version"]}"'} if existing.status_code == 200 and existing.json() else {}
    profile = mentor.http.put("/api/v1/me/mentor-profile", headers=put_headers, json={"bio": "[DEMO] Synthetic mentor profile for BUILD judging.", "skills": ["Web Development", "Accessibility", "Data Modelling"], "availability_text": "6 hours weekly", "weekly_review_capacity": 4, "directory_opt_in": True})
    check(profile, "mentor: PUT /me/mentor-profile")
    admin.post(f"/admin/mentors/{mentor_me['id']}/eligibility", {"decision": "approve", "explanation": "SYNTHETIC demo mentor eligibility."}, profile.json()["row_version"], ok=(200, 201, 409))

    # Project: draft -> terms -> submit -> admin approve -> open.
    today = date.today()
    due = (today + timedelta(days=30)).isoformat()
    stamp = datetime.now().strftime("%d %b %H:%M")
    project = org.post(f"/organizations/{organization['id']}/projects", {
        "title": f"[DEMO] Clinic Appointment Reminder Web App ({stamp})",
        "description": "SYNTHETIC demo project: build an accessible web page that lets clinic staff schedule appointment reminders.",
        "capacity": 2,
        "org_reviewer_user_id": org_me["id"],
        "scope_in": "Responsive scheduling form, list view and validation.",
        "scope_out": "Real SMS delivery and real patient data are out of scope.",
        "estimated_minutes": 1800,
        "start_on": today.isoformat(),
        "due_on": due,
        "milestones": [{"title": "Milestone 1: Working scheduling prototype", "acceptance_criteria": ["Form validates required fields", "Reminders list is keyboard accessible"], "due_on": due}],
    }, organization["row_version"]).json()
    terms = org.post(f"/projects/{project['id']}/terms-versions", {
        "compensation_type": "paid_fixed", "currency": "GHS", "fee_amount": "800.00",
        "payment_terms": "SYNTHETIC demo terms. No funds are held or transferred by ExperienceBridge.",
        "ip_ownership_terms": "SYNTHETIC demo terms: student keeps portfolio rights to their own work.",
        "confidentiality_terms": "Synthetic data only; no real patient information.",
        "mentor_plan": "Weekly check-in and an independent rubric review by the assigned mentor.",
    }, org.get(f"/projects/{project['id']}")["row_version"]).json()
    project = org.post(f"/projects/{project['id']}/submit-review", {"terms_version_id": terms["id"]}, org.get(f"/projects/{project['id']}")["row_version"]).json()
    project = admin.post(f"/admin/projects/{project['id']}/decisions", {"decision": "approve", "explanation": "SYNTHETIC demo approval.", "terms_version_id": terms["id"], "snapshot_hash": terms["content_hash"]}, project["row_version"]).json()
    assert project["status"] == "open", project["status"]
    listed = student.get("/projects").get("items", [])
    assert any(p["id"] == project["id"] for p in listed), "published project not visible to student"
    print(f"ok    project open and visible to student: {project['title']}")

    if not args.full:
        print("\nDemo accounts ready (password = your EB_DEMO_PASSWORD):")
        for key, (email, _) in ACCOUNTS.items():
            print(f"  {key:8} {email}")
        return 0

    # Student applies; org shortlists and offers; student accepts.
    application = student.post(f"/projects/{project['id']}/applications", {
        "seen_terms_version_id": terms["id"],
        "motivation": "[DEMO] I have built accessible forms in React during my coursework and want real project experience.",
        "declared_skills": ["React", "TypeScript", "Accessibility"],
        "links": [{"label": "Portfolio", "url": "https://example.com/demo-portfolio"}],
        "weekly_minutes_available": 600,
    }, project["row_version"]).json()
    application = org.post(f"/applications/{application['id']}/shortlist", {}, application["row_version"]).json()
    expires = (datetime.now(timezone.utc) + timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    offer = org.post(f"/applications/{application['id']}/offer", {"terms_version_id": terms["id"], "expires_at": expires}, application["row_version"]).json()
    participation = student.post(f"/offers/{offer['id']}/accept", {"terms_version_id": terms["id"], "terms_hash": terms["content_hash"], "consent_statement_version": "supervisor-v1", "explicitly_accepted": True}, offer["row_version"]).json()

    # Org assigns mentor; mentor accepts; org starts project.
    assignment = org.post(f"/participations/{participation['id']}/mentor-assignments", {"mentor_user_id": mentor_me["id"], "context": "[DEMO] Review the scheduling prototype milestone.", "expires_at": expires}, participation["row_version"]).json()
    mentor.post(f"/mentor-assignments/{assignment['id']}/accept", {"conflict_declared": False, "confidentiality_acknowledged": True}, assignment["row_version"])
    org.post(f"/projects/{project['id']}/start", {}, org.get(f"/projects/{project['id']}")["row_version"])

    # Student submits work with an external artifact.
    part = student.get(f"/participations/{participation['id']}")
    submission = student.post(f"/participations/{participation['id']}/submissions", {"milestone_index": 0, "summary": "[DEMO] Scheduling prototype with validated form and accessible list.", "contribution_statement": "I built the form, validation and list components and their tests."}, part["row_version"]).json()
    student.post(f"/submissions/{submission['id']}/external-artifacts", {"kind": "external_url", "label": "[DEMO] Prototype repository", "url": "https://example.com/demo-repository"})
    submission = student.post(f"/submissions/{submission['id']}/submit", {}, student.get(f"/submissions/{submission['id']}")["row_version"]).json()

    # Mentor review, then organization review (separate records).
    mentor.post(f"/submissions/{submission['id']}/mentor-reviews", {"decision": "reviewed", "participant_feedback": "[DEMO] Clear structure and good keyboard support; add more edge-case tests next time.", "observations": [{"criterion_text": "Form validates required fields", "score": 4, "observation": "All required fields are validated with helpful messages."}], "manager_summary": "[DEMO] Solid milestone delivery."}, submission["row_version"])
    org.post(f"/submissions/{submission['id']}/organization-reviews", {"decision": "accepted", "criteria_results": [{"criterion_text": "Form validates required fields", "met": True, "explanation": "[DEMO] Checked in review."}, {"criterion_text": "Reminders list is keyboard accessible", "met": True, "explanation": "[DEMO] Checked with keyboard only."}], "explanation": "[DEMO] Deliverable accepted."}, org.get(f"/submissions/{submission['id']}")["row_version"])

    # Completion.
    part = student.post(f"/participations/{participation['id']}/mark-ready-for-review", {"requested_outcome": "completed", "explanation": "[DEMO] Milestone delivered and accepted."}, student.get(f"/participations/{participation['id']}")["row_version"]).json()
    org.post(f"/participations/{participation['id']}/finalize", {"outcome": "completed", "explanation": "[DEMO] Milestone criteria met with mentor review."}, part["row_version"])
    org.post(f"/projects/{project['id']}/complete", {"explanation": "[DEMO] All participations reviewed."}, org.get(f"/projects/{project['id']}")["row_version"])

    # What the passport screen reads.
    parts = student.get("/me/participations").get("items", [])
    done = [p for p in parts if p["id"] == participation["id"]]
    assert done and done[0]["status"] == "completed", done
    reviews = student.get(f"/submissions/{submission['id']}/mentor-reviews").get("items", [])
    org_reviews = student.get(f"/submissions/{submission['id']}/organization-reviews").get("items", [])
    print(f"ok    passport data: participation completed, {len(reviews)} mentor review(s), {len(org_reviews)} organization review(s)")
    print("\nFull demo flow completed. Sign in as the student and open /student/passport.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
