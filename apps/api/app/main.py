"""Modular FastAPI application factory and entry point."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import health_check, router as health_router
from app.api.router import api_v1_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.database.session import ApplicationDatabase


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage FastAPI startup and serverless-safe database engine cleanup."""
    settings: Settings = getattr(app.state, "settings", None) or get_settings()
    logger = configure_logging(settings.log_level)
    logger.info(
        "Starting %s v%s [env=%s, neon_branch=%s, serverless=%s]",
        settings.app_service,
        settings.app_version,
        settings.app_env,
        settings.neon_branch,
        settings.is_serverless,
    )
    try:
        yield
    finally:
        app.state.database.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the ExperienceBridge FastAPI application."""
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)

    docs_url = "/docs" if active_settings.docs_enabled else None
    redoc_url = "/redoc" if active_settings.docs_enabled else None
    openapi_url = "/openapi.json" if active_settings.docs_enabled else None

    application = FastAPI(
        title=active_settings.app_name,
        version=active_settings.app_version,
        description=active_settings.app_description,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )
    application.state.settings = active_settings
    application.state.database = ApplicationDatabase(active_settings)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(active_settings.cors_allowed_origins),
        allow_credentials=active_settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "If-Match", "X-Request-ID"],
        expose_headers=["ETag", "X-Request-ID"],
    )

    register_exception_handlers(application)
    application.include_router(health_router)
    application.include_router(api_v1_router)

    return application


app = create_app()

__all__ = ["app", "create_app", "health_check"]
