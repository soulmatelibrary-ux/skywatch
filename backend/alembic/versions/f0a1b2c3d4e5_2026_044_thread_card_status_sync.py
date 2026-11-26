"""2026_044 이어지는 일(thread)이 진행중·보류인 묶음의 카드 상태를 일 상태에 맞춘다

바뀌는 카드의 기존 값은 skywatch_card_status_backup_044 에 먼저 저장한다 (downgrade 가 이 표로 복원).
장기 과제(project)·삭제된 카드·취소된 카드는 건드리지 않는다.

Revision ID: f0a1b2c3d4e5
Revises: e9f0a1b2c3d4
Create Date: 2026-11-12
"""
from alembic import op

revision = "f0a1b2c3d4e5"
down_revision = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None

BACKUP = "skywatch_card_status_backup_044"
# 일 상태 -> 카드 상태: open -> in_progress(진행중), hold -> hold
TARGET = "CASE t.status WHEN 'open' THEN 'in_progress' ELSE 'hold' END"


def upgrade():
    op.execute(f"""
        CREATE TABLE IF NOT EXISTS {BACKUP} (
            card_id integer PRIMARY KEY,
            old_status varchar(20),
            old_completed_by integer,
            old_completed_at timestamptz,
            old_status_changed_by integer,
            old_status_changed_at timestamptz
        )""")
    op.execute(f"""
        INSERT INTO {BACKUP}
            (card_id, old_status, old_completed_by, old_completed_at, old_status_changed_by, old_status_changed_at)
        SELECT c.id, c.status, c.completed_by, c.completed_at, c.status_changed_by, c.status_changed_at
        FROM skywatch_log_cards c
        JOIN skywatch_work_thread_cards w ON w.card_id = c.id
        JOIN skywatch_work_threads t ON t.id = w.thread_id
        WHERE t.kind = 'thread' AND t.is_deleted = FALSE AND t.status IN ('open', 'hold')
          AND c.is_deleted = FALSE AND c.status <> 'cancelled' AND c.status <> {TARGET}
        ON CONFLICT (card_id) DO NOTHING""")
    op.execute(f"""
        UPDATE skywatch_log_cards c
        SET status = {TARGET}, completed_by = NULL, completed_at = NULL,
            status_changed_by = NULL, status_changed_at = now()
        FROM skywatch_work_thread_cards w
        JOIN skywatch_work_threads t ON t.id = w.thread_id
        WHERE w.card_id = c.id AND c.id IN (SELECT card_id FROM {BACKUP})""")


def downgrade():
    op.execute(f"""
        UPDATE skywatch_log_cards c
        SET status = b.old_status, completed_by = b.old_completed_by, completed_at = b.old_completed_at,
            status_changed_by = b.old_status_changed_by, status_changed_at = b.old_status_changed_at
        FROM {BACKUP} b WHERE b.card_id = c.id""")
    op.execute(f"DROP TABLE IF EXISTS {BACKUP}")
