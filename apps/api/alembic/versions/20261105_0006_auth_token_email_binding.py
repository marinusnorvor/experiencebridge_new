"""Bind future action tokens to the email address to which they were sent."""
from alembic import op
import sqlalchemy as sa

revision = "20261105_0006"
down_revision = "20261105_0005"
branch_labels = None
depends_on = None


def upgrade():
    # Nullable preserves any pre-existing records. Application logic rejects
    # unbound tokens, so they cannot become credentials for a changed address.
    op.add_column("auth_tokens", sa.Column("email_hash", sa.String(64), nullable=True))


def downgrade():
    raise RuntimeError("Authentication records require a reviewed, data-preserving rollback plan")
