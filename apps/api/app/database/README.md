# Database access (`app/database`)

Provides SQLAlchemy 2.x and `psycopg` 3 integration for Neon PostgreSQL:

- `base.py`: Canonical `Base` declarative metadata with PostgreSQL constraint naming conventions from `docs/03-database-api.md` §1. No unapproved domain tables are registered before schema sign-off.
- `session.py`: Serverless-safe SQLAlchemy 2.x engine builder (`NullPool` for Vercel serverless / Neon `-pooler` PgBouncer transaction pooling, `prepare_threshold=None`), `Session` factory, and `get_db` dependency.
- `connectivity.py`: Internal-only read-only database connectivity check (`verify_database_connectivity`). Never expose this check via an unauthenticated public HTTP route.
