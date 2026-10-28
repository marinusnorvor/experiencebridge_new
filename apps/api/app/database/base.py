"""SQLAlchemy 2.x declarative base and PostgreSQL constraint naming conventions."""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Naming convention aligned with docs/03-database-api.md §1
POSTGRES_NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Canonical SQLAlchemy 2.x declarative base for ExperienceBridge."""

    metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)
