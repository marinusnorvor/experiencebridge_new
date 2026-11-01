"""Milestone submissions, external artifacts, and independent mentor/organization reviews."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.organizations.models import Record


class Submission(Record, Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("participation_id", "milestone_index", "revision_no"),
        CheckConstraint("status IN ('draft','submitted','revision_requested','withdrawn')", name="status"),
    )
    participation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participations.id"), index=True)
    milestone_index: Mapped[int] = mapped_column(default=0)
    revision_no: Mapped[int] = mapped_column(default=1)
    student_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    summary: Mapped[str] = mapped_column(Text)
    contribution_statement: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    supersedes_submission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("submissions.id"))
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class Artifact(Record, Base):
    __tablename__ = "artifacts"
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    creator_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(30))
    label: Mapped[str] = mapped_column(String(160))
    url: Mapped[str | None] = mapped_column(String(2048))
    excerpt: Mapped[str | None] = mapped_column(Text)
    access_class: Mapped[str] = mapped_column(String(20), default="private")
    safety_status: Mapped[str] = mapped_column(String(20), default="not_scanned")
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class MentorReview(Record, Base):
    __tablename__ = "mentor_reviews"
    __table_args__ = (
        CheckConstraint("decision IN ('reviewed','revision_requested','unable_to_assess')", name="decision"),
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mentor_assignments.id"))
    author_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(30), index=True)
    observations: Mapped[list] = mapped_column(JSON, default=list)
    participant_feedback: Mapped[str] = mapped_column(Text)
    manager_summary: Mapped[str | None] = mapped_column(Text)
    supersedes_review_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mentor_reviews.id"))
    correction_reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class OrganizationReview(Record, Base):
    __tablename__ = "organization_reviews"
    __table_args__ = (
        CheckConstraint("decision IN ('accepted','revisions_requested','rejected')", name="decision"),
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    reviewer_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(30), index=True)
    criteria_results: Mapped[list] = mapped_column(JSON, default=list)
    explanation: Mapped[str] = mapped_column(Text)
    supersedes_review_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("organization_reviews.id"))
    correction_reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")
