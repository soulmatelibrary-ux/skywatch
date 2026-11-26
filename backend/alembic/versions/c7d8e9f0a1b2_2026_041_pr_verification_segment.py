"""2026_041 add test segment and attendees to PR verifications

Revision ID: c7d8e9f0a1b2
Revises: b6c7d8e9f0a1
Create Date: 2026-11-04
"""
from alembic import op
import sqlalchemy as sa

revision = "c7d8e9f0a1b2"
down_revision = "b6c7d8e9f0a1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("skywatch_pr_verifications", sa.Column("test_segment", sa.String(100), nullable=True))
    op.add_column("skywatch_pr_verifications", sa.Column("attendees", sa.String(200), nullable=True))


def downgrade():
    op.drop_column("skywatch_pr_verifications", "attendees")
    op.drop_column("skywatch_pr_verifications", "test_segment")
