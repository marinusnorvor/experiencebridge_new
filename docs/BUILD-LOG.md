# BUILD-LOG — overnight sprint (`feat/overnight-v1`)

Read this first (2 minutes). Newest entries at the top of each section.
Plan: `docs/PRODUCT-PLAN.md` + `docs/TONIGHT-SPRINT.md` (sprint wins on conflicts).
Rollback point: tag `v0.1-build-live` (= `main` at d1be39f, the live deploy).

## Status by block

| Block | Status | Notes |
|---|---|---|
| B0 setup | DONE | tag pushed, branch, stack, tokens + Geist, Vercel Analytics, `docs/GAP-ANALYSIS.md` |
| B1 shell + components | DONE | AppShell (sidebar + mobile bottom tabs), account menu + workspace switcher, no-access page, unlisted admin URL, `/app` redirect, Action Centre v1 (pulled forward from B4) |
| B2 marketing + auth + onboarding | DONE | `/`, `/about`, `/how-it-works`; new sign-up/sign-in/forgot/reset; `/onboarding` for all 3 paths. **Verified in a real browser:** landing → sign up → onboarding → home for student (375px), organisation and mentor |
| B3 org + admin journeys | DONE | Org: loading/error inside shell, first-load bug fixed, verification hints, copy. Admin: light brand, queues first, 3 bugs fixed |
| B4 student + mentor + Action Centre + feedback + rate limit | MOSTLY DONE | Passport redesign, mentor rubric review, mentor home, feedback button, rate-limit (awaiting approval). Student screens polish in progress (subagent) |
| B5 Playwright + mobile + jargon + final checks | IN PROGRESS | e2e full journey PASSES locally (3.2 min, 4 browser contexts) |

## Needs Marinus

1. **Speed (important for 11:00):** Vercel → Project → Settings → Functions → **Function Region = London (lhr1)**,
   then redeploy. Neon is in `eu-west-2` (London). Measured tonight: one DB round trip ≈ 106 ms from Ghana, and one
   `/me` request makes ~25 of them (≈ 3 s). If the API runs in Vercel's default US region every request pays the
   transatlantic hop ≈ 2 s; in London it's a few ms. No code change needed.
2. **Approve or revert the rate-limit commit** `feat(api): configurable per-IP auth limits … (NEEDS APPROVAL)`.
   Defaults are unchanged. If approved, set in Vercel Production: `AUTH_LOGIN_PER_IP_PER_15MIN=300`,
   `AUTH_REGISTER_PER_IP_PER_HOUR=300`. To reject: `git revert <that commit>` before merging.
3. **Feedback form:** create a Tally/Google Form, then set `NEXT_PUBLIC_FEEDBACK_URL=<form url>` in Vercel Production
   (it's public by design) and redeploy. The button sends `page`, `role`, `rating`, `trying`, `wrong`, `email` as
   query params — in Tally add hidden fields with those names to capture them. Without the variable the button is hidden.
4. **Unlisted admin URL (optional):** `ADMIN_PATH_SECRET` in Vercel Production (server-only, NOT `NEXT_PUBLIC_`),
   24+ letters/digits: `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})`.
   Admin URL becomes `https://experiencebridgenew.vercel.app/<secret>/dashboard`; `/admin` returns 404. Bookmark it.
   Without the variable `/admin` keeps working (still protected server-side).
5. **Decision (after the user test): show applicant/mentor names to organisations.** The API returns only user IDs on
   applications/participations/assignments, so organisations see "Applicant 6C83F7". Proposal: add the user's
   `display_name` to those read DTOs for the org that owns the project (privacy decision — student applied to them).
   Same for the organisation name on the student's Passport/project cards (`ProjectRead` has no org name; the Passport
   shows "Organisation"). Not built — needs your approval (PRODUCT-PLAN §0.7).

## Notes for test day

- Password reset emails use `onboarding@resend.dev`, which only delivers to the Resend account owner's
  inbox. Testers will NOT receive reset emails. If a tester is locked out, reset their password manually
  (or have them create a new account).

## Log

### B4 (≈04:30)
- **Passport** (`components/passport/experience-passport.tsx`): passport-document hero, verified entries only when the org
  accepted the work AND finalised the participation; in-progress and self-reported skills clearly separated; print/PDF.
  Fixed a fabricated label: the loader used to name every organisation "Verified Host Organization" (now "Organisation";
  the API doesn't give students the org name — see Needs Marinus #5).
- **Mentor review** now records a 1–5 rubric per acceptance criterion. Before tonight the live form always sent
  `observations: []`, so real reviews could never show "skills proven" on a Passport.
- `/mentor/submissions/[id]/review` (sample data only) now redirects to the live participation page.
- Mentor home: approval status first, profile collapsible.
- Feedback button (`components/app/feedback-button.tsx`) — hidden until `NEXT_PUBLIC_FEEDBACK_URL` is set.
- Rate limits: env-configurable per-IP ceilings, separate commit, defaults unchanged, test added — **needs approval**.

### B3 (≈03:45)
- Org portal: the background refresh cancelled the first data load, so the org pages could stay on "Loading…" when
  requests were slow (locally ~30 s+). Fixed. Loading/error now render inside the AppShell with a retry.
- Org settings: StatusBadge + NextStepHint for every verification status. Removed API IDs, "synthetic", "Live API",
  "sample brief", the developer disclosure banner. Applicants shown as "Applicant 6C83F7" (no names in the API).
- Admin (subagent): light theme, queues-first overview, StatusBadge, toasts, tables scroll inside cards at 375 px,
  links via the unlisted base. Bugs fixed: mentor suspend always failed; admin-created passwords < 12 chars always
  rejected by the API; application filter offered a non-existent status.

### B2 (≈02:40)
- Marketing site built by a parallel subagent on the same branch (files: `app/(public)/page.tsx`, `about/`, `how-it-works/`,
  `components/marketing/*`, `components/layouts/site-header.tsx`). Only sourced stats (GSS 2025; Van Iddekinge 2019),
  no fake logos/numbers/testimonials, team section says "Full team bios coming soon" (decision §12.3 pending), no contact email.
- Auth: `components/layouts/auth-form.tsx` rewritten on the same `authClient` calls; `components/auth/auth-shell.tsx`.
  Register → login → `/onboarding?path=…` (register doesn't sign in by itself). Sign-in → `?next=` (same-site only) or `/app`.
- Onboarding (`app/onboarding`, `components/onboarding/*`) solves gap G1: creates the org / mentor profile from outside the
  gated portals, then `refresh()` so the new workspace appears. Only real API fields are used.
- Browser-tested with Playwright (scratchpad script): 3 roles × sign-up → onboarding → home all pass.
- Known: signed-out pages log one browser "401" line for the `/me` check — expected, not a JS error.

### B1 (≈01:45)
- `components/app/*`: AppShell, portal nav config, account menu (workspace switcher shows only usable portals,
  "Set up an organisation" / "Become a mentor"), NoAccess, ServiceUnavailable, Action Centre (bell + panel,
  React Query, polls on focus and every 45 s), admin badges.
- `PortalBoundary` now wraps every portal in the AppShell, redirects signed-out users to `/sign-in?next=…`.
  The old `AdminShell` / `OrganizationPortalShell` are no longer rendered (files kept, not deleted).
- Unlisted admin URL: `proxy.ts` + `ADMIN_PATH_SECRET` (server-only) + admin layout reads the base from a proxy header.
- `/app` route handler: server-side `/me` → admin (secret path) / organisation / mentor / student home.
- Local dev note: Next runs on **:3002** and the API on **:8001** because an older checkout still holds :3000/:8000.
  Local API uses `DB_POOL_MODE=queue` (existing setting) — see "Needs Marinus" #1 for the real latency fix.

### B0
- Moved `EXPERIENCEBRIDGE-PRODUCT-PLAN.md` / `TONIGHT-SPRINT.md` from the repo root to `docs/PRODUCT-PLAN.md` / `docs/TONIGHT-SPRINT.md` (paths the plan refers to).
- Tagged `v0.1-build-live` on `origin/main` (d1be39f) and pushed the tag.
- Installed: lucide-react, motion, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner,
  radix-ui (shadcn-style components written by hand on Radix — no shadcn CLI needed), clsx, tailwind-merge,
  class-variance-authority, @vercel/analytics, geist; dev: @playwright/test.
- Tokens in `apps/web/app/globals.css` exactly as TONIGHT-SPRINT §4. Contrast: added darker *text* shades of
  the same hue for gold (`#B45309`), warning (`#A16207`), success (`#15803D`) because the brief's values fail AA
  as small text on light backgrounds; the brief's values are kept for fills/icons.
- Geist Sans/Mono via the `geist` package (local files, no Google Fonts fetch at build). `<Analytics />` in root layout.
- Checks: lint PASS (2 old warnings) · typecheck PASS · build PASS.
