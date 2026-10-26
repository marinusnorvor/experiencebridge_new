"""Domain module specification contract aligned with AGENTS.md and docs/02 & docs/03."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter


@dataclass(frozen=True)
class DomainModuleSpec:
    """Declarative boundary metadata for an ExperienceBridge domain module.

    Note: Proposed table names from docs/03-database-api.md §3 are listed as
    architectural boundary metadata only. No unapproved database tables or
    business rules are instantiated on SQLAlchemy Base.metadata before ADR sign-off.
    """

    key: str
    title: str
    owner_lane: str
    summary: str
    proposed_tables: tuple[str, ...]
    blocking_decisions: tuple[str, ...]
    invariants: tuple[str, ...]


def create_domain_router(spec: DomainModuleSpec) -> APIRouter:
    """Create a domain APIRouter without registering unapproved product routes."""
    return APIRouter(prefix=f"/{spec.key}", tags=[spec.title])
