# Gap analysis — PRODUCT-PLAN §4 journeys vs the code (6 Nov 2026, 00:50)

For the record (TONIGHT-SPRINT §1: written, not waiting for approval). Endpoints are under `/api/v1`.
**Live** = calls the real API in production. Preview fixtures only load when `NODE_ENV=development` and
`NEXT_PUBLIC_PORTAL_PREVIEW=true` off-Vercel.

## Blockers (fix tonight)

| # | Problem | Fix tonight (no permission change) |
|---|---|---|
| G1 | A new user can't create an organisation or mentor profile: `/organization/*` and `/mentor/*` are gated on `effective_contexts`, which only appear after the org/mentor profile exists. | `/onboarding` (inside the student-level signed-in area) calls `POST /organizations` / `PUT /me/mentor-profile`, then `refresh()` → contexts appear → redirect. |
| G2 | Register does not sign in (202 only). | Sign-up form calls register → login → refresh (already does) → `/onboarding?path=…`. |
| G3 | Developer jargon on live screens ("STU-01", "D2 Workspace", "synthetic", "Supervisor demonstration", "API ID: …", "sample brief"). | Copy pass across portal screens (B5, earlier where touched). |
| G4 | `/mentor/submissions/[id]/review` always renders sample data. | Point mentor review to the live `mentor-review-panel` inside `/mentor/participations/[id]` (B4). |
| G5 | Org `start-review` has no client method, so `under_review` is unreachable. | Optional; shortlist/offer/reject work. Add only if time (B3). |
| G6 | No Action Centre. | Client-derived from list endpoints (B4). |
| G7 | No unlisted admin URL. | `ADMIN_PATH_SECRET` rewrite in `proxy.ts` (B1). |

## Organisation (§4.1)

| Step | Endpoint | Screen | State | Gap |
|---|---|---|---|---|
| 1 Profile | POST /organizations (`display_name`, `description` only) | `/organization/settings` | Live | No sector/size/website/location/logo fields in API → onboarding asks only name + description (no invented fields). G1. |
| 2 Verify | POST /organizations/{id}/submit-verification | settings | Live | Needs "under review, usually within 48h" state. |
| 3 Admin decision | POST /admin/organizations/{id}/decisions | settings badge | Live | Admin reason not shown to org. |
| 4 Project wizard | POST /organizations/{id}/projects, PATCH /projects/{id}, POST /projects/{id}/terms-versions | `/organization/projects/new` | Live | API has no skills/deliverables fields (wizard says so on screen). No autosave live. |
| 5 Submit for review | POST /projects/{id}/submit-review | wizard | Live | Shows raw project IDs. |
| 6 Applications | GET /projects/{id}/applications; shortlist/reject/offer; revoke | `/organization/applications` | Live | G5; no Passport on applicant card. |
| 7 Start | POST /projects/{id}/start | `/organization/projects/{id}/workspace` | Live | — |
| 8 Assign mentor | GET /organizations/{id}/mentors; POST /participations/{id}/mentor-assignments | `/organization/projects/{id}/team` | Live | No org-nominated supervisor (backend B4, out tonight). |
| 9 Review | POST /submissions/{id}/organization-reviews | `/organization/reviews` | Live | Jargon. |
| 10 Finalise | POST /participations/{id}/finalize; POST /projects/{id}/complete | workspace | Live | — |

## Student (§4.2)

| Step | Endpoint | Screen | State | Gap |
|---|---|---|---|---|
| 1 Profile | GET/PUT /me/student-profile (institution, programme, grad year, hours, domains, links, skills w/ proficiency) | `/student/profile` | Live | No onboarding / completeness meter. Backend fields already exist (plan item B5 not needed). |
| 2 Discover | GET /projects (`q`, paging) | embedded in `/student/applications` | Live | No dedicated discover page, no filters. |
| 3 Apply/withdraw | POST /projects/{id}/applications; POST /applications/{id}/withdraw | apply modal, `/student/applications/[id]` | Live | "Synthetic profile" copy. |
| 4 Offer | GET /me/offers; accept/decline | application detail | Live | — |
| 5 Workspace | submissions, artifacts, submit, mark-ready-for-review | `/student/projects/[id]` | Live | Jargon; STU-12 "report" makes a fake client-side ticket. |
| 6 Passport | none (derived client-side from participations + reviews) | `/student/passport` | Live | Needs the hero redesign. No PDF/public link (out tonight). |

## Mentor (§4.3)

| Step | Endpoint | Screen | State | Gap |
|---|---|---|---|---|
| 1 Profile | GET/PUT /me/mentor-profile (bio, skills, availability, capacity, directory opt-in) | `/mentor/dashboard` form | Live | G1. No years/industries/LinkedIn fields in API. |
| 2 Eligibility | POST /admin/mentors/{id}/eligibility | admin | Live | — |
| 3 Assignments | GET /me/mentor-assignments; accept/decline | `/mentor/dashboard`, `/mentor/assignments/[id]` | Live | Always-on "synthetic records" banner. |
| 4 Review | POST /submissions/{id}/mentor-reviews | `/mentor/participations/[id]` (live) · `/mentor/submissions/[id]/review` (mock) | Mixed | G4. |
| 5 Mentees/end | POST /mentor-assignments/{id}/end | participation page | Live | — |

## Admin (§4.4)
All live under `/admin/*` (stats, org/project/mentor queues, oversight, audit). Gaps: G7; dark indigo theme
off-brand; check queues-before-stats order.

## Status enums (source of truth for `StatusBadge`)
Application: submitted, under_review, shortlisted, rejected, offered, withdrawn · Offer: offered, accepted,
declined, expired, revoked · Participation: active, under_review, completed, partially_completed, withdrawn,
cancelled · Submission: draft, submitted, revision_requested, withdrawn · Assignment: proposed, accepted,
declined, expired, ended · Mentor review: reviewed, revision_requested, unable_to_assess · Org review:
accepted, revisions_requested, rejected · Mentor eligibility: pending, approved, rejected, suspended · Org
verification: draft, submitted, verified, changes_requested, rejected · Project: draft, pending_review,
changes_requested, rejected, open, in_progress, completed, cancelled.

## Backend proposals (unchanged from PRODUCT-PLAN §7; none built tonight except §5.1 after approval)
Org profile fields (sector/size/website/location) and project skills/deliverables are **not** in the API —
the UI will not invent them. Proposal for after the user test.
