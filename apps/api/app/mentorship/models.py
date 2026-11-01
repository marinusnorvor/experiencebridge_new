"""Mentor eligibility profiles and participation-scoped assignments."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.organizations.models import Record


class MentorProfile(Record, Base):
    __tablename__ = "mentor_profiles"
    __table_args__ = (
        CheckConstraint("eligibility_status IN ('pending','approved','rejected','suspended')", name="eligibility_status"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    bio: Mapped[str] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    availability_text: Mapped[str] = mapped_column(String(200))
    weekly_review_capacity: Mapped[int] = mapped_column(default=5)
    directory_opt_in: Mapped[bool] = mapped_column(default=True)
    eligibility_status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class MentorAssignment(Record, Base):
    __tablename__ = "mentor_assignments"
    __table_args__ = (
        CheckConstraint("status IN ('proposed','accepted','declined','expired','ended')", name="status"),
    )
    participation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participations.id"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    mentor_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    proposer_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    context: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="proposed", index=True)
    conflict_declared: Mapped[bool | None] = mapped_column(default=None)
    confidentiality_acknowledged: Mapped[bool | None] = mapped_column(default=None)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")
