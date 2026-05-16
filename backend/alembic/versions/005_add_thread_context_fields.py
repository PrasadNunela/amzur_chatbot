"""Add thread context fields.

Revision ID: 005_add_thread_context_fields
Revises: 004_add_attachments
Create Date: 2026-05-16 16:25:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005_add_thread_context_fields"
down_revision = "004_add_attachments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("threads", sa.Column("context_type", sa.String(length=20), nullable=True))
    op.add_column("threads", sa.Column("context_source", sa.Text(), nullable=True))
    op.add_column("threads", sa.Column("context_label", sa.String(length=255), nullable=True))
    op.add_column(
        "threads",
        sa.Column("context_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("threads", "context_locked", server_default=None)


def downgrade() -> None:
    op.drop_column("threads", "context_locked")
    op.drop_column("threads", "context_label")
    op.drop_column("threads", "context_source")
    op.drop_column("threads", "context_type")
