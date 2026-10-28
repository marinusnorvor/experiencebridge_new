"""Bootstrap service liveness endpoint (/health)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Response model for the public service liveness endpoint."""

    status: str = "ok"
    service: str = "experiencebridge-api"
    version: str = "0.1.0"


@router.get("/health", response_model=HealthResponse, summary="Service liveness check")
def health_check() -> dict[str, str]:
    """Return service liveness metadata without exposing database diagnostics."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_service,
        "version": settings.app_version,
    }
