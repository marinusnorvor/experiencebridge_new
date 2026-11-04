# ExperienceBridge — Complete Application Recovery, Integration & Production Readiness Report

**Date:** 3 November 2026  
**Integration Branch:** `fix/experiencebridge-full-integration` (based on `lib` @ `6432bbd`)  
**Scope:** End-to-end inspection, defect resolution, authentication/contextual authorization alignment, OpenAPI/TypeScript contract synchronization, dynamic cross-portal data wiring across Student, Organization, Mentor, and Admin portals, and automated E2E workflow verification.

---

## 1. Root Causes Identified and Resolved

1. **Identity & Contextual Portal Role Resolution (`GET /api/v1/me`):**
   - **Root Cause:** `list_effective_contexts` in `apps/api/app/identity/service.py` previously derived `effective_contexts` solely from `user_role_grants`, ignoring active `OrganizationMembership`, `MentorProfile`/`MentorAssignment`, and `Application`/`Participation` records created through normal portal onboarding.
   - **Resolution:** Updated `list_effective_contexts(db, user)` and `apps/api/app/identity/router.py` so `GET /api/v1/me` computes `effective_contexts` from both explicit `user_role_grants` and active relational records (`OrganizationMembership` + active `Organization`, `MentorProfile` / non-revoked `MentorAssignment`, and `Application` / `Participation`), while always preserving `"student"` and enforcing `platform_admin` via server-verified role grants.

2. **Submitted Project Terms Snapshot Resolution (`submitted_terms_version_id`):**
   - **Root Cause:** When an organization submitted a project for moderation (`status = "pending_review"`) or when an admin requested changes (`status = "changes_requested"`), `published_terms_version_id` remained `null`. Organization project lists and detail views could not load the submitted compensation, IP, confidentiality, and mentor terms snapshot before publication.
   - **Resolution:** Added `submitted_terms_version_id` to `ProjectRead` in `apps/api/app/projects/schemas.py`, updated `add_published_terms_ids`, `organization_projects`, `get_project`, `submit_project`, and `project_decision` in `apps/api/app/projects/router.py`, synchronized `packages/api-client/openapi.json` and `packages/api-client/src/generated/schema.d.ts`, and updated `apps/web/features/organization/hooks/organization-demo-context.tsx` to resolve `published_terms_version_id ?? submitted_terms_version_id`.

3. **Organization Project Wizard & Live Validation Synchronization:**
   - **Root Cause:** Navigating directly to `/organization/projects/[id]/edit` rendered an empty brief if the async context fetch finished after initial mount; `validateBrief` enforced planning-only fields that are not stored in the API draft schema; and `organization-projects-screen.tsx` rendered an empty badge when `skills` was empty.
   - **Resolution:** Derived active wizard state directly from `!dirty && existing ? existing : draftBrief` in `apps/web/features/organization/screens/organization-project-wizard.tsx`, added `validateLiveBrief` in `apps/web/features/organization/lib/brief-validation.ts`, added `"Needs revision"` to `ProjectStatus`, and filtered empty skill tags in `apps/web/features/organization/screens/organization-projects-screen.tsx`.

4. **Missing Root Portal Entry Redirects (`/admin` and `/mentor`):**
   - **Root Cause:** Navigating to `/admin` or `/mentor` returned HTTP 404 because only `/admin/dashboard` and `/mentor/dashboard` existed, whereas `/student` and `/organization` had index redirect pages.
   - **Resolution:** Added `apps/web/app/(portals)/admin/page.tsx` and `apps/web/app/(portals)/mentor/page.tsx` redirecting to `/admin/dashboard` and `/mentor/dashboard`.

5. **Mentor Portal Date Crash & Live Refresh:**
   - **Root Cause:** `formatDate` in `apps/web/features/mentor/components/participation-context.tsx` called `new Date(iso).toISOString()` without guarding against non-ISO placeholder strings (`"Not scheduled"`), throwing `RangeError: Invalid time value`.
   - **Resolution:** Guarded `formatDate` with `Number.isNaN(parsed.getTime())` fallback and wired `onChanged` reload callbacks across `assignment-proposal-detail.tsx` and `mentor-record-connected.tsx`.

6. **Student Portal Live Dashboard, Passport & Profile Wiring:**
   - **Root Cause:** In live mode (`!preview`), `StudentDashboardView`, `StudentPassportView`, and `StudentProfileView` fell back to empty placeholders or static fixtures instead of computing live decisions, 4-tier evidence assertions, mentor rubric competencies, and self-reported application skills from backend records.
   - **Resolution:** Implemented `loadStudentPassportAndDecisions(api)` in `apps/web/features/student/lib/api-records.ts` and connected `student-dashboard-view.tsx`, `student-passport-view.tsx`, and `student-profile-view.tsx` to live API endpoints with `useVisibleRefresh`.

---

## 2. Verification & Automated Test Results

- **Backend Test Suite (`pytest`):**
  - Command: `apps/api/.venv/Scripts/python.exe -m pytest app/tests -k "not live_neon" -q`
  - Result: **86 PASSED, 0 FAILED** (includes `test_e2e_mvp_workflows.py` covering all 5 cross-portal MVP workflows A–E, `test_identity_auth.py`, `test_supervisor_projects.py`, `test_supervisor_applications.py`, `test_supervisor_mentorship_assessments.py`, `test_migration_consistency.py`, `test_production_configuration.py`, `test_database_connectivity.py`, `test_database_runtime.py`, `test_config.py`, `test_health_and_app.py`).
- **Frontend Unit & Adapter Integration Tests (`node --test`):**
  - Command: `node --experimental-strip-types --test tests/*.test.mjs features/organization/tests/*.test.mjs`
  - Result: **47 PASSED, 0 FAILED, 13 SKIPPED** (optional browser/DOM smoke checks).
- **TypeScript Typecheck (`tsc`):**
  - Command: `npx.cmd tsc --noEmit`
  - Result: **PASS (exit code 0, 0 errors)**.
- **ESLint (`eslint`):**
  - Command: `npm.cmd run lint`
  - Result: **PASS (exit code 0, 0 errors, 0 warnings)**.
