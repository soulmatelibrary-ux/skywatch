"""2026_010_allow_home_memo_type

홈 화면 근무자 조정을 위해 home_주간, home_야간, home_일근 memo_type 허용

Revision ID: g7h8i9j0k1l2
Revises: c9d0e1f2a3b4
Create Date: 2026-05-07
"""
from alembic import op

revision = 'g7h8i9j0k1l2'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade():
    # 기존 CHECK 제약 제거
    op.execute("""
        ALTER TABLE skywatch_shift_staff_memos
        DROP CONSTRAINT IF EXISTS skywatch_shift_staff_memos_memo_type_check;
    """)
    # home_ 패턴을 허용하는 새 제약 추가
    op.execute("""
        ALTER TABLE skywatch_shift_staff_memos
        ADD CONSTRAINT skywatch_shift_staff_memos_memo_type_check
        CHECK (
            memo_type ~ '^M[0-9]{4}$'
            OR memo_type ~ '^home_'
            OR memo_type IN ('연차','대체','대휴','교육','출장','기타','알림')
        );
    """)


def downgrade():
    op.execute("""
        ALTER TABLE skywatch_shift_staff_memos
        DROP CONSTRAINT IF EXISTS skywatch_shift_staff_memos_memo_type_check;
    """)
    op.execute("""
        ALTER TABLE skywatch_shift_staff_memos
        ADD CONSTRAINT skywatch_shift_staff_memos_memo_type_check
        CHECK (
            memo_type ~ '^M[0-9]{4}$'
            OR memo_type IN ('연차','대체','대휴','교육','출장','기타','알림')
        );
    """)
