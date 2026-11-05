"""Strict input DTOs for the small synthetic demonstration scope."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Text = Annotated[str, Field(min_length=10, max_length=5000)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OrganizationCreate(Input):
    display_name: str = Field(min_length=2, max_length=160)
    description: Text


class MilestoneInput(Input):
    title: str = Field(min_length=2, max_length=180)
    acceptance_criteria: list[Annotated[str, Field(min_length=5, max_length=1000)]] = Field(min_length=1, max_length=20)
    due_on: date


class ProjectCreate(Input):
    title: str = Field(min_length=2, max_length=180)
    description: Text
    capacity: int = Field(ge=1, le=100, strict=True)
    org_reviewer_user_id: UUID
    scope_in: Text
    scope_out: Text
    estimated_minutes: int = Field(gt=0, le=100000, strict=True)
    start_on: date
    due_on: date
    milestones: list[MilestoneInput] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def dates(self):
        if self.due_on < self.start_on:
            raise ValueError("due_on must not precede start_on")
        if any(not self.start_on <= m.due_on <= self.due_on for m in self.milestones):
            raise ValueError("Milestone deadlines must fall within project dates")
        return self


class TermsCreate(Input):
    compensation_type: Literal["paid_fixed"] = "paid_fixed"
    currency: Literal["GHS"] = "GHS"
    fee_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    payment_terms: Text
    ip_ownership_terms: Text
    confidentiality_terms: Text
    mentor_plan: Text

    @field_validator("fee_amount", mode="before")
    @classmethod
    def decimal_string(cls, value):
        import re
        if not isinstance(value, str) or not re.fullmatch(r"[0-9]{1,12}\.[0-9]{2}", value):
            raise ValueError("fee_amount must be a decimal string with two fractional digits")
        return value


class SubmitProject(Input):
    terms_version_id: UUID


class DecisionInput(Input):
    decision: Literal["verify", "approve", "request_changes", "reject"]
    explanation: str = Field(min_length=10, max_length=2000)
    terms_version_id: UUID | None = None
    snapshot_hash: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


class Empty(Input):
    pass


class RequiredReason(Input):
    explanation: Annotated[str, Field(min_length=10, max_length=2000)]


class OptionalReason(Input):
    explanation: Annotated[str | None, Field(default=None, min_length=10, max_length=2000)] = None


class RecordRead(BaseModel):
    id: UUID
    created_at: datetime
    row_version: int


class OrganizationRead(RecordRead):
    display_name: str
    description: str
    created_by_user_id: UUID
    verification_status: Literal["draft", "submitted", "verified", "changes_requested", "rejected"]
    data_origin: Literal["synthetic"]


class ProjectRead(RecordRead):
    organization_id: UUID
    title: str
    description: str
    capacity: int
    scope: dict
    status: Literal["draft", "pending_review", "changes_requested", "rejected", "open", "in_progress", "completed", "cancelled"]
    submitted_terms_version: int | None
    submitted_terms_version_id: UUID | None = None
    published_terms_version: int | None
    published_terms_version_id: UUID | None = None
    data_origin: Literal["synthetic"]
    project_manager_user_id: UUID | None = None
    org_reviewer_user_id: UUID | None = None


class TermsRead(RecordRead):
    project_id: UUID
    version_no: int
    snapshot: dict
    content_hash: str
    created_by_user_id: UUID
    project_row_version: int | None = None


class OrganizationPage(BaseModel):
    items: list[OrganizationRead]
    next_cursor: str | None = None


class ProjectPage(BaseModel):
    items: list[ProjectRead]
    next_cursor: str | None = None
    next_offset: int | None = None


OrganizationStatus = Literal["draft", "submitted", "verified", "changes_requested", "rejected"]
ProjectStatus = Literal["draft", "pending_review", "changes_requested", "rejected", "open", "in_progress", "completed", "cancelled"]
ApplicationStatus = Literal["submitted", "under_review", "shortlisted", "rejected", "offered", "withdrawn"]
ParticipationStatus = Literal["active", "under_review", "completed", "partially_completed", "withdrawn", "cancelled"]
GlobalRole = Literal["student", "mentor_candidate", "platform_admin"]


class ProjectReviewItem(BaseModel):
    project: ProjectRead
    terms: TermsRead | None = None
    organization_name: str | None = None


class ProjectReviewPage(BaseModel):
    items: list[ProjectReviewItem]
    next_cursor: str | None = None


class AdminProjectItem(BaseModel):
    project: ProjectRead
    terms: TermsRead | None = None
    organization_name: str | None = None
    organization_verification_status: str | None = None


class AdminProjectPage(BaseModel):
    items: list[AdminProjectItem]
    total: int


class AdminStats(BaseModel):
    organizations: dict[str, int]
    projects: dict[str, int]
    mentors: dict[str, int]
    applications: dict[str, int]
    offers: dict[str, int] = {}
    participations: dict[str, int]
    submissions: dict[str, int] = {}
    users: dict[str, int]
    total_audit_events: int


class AuditLogItem(BaseModel):
    id: UUID
    actor_user_id: UUID
    actor_email: str | None = None
    actor_name: str | None = None
    event_type: str
    entity_id: UUID
    request_id: str
    details: dict
    created_at: datetime
    row_version: int


class AuditLogPage(BaseModel):
    items: list[AuditLogItem]
    total: int
    limit: int
    offset: int


class AdminUserOversight(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str
    account_status: str = "active"
    roles: list[str]
    created_at: datetime


class AdminUserOversightPage(BaseModel):
    items: list[AdminUserOversight]
    total: int


class AdminApplicationOversight(BaseModel):
    id: UUID
    project_id: UUID
    project_title: str | None = None
    student_user_id: UUID
    student_email: str | None = None
    student_name: str | None = None
    status: str
    offer_status: str | None = None
    weekly_minutes_available: int
    created_at: datetime
    row_version: int


class AdminApplicationOversightPage(BaseModel):
    items: list[AdminApplicationOversight]
    total: int


class AdminParticipationOversight(BaseModel):
    id: UUID
    project_id: UUID
    project_title: str | None = None
    student_user_id: UUID
    student_email: str | None = None
    student_name: str | None = None
    status: str
    started_at: datetime | None = None
    submission_counts: dict[str, int] = {}
    created_at: datetime
    row_version: int


class AdminParticipationOversightPage(BaseModel):
    items: list[AdminParticipationOversight]
    total: int

