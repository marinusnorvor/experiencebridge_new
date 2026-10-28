"""Experience Passport domain package; no evidence projection is implemented (D4)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="passports",
    title="Experience Passports",
    owner_lane="D4",
    summary=(
        "Provenance-backed passport assertions, evidence citations, corrections, "
        "and revocable, default-private share grants."
    ),
    proposed_tables=(
        "passport_assertions",
        "assertion_evidence",
        "passport_share_grants",
        "passport_corrections",
    ),
    blocking_decisions=("ADR-005", "ADR-006", "DEC-005", "DEC-006", "DEC-010"),
    invariants=(
        "Experience Passports are provenance-backed projections over recorded activity and are private by default.",
        "Assertions distinguish self_reported, platform_recorded, mentor_reviewed, and organization_accepted provenance.",
        "Share tokens are stored only as cryptographic hashes and checked for revocation/expiry on every access.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
