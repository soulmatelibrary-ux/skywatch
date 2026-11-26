"""2026_014_add_backup_log_soft_delete

백업 이력 Soft delete 지원

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa


revision = 'k1l2m3n4o5p6'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('skywatch_backup_logs', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('skywatch_backup_logs', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('skywatch_backup_logs', sa.Column('deleted_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_backup_logs_deleted_by', 'skywatch_backup_logs', 'skywatch_users', ['deleted_by'], ['id'])


def downgrade():
    op.drop_constraint('fk_backup_logs_deleted_by', 'skywatch_backup_logs', type_='foreignkey')
    op.drop_column('skywatch_backup_logs', 'deleted_by')
    op.drop_column('skywatch_backup_logs', 'deleted_at')
    op.drop_column('skywatch_backup_logs', 'is_deleted')
