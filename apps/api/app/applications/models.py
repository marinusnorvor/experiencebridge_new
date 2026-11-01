"""Selection and explicit consent records, separate from mentor/review evidence."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.organizations.models import Record


class Application(Record, Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("project_id", "student_user_id"),
        CheckConstraint("status IN ('submitted','under_review','shortlisted','rejected','offered','withdrawn')", name="status"),
    )
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    student_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    seen_terms_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_terms_versions.id"))
    motivation: Mapped[str] = mapped_column(Text)
    declared_skills: Mapped[list] = mapped_column(JSON, default=list)
    links: Mapped[list] = mapped_column(JSON, default=list)
    weekly_minutes_available: Mapped[int]
    status: Mapped[str] = mapped_column(String(30), default="submitted", index=True)
    reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class Offer(Record, Base):
    __tablename__ = "offers"
    __table_args__ = (
        CheckConstraint("status IN ('offered','accepted','declined','expired','revoked')", name="status"),
        Index("uq_offers_live_application", "application_id", unique=True,
              postgresql_where=text("status = 'offered'"), sqlite_where=text("status = 'offered'")),
        Index("uq_offers_accepted_application", "application_id", unique=True,
              postgresql_where=text("status = 'accepted'"), sqlite_where=text("status = 'accepted'")),
    )
    application_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("applications.id"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    student_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    terms_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_terms_versions.id"))
    terms_hash: Mapped[str] = mapped_column(String(64))
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="offered")
    reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class Participation(Record, Base):
    __tablename__ = "participations"
    __table_args__ = (
        UniqueConstraint("offer_id"), UniqueConstraint("project_id", "student_user_id"),
        CheckConstraint("status IN ('active','under_review','completed','partially_completed','withdrawn','cancelled')", name="status"),
    )
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    student_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id"))
    accepted_terms_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_terms_versions.id"))
    status: Mapped[str] = mapped_column(String(30), default="active")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    withdrawal_reason: Mapped[str | None] = mapped_column(Text)
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class TermsAcceptance(Record, Base):
    __tablename__ = "terms_acceptances"
    __table_args__ = (UniqueConstraint("offer_id"), UniqueConstraint("participation_id"),)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id"))
    participation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participations.id"))
    student_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    terms_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project_terms_versions.id"))
    terms_hash: Mapped[str] = mapped_column(String(64))
    consent_statement_version: Mapped[str] = mapped_column(String(40))
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")
