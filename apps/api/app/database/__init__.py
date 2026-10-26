"""Database access layer for SQLAlchemy 2.x and Neon PostgreSQL."""

from app.database.base import POSTGRES_NAMING_CONVENTION, Base
from app.database.connectivity import DatabaseConnectivityResult, verify_database_connectivity
from app.database.migrations import get_migration_settings
from app.database.session import (
    build_engine_options,
    create_db_engine,
    create_session_factory,
    dispose_engine,
    get_db,
    get_engine,
    get_session_factory,
    read_only_session,
)

__all__ = [
    "Base",
    "DatabaseConnectivityResult",
    "POSTGRES_NAMING_CONVENTION",
    "build_engine_options",
    "create_db_engine",
    "create_session_factory",
    "dispose_engine",
    "get_db",
    "get_engine",
    "get_migration_settings",
    "get_session_factory",
    "read_only_session",
    "verify_database_connectivity",
]
