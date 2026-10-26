"""Assessments domain package; review records are not implemented (D3/D4)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="assessments",
    title="Submissions & Independent Assessments",
    owner_lane="D4",
    summary=(
        "Student milestone submissions, private evidence artifact references, "
        "independent mentor rubric reviews, and independent organization acceptance decisions."
    ),
    proposed_tables=(
        "submissions",
        "artifacts",
        "mentor_reviews",
        "organization_reviews",
        "mentor_review_evidence",
        "organization_review_evidence",
    ),
    blocking_decisions=("ADR-003", "ADR-005", "ADR-008", "DEC-012"),
    invariants=(
        "A student submission, a mentor review, and an organization review are separate immutable records.",
        "Evidence artifacts are private by default and never exposed via permanent public storage URLs.",
        "New submission revisions do not inherit prior mentor or organization review decisions.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
