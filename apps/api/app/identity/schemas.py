"""Pydantic DTOs for authenticated identity and GET /api/v1/me (Contract C-01)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.identity.models import AccountStatus, GlobalUserRole

PortalContextName = Literal["student", "organization", "mentor", "admin"]


class VerifiedIdentityClaims(BaseModel):
    """Server-verified identity claims extracted from a Clerk session JWT."""

    model_config = ConfigDict(frozen=True)

    issuer: str = Field(description="Verified OIDC/Clerk issuer URL (iss).")
    subject: str = Field(description="Verified Clerk user ID (sub).")
    session_id: str | None = Field(default=None, description="Clerk session identifier (sid).")
    authorized_party: str | None = Field(
        default=None,
        description="Verified authorized party origin (azp) when present.",
    )
    email: str | None = Field(
        default=None,
        description="Optional normalized email claim from the verified token.",
    )
    email_verified: bool = Field(
        default=False,
        description="Whether the email address was verified by Clerk.",
    )
    display_name: str | None = Field(
        default=None,
        description="Optional display name claim from the verified token.",
    )


class UserRoleGrantRead(BaseModel):
    """Active global role grant attached to an internal user record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: GlobalUserRole
    granted_at: datetime
    reason: str | None = None


class UserSelf(BaseModel):
    """Response model for GET /api/v1/me (API-ID-01 / Contract C-01)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Internal ExperienceBridge user UUID.")
    identity_issuer: str = Field(description="Verified identity provider issuer URL.")
    identity_subject: str = Field(description="Verified identity provider subject identifier.")
    display_name: str = Field(description="User display name.")
    email: str | None = Field(default=None, description="Contact email address (if available).")
    email_verified_at: datetime | None = Field(
        default=None,
        description="UTC timestamp when the user's email was verified.",
    )
    account_status: AccountStatus = Field(description="Internal account lifecycle status.")
    role_grants: list[GlobalUserRole] = Field(
        default_factory=list,
        description="Active global role grants persisted in PostgreSQL.",
    )
    effective_contexts: list[PortalContextName] = Field(
        default_factory=list,
        description="Server-verified portal contexts available to this user.",
    )
    created_at: datetime
    updated_at: datetime
    row_version: int
