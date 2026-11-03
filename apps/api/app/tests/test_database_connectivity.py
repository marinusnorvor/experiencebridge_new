"""Automated tests for SQLAlchemy 2.x serverless engine, sessions, and Neon connectivity."""

from __future__ import annotations

from typing import Any
import base64

import pytest
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import DEFAULT_DEV_ENV_FILE, Settings, load_settings
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
        clerk_publishable_key="pk_live_" + base64.b64encode(b"clerk.example.com$").decode(),
        clerk_authorized_parties=["https://app.example.com"],
    )
    with pytest.raises(RuntimeError, match="Refusing to run local/test database connectivity check"):
        verify_database_connectivity(settings=prod_settings)


def test_alembic_guard_blocks_production_migrations(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("NEON_BRANCH", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")
    monkeypatch.setenv("CLERK_PUBLISHABLE_KEY", "pk_live_" + base64.b64encode(b"clerk.example.com$").decode())
    monkeypatch.setenv("CLERK_AUTHORIZED_PARTIES", "https://app.example.com")
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


@pytest.mark.skipif(
    not DEFAULT_DEV_ENV_FILE.is_file(),
    reason="Local Neon development .env.development.local is not present.",
)
def test_live_neon_development_read_only_connectivity() -> None:
    """Connect to the configured Neon development database in read-only mode."""
    dev_settings = load_settings(
        env_file=DEFAULT_DEV_ENV_FILE,
        overrides={"app_env": "development", "neon_branch": "development"},
    )
    assert dev_settings.app_env == "development"
    assert dev_settings.neon_branch == "development"

    result = verify_database_connectivity(settings=dev_settings)
    assert result.ok is True, f"Neon development connectivity check failed: {result.error}"
    assert result.read_only is True
    assert result.environment == "development"
    assert result.neon_branch == "development"
    assert result.database_role == "experiencebridge_development"
    assert result.pool_class == "NullPool"
    assert result.error is None
