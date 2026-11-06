# BUILD-LOG — overnight sprint (`feat/overnight-v1`)

Read this first (2 minutes). Newest entries at the top of each section.
Plan: `docs/PRODUCT-PLAN.md` + `docs/TONIGHT-SPRINT.md` (sprint wins on conflicts).
Rollback point: tag `v0.1-build-live` (= `main` at d1be39f, the live deploy).

## Status by block

| Block | Status | Notes |
|---|---|---|
| B0 setup | IN PROGRESS | tag pushed, branch created, stack installed, tokens + Geist fonts, Vercel Analytics |
| B1 shell + components | TODO | |
| B2 marketing + auth + onboarding | TODO | |
| B3 org + admin journeys | TODO | |
| B4 student + mentor + Action Centre + feedback + rate limit | TODO | |
| B5 Playwright + mobile + jargon + final checks | TODO | |

## Needs Marinus

- (none yet)

## Notes for test day

- Password reset emails use `onboarding@resend.dev`, which only delivers to the Resend account owner's
  inbox. Testers will NOT receive reset emails. If a tester is locked out, reset their password manually
  (or have them create a new account).

## Log

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
