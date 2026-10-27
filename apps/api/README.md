# ExperienceBridge API

FastAPI backend for ExperienceBridge, configured with SQLAlchemy 2.x, `psycopg` 3, Clerk JWT/JWKS authentication (`ADR-002`), and Alembic for Neon PostgreSQL on Vercel serverless functions.

- `main.py` and `app/main.py`: Modular FastAPI application factory (`create_app()`) and compatibility entry point preserving `/health` and Swagger/OpenAPI (`/docs`, `/redoc`, `/openapi.json`).
- `app/core/`: Environment-separated `Settings` (`config.py`), standardized error envelopes and `X-Request-ID` correlation (`errors.py`), credential-redacting structured logging (`logging.py`), and domain module specifications (`domains.py`).
- `app/database/`: SQLAlchemy 2.x `Base` (`base.py`), serverless-safe engine and session lifecycle (`session.py` using `NullPool` and `prepare_threshold=None` for Neon PgBouncer `-pooler` endpoints), and internal read-only connectivity check (`connectivity.py`).
- `app/identity/`: Clerk RS256 JWKS Bearer token verifier (`clerk_verifier.py`), internal `User` and `UserRoleGrant` SQLAlchemy models (`models.py`), server-side profile & role context resolution (`service.py`), authentication/authorization dependencies (`dependencies.py`), and `GET /api/v1/me` (`router.py`).
- `alembic/`: Initialized Alembic migration environment (`env.py`) guarded against running unapproved or production migrations, with migration `20261026_0001` creating `users` and `user_role_grants` (`ADR-002` / Contract `C-01`).
- Domain modules (`app/identity`, `app/organizations`, `app/projects`, `app/applications`, `app/mentorship`, `app/assessments`, `app/passports`, plus compatibility aliases `app/identity_authorization` and `app/experience_passports`): Prepared according to `docs/02-system-architecture.md` and `docs/03-database-api.md`.

## Local development

The ignored `.env.development.local` file contains the pooled URL for the Neon `development` branch, its branch-specific role (`experiencebridge_development`), and Clerk development configuration (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ISSUER_URL`, `CLERK_JWKS_URL`, `CLERK_AUTHORIZED_PARTIES`). Start the API through the guard script, which loads only that file, overrides any inherited `DATABASE_URL`, and rejects a different branch marker or database role:

```powershell
.\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py
```

Then request `http://127.0.0.1:8000/health`, `http://127.0.0.1:8000/api/v1/me` (with `Authorization: Bearer <clerk-jwt>`), or `http://127.0.0.1:8000/docs`.

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

Use the `.env.*.example` files as placeholder-only references for separate deployment environments. Never use production credentials for local development or tests.
