"""Identity and contextual authorization domain module (D1)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec, create_domain_router

MODULE_SPEC = DomainModuleSpec(
    key="identity",
    title="Identity & Authorization",
    owner_lane="D1",
    summary=(
        "Local user records, external OIDC issuer/subject mapping, and server-side "
        "contextual authorization predicates."
    ),
    proposed_tables=("users", "user_role_grants"),
    blocking_decisions=("ADR-002",),
    invariants=(
        "Identity is not authorization; contextual membership, assignment, and ownership are checked server-side.",
        "Client-supplied role labels or user IDs are never trusted.",
        "No passwords or identity-provider secrets are stored in the application database.",
    ),
)

router = create_domain_router(MODULE_SPEC)

__all__ = ["MODULE_SPEC", "router"]
