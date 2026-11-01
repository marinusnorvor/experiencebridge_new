"""Project scope, immutable terms snapshots, and attributed moderation decisions."""

import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.organizations.models import Record


class Project(Record, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("capacity > 0 AND capacity <= 100", name="capacity"),
        CheckConstraint("status IN ('draft','pending_review','changes_requested','rejected','open','in_progress','completed','cancelled')", name="status"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_manager_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    org_reviewer_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    capacity: Mapped[int]
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    scope: Mapped[dict] = mapped_column(JSON)
    # Version numbers avoid a cyclic project/terms FK; terms rows have a project FK + UQ.
    submitted_terms_version: Mapped[int | None]
    published_terms_version: Mapped[int | None]
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class TermsVersion(Record, Base):
    __tablename__ = "project_terms_versions"
    __table_args__ = (UniqueConstraint("project_id", "version_no"),)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    version_no: Mapped[int]
    snapshot: Mapped[dict] = mapped_column(JSON)
    content_hash: Mapped[str] = mapped_column(String(64))
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))


class ModerationDecision(Record, Base):
    __tablename__ = "moderation_decisions"
    __table_args__ = (CheckConstraint(
        "(organization_id IS NOT NULL AND project_id IS NULL) OR "
        "(organization_id IS NULL AND project_id IS NOT NULL)", name="one_target"
    ),)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("organizations.id"))
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id"))
    terms_version_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("project_terms_versions.id"))
    admin_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(30))
    explanation: Mapped[str] = mapped_column(Text)
