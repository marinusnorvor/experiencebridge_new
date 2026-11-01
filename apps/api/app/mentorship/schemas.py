"""Typed request and response schemas for mentor profiles and assignments."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.projects.schemas import Input, RecordRead


class MentorProfileWrite(Input):
    bio: Annotated[str, Field(min_length=10, max_length=2000)]
    skills: list[Annotated[str, Field(min_length=1, max_length=80)]] = Field(min_length=1, max_length=30)
    availability_text: Annotated[str, Field(min_length=2, max_length=200)]
    weekly_review_capacity: int = Field(ge=1, le=50, strict=True)
    directory_opt_in: bool = True


class MentorProfileRead(RecordRead):
    user_id: UUID
    bio: str
    skills: list[str]
    availability_text: str
    weekly_review_capacity: int
    directory_opt_in: bool
    eligibility_status: Literal["pending", "approved", "rejected", "suspended"]
    data_origin: Literal["synthetic"]


class MentorEligibilityInput(Input):
    decision: Literal["approve", "reject", "suspend"]
    explanation: Annotated[str, Field(min_length=10, max_length=2000)]


class AssignmentCreate(Input):
    mentor_user_id: UUID
    context: Annotated[str, Field(min_length=10, max_length=2000)]
    expires_at: AwareDatetime


class AssignmentAccept(Input):
    conflict_declared: bool = Field(strict=True)
    confidentiality_acknowledged: bool = Field(strict=True)


class AssignmentRead(RecordRead):
    participation_id: UUID
    project_id: UUID
    mentor_user_id: UUID
    proposer_user_id: UUID
    context: str
    expires_at: datetime
    status: Literal["proposed", "accepted", "declined", "expired", "ended"]
    conflict_declared: bool | None
    confidentiality_acknowledged: bool | None
    accepted_at: datetime | None
    end_reason: str | None
    data_origin: Literal["synthetic"]


class AssignmentPage(Input):
    items: list[AssignmentRead]
    next_offset: int | None = None
    next_cursor: str | None = None
