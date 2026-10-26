"""Alembic migration environment with Neon branch isolation and production safety guards."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.database.base import Base
from app.database.migrations import get_migration_settings

# Canonical SQLAlchemy metadata. Domain tables remain empty until ADR-003/ADR-004 schema sign-off.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode without establishing a live database connection."""
    settings = get_migration_settings()
    url = settings.sqlalchemy_migration_uri
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using a direct (or configured) Neon connection."""
    config = context.config
    settings = get_migration_settings()
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.sqlalchemy_migration_uri

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
        connect_args={
            "connect_timeout": settings.db_connect_timeout,
            "prepare_threshold": None,
            "application_name": f"{settings.app_service}-alembic",
        },
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if hasattr(context, "config"):
    if context.config.config_file_name is not None:
        fileConfig(context.config.config_file_name)
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
