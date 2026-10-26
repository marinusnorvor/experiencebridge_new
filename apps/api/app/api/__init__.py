"""API routing package."""

from app.api.health import HealthResponse, health_check
from app.api.router import DOMAIN_MODULES, api_v1_router

__all__ = [
    "DOMAIN_MODULES",
    "HealthResponse",
    "api_v1_router",
    "health_check",
]
