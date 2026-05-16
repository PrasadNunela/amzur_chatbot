"""Add thread mode field.

Revision ID: 006_add_thread_mode
Revises: 005_add_thread_context_fields
Create Date: 2026-05-16 16:55:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "006_add_thread_mode"
down_revision = "005_add_thread_context_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "threads",
        sa.Column("thread_mode", sa.String(length=20), nullable=False, server_default="general"),
    )
    op.alter_column("threads", "thread_mode", server_default=None)


def downgrade() -> None:
    op.drop_column("threads", "thread_mode")
