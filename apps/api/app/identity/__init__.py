"""Identity and contextual authorization domain module (D1)."""

from __future__ import annotations

from app.core.domains import DomainModuleSpec
from app.identity import models as _models  # noqa: F401
from app.identity.router import router

MODULE_SPEC = DomainModuleSpec(
    key="identity",
    title="Identity & Authorization",
    owner_lane="D1",
    summary=(
        "Local user records, external OIDC issuer/subject mapping, and server-side "
        "contextual authorization predicates."
    ),
    proposed_tables=("users", "user_role_grants"),
    blocking_decisions=("ADR-012 (branch development exception)",),
    invariants=(
        "Identity is not authorization; contextual membership, assignment, and ownership are checked server-side.",
        "Client-supplied role labels or user IDs are never trusted.",
        "Only password hashes and token hashes are persisted.",
    ),
)

__all__ = ["MODULE_SPEC", "router"]
