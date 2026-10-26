"""Applications domain package; lifecycle contract remains pending (D2/D3)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="applications",
    title="Applications, Offers & Participations",
    owner_lane="D2",
    summary=(
        "Student project applications, organization offers, explicit terms consent, "
        "and atomic creation of project participations."
    ),
    proposed_tables=(
        "applications",
        "offers",
        "terms_acceptances",
        "participations",
    ),
    blocking_decisions=("ADR-003", "ADR-004", "DEC-009", "DEC-012"),
    invariants=(
        "Active participation cannot be created without an accepted, non-expired offer and matching terms version consent.",
        "Offer acceptance atomically records terms acceptance and participation within a single database transaction.",
        "Students may only read their own applications; organization access is scoped to authorized project managers.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
