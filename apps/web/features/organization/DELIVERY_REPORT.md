# Organization Portal continuation — 31 October 2026

Branch: `lib`. Human owner: Marinus. Release: synthetic BUILD presentation.
No issue number or independent reviewer supplied; no release approval implied.

## Outcome and checkpoint status

| Checkpoint | Status |
| --- | --- |
| O00 | Repository/spec/ownership audit retained and refreshed |
| O01–O02 | Existing shell/dashboard preserved; CSS confirmed by served selectors and browser screenshots; full visual acceptance still pending |
| O03 | Project list/detail implementation complete with automated checks |
| O04 | Five-step wizard implementation complete with automated checks; full browser form/exit-prompt QA pending |
| O05 | Application decisions implemented and tested locally; offers never create membership |
| O06 | Team/invitations implemented and tested locally; invitations never grant assignment |
| O07 | Six-section workspace implemented and tested locally; real completion lifecycle deferred |
| O08 | Versioned review decisions implemented and tested locally; independent assessment preserved |
| O09 | Messages, notifications and settings implemented and tested locally |
| O10 | Partial: shared polish/states complete; full device/keyboard/motion QA incomplete |
| O11 | Actual organization route wiring implemented and tested |
| O12 | Partial: evidence-backed contract gap report complete; human owner agreement pending |
| O13 | BLOCKED: no executable organization contracts or separately approved backend scope |
| O14 | Partial: local tests/lint/typecheck/build pass; real API/security E2E and release gates pending |

All new workflows are explicitly synthetic. Decisions are in memory and reset on
refresh. Only explicitly saved wizard drafts receive a sessionStorage backup in
the current tab, restored with Restore saved draft; this is not database persistence.
Do not enter real participant or confidential organization data. No emails,
notifications to real people, payments, production mutations, or role grants occur.

## CSS and browser evidence

The previously approved Next.js CSS Modules exclusion remains unchanged. Live
stylesheet regression tests confirm scoped selectors bind to actual HTML and
global Tailwind utilities remain available. New-screen CSS checks cover projects,
wizard, applications, reviews, messages and settings.

Used the computer-use skill to access Chrome after the browser host failed.
Observed styled dashboard at a full desktop window and a narrow window; observed
My Projects and wizard headers at DevTools width 390 CSS pixels. Tested navigation
drawer opening, navigation to projects, Escape dismissal with visible focus restored
to the trigger, project search, no-result state and Clear filters recovery.

The user stopped Computer Use using physical Escape during the mobile wizard check.
No further browser input was issued. NOT PASSED: complete wizard traversal,
application/review/message interaction E2E, exact 768px tablet pass, all-screen
responsive consistency, full focus trapping, reduced-motion emulation, measured
contrast, and comprehensive browser console inspection. The subsequent small mobile
header refinement has automated/build validation only. O10 is not visually accepted.

## Tests actually run

Each O03–O09 implementation was followed by its feature state/live-route tests,
organization-scoped ESLint and workspace typecheck before the next implementation.
Exact results and files by checkpoint are in IMPLEMENTATION_PROGRESS.md.

Final commands:

```powershell
$env:PORTAL_TEST_URL = 'http://localhost:3000'
node --test apps/web/features/organization/tests/*.test.mjs apps/web/tests/portal-presentation.test.mjs apps/web/tests/portal-routes.test.mjs
npm.cmd run lint --workspace apps/web
npm.cmd run typecheck --workspace apps/web
npm.cmd run build --workspace apps/web
git diff --check
```

- PASS: 41 tests, 0 failures, 0 skipped (includes five nested route smoke tests).
- PASS: whole-web ESLint, TypeScript, optimized production build (30 pages).
- PASS: diff whitespace check; Git prints expected LF/CRLF conversion notices.
- PASS: existing Student/Mentor/Admin local route smoke tests and local-only
  presentation environment matrix. These are not full regression/visual audits.
- PASS: invalid input, wrong local actor, stale revisions, duplicate decisions,
  capacity, terms version, project isolation, review criteria and independence tests.
  Local actor guards are not evidence of real backend authorization.
- Initial TypeScript extension import failure corrected with a test-only resolver.
  Initial expanded CSS assertion selected a streamed fallback; corrected and reran.
  Final failures: none. Node emits a non-failing module-type warning.

Production authentication code was not modified. Real unauthorized-actor API E2E,
multi-session concurrency, persistence and release/security verification are NOT RUN
because those organization contracts do not exist.

## Local URLs

The existing Next server is on **3000**, not the older 3002. Starting a second
`next dev` for the same app was rejected by Next's lock; the existing server was
reused and left running. Do not launch a duplicate server while it is running.

- http://localhost:3000/organization/dashboard
- http://localhost:3000/organization/projects
- http://localhost:3000/organization/projects/new
- http://localhost:3000/organization/projects/demo-draft/edit
- http://localhost:3000/organization/projects/demo-health
- http://localhost:3000/organization/applications
- http://localhost:3000/organization/projects/demo-health/team
- http://localhost:3000/organization/projects/demo-health/workspace
- http://localhost:3000/organization/reviews?submission=review-wireframes
- http://localhost:3000/organization/messages?project=demo-health
- http://localhost:3000/organization/notifications
- http://localhost:3000/organization/settings

Workspace sections use `?tab=overview|team|milestones|updates|deliverables|discussion`.
State previews: `/organization/projects?sample=loading` and `?sample=error`.
After stopping an existing server yourself, `npm run dev -- --port 3002` from
`apps/web` serves the same routes on 3002.

## Backend dependencies and review

See [API_INTEGRATION_GAPS.md](./API_INTEGRATION_GAPS.md). Checked-in OpenAPI contains
only health and identity; domain routers intentionally have no business operations.
O13 requires approved organization/project/offer/mentor/review/discussion contracts,
membership and state rules, cross-owner review, and a separately assigned backend
scope. Do not map local presentation labels directly into database enums.

No Student/Mentor/Admin implementation, shared authentication, global styling,
Next.js configuration, backend, package manifest or lockfile was edited in this run.
Pre-existing modifications to engineering standards, the staged ADR-011, and
package-lock remain untouched. No commit, push, merge or deploy was performed.

## Manual Git handoff

Recommended commit: `feat(organization): add synthetic project workflows`

Run in Git Bash (works from the repository root or `apps/web`):

```bash
cd "$(git rev-parse --show-toplevel)"
git status --short
git diff -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git add -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git diff --cached --check -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git diff --cached --stat -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git diff --cached -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git commit --only -m "feat(organization): add synthetic project workflows" -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git push origin lib
```

The scoped commit excludes the unrelated ADR already staged. Review all new files
in the staged diff before committing. Obtain independent human review; this report
does not self-approve the change.

## Exact changed files

- apps/web/app/(portals)/organization/[...slug]/error.tsx
- apps/web/app/(portals)/organization/[...slug]/loading.tsx
- apps/web/app/(portals)/organization/[...slug]/page.tsx
- apps/web/app/(portals)/organization/layout.tsx
- apps/web/features/organization/API_INTEGRATION_GAPS.md
- apps/web/features/organization/components/dashboard/dashboard-detail.tsx
- apps/web/features/organization/components/dashboard/dashboard-project-card.tsx
- apps/web/features/organization/components/layout/organization-portal-shell.tsx
- apps/web/features/organization/components/layout/organization-shell.module.css
- apps/web/features/organization/components/ui/portal.module.css
- apps/web/features/organization/components/ui/portal-states.tsx
- apps/web/features/organization/components/ui/portal-ui.tsx
- apps/web/features/organization/components/ui/project-discussion.tsx
- apps/web/features/organization/data/portal-fixtures.ts
- apps/web/features/organization/DELIVERY_REPORT.md
- apps/web/features/organization/hooks/organization-demo-context.tsx
- apps/web/features/organization/hooks/use-demo-action.ts
- apps/web/features/organization/hooks/use-unsaved-changes.ts
- apps/web/features/organization/IMPLEMENTATION_PROGRESS.md
- apps/web/features/organization/lib/brief-validation.ts
- apps/web/features/organization/lib/dashboard-selectors.ts
- apps/web/features/organization/lib/demo-transitions.ts
- apps/web/features/organization/lib/organization-routes.ts
- apps/web/features/organization/lib/portal-dashboard.ts
- apps/web/features/organization/lib/profile-validation.ts
- apps/web/features/organization/lib/project-selectors.ts
- apps/web/features/organization/README.md
- apps/web/features/organization/screens/organization-applications-screen.tsx
- apps/web/features/organization/screens/organization-dashboard-screen.tsx
- apps/web/features/organization/screens/organization-feature-router.tsx
- apps/web/features/organization/screens/organization-messages-screen.tsx
- apps/web/features/organization/screens/organization-projects-screen.tsx
- apps/web/features/organization/screens/organization-project-wizard.tsx
- apps/web/features/organization/screens/organization-reviews-screen.tsx
- apps/web/features/organization/screens/organization-settings-screen.tsx
- apps/web/features/organization/screens/organization-team-screen.tsx
- apps/web/features/organization/screens/organization-workspace-screen.tsx
- apps/web/features/organization/tests/organization-applications.test.mjs
- apps/web/features/organization/tests/organization-communications.test.mjs
- apps/web/features/organization/tests/organization-integration.test.mjs
- apps/web/features/organization/tests/organization-projects.test.mjs
- apps/web/features/organization/tests/organization-reviews.test.mjs
- apps/web/features/organization/tests/organization-team.test.mjs
- apps/web/features/organization/tests/organization-wizard.test.mjs
- apps/web/features/organization/tests/organization-workspace.test.mjs
- apps/web/features/organization/tests/register-typescript.mjs
- apps/web/features/organization/types/dashboard.ts
- apps/web/features/organization/types/portal.ts
