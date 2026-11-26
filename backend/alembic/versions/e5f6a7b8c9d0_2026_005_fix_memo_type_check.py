"""2026_005_fix_memo_type_check

memo_type CHECK 제약을 M#### 포맷도 허용하도록 확장

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-06
"""
from alembic import op

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    # 기존 CHECK 제약 모두 제거 (이름이 다를 수 있으므로 raw SQL 사용)
    op.execute("""
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'skywatch_shift_staff_memos'::regclass
                  AND contype = 'c'
                  AND conname ILIKE '%memo_type%'
            LOOP
                EXECUTE 'ALTER TABLE skywatch_shift_staff_memos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
            END LOOP;
        END;
        $$;
    """)
    # M#### 포맷, home_ 홈 화면 조정, 또는 기존 타입값 모두 허용하는 새 제약 추가
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
        CHECK (memo_type IN ('연차','대체','대휴','교육','출장','기타','알림'));
    """)
