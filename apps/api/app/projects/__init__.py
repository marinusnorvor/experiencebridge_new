"""Projects domain package; no unapproved models or business operations yet (D3)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="projects",
    title="Projects & Terms",
    owner_lane="D3",
    summary=(
        "Scoped organization project briefs, immutable versioned compensation/IP terms, "
        "moderation publication gates, and project milestones."
    ),
    proposed_tables=(
        "projects",
        "project_terms_versions",
        "project_moderation_decisions",
        "milestones",
    ),
    blocking_decisions=("ADR-003", "ADR-004", "ADR-007", "DEC-004", "DEC-005"),
    invariants=(
        "Project terms are versioned and immutable once approved or accepted.",
        "Compensation uses exact fixed-precision decimal values with ISO currency codes, never binary floats.",
        "Unpaid commercial production work is blocked; publication requires authorized moderation approval.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
