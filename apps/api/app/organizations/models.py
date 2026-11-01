"""Organization records for the authenticated supervisor demonstration."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Record:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    row_version: Mapped[int] = mapped_column(default=1, nullable=False)


class Organization(Record, Base):
    __tablename__ = "organizations"
    __table_args__ = (CheckConstraint(
        "verification_status IN ('draft','submitted','verified','changes_requested','rejected')",
        name="verification_status",
    ),)
    display_name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    verification_status: Mapped[str] = mapped_column(String(30), default="draft")
    data_origin: Mapped[str] = mapped_column(String(20), default="synthetic")


class OrganizationMembership(Record, Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", "role"),
        CheckConstraint("role IN ('owner','project_manager','reviewer')", name="role"),
        CheckConstraint("status IN ('active','removed')", name="status"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="active")
