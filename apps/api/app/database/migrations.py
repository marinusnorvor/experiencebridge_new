"""Alembic migration helper and production safety guards."""

from __future__ import annotations

import os

from app.core.config import Settings, load_settings


def get_migration_settings(settings: Settings | None = None) -> Settings:
    """Load validated settings and enforce production migration safeguards."""
    active_settings = settings or load_settings()
    if active_settings.app_env == "production" or active_settings.neon_branch == "production":
        allow_prod = os.environ.get("ALLOW_PRODUCTION_MIGRATIONS", "").strip().lower() == "true"
        if not allow_prod:
            raise RuntimeError(
                "Blocked Alembic migration against production. "
                "Production migrations require reviewed release approval and ALLOW_PRODUCTION_MIGRATIONS=true."
            )
    return active_settings
