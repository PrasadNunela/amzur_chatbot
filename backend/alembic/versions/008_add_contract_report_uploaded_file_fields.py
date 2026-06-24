"""Add uploaded file metadata fields to contract analysis reports.

Revision ID: 008_contract_file_meta
Revises: 007_contract_reports
Create Date: 2026-06-23 22:20:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "008_contract_file_meta"
down_revision = "007_contract_reports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contract_analysis_reports", sa.Column("uploaded_filename", sa.String(length=255), nullable=True))
    op.add_column("contract_analysis_reports", sa.Column("uploaded_file_path", sa.String(length=512), nullable=True))
    op.add_column("contract_analysis_reports", sa.Column("uploaded_file_mime_type", sa.String(length=100), nullable=True))
    op.add_column("contract_analysis_reports", sa.Column("uploaded_file_size", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("contract_analysis_reports", "uploaded_file_size")
    op.drop_column("contract_analysis_reports", "uploaded_file_mime_type")
    op.drop_column("contract_analysis_reports", "uploaded_file_path")
    op.drop_column("contract_analysis_reports", "uploaded_filename")
