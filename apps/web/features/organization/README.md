# Organization Portal — checkpoint handoff

## Current status

**Latest continuation:** See [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md)
for the current run, checkpoint results and remaining blockers. The historical
O02 handoff below is retained; its instruction to stop before O03 is superseded
by the user's explicit authorization to continue the remaining checkpoints.

**Current delivery:** [DELIVERY_REPORT.md](./DELIVERY_REPORT.md) covers O03–O09/O11
implementation, 41 passing tests, lint/typecheck/build, working localhost:3000 URLs,
exact changed files and Git commands. O10 visual QA is partial; O12 awaits owner
agreement; O13 is blocked on approved backend contracts; O14 real E2E remains pending.

**Rendering repair follow-up:** A shared Turbopack rule was misclassifying CSS
Modules as global CSS. The user approved a narrow configuration fix; see
[UI_RENDERING_FIX.md](./UI_RENDERING_FIX.md) for before/after evidence, the new
stylesheet/class-binding regression, and validation. The O02 report below
describes the earlier implementation run; visual acceptance remains pending.

2026-10-31, branch `lib`. Owner: Marinus. Synthetic BUILD presentation only.
The current user request authorizes O02 and organization route wiring. No issue
number or independent human reviewer was supplied; no release approval is implied.

**O02 implementation is ready for review, but O02 is NOT complete or accepted.**
Desktop/tablet/mobile visual review and browser interaction QA remain pending:
the browser access host returned unavailable. No screenshots, focus/keyboard,
animation, or responsive visual passes are claimed.

| Checkpoint | Evidence / remaining work |
| --- | --- |
| O00 | Repository, instructions, complete portal spec, existing routes and working tree audited. |
| O01 | Foundation implemented previously; automated checks pass. Browser QA remains pending. |
| O02 | Dashboard implemented in this run. Automated checks pass. Premium visual/interaction acceptance remains pending. |
| O03–O09 | Pending. Project creation, applicant decisions, full workspace, invites, deliverable decisions, messages and settings are not implemented by O02. |
| O10 | Pending portal-wide UX audit. |
| O11 | Existing organization-only route wiring retained; dashboard loading/error boundaries connected. |
| O12–O14 | Pending contract review, separately authorized integration, and release/security verification. |

## O02 implementation

- Distinct metric strip, priority list, two project previews and a quieter activity
  column. Restrained navy/teal palette, consistent line icons, progress bars,
  subtle hover/press feedback, visible focus and reduced-motion rules.
- Four metrics derived from the same synthetic records shown in their drilldowns.
  Upcoming deadlines include the snapshot day through seven days later; overdue
  work remains in the attention queue.
- Category buttons and project dropdown filter the attention queue together.
  Empty combinations offer reset and announce the result count.
- Searchable, URL-addressable read-only collection/record dialogs. Activity links
  open exact records. Missing records/unknown views produce recovery guidance.
- Native modal focus containment, background inertness, Escape/backdrop dismissal,
  scroll locking, and focus restoration implemented, pending browser confirmation.
- Actual Suspense/loading fallback and route error boundary with retry. Explicit
  local-only empty/loading/error previews make manual QA reproducible.
- Fixed synthetic snapshot dated 31 October 2026. Names and labels are fictional;
  no verified organization, real applications, mentor assessment or acceptance is
  claimed. No API requests, persistent writes, payments or permission changes.
- Removed the duplicate feature-level presentation banner while retaining the
  shared local-mode notice, header synthetic badge and unmistakable sample labels.

Scope limitation: **Create project** navigates to the existing planned O04 route.
**Preview workspace** opens a read-only O02 project summary, not a completed O07
workspace. This run does not claim those later workflows are functional.

## References and design rationale

Read the portal specification §§5–7/9, UI/UX §§13–15, and the repository's local
Next.js Link/useSearchParams documentation. Relevant trust requirements remain
AUTH-001/002 and ORG-001/002; no backend DTO/state/ADR was introduced.

Reference documentation reviewed for inspiration (no code copied or packages added):

- [Framer hover and press](https://www.framer.com/academy/lessons/framer-animations-hover-and-press-effects): short feedback on interactive elements.
- [Aceternity tabs](https://ui.aceternity.com/components/tabs): distinct selection states; implemented as ordinary filter buttons, not copied animated tab stacks.
- [Magic UI animated list](https://magicui.design/docs/components/animated-list): legible activity hierarchy; all events remain visible, without a looping demo.
- [Linear features](https://linear.app/features): workflow-oriented information organization.

The design uses the existing system font and feature-scoped CSS. Reference browsing
was textual; it does not substitute for rendered local visual acceptance.

## Exact files changed in the O02 run

Within `apps/web/features/organization/`:

Modified:

- `README.md`
- `screens/organization-dashboard-screen.tsx`
- `data/synthetic-organization-data.ts`
- `components/ui/organization-ui.tsx`
- `components/layout/organization-portal-shell.tsx`
- `components/layout/organization-shell.module.css`

Created:

- `components/dashboard/dashboard.module.css`
- `components/dashboard/dashboard-detail.tsx`
- `components/dashboard/dashboard-project-card.tsx`
- `components/dashboard/dashboard-states.tsx`
- `data/synthetic-dashboard.ts`
- `lib/dashboard-selectors.ts`
- `types/dashboard.ts`
- `tests/organization-dashboard.test.mjs`

Within `apps/web/app/(portals)/organization/dashboard/`:

- Modified `page.tsx` to use the dashboard skeleton fallback.
- Created `loading.tsx` and `error.tsx`.

Also modified `apps/web/app/(portals)/organization/[...slug]/page.tsx` to place
URL parameter access inside Suspense. The server log exposed an existing Next.js
instant-navigation warning that HTTP status checks alone did not detect.

Existing organization work, shared authentication, global styles, teammate portals,
backend, dependencies, and unrelated staged/unstaged edits were preserved.

## Tests actually executed

```powershell
npm.cmd run lint --workspace apps/web -- features/organization 'app/(portals)/organization'
npm.cmd run lint --workspace apps/web
npm.cmd run typecheck --workspace apps/web
npm.cmd run build --workspace apps/web
$env:PORTAL_TEST_URL = 'http://localhost:3002'
node --test apps/web/features/organization/tests/*.test.mjs apps/web/tests/portal-presentation.test.mjs
git diff --check
```

PASS: lint, typecheck, production build, and 10 Node tests with no failures or skips
in the live-server run. The first offline run passed 8 and skipped 2 HTTP tests;
those HTTP tests were subsequently executed successfully. Node emitted a package
module-type warning. HTTP tests cover the seven existing organization screens plus
normal/detail/empty/loading/error/invalid dashboard states. Selector tests cover
count consistency, combined filters, search, date-window boundaries, empty data,
link encoding and fixture integrity. The existing environment matrix rejects
presentation mode in production, staging and hosted environments.
After the catch-all Suspense fix, the ten tests and production build passed again;
the fresh dev-server output showed successful route requests without the prior
URL-data navigation warning.

NOT RUN: browser interaction tests, device screenshots, visual comparison, measured
contrast/focus review, reduced-motion emulation and real backend authorization E2E.
Passing compilation or server-render checks is not visual acceptance.

## Manual acceptance checklist — ALL PENDING

Review at 375, 768, 1280 and 1440 CSS pixels, then 200% zoom:

1. Check no horizontal overflow, readable text and consistent spacing/alignment.
   Metric strip should become 2 columns on mobile; project cards stack; activity
   moves below the main column; mobile navigation replaces the sidebar.
2. Keyboard through skip link, menu, metrics, filters, project select and links.
   Focus must remain visible. Menu/dialog must trap focus and restore it on close.
3. Open each metric: counts must match rows. Search, clear search, open a record,
   return to the list, dismiss, and use browser Back/Forward.
4. Combine Reviews + Local market insights: empty view; Reset filters restores all.
   Check that announcements describe the actual number of displayed items.
5. Open every attention/activity/project link and check the exact record and labels.
6. Check hover/press states and entrance motion; repeat with reduced motion enabled.
7. Review sample loading/empty/error views. Retry exits the explicit error preview;
   the actual route error boundary calls Next.js reset.
8. Refine any clutter, weak hierarchy, contrast problem, overflow or awkward motion
   before marking O02 complete. Full project creation/workspace actions remain later scope.

## Local review

From `apps/web` in Git Bash:

```bash
npm run dev -- --port 3002
```

URLs:

- http://localhost:3002/organization/dashboard
- http://localhost:3002/organization/dashboard?view=applications
- http://localhost:3002/organization/dashboard?view=reviews&record=review-wireframes
- http://localhost:3002/organization/dashboard?sample=empty
- http://localhost:3002/organization/dashboard?sample=loading
- http://localhost:3002/organization/dashboard?sample=error

The temporary server used for this run is stopped after verification, so it should
not block your own dev command. No commit, push, merge or deployment was performed.
No dependency, configuration or migration changes.

Suggested commit: `feat(organization): add interactive dashboard preview`

From the repository root, review and commit only the authorized organization paths.
The scoped commit excludes the unrelated ADR already staged in the original tree;
it includes the pre-existing organization foundation needed by the dashboard.

```bash
git status --short
git add -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git diff --cached --check
git diff --cached -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git commit --only -m "feat(organization): add interactive dashboard preview" -- apps/web/features/organization 'apps/web/app/(portals)/organization'
git push origin lib
```

Stop here. Do not start O03 until O02 visual/interaction review is completed and the
user authorizes the next checkpoint.
