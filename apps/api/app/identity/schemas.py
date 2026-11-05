"""Pydantic DTOs for authenticated identity and GET /api/v1/me (Contract C-01)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.identity.models import AccountStatus, GlobalUserRole

PortalContextName = Literal["student", "organization", "mentor", "admin"]
SkillProficiencyLevel = Literal["beginner", "intermediate", "advanced"]


def _clean_optional_url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if not (cleaned.startswith("https://") or cleaned.startswith("http://")):
        raise ValueError("URL must start with https:// or http://.")
    return cleaned


class StudentSelfReportedSkillDTO(BaseModel):
    """Self-reported student skill entry persisted in the student profile."""

    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(default="General", min_length=1, max_length=80)
    proficiency: SkillProficiencyLevel = "intermediate"
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("name", "category")
    @classmethod
    def _strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank.")
        return cleaned


class StudentProfileProjectDTO(BaseModel):
    """Highlighted project entry persisted in the student profile."""

    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=1000)
    role: str = Field(default="Contributor", min_length=1, max_length=120)
    link_url: str | None = Field(default=None, max_length=2048)

    @field_validator("title", "role")
    @classmethod
    def _strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank.")
        return cleaned

    @field_validator("link_url")
    @classmethod
    def _validate_link_url(cls, value: str | None) -> str | None:
        return _clean_optional_url(value)


class StudentProfileUpsert(BaseModel):
    """Editable student profile fields saved via PUT /api/v1/me/student-profile."""

    display_name: str = Field(min_length=1, max_length=160)
    headline: str = Field(default="", max_length=240)
    bio: str = Field(default="", max_length=2000)
    institution: str = Field(default="", max_length=200)
    program_of_study: str = Field(default="", max_length=200)
    graduation_year: int = Field(default=2026, ge=1950, le=2100)
    weekly_hours_available: int = Field(default=10, ge=1, le=80)
    preferred_domains: list[str] = Field(default_factory=list, max_length=20)
    portfolio_url: str | None = Field(default=None, max_length=2048)
    github_url: str | None = Field(default=None, max_length=2048)
    linkedin_url: str | None = Field(default=None, max_length=2048)
    self_reported_skills: list[StudentSelfReportedSkillDTO] = Field(
        default_factory=list,
        max_length=50,
    )
    top_projects: list[StudentProfileProjectDTO] = Field(
        default_factory=list,
        max_length=20,
    )

    @field_validator("display_name")
    @classmethod
    def _validate_display_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Display name cannot be blank.")
        return cleaned

    @field_validator("headline", "bio", "institution", "program_of_study")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("preferred_domains")
    @classmethod
    def _clean_domains(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in value:
            domain = item.strip()[:80]
            if domain and domain.lower() not in seen:
                seen.add(domain.lower())
                cleaned.append(domain)
        return cleaned

    @field_validator("portfolio_url", "github_url", "linkedin_url")
    @classmethod
    def _validate_urls(cls, value: str | None) -> str | None:
        return _clean_optional_url(value)


class StudentProfileRead(BaseModel):
    """Response model for GET/PUT /api/v1/me/student-profile."""

    user_id: uuid.UUID
    identity_issuer: str
    identity_subject: str
    display_name: str
    email: str | None = None
    headline: str = ""
    bio: str = ""
    institution: str = ""
    program_of_study: str = ""
    graduation_year: int = 2026
    weekly_hours_available: int = 10
    preferred_domains: list[str] = Field(default_factory=list)
    portfolio_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    self_reported_skills: list[StudentSelfReportedSkillDTO] = Field(default_factory=list)
    top_projects: list[StudentProfileProjectDTO] = Field(default_factory=list)
    updated_at: datetime
    row_version: int


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


AdminRoleType = Literal["student", "mentor_candidate", "platform_admin"]


class AdminCreateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=160)
    role: AdminRoleType | None = "platform_admin"


class AdminGrantRoleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    role: AdminRoleType
    reason: str | None = Field(default=None, max_length=500)


class AdminUserOversight(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None = None
    display_name: str
    account_status: str = "active"
    roles: list[str]
    created_at: datetime


class AdminUserOversightPage(BaseModel):
    items: list[AdminUserOversight]
    total: int
