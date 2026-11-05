# DEPLOY-CHECKLIST — branch `fix/deploy-ready`

Not committed unless the team agrees. Updated 2026-11-05 ~22:20 Ghana time.

## Phase 1 — Local

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1a | `npm ci` | PASS | npm audit advisories not addressed (no dependency changes) |
| 1b | venv + `pip install -r apps/api/requirements.txt` | PASS | venv built with uv-managed CPython 3.11.15 (`py -V:Astral\CPython3.11.15`) |
| 2 | Local env files | PASS | gitignored `apps/api/.env.development.local` (Neon `development` branch, role `experiencebridge_development`, db `experiencebridge`) and `apps/web/.env.local` |
| 3 | Backend pytest (`-k "not live_neon"`) | PASS* | 72 passed, 3 skipped, 0 failed, 32 errors — all errors = `staging_workflow` fixture needs `EB_AUTH_STAGING_TEST_URL`; accepted by team for now |
| 3b | `compileall` | PASS | |
| 4 | `alembic upgrade head` on development branch | PASS | 0001 → 0006, `alembic current` = `20261105_0006 (head)` |
| 5a | lint | PASS | 0 errors, 2 pre-existing unused-import warnings |
| 5b | typecheck | PASS | needs `NEXT_PUBLIC_APP_ENV` set; CI fixed |
| 5c | build | PASS | |
| 6a | Servers start | PASS | API on **8001**, web on **3002** — old checkout `..\experiencebridge\` holds ports 3000 and 8000 (left running) |
| 6b | Super admin bootstrap | FIXED → PASS | crashed at startup (`session_factory()` not called twice) |
| 6c | Sign up / sign in / sign out — student, org, mentor, super admin | PASS | over HTTP via the Next gateway; `/me` → 401 after sign-out |
| 6d | Full demo flow with real DB rows | PASS | `seed_demo.py --full`: org verified → project submitted → admin approves → student applies → shortlist/offer/accept → mentor assigned/accepts → submit + artifact → mentor review → org review → completion; passport data = completed participation + 1 mentor review + 1 org review |
| 6e | Four portals load | PARTIAL | every portal route returns 200 server-side for its role; **client-side console errors NOT checked — no browser tool in this session; needs a human click-through** |
| 7 | Auth fix | PASS | unit test + live staging-mode run (VERCEL=1): no header 403, bad header 403, forged sig 403, valid header + wrong pw 401, valid header + demo creds 200 |
| 8 | Production-like config | PASS | `check_config.py`: staging (dev DB) valid; production (format-only fake values) valid; production without EMAIL_* correctly fails. Web `next build` with `NEXT_PUBLIC_APP_ENV=production` + upstream + proxy secret: PASS |
| 9 | Demo seed / reset | PASS | `apps/api/seed_demo.py` (setup-only re-run verified) |

## Workflow gate — RESOLVED by team decision (Option A, production)
All workflow routers depend on `demonstration_environment` (`apps/api/app/projects/router.py`), which
returned 403 outside development/test. Team decision (2026-11-05): deploy with APP_ENV=production /
NEON_BRANCH=production and add a default-off opt-in `EB_BUILD_DEMO_WORKFLOWS=true` for the BUILD judging
deployment (synthetic demo data only). Test: `test_build_demo_workflows_opt_in_is_default_off_and_works_in_production`.
Backend tests after change: 73 passed, 0 failed, 32 accepted DB-fixture errors.

## Phase 2 — Deploy

| # | Step | Status | Notes |
|---|------|--------|-------|
| P1 | `.env.production.vercel` generated (gitignored, not committed) | DONE | generated secrets; `<FILL_ME>` for DB URLs, Vercel URL, email, super admin. Filled copy passes `check_config.py` |
| P2 | `seed_demo.py` password from `EB_DEMO_PASSWORD` | DONE | refuses to run without it |
| P3 | Commit + push `fix/deploy-ready` | see git log | |
| P4 | Merge PR into main | TODO (human) | |
| P5 | Import env in Vercel | TODO (human) | |
| P6 | Production migrations | TODO — human approval required | |
| P7 | Redeploy + post-deploy checks | TODO | |

## Changes made
- `apps/api/app/identity/auth_router.py` — `_trusted_client_ip()`; Vercel fallback.
- `apps/api/app/tests/test_auth_proxy_identity.py` — Vercel-path test.
- `apps/api/app/main.py` — super admin bootstrap: `session_factory()()`.
- `.github/workflows/frontend-ci.yml` — `NEXT_PUBLIC_APP_ENV: development` (approved).
- `apps/api/seed_demo.py` — new synthetic demo seed / full-flow driver (password from `EB_DEMO_PASSWORD`).
- `apps/api/app/core/config.py` — `build_demo_workflows` setting (`EB_BUILD_DEMO_WORKFLOWS`, default false).
- `apps/api/app/projects/router.py` — `demonstration_environment` honours the opt-in.
- `apps/api/check_config.py` — reports when demo workflows are enabled.
- `apps/api/app/tests/test_production_configuration.py` — opt-in test.
