"""Automated tests for SQLAlchemy 2.x serverless engine, sessions, and Neon connectivity."""

from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import Settings
from app.database.connectivity import verify_database_connectivity
from app.database.migrations import get_migration_settings
from app.database.session import build_engine_options, get_db

VALID_DEV_POOLER_URL = (
    "postgresql://experiencebridge_development:superSecretPass123"
    "@ep-demo-pooler.us-east-2.aws.neon.tech/experiencebridge?sslmode=require"
)


def test_serverless_engine_options_use_nullpool_and_disable_prepared_statements() -> None:
    serverless_settings = Settings(
        _env_file=None,
        app_env="development",
        neon_branch="development",
        database_url=VALID_DEV_POOLER_URL,
        vercel=True,
    )
    opts = build_engine_options(serverless_settings)
    assert opts["poolclass"] is NullPool
    assert opts["connect_args"]["prepare_threshold"] is None
    assert opts["hide_parameters"] is True

    queue_settings = Settings(
        _env_file=None,
        app_env="test",
        neon_branch="test",
        database_url="postgresql://user:pass@localhost:5432/testdb",
        db_pool_mode="queue",
    )
    queue_opts = build_engine_options(queue_settings)
    assert queue_opts["poolclass"] is QueuePool
    assert queue_opts["pool_pre_ping"] is True


def test_verify_database_connectivity_blocks_production() -> None:
    prod_settings = Settings(
        _env_file=None,
        app_env="production",
        neon_branch="production",
        cors_allowed_origins=["https://app.example.com"],
    )
    with pytest.raises(RuntimeError, match="Refusing to run local/test database connectivity check"):
        verify_database_connectivity(settings=prod_settings)


def test_alembic_guard_blocks_production_migrations(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("NEON_BRANCH", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")
    monkeypatch.delenv("ALLOW_PRODUCTION_MIGRATIONS", raising=False)

    with pytest.raises(RuntimeError, match="Blocked Alembic migration against production"):
        get_migration_settings()


def test_verify_database_connectivity_unit_with_mock_engine() -> None:
    statements: list[str] = []

    class FakeResult:
        def mappings(self) -> FakeResult:
            return self

        def one(self) -> dict[str, Any]:
            return {
                "ok": 1,
                "database_name": "experiencebridge",
                "database_role": "experiencebridge_development",
                "transaction_read_only": "on",
            }

    class FakeConnection:
        def __enter__(self) -> FakeConnection:
            return self

        def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            return None

        def execute(self, statement: Any) -> FakeResult:
            statements.append(str(statement))
            return FakeResult()

        def rollback(self) -> None:
            statements.append("ROLLBACK")

    class FakeEngine:
        pool = NullPool(lambda: None)

        def connect(self) -> FakeConnection:
            return FakeConnection()

        def dispose(self) -> None:
            pass

    test_settings = Settings(
        _env_file=None,
        app_env="test",
        neon_branch="test",
    )
    result = verify_database_connectivity(
        engine=FakeEngine(),  # type: ignore[arg-type]
        settings=test_settings,
    )
    assert result.ok is True
    assert result.read_only is True
    assert result.database_name == "experiencebridge"
    assert result.database_role == "experiencebridge_development"
    assert statements[0] == "SET TRANSACTION READ ONLY"
    assert "ROLLBACK" in statements


def test_get_db_dependency_closes_and_rolls_back_on_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[str] = []

    class DummySession:
        def rollback(self) -> None:
            events.append("rollback")

        def close(self) -> None:
            events.append("close")

    monkeypatch.setattr(
        "app.database.session.get_session_factory",
        lambda: (lambda: DummySession()),
    )

    gen = get_db()
    session = next(gen)
    assert isinstance(session, DummySession)
    with pytest.raises(ValueError, match="boom"):
        gen.throw(ValueError("boom"))
    assert events == ["rollback", "close"]


def test_live_neon_staging_read_only_connectivity() -> None:
    """Only inspect the explicitly verified staging endpoint, in read-only mode."""
    import os
    from urllib.parse import urlsplit
    from sqlalchemy import create_engine, text
    from app.core.config import normalize_sqlalchemy_postgres_url

    url = os.environ.get("EB_AUTH_STAGING_TEST_URL", "")
    if not ((urlsplit(url).hostname or "").startswith("ep-ancient-truth-zavsgzpz-pooler.") and (urlsplit(url).hostname or "").endswith(".aws.neon.tech")):
        pytest.fail("A verified Neon staging pooled connection is required")
    engine = create_engine(normalize_sqlalchemy_postgres_url(url), poolclass=NullPool, hide_parameters=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            assert connection.execute(text("SHOW transaction_read_only")).scalar_one() == "on"
            assert connection.execute(text("SELECT 1")).scalar_one() == 1
            connection.rollback()
    finally:
        engine.dispose()
