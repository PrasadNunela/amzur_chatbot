"""Add Google OAuth to users table

Revision ID: 003_add_google_oauth
Revises: 002_create_users_table
Create Date: 2024-01-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_google_oauth'
down_revision = '002_create_users_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_id column
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True, unique=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    
    # Make hashed_password nullable (for Google OAuth users)
    op.alter_column('users', 'hashed_password',
               existing_type=sa.String(255),
               nullable=True)


def downgrade() -> None:
    # Make hashed_password not nullable again
    op.alter_column('users', 'hashed_password',
               existing_type=sa.String(255),
               nullable=False)
    
    # Remove google_id column
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')
