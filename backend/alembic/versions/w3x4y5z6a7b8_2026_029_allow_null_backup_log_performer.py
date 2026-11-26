"""2026_029_allow_null_backup_log_performer

자동 백업(스케줄러) 이력 기록을 위해 performed_by 컬럼을 nullable로 변경

Revision ID: w3x4y5z6a7b8
Revises: v2w3x4y5z6a7
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa


revision = 'w3x4y5z6a7b8'
down_revision = 'v2w3x4y5z6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'skywatch_backup_logs',
        'performed_by',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        'skywatch_backup_logs',
        'performed_by',
        existing_type=sa.Integer(),
        nullable=False,
    )
