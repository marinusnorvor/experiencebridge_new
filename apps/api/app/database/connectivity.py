"""Internal read-only database connectivity verification (never exposed publicly)."""

from __future__ import annotations

import time
from dataclasses import dataclass

from sqlalchemy import Engine, text

from app.core.config import Settings, get_settings
from app.core.logging import scrub_sensitive_text
from app.database.session import create_db_engine


@dataclass(frozen=True)
class DatabaseConnectivityResult:
    """Sanitized result of an internal read-only database connectivity check."""

    ok: bool
    environment: str
    neon_branch: str
    database_name: str | None
    database_role: str | None
    read_only: bool
    pool_class: str
    latency_ms: float
    error: str | None = None


def verify_database_connectivity(
    *,
    engine: Engine | None = None,
    settings: Settings | None = None,
    allow_production: bool = False,
) -> DatabaseConnectivityResult:
    """Execute an internal read-only connectivity check against the configured database.

    This helper is strictly for internal startup/test verification and must never be
    wired to an unauthenticated public HTTP endpoint.
    """
    active_settings = settings or get_settings()

    if not allow_production and (
        active_settings.app_env == "production" or active_settings.neon_branch == "production"
    ):
        raise RuntimeError(
            "Refusing to run local/test database connectivity check against production."
        )

    owns_engine = engine is None
    target_engine = engine or create_db_engine(active_settings)
    pool_class_name = target_engine.pool.__class__.__name__
    start = time.perf_counter()

    try:
        with target_engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            row = connection.execute(
                text(
                    "SELECT "
                    "1 AS ok, "
                    "current_database() AS database_name, "
                    "current_user AS database_role, "
                    "current_setting('transaction_read_only') AS transaction_read_only"
                )
            ).mappings().one()
            connection.rollback()

        elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
        is_read_only = str(row["transaction_read_only"]).lower() in {"on", "true", "1"}

        return DatabaseConnectivityResult(
            ok=int(row["ok"]) == 1 and is_read_only,
            environment=active_settings.app_env,
            neon_branch=active_settings.neon_branch,
            database_name=str(row["database_name"]),
            database_role=str(row["database_role"]),
            read_only=is_read_only,
            pool_class=pool_class_name,
            latency_ms=elapsed_ms,
            error=None,
        )
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
        return DatabaseConnectivityResult(
            ok=False,
            environment=active_settings.app_env,
            neon_branch=active_settings.neon_branch,
            database_name=None,
            database_role=None,
            read_only=True,
            pool_class=pool_class_name,
            latency_ms=elapsed_ms,
            error=scrub_sensitive_text(f"{exc.__class__.__name__}: {exc}"),
        )
    finally:
        if owns_engine:
            target_engine.dispose()
