"""Offline regression tests; never use a configured Neon connection."""

from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.database import session as database
from app.database.connectivity import verify_database_connectivity
from app.main import create_app


def settings(**kwargs):
    return Settings(_env_file=None, app_env="test", neon_branch="test", **kwargs)


@pytest.mark.parametrize("query", [
    "sslmode=require&sslmode=disable", "sslmode=require&sslmode=",
    "sslmode=require&host=other.example.com", "sslmode=require&hostaddr=192.0.2.1",
    "sslmode=require&user=other", "sslmode=require&dbname=other",
    "sslmode=require&service=other", "sslmode=require#ignored",
])
def test_database_url_rejects_ambiguous_or_overridden_target(query):
    with pytest.raises(ValidationError):
        settings(database_url=f"postgresql://user:secret@localhost/db?{query}")


def test_pooler_selection_uses_hostname_not_password():
    direct = settings(database_url="postgresql://user:fake-pooler.password@localhost/db")
    assert direct.is_serverless is False


def test_transaction_timeout_is_applied_after_commit_and_rollback(monkeypatch):
    # Exercise SQLAlchemy's real autobegin event locally. SQLite substitutes SELECT 1
    # for the PostgreSQL SET statement; this is not live PostgreSQL verification.
    engine = create_engine("sqlite://")
    statements = []

    @event.listens_for(engine, "before_cursor_execute", retval=True)
    def capture(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)
        if statement.startswith("SET LOCAL"):
            return "SELECT 1", ()
        return statement, parameters

    monkeypatch.setattr(database, "create_engine", lambda *args, **kwargs: engine)
    configured = database.create_db_engine(settings(
        database_url="postgresql://user:secret@localhost/db", db_statement_timeout_ms=2300,
    ))
    try:
        with configured.connect() as connection:
            connection.execute(text("SELECT 2"))
            connection.commit()
            connection.execute(text("SELECT 3"))
            connection.rollback()
            connection.execute(text("SELECT 4"))
        assert statements == [
            "SET LOCAL statement_timeout = 2300", "SELECT 2",
            "SET LOCAL statement_timeout = 2300", "SELECT 3",
            "SET LOCAL statement_timeout = 2300", "SELECT 4",
        ]
    finally:
        configured.dispose()


def test_failed_connectivity_does_not_claim_read_only_or_expose_driver_details():
    engine = Mock()
    engine.connect.side_effect = OperationalError(
        "SELECT private_evidence", {"secret": "private-parameter"},
        RuntimeError("password=private-password"),
    )
    result = verify_database_connectivity(engine=engine, settings=settings())
    assert result.ok is False
    assert result.read_only is False
    assert result.error == "OperationalError: Database connectivity verification failed."
    engine.dispose.assert_not_called()


def test_engine_creation_failure_is_reported_without_traceback(monkeypatch):
    monkeypatch.setattr("app.database.connectivity.create_db_engine", Mock(side_effect=ValueError("secret")))
    result = verify_database_connectivity(settings=settings())
    assert result.ok is False
    assert result.pool_class == "unavailable"
    assert "secret" not in result.error


def test_owned_engine_disposed_on_connection_failure(monkeypatch):
    engine = Mock()
    engine.connect.side_effect = RuntimeError("failed connection")
    monkeypatch.setattr("app.database.connectivity.create_db_engine", lambda _: engine)
    assert verify_database_connectivity(settings=settings()).ok is False
    engine.dispose.assert_called_once()


def test_read_only_session_closes_even_when_rollback_fails(monkeypatch):
    session = Mock()
    session.rollback.side_effect = RuntimeError("rollback failed")
    monkeypatch.setattr(database, "get_session_factory", lambda: lambda: session)
    with pytest.raises(RuntimeError, match="rollback failed"):
        with database.read_only_session():
            pass
    session.close.assert_called_once()


def test_request_sessions_use_app_settings_and_dispose_on_shutdown(monkeypatch):
    engines = []
    seen = []

    def build(active):
        seen.append(active)
        engine = create_engine("sqlite://")
        engines.append(engine)
        return engine

    monkeypatch.setattr(database, "create_db_engine", build)
    monkeypatch.setattr(database, "get_settings", Mock(side_effect=AssertionError("global settings used")))
    first_settings = settings(app_service="first")
    second_settings = settings(app_service="second")
    first, second = create_app(first_settings), create_app(second_settings)
    for app in (first, second):
        @app.get("/_test/database")
        def inspect_database(db=Depends(database.get_db)):
            return {"bound": db.get_bind() is not None}

    assert not engines  # App import/startup must not open a database connection.
    with TestClient(first) as client, TestClient(second) as other:
        assert client.get("/_test/database").json() == {"bound": True}
        assert other.get("/_test/database").json() == {"bound": True}
        assert client.get("/_test/database").status_code == 200
        assert seen == [first_settings, second_settings]
        assert first.state.database._engine is not second.state.database._engine
    assert first.state.database._engine is None
    assert second.state.database._engine is None


def test_request_database_failure_returns_sanitized_503(monkeypatch):
    failure = OperationalError("SELECT private_evidence", {}, RuntimeError("private-password"))
    monkeypatch.setattr(database, "create_db_engine", Mock(side_effect=failure))
    app = create_app(settings())

    @app.get("/_test/database-error")
    def query(db=Depends(database.get_db)):
        raise AssertionError("A failed dependency must not reach the route")

    with TestClient(app) as client:
        response = client.get("/_test/database-error")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "TEMPORARY_UNAVAILABLE"
        assert "private-password" not in response.text
        assert "private_evidence" not in response.text


def test_concurrent_requests_share_one_app_engine(monkeypatch):
    engine = create_engine("sqlite://")
    builder = Mock(return_value=engine)
    monkeypatch.setattr(database, "create_db_engine", builder)
    runtime = database.ApplicationDatabase(settings())
    try:
        with ThreadPoolExecutor(max_workers=8) as executor:
            factories = list(executor.map(lambda _: runtime.session_factory(), range(32)))
        assert all(factory is factories[0] for factory in factories)
        builder.assert_called_once()
    finally:
        runtime.dispose()
