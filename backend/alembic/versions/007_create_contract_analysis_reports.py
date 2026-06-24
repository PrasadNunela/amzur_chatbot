"""Create contract analysis reports table.

Revision ID: 007_contract_reports
Revises: 006_add_thread_mode
Create Date: 2026-06-23 21:55:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "007_contract_reports"
down_revision = "006_add_thread_mode"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contract_analysis_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("report_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contract_analysis_reports_user_id"),
        "contract_analysis_reports",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contract_analysis_reports_user_id"), table_name="contract_analysis_reports")
    op.drop_table("contract_analysis_reports")
