"""Create users and user_role_grants tables (ADR-002 / Contract C-01).

Revision ID: 20261026_0001
Revises:
Create Date: 2026-10-26 16:15:00+00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261026_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("identity_issuer", sa.Text(), nullable=False),
        sa.Column("identity_subject", sa.Text(), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "account_status",
            sa.Text(),
            server_default="active",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "row_version",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
        sa.CheckConstraint(
            "account_status IN ('active', 'suspended', 'disabled')",
            name=op.f("ck_users_account_status"),
        ),
        sa.CheckConstraint(
            "row_version >= 1",
            name=op.f("ck_users_row_version_positive"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint(
            "identity_issuer",
            "identity_subject",
            name=op.f("uq_users_identity_issuer_identity_subject"),
        ),
    )
    op.create_index("ix_users_identity_subject", "users", ["identity_subject"], unique=False)

    op.create_table(
        "user_role_grants",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("granted_by_user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "role IN ('student', 'mentor_candidate', 'platform_admin')",
            name=op.f("ck_user_role_grants_valid_role"),
        ),
        sa.ForeignKeyConstraint(
            ["granted_by_user_id"],
            ["users.id"],
            name=op.f("fk_user_role_grants_granted_by_user_id"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_role_grants_user_id"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_role_grants")),
    )
    op.create_index(
        "ix_user_role_grants_user_id",
        "user_role_grants",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "uq_user_role_grants_active_user_role",
        "user_role_grants",
        ["user_id", "role"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
        sqlite_where=sa.text("revoked_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_user_role_grants_active_user_role", table_name="user_role_grants")
    op.drop_index("ix_user_role_grants_user_id", table_name="user_role_grants")
    op.drop_table("user_role_grants")
    op.drop_index("ix_users_identity_subject", table_name="users")
    op.drop_table("users")
