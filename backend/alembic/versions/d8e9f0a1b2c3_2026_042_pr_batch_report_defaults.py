"""2026_042 PR version report defaults (Skyline/Adaptation version, test segment)

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa

revision = "d8e9f0a1b2c3"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade():
    # 버전에 한 번 적어 두면 검증 보고서 입력·엑셀 업로드 때 기본값으로 쓴다 (기존 행은 비워 둠)
    op.add_column("skywatch_pr_batches", sa.Column("skyline_version", sa.String(100), nullable=True))
    op.add_column("skywatch_pr_batches", sa.Column("adaptation_version", sa.String(100), nullable=True))
    op.add_column("skywatch_pr_batches", sa.Column("test_segment", sa.String(100), nullable=True))


def downgrade():
    op.drop_column("skywatch_pr_batches", "test_segment")
    op.drop_column("skywatch_pr_batches", "adaptation_version")
    op.drop_column("skywatch_pr_batches", "skyline_version")
