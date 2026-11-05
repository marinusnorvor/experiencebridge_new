# ExperienceBridge API

FastAPI backend for ExperienceBridge, configured with SQLAlchemy 2.x, `psycopg` 3, FastAPI-managed session authentication (ADR-012, development exception), and Alembic for Neon PostgreSQL on Vercel serverless functions.

- `main.py` and `app/main.py`: Modular FastAPI application factory (`create_app()`) and compatibility entry point preserving `/health` and Swagger/OpenAPI (`/docs`, `/redoc`, `/openapi.json`).
- `app/core/`: Environment-separated `Settings` (`config.py`), standardized error envelopes and `X-Request-ID` correlation (`errors.py`), credential-redacting structured logging (`logging.py`), and domain module specifications (`domains.py`).
- `app/database/`: SQLAlchemy 2.x `Base` (`base.py`), serverless-safe engine and session lifecycle (`session.py` using `NullPool` and `prepare_threshold=None` for Neon PgBouncer `-pooler` endpoints), and internal read-only connectivity check (`connectivity.py`).
- `app/identity/`: password authentication and Neon-backed sessions (`auth_router.py`, `auth_repository.py`), internal `User` and `UserRoleGrant` SQLAlchemy models (`models.py`), server-side profile & role context resolution (`service.py`), authentication/authorization dependencies (`dependencies.py`), and `GET /api/v1/me` (`router.py`).
- `alembic/`: Initialized Alembic migration environment (`env.py`) guarded against running unapproved or production migrations, with migration `20261026_0001` creating `users` and `user_role_grants` (`ADR-002` / Contract `C-01`).
- Domain modules (`app/identity`, `app/organizations`, `app/projects`, `app/applications`, `app/mentorship`, `app/assessments`, `app/passports`, plus compatibility aliases `app/identity_authorization` and `app/experience_passports`): Prepared according to `docs/02-system-architecture.md` and `docs/03-database-api.md`.

## Local development

Configure a verified development Neon pooled connection and authentication values from `.env.development.example`; see `docs/auth-integration.md`. Start the API through the guard script, which restricts the target development branch:
```powershell
.\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py
```

Then request `http://127.0.0.1:8000/health`, `http://127.0.0.1:8000/api/v1/me` after signing in through the shared web client, or `http://127.0.0.1:8000/docs`.

To run the internal read-only Neon `development` database connectivity check without exposing a public endpoint:

```powershell
.\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py --check-only
```

## Database migrations (Neon `development` branch)

Apply approved Alembic migrations to the Neon `development` branch:

```powershell
.\apps\api\.venv\Scripts\python.exe -m alembic -c apps/api/alembic.ini upgrade head
```

## Automated tests

Run the backend test suite from the repository root:

```powershell
.\apps\api\.venv\Scripts\python.exe -m pytest apps/api/app/tests -v
```

## Production configuration (local process or Vercel Production)

Use the tracked `.env.example` as the production variable-name reference. The legacy
ignored `.env.production.example` files contain non-placeholder values and must not
be committed or used as templates. Development and Preview retain their isolated
profiles; `run_dev.py` intentionally stays development-only.

A locally hosted **production-mode** process uses `APP_ENV=production` and
`NEON_BRANCH=production`, with the approved frontend origin and Neon production target. Do not relabel that process as development to bypass
validation. No production credentials or deployment settings were changed by Phase 1.

Validate a privately configured file without connecting or printing values (Git Bash):

```bash
apps/api/.venv/Scripts/python.exe apps/api/check_config.py --env-file apps/api/.env.production.local
```

For a future authorized local production-mode run, use the existing entry point:

```bash
apps/api/.venv/Scripts/python.exe -m uvicorn main:app --app-dir apps/api --env-file apps/api/.env.production.local --host 127.0.0.1 --port 8000
```

This startup command is **not read-only**: authenticated identity requests can provision
users. Do not run it as a production database verification step. Inherited process
variables take precedence over the explicit env file, as on Vercel. No automatic
migration or seed runs at startup. Production database connection verification needs
an independently identified intended branch and a read-only transaction.

The current supervisor workflows deliberately return 403 outside development/test.
Configuration support is not approval to enable those synthetic workflows in production.

Use explicit HTTPS frontend origins, matching `AUTH_PROXY_SECRET` values on web and API, and the email provider configuration described in `docs/auth-integration.md`.

Vercel uses two projects rooted at `apps/web` and `apps/api` (ADR-002/ADR-011).
Configure the same variable names in their Production scopes; never expose backend
secrets with `NEXT_PUBLIC_`. Next public variables are fixed at build time. The web
production profile requires `NEXT_PUBLIC_APP_ENV=production`, the authentication proxy secret and an HTTPS API origin. Preview continues to use staging resources. Vercel project settings,
production credentials and the production database schema have not been verified.
