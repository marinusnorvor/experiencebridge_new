# EB-012 ? Real Portal Integration

## Issue and scope
- Issue: EB-012; Owner: D1; Reviewer: D2, acceptance and independent review pending; Release: BUILD.
- Branch: dev/marinus, fast-forwarded from 2c9c140 to approved origin/staging 703e1b8. No new commits, push, remote merge, or deployment.
- PRD: AUTH-001/002, SEC-001/002, PRIV-001, ACC-001. UI: PUB-01, STU-01/02/03/04/06/07, MEN-01/02/03, ORG-01, ADM-01. ADR-002 and C-01 remain unchanged outside the explicitly requested local presentation exception.

## Implementation
- Homepage and responsive shared navigation open actual portal routes. Removed the seven generic demo-only files.
- Local `next dev` renders the actual merged Student and Mentor implementations without Clerk or identity API requests. Existing fixture labels and browser-local interactions remain.
- Organization and Admin retain their existing reserved-route components, with a safe unavailable state instead of an identity API request in local presentation mode.
- Clerk dependencies, sign-in/up screens, API diagnostics, deployed frontend guards, and backend JWT/role checks remain available.
- Fixed the Student Passport link to the existing dashboard preview and the project action to the real sample participation ID.
- Missing Student workspace details now display an unavailable state instead of copying an unrelated workspace. Existing saved workspaces must match the requested participation ID.
- No backend, database, dependency lockfile, secrets, or Vercel configuration changes. No migration required.

## Tests actually run
- `npm.cmd ci --no-audit --no-fund` ? PASS after stopping only the existing ExperienceBridge server holding a native dependency open. Initial attempts failed with Windows EPERM; package versions were not changed.
- `npm.cmd run lint --workspace apps/web` ? PASS.
- `npm.cmd run typecheck --workspace apps/web` ? PASS.
- `npm.cmd run build --workspace apps/web` ? PASS, including after final code fixes.
- `$env:PORTAL_TEST_URL = 'http://localhost:3002'; node --test apps/web/tests/*.test.mjs` ? PASS: 18 reported tests, comprising the environment guard, 16 HTTP route cases, and their parent test. Node emits a harmless module-type warning when directly importing TypeScript.
- From `apps/api`: `.venv/Scripts/python.exe -m pytest app/tests/test_identity_auth.py -p no:cacheprovider` ? PASS: 11 tests. Includes missing/invalid/expired tokens, role escalation rejection, suspended account rejection, signing-key rotation, and a read-only development schema check. Existing FastAPI/httpx deprecation warning. Initial repository-root venv lacked pytest; the API's own venv succeeded.
- `git diff --check` ? PASS. Changed-file credential-pattern scan ? no matches. Backend/configuration diff ? empty. Original staged documentation compared against the preserved stash index ? identical.
- Browser: homepage, all four portal links, Student Profile navigation and 390px mobile layout verified in Chrome. Console inspected without application errors during these checks.
- Removed `/demo/student` returns HTTP 404. Valid and unknown Student/Mentor detail routes covered in HTTP tests.
- Production `next start` runtime check ? BLOCKED: local production environment has no Clerk secret key; requests fail closed with HTTP 500. Production sign-in/redirect behavior could not be verified with real configuration. No credentials or deployment settings changed.
- Full end-to-end backend workflows, production deployment, and exhaustive mobile/accessibility testing ? NOT RUN; outside local UI integration and not yet implemented across all portals.

## AI-assistance accountability
- AI helped with local branch integration, frontend changes, tests, and browser checks.
- Human review and understanding: pending D1 handoff and independent D2 review. AI did not approve or merge remotely.
- Remaining gaps: Organization/Admin workflows are not merged into staging. Student and Mentor still use existing sample fixtures; Mentor decision/review actions remain disabled. Some Student projects have no detailed workspace yet and now explicitly say so. Discovery links currently return to the homepage because discovery is not implemented. No replacement feature was fabricated.

## Demonstration and release
- Local server: http://localhost:3002 (user chose to preserve unrelated servers on port 3000).
- Actual portal routes: `/student/dashboard`, `/mentor/dashboard`, `/organization/dashboard`, `/admin/dashboard`.
- Sample content remains labeled. No genuine verification, payments, or project completion asserted by this integration.
- Staging/production: not deployed. Production access remains authenticated.
- Existing staged `docs/06-engineering-standards.md` and `docs/decisions/ADR-011-vercel-git-deployment.md` are preserved, plus a backup stash named `EB-012 preserve pre-existing staged deployment documentation`.
- Rollback: revert this frontend change after committing; disable `isPortalPresentationMode()` to restore local sign-in requirements. No database rollback needed.

## Changed files (relative to repository root)
- `apps/web/README.md`
- `apps/web/app/(portals)/layout.tsx`
- `apps/web/app/(public)/dev/integration/layout.tsx`
- `apps/web/app/(public)/page.tsx`
- `apps/web/app/(public)/sign-in/layout.tsx`
- `apps/web/app/(public)/sign-up/layout.tsx`
- `apps/web/app/demo/admin/page.tsx` (removed)
- `apps/web/app/demo/layout.tsx` (removed)
- `apps/web/app/demo/mentor/page.tsx` (removed)
- `apps/web/app/demo/organization/page.tsx` (removed)
- `apps/web/app/demo/student/page.tsx` (removed)
- `apps/web/app/layout.tsx`
- `apps/web/components/demo/demo-portal.tsx` (removed)
- `apps/web/components/layouts/auth-provider.tsx`
- `apps/web/components/layouts/local-auth-layout.tsx`
- `apps/web/components/layouts/portal-placeholder.tsx`
- `apps/web/components/layouts/site-header.tsx`
- `apps/web/features/demo/demo-data.ts` (removed)
- `apps/web/features/student/components/linkedin-profile-card.tsx`
- `apps/web/features/student/components/student-dashboard-view.tsx`
- `apps/web/features/student/components/student-participation-workspace-view.tsx`
- `apps/web/lib/auth/portal-presentation.ts`
- `apps/web/lib/portal-routes.ts`
- `apps/web/proxy.ts`
- `apps/web/tests/portal-presentation.test.mjs`
- `apps/web/tests/portal-routes.test.mjs`
- `apps/web/EB-012-integration-notes.md` (this report)
