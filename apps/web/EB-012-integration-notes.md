# EB-012 - Shared portal routing and staging conflict resolution

## Issue and scope
- Owner: D1. Independent reviewer: D2, pending acceptance. Release: BUILD.
- User clarified scope: shared homepage, navigation, and integration only. Portal owners own their pages, components, fixtures, and behavior.
- Retained references: AUTH-001/002, SEC-001/002, PRIV-001, ACC-001, PUB-01, and ADR-002. No API/schema changes.

## Conflict and resolution
- Local branch: dev/marinus at 0d851d1 before this resolution.
- Incoming staging: 94d2acb, containing Stella's merged PR #24 and Student Passport work.
- Conflict: student-dashboard-view.tsx, where the previous integration changed a link label while Stella added the real Passport destination.
- Earlier integration also modified linkedin-profile-card.tsx and student-participation-workspace-view.tsx. All three files were restored exactly from origin/staging.
- Verified that every file under features/student, features/mentor, features/organization, features/admin, and their app/(portals)/<portal> directories matches origin/staging. No D1 portal implementation changes remain in the resulting tree relative to staging.
- New Student files in the merge come from staging, not new agent implementation. The prior workspace fallback changes and Passport-preview rewrite are withdrawn; existing portal behavior belongs to its owner.
- Shared homepage/navigation, local presentation shell, and obsolete generic demo removal remain. Backend security is unchanged.
- Routing tests now cover the shared homepage and four portal destinations, without prescribing owner-managed sample records or internal workflows.

## How integration works
The shared homepage and header read lib/portal-routes.ts. Each link points to an
existing page in app/(portals)/<portal>/. Those pages render the owner's components
from features/<portal>/. Approved teammate updates appear at those routes after
staging is merged; D1 does not copy or modify their implementations.

## Checks actually run for this resolution
- npm.cmd run lint --workspace apps/web: PASS.
- npm.cmd run typecheck --workspace apps/web: PASS.
- npm.cmd run build --workspace apps/web: PASS, including the incoming Passport routes.
- PORTAL_TEST_URL=http://localhost:3002 with node --test apps/web/tests/*.test.mjs: PASS, 7 reported tests (environment guard, five HTTP routes, and their parent test).
- GET /student/passport: 200; incoming Experience Passport page rendered.
- git diff --cached origin/staging --exit-code for all four portal features and page directories: PASS, exact match.
- Unmerged index entries: none after resolution.
- git diff --cached --check: reports one pre-existing incoming whitespace issue in apps/web/features/student/lib/types.ts (extra blank line at EOF). Preserved the owner's file unchanged. This is not a conflict marker or build failure.
- Backend tests were not rerun in this resolution; no backend or authentication code changed. The prior run passed 11 backend identity tests.
- Browser automation was not repeated; route checks used the running local frontend.

## Handoff and preserved work
- Merge conflicts are resolved and staged locally. The merge still requires a user-created commit and push to update GitHub. No commit, push, remote merge, or deployment was performed by the agent.
- Existing docs/06-engineering-standards.md and docs/decisions/ADR-011-vercel-git-deployment.md were restored to the working tree, intentionally unstaged to exclude them from the merge commit. Their original staged versions are also backed up in the stash named EB-012 preserve staged documentation before staging conflict resolution.
- Do not use git add . for this merge: it would include those unrelated documentation changes.
- Development server remains on http://localhost:3002. Local portal viewing remains sign-in-free; deployed authentication remains unchanged.
- Organization/Admin currently retain staging's existing placeholders. Portal feature gaps should be handled by their assigned owners.
- Independent human review remains pending. No migration or deployment configuration changes.
