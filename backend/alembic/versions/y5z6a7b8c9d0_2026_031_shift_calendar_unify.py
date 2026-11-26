"""2026_031 unify shift calendar tables into skywatch db

Revision ID: y5z6a7b8c9d0
Revises: x4y5z6a7b8c9
Create Date: 2026-07-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'y5z6a7b8c9d0'
down_revision = 'x4y5z6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. skywatch_shift_staff_master (달력 직원 마스터)
    op.create_table(
        'skywatch_shift_staff_master',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('emp_no', sa.Integer, nullable=False, default=0),
        sa.Column('grade', sa.String(20)),
        sa.Column('shift', sa.String(20)),
        sa.Column('from_date', sa.Date),
        sa.Column('to_date', sa.Date),
        sa.Column('no_excel', sa.Boolean, nullable=False, default=False),
    )

    # 2. skywatch_shift_notices에 deleted_at 추가 (소프트 삭제용)
    op.add_column(
        'skywatch_shift_notices',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 3. skywatch_shift_carry_raw (달력 연간 잔여시간: year/name/hours)
    op.create_table(
        'skywatch_shift_carry_raw',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('year', sa.String(10), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('hours', sa.Numeric(6, 1), nullable=False, default=0),
        sa.UniqueConstraint('year', 'name', name='uq_shift_carry_raw_year_name'),
    )


def downgrade() -> None:
    op.drop_table('skywatch_shift_carry_raw')
    op.drop_column('skywatch_shift_notices', 'deleted_at')
    op.drop_table('skywatch_shift_staff_master')
