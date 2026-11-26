"""2026_007_add_card_status_seeds

카드 상태 5종 체계로 정비:
- open: 라벨 "진행중" → "신규", 색상 gray 변경
- in_progress(진행중), pending(확인대기), cancelled(취소) 신규 추가
- hold/done sort_order 조정

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = 'a7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # open: 라벨 "신규", 색상 gray, sort_order 0 유지
    op.execute("""
        UPDATE skywatch_card_statuses
        SET label = '신규', color = '#6b7280'
        WHERE key = 'open'
    """)

    # hold sort_order 4, done sort_order 3으로 밀기
    op.execute("UPDATE skywatch_card_statuses SET sort_order = 3 WHERE key = 'done'")
    op.execute("UPDATE skywatch_card_statuses SET sort_order = 4 WHERE key = 'hold'")

    # 신규 상태 3개 추가
    op.bulk_insert(
        sa.table(
            "skywatch_card_statuses",
            sa.column("key"),
            sa.column("label"),
            sa.column("color"),
            sa.column("sort_order"),
            sa.column("is_system"),
            sa.column("is_active"),
            sa.column("is_deleted"),
        ),
        [
            {"key": "in_progress", "label": "진행중",   "color": "#3b82f6", "sort_order": 1, "is_system": True, "is_active": True, "is_deleted": False},
            {"key": "pending",     "label": "확인대기", "color": "#f59e0b", "sort_order": 2, "is_system": True, "is_active": True, "is_deleted": False},
            {"key": "cancelled",   "label": "취소",     "color": "#ef4444", "sort_order": 5, "is_system": True, "is_active": True, "is_deleted": False},
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM skywatch_card_statuses WHERE key IN ('in_progress', 'pending', 'cancelled')")
    op.execute("""
        UPDATE skywatch_card_statuses
        SET label = '진행중', color = '#f59e0b'
        WHERE key = 'open'
    """)
    op.execute("UPDATE skywatch_card_statuses SET sort_order = 1 WHERE key = 'hold'")
    op.execute("UPDATE skywatch_card_statuses SET sort_order = 2 WHERE key = 'done'")
