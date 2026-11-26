"""2026_016_add_task_archive

skywatch_tasks에 is_archived, archived_at 컬럼 추가

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa


revision = 'm3n4o5p6q7r8'
down_revision = 'l2m3n4o5p6q7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('skywatch_tasks', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('skywatch_tasks', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('skywatch_tasks', 'archived_at')
    op.drop_column('skywatch_tasks', 'is_archived')
