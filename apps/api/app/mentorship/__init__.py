"""Mentorship domain package; no assignments or review behavior yet (D4)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec
from app.mentorship.router import router

MODULE_SPEC = DomainModuleSpec(
    key="mentorship",
    title="Mentorship",
    owner_lane="D4",
    summary=(
        "Mentor eligibility profiles, conflict-of-interest declarations, and "
        "participation-scoped mentor assignments."
    ),
    proposed_tables=(
        "mentor_profiles",
        "mentor_assignments",
    ),
    blocking_decisions=("ADR-003", "ADR-008", "DEC-008"),
    invariants=(
        "Only an explicitly assigned and accepted mentor for a participation may submit a mentor review.",
        "Mentor observation and rubric assessment never imply organization deliverable acceptance.",
    ),
)

__all__ = ["MODULE_SPEC", "router"]
