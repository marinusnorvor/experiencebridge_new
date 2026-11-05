"""Central API router registry and domain module manifest."""

from __future__ import annotations

from fastapi import APIRouter

from app import (
    applications,
    assessments,
    identity,
    mentorship,
    organizations,
    passports,
    projects,
)
from app.core.domains import DomainModuleSpec
from app.api.health import router as health_router
from app.identity.auth_router import router as authentication_router

DOMAIN_MODULES: tuple[DomainModuleSpec, ...] = (
    identity.MODULE_SPEC,
    organizations.MODULE_SPEC,
    projects.MODULE_SPEC,
    applications.MODULE_SPEC,
    mentorship.MODULE_SPEC,
    assessments.MODULE_SPEC,
    passports.MODULE_SPEC,
)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router)
api_v1_router.include_router(authentication_router)
for domain_pkg in (
    identity,
    organizations,
    projects,
    applications,
    mentorship,
    assessments,
    passports,
):
    api_v1_router.include_router(domain_pkg.router)
