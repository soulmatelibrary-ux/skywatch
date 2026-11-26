"""2026_028 add notice shift type

'공지' shift_type 추가:
- CHECK 제약 업데이트 (주간/야간/주야/비번/휴가 → +공지)
- UNIQUE 인덱스에서 공지 제외 (같은 날짜에 여러 공지 허용)

Revision ID: v2w3x4y5z6a7
Revises: u1v2w3x4y5z6
Create Date: 2026-06-30
"""
from alembic import op

revision = 'v2w3x4y5z6a7'
down_revision = 'u1v2w3x4y5z6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('skywatch_logs_shift_type_check', 'skywatch_logs', type_='check')
    op.create_check_constraint(
        'skywatch_logs_shift_type_check',
        'skywatch_logs',
        "shift_type IN ('주간','야간','주야','비번','휴가','공지')",
    )

    op.execute("DROP INDEX IF EXISTS skywatch_logs_date_shift_type_active_uidx")
    op.execute("""
        CREATE UNIQUE INDEX skywatch_logs_date_shift_type_active_uidx
        ON skywatch_logs (date, shift_type)
        WHERE is_deleted = FALSE AND shift_type != '공지'
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS skywatch_logs_date_shift_type_active_uidx")
    op.execute("""
        CREATE UNIQUE INDEX skywatch_logs_date_shift_type_active_uidx
        ON skywatch_logs (date, shift_type)
        WHERE is_deleted = FALSE
    """)
    op.drop_constraint('skywatch_logs_shift_type_check', 'skywatch_logs', type_='check')
    op.create_check_constraint(
        'skywatch_logs_shift_type_check',
        'skywatch_logs',
        "shift_type IN ('주간','야간','주야','비번','휴가')",
    )
