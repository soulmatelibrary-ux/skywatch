"""2026_015_fix_shift_data_date_type

skywatch_shift_data.date 컬럼 타입 text → date 변환

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa


revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE skywatch_shift_data ALTER COLUMN date TYPE DATE USING date::date"
    )


def downgrade():
    op.execute(
        "ALTER TABLE skywatch_shift_data ALTER COLUMN date TYPE TEXT USING date::text"
    )
