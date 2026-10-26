# Alembic Migrations (`apps/api/alembic`)

Alembic is initialized for SQLAlchemy 2.x + `psycopg` 3 against Neon PostgreSQL:

- Prefer a direct (non-pooled) connection in `DATABASE_URL_UNPOOLED` for running schema migrations, per Neon's PgBouncer connection pooling rules.
- `alembic/env.py` blocks online migrations against `NEON_BRANCH=production` or `APP_ENV=production` unless explicitly authorized in a reviewed release workflow (`ALLOW_PRODUCTION_MIGRATIONS=true`).
- No unapproved domain tables or migrations are created in `alembic/versions/` until `ADR-003` and `ADR-004` schema contracts in `docs/03-database-api.md` are formally approved.
