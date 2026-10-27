"""SQLAlchemy 2.x ORM models for the identity domain (docs/03-database-api.md §3.1)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

AccountStatus = Literal["active", "suspended", "disabled"]
GlobalUserRole = Literal["student", "mentor_candidate", "platform_admin"]

ALLOWED_ACCOUNT_STATUSES: tuple[AccountStatus, ...] = ("active", "suspended", "disabled")
ALLOWED_GLOBAL_USER_ROLES: tuple[GlobalUserRole, ...] = (
    "student",
    "mentor_candidate",
    "platform_admin",
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Internal application user mapped from a verified external OIDC/Clerk subject."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("identity_issuer", "identity_subject"),
        CheckConstraint(
            "account_status IN ('active', 'suspended', 'disabled')",
            name="account_status",
        ),
        CheckConstraint(
            "row_version >= 1",
            name="row_version_positive",
        ),
        Index("ix_users_identity_subject", "identity_subject"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    identity_issuer: Mapped[str] = mapped_column(Text, nullable=False)
    identity_subject: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    account_status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="active",
        server_default="active",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
        server_default=func.now(),
    )
    row_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    role_grants: Mapped[list[UserRoleGrant]] = relationship(
        "UserRoleGrant",
        back_populates="user",
        foreign_keys="UserRoleGrant.user_id",
        cascade="all, delete-orphan",
        order_by="UserRoleGrant.granted_at.asc()",
    )


class UserRoleGrant(Base):
    """Explicit server-managed global role grant (never self-awarded for mentor/admin)."""

    __tablename__ = "user_role_grants"
    __table_args__ = (
        CheckConstraint(
            "role IN ('student', 'mentor_candidate', 'platform_admin')",
            name="valid_role",
        ),
        Index("ix_user_role_grants_user_id", "user_id"),
        Index(
            "uq_user_role_grants_active_user_role",
            "user_id",
            "role",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
            sqlite_where=text("revoked_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    granted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        server_default=func.now(),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(
        "User",
        back_populates="role_grants",
        foreign_keys=[user_id],
    )
