"""Organization domain metadata; supervisor operations register with the project workflow."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="organizations",
    title="Organizations",
    owner_lane="D3",
    summary=(
        "Organization profiles, scoped memberships (owner, project_manager, reviewer), "
        "and verification/restriction lifecycle records."
    ),
    proposed_tables=(
        "organizations",
        "organization_memberships",
        "organization_verification_reviews",
    ),
    blocking_decisions=("ADR-002", "ADR-003", "ADR-008"),
    invariants=(
        "Every organization-owned operation enforces tenant boundary (organization_id) and active membership.",
        "Organization identity verification is independent from deliverable acceptance and mentor skill assessment.",
        "Restriction status does not erase historical verification records.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
