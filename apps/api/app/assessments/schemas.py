"""Typed request and response schemas for submissions, artifacts, and reviews."""

from datetime import datetime
from ipaddress import ip_address
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, HttpUrl, field_validator, model_validator

from app.projects.schemas import Input, RecordRead


class ArtifactCreate(Input):
    kind: Literal["external_url", "text_excerpt"]
    label: Annotated[str, Field(min_length=1, max_length=160)]
    url: HttpUrl | None = Field(default=None, max_length=2048)
    excerpt: Annotated[str | None, Field(default=None, min_length=10, max_length=20000)] = None

    @field_validator("url")
    @classmethod
    def safe_url(cls, value):
        if value is None:
            return None
        host = (value.host or "").rstrip(".").lower()
        if value.scheme != "https" or value.username or value.password or host == "localhost" or host.endswith((".localhost", ".local")):
            raise ValueError("Use an HTTPS link without credentials or a local host")
        try:
            address = ip_address(host.strip("[]"))
        except ValueError:
            return value
        if not address.is_global:
            raise ValueError("Private/reserved IP addresses are not allowed")
        return value

    @model_validator(mode="after")
    def validate_content(self):
        if self.kind == "external_url" and not self.url:
            raise ValueError("url is required for external_url artifacts")
        if self.kind == "text_excerpt" and not self.excerpt:
            raise ValueError("excerpt is required for text_excerpt artifacts")
        return self


class ArtifactRead(RecordRead):
    submission_id: UUID
    creator_user_id: UUID
    kind: Literal["external_url", "text_excerpt"]
    label: str
    url: str | None
    excerpt: str | None
    access_class: Literal["private"]
    safety_status: Literal["not_scanned"]
    data_origin: Literal["synthetic"]


class SubmissionCreate(Input):
    milestone_index: int = Field(ge=0, strict=True)
    summary: Annotated[str, Field(min_length=20, max_length=5000)]
    contribution_statement: Annotated[str, Field(min_length=20, max_length=5000)]


class SubmissionPatch(Input):
    summary: Annotated[str | None, Field(default=None, min_length=20, max_length=5000)] = None
    contribution_statement: Annotated[str | None, Field(default=None, min_length=20, max_length=5000)] = None


class SubmissionRead(RecordRead):
    participation_id: UUID
    milestone_index: int
    revision_no: int
    student_user_id: UUID
    summary: str
    contribution_statement: str
    status: Literal["draft", "submitted", "revision_requested", "withdrawn"]
    submitted_at: datetime | None
    supersedes_submission_id: UUID | None
    data_origin: Literal["synthetic"]
    artifacts: list[ArtifactRead] = Field(default_factory=list)


class SubmissionPage(Input):
    items: list[SubmissionRead]
    next_offset: int | None = None
    next_cursor: str | None = None


class MentorObservation(Input):
    criterion_text: Annotated[str, Field(min_length=2, max_length=200)]
    score: int | None = Field(default=None, ge=1, le=5)
    observation: Annotated[str, Field(min_length=5, max_length=2000)]


class MentorReviewCreate(Input):
    decision: Literal["reviewed", "revision_requested", "unable_to_assess"]
    observations: list[MentorObservation] = Field(default_factory=list)
    participant_feedback: Annotated[str, Field(min_length=10, max_length=5000)]
    manager_summary: Annotated[str | None, Field(default=None, min_length=10, max_length=2000)] = None


class MentorReviewView(RecordRead):
    submission_id: UUID
    assignment_id: UUID
    author_user_id: UUID
    decision: Literal["reviewed", "revision_requested", "unable_to_assess"]
    observations: list[MentorObservation]
    participant_feedback: str | None = None
    manager_summary: str | None = None
    supersedes_review_id: UUID | None = None
    data_origin: Literal["synthetic"]


class MentorReviewPage(Input):
    items: list[MentorReviewView]
    next_offset: int | None = None
    next_cursor: str | None = None


class OrganizationCriterionResult(Input):
    criterion_text: Annotated[str, Field(min_length=2, max_length=200)]
    met: bool
    explanation: Annotated[str, Field(min_length=5, max_length=2000)]


class OrganizationReviewCreate(Input):
    decision: Literal["accepted", "revisions_requested", "rejected"]
    criteria_results: list[OrganizationCriterionResult] = Field(default_factory=list)
    explanation: Annotated[str, Field(min_length=10, max_length=5000)]


class OrganizationReviewRead(RecordRead):
    submission_id: UUID
    project_id: UUID
    reviewer_user_id: UUID
    decision: Literal["accepted", "revisions_requested", "rejected"]
    criteria_results: list[OrganizationCriterionResult]
    explanation: str
    supersedes_review_id: UUID | None = None
    data_origin: Literal["synthetic"]


class OrganizationReviewPage(Input):
    items: list[OrganizationReviewRead]
    next_offset: int | None = None
    next_cursor: str | None = None


class ReadyRequest(Input):
    requested_outcome: Literal["completed", "partially_completed"]
    explanation: Annotated[str, Field(min_length=10, max_length=2000)]


class FinalizeRequest(Input):
    outcome: Literal["completed", "partially_completed"]
    explanation: Annotated[str, Field(min_length=10, max_length=2000)]
