"""SQLAlchemy 2.x engine, session factory, and serverless lifecycle management for Neon."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from threading import RLock
from typing import Any

from fastapi import Request
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import Settings, get_settings

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None
_engine_lock = RLock()


def build_engine_options(settings: Settings) -> dict[str, Any]:
    """Build SQLAlchemy 2.x engine options tuned for Neon PostgreSQL and Vercel serverless."""
    connect_args: dict[str, Any] = {
        "connect_timeout": settings.db_connect_timeout,
        # Disable psycopg 3 automatic server-side prepared statements for compatibility
        # with Neon's PgBouncer (-pooler) transaction pooling mode.
        "prepare_threshold": None,
        "application_name": settings.app_service,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

    use_null_pool = settings.db_pool_mode == "null" or (
        settings.db_pool_mode == "auto" and settings.is_serverless
    )

    options: dict[str, Any] = {
        "future": True,
        "hide_parameters": True,
        "connect_args": connect_args,
    }

    if use_null_pool:
        # On Vercel serverless / Neon pooled endpoints, delegate pooling to Neon PgBouncer
        # and avoid retaining idle connections across frozen function instances.
        options["poolclass"] = NullPool
    else:
        options["poolclass"] = QueuePool
        options["pool_pre_ping"] = True
        options["pool_size"] = settings.db_pool_size
        options["max_overflow"] = settings.db_max_overflow
        options["pool_timeout"] = settings.db_pool_timeout
        options["pool_recycle"] = settings.db_pool_recycle

    return options


def create_db_engine(settings: Settings | None = None) -> Engine:
    """Create a configured SQLAlchemy 2.x Engine for Neon PostgreSQL."""
    active_settings = settings or get_settings()
    uri = active_settings.sqlalchemy_database_uri
    engine_options = build_engine_options(active_settings)
    engine = create_engine(uri, **engine_options)

    @event.listens_for(engine, "begin")
    def set_transaction_timeout(connection):
        # SET LOCAL resets at transaction end, including with PgBouncer transaction
        # pooling. The interpolated value is a bounded, validated integer, never SQL input.
        try:
            connection.exec_driver_sql(
                f"SET LOCAL statement_timeout = {active_settings.db_statement_timeout_ms}"
            )
        except Exception:
            pass

    return engine


def get_engine(settings: Settings | None = None) -> Engine:
    """Return the shared SQLAlchemy Engine instance, creating it lazily if needed."""
    global _engine
    if settings is not None:
        return create_db_engine(settings)
    with _engine_lock:
        if _engine is None:
            _engine = create_db_engine(get_settings())
        return _engine


def create_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    """Create a SQLAlchemy 2.x sessionmaker bound to the provided or default engine."""
    target_engine = engine or get_engine()
    return sessionmaker(
        bind=target_engine,
        class_=Session,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def get_session_factory() -> sessionmaker[Session]:
    """Return the cached SQLAlchemy sessionmaker."""
    global _session_factory
    with _engine_lock:
        if _session_factory is None:
            _session_factory = create_session_factory(get_engine())
        return _session_factory


def dispose_engine() -> None:
    """Dispose the active SQLAlchemy engine and reset cached session factories."""
    global _engine, _session_factory
    with _engine_lock:
        if _engine is not None:
            _engine.dispose()
        _engine = None
        _session_factory = None


class ApplicationDatabase:
    """Lazy engine owned by one FastAPI app and its validated settings."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._engine: Engine | None = None
        self._factory: sessionmaker[Session] | None = None
        self._lock = RLock()

    def session_factory(self) -> sessionmaker[Session]:
        with self._lock:
            if self._factory is None:
                self._engine = create_db_engine(self.settings)
                self._factory = create_session_factory(self._engine)
            return self._factory

    def dispose(self) -> None:
        with self._lock:
            if self._engine is not None:
                self._engine.dispose()
            self._engine = None
            self._factory = None


def get_db(request: Request = None) -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped SQLAlchemy Session per request."""
    session_factory = (
        request.app.state.database.session_factory() if request is not None
        else get_session_factory()
    )
    session = session_factory()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def read_only_session(engine: Engine | None = None) -> Generator[Session, None, None]:
    """Open an explicitly read-only database session that rolls back on exit."""
    factory = create_session_factory(engine) if engine is not None else get_session_factory()
    session = factory()
    try:
        session.execute(text("SET TRANSACTION READ ONLY"))
        yield session
    finally:
        try:
            session.rollback()
        finally:
            session.close()
