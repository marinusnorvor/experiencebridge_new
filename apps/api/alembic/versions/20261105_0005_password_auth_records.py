"""Add isolated authentication records without changing legacy users.

Development only until the migration has been independently reviewed and tested.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261105_0005"
down_revision = "20261031_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_credentials",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("normalized_email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("normalized_email", name=op.f("uq_auth_credentials_normalized_email")),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.create_table(
        "auth_tokens",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("purpose", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"])
    op.create_index("ix_auth_tokens_expires_at", "auth_tokens", ["expires_at"])
    op.create_table(
        "auth_csrf_contexts",
        sa.Column("context_hash", sa.String(64), primary_key=True),
        sa.Column("csrf_hash", sa.String(64), nullable=False),
        sa.Column("session_hash", sa.String(64), sa.ForeignKey("auth_sessions.token_hash")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_csrf_contexts_session_hash", "auth_csrf_contexts", ["session_hash"])
    op.create_index("ix_auth_csrf_contexts_expires_at", "auth_csrf_contexts", ["expires_at"])
    op.create_table(
        "auth_rate_limits",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("bucket_key", sa.String(64), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("bucket_key", "window_start", name=op.f("uq_auth_rate_limits_bucket_key_window_start")),
    )
    op.create_index("ix_auth_rate_limits_expires_at", "auth_rate_limits", ["expires_at"])


def downgrade():
    # Preserve new credentials and sessions. Reverting application code is separate
    # from a destructive database rollback, which requires an explicit data plan.
    raise RuntimeError("Authentication records require a reviewed, data-preserving rollback plan")
