"""Create users table and add foreign key to threads

Revision ID: 002_create_users_table
Revises: 001_create_chat_tables
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from uuid import uuid4
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision = '002_create_users_table'
down_revision = '001_create_chat_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create default user for existing chats
    # This is a temporary user to handle the existing threads
    op.execute(sa.text("""
        INSERT INTO users (id, email, hashed_password, full_name, created_at, updated_at)
        VALUES (
            '12345678-1234-5678-1234-567812345678'::uuid,
            'demo@amzur.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUmGEJei',
            'Demo User',
            now(),
            now()
        )
    """))

    # Add foreign key constraint from threads to users
    op.alter_column('threads', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               nullable=False)
    op.create_foreign_key(
        'fk_threads_user_id',
        'threads', 'users',
        ['user_id'], ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_threads_user_id', 'threads', type_='foreignkey')
    
    # Drop users table
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

