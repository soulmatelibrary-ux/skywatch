"""2026_036 work threads (이어지는 일·장기 과제) and card memos (전달·메모)

기존 일지/카드 테이블은 변경하지 않고 매칭 테이블만 추가한다.
데이터 이관:
  1) '전달사항' 카드 분류 추가 (없을 때만)
  2) 이월 체인(같은 제목 카드 간 CardLink)을 과제로 묶음
  3) 남은 미완료 카드(open·in_progress·hold 등)를 카드별 과제로 등록

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-10-24
"""
from alembic import op
import sqlalchemy as sa

revision = 'd2e3f4a5b6c7'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None

_DONE = ('done', 'cancelled')


def _create_tables():
    op.create_table(
        'skywatch_work_threads',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('kind', sa.String(10), nullable=False, server_default='thread'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('skywatch_card_categories.id'), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='open'),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('started_on', sa.Date(), nullable=False),
        sa.Column('closed_on', sa.Date(), nullable=True),
        sa.Column('current_phase', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('recur_month', sa.Integer(), nullable=True),
        sa.Column('source_thread_id', sa.Integer(), sa.ForeignKey('skywatch_work_threads.id'), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index('ix_work_threads_status', 'skywatch_work_threads', ['kind', 'status'])
    op.create_table(
        'skywatch_work_thread_phases',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('thread_id', sa.Integer(), sa.ForeignKey('skywatch_work_threads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('seq', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('start_month', sa.String(7), nullable=False),
        sa.Column('end_month', sa.String(7), nullable=False),
    )
    op.create_table(
        'skywatch_work_thread_cards',
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('skywatch_log_cards.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('thread_id', sa.Integer(), sa.ForeignKey('skywatch_work_threads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('origin', sa.String(20), nullable=False, server_default='new'),
        sa.Column('linked_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('linked_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_skywatch_work_thread_cards_thread_id', 'skywatch_work_thread_cards', ['thread_id'])
    op.create_table(
        'skywatch_card_memos',
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('skywatch_log_cards.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('target_type', sa.String(10), nullable=False, server_default='next'),
        sa.Column('target_user_id', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('keep', sa.String(10), nullable=False, server_default='checked'),
        sa.Column('keep_until', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        'skywatch_card_memo_checks',
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('skywatch_log_cards.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('skywatch_users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def _add_memo_category(bind):
    exists = bind.execute(sa.text(
        "SELECT 1 FROM skywatch_card_categories WHERE name = '전달사항' LIMIT 1"
    )).first()
    if exists:
        return
    bind.execute(sa.text("""
        INSERT INTO skywatch_card_categories (name, color, sort_order, is_active)
        SELECT '전달사항', '#0891b2', COALESCE(MAX(sort_order), 0) + 1, TRUE
        FROM skywatch_card_categories
    """))


def _insert_thread(bind, card_rows, status):
    """card_rows: [(card_id, title, category_id, log_date, created_by)] 날짜순."""
    first, last = card_rows[0], card_rows[-1]
    thread_id = bind.execute(sa.text("""
        INSERT INTO skywatch_work_threads
            (kind, title, category_id, status, owner_id, started_on, closed_on, created_by)
        VALUES ('thread', :title, :cat, :status, :owner, :started, :closed, :owner)
        RETURNING id
    """), {
        "title": (first[1] or '(제목 없음)')[:255], "cat": first[2], "status": status,
        "owner": first[4], "started": first[3], "closed": last[3] if status == 'done' else None,
    }).scalar()
    for row in card_rows:
        bind.execute(sa.text("""
            INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin)
            VALUES (:card, :thread, 'migration') ON CONFLICT (card_id) DO NOTHING
        """), {"card": row[0], "thread": thread_id})


_CARD_SQL = """
    SELECT c.id, c.title, c.category_id, l.date, c.created_by, c.status
    FROM skywatch_log_cards c JOIN skywatch_logs l ON l.id = c.log_id
    WHERE c.is_deleted = FALSE AND l.is_deleted = FALSE
"""


def _migrate_carry_chains(bind):
    links = bind.execute(sa.text("""
        SELECT k.source_card_id, k.target_card_id
        FROM skywatch_card_links k
        JOIN skywatch_log_cards s ON s.id = k.source_card_id AND s.is_deleted = FALSE
        JOIN skywatch_log_cards t ON t.id = k.target_card_id AND t.is_deleted = FALSE
        WHERE TRIM(s.title) = TRIM(t.title)
    """)).fetchall()
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in links:
        parent[find(a)] = find(b)
    groups = {}
    for cid in list(parent):
        groups.setdefault(find(cid), []).append(cid)
    for ids in groups.values():
        rows = bind.execute(sa.text(_CARD_SQL + " AND c.id = ANY(:ids) ORDER BY l.date, c.id"),
                            {"ids": ids}).fetchall()
        if len(rows) < 2:
            continue
        # 최신 카드 기준 (이월된 예전 카드는 '보류'로 남아 있으므로 판정에서 뺀다)
        status = 'open' if rows[-1][5] not in _DONE else 'done'
        _insert_thread(bind, [tuple(r[:5]) for r in rows], status)


def _migrate_open_cards(bind):
    rows = bind.execute(sa.text(_CARD_SQL + """
        AND c.status NOT IN ('done', 'cancelled') AND l.shift_type <> '공지'
        AND NOT EXISTS (SELECT 1 FROM skywatch_work_thread_cards w WHERE w.card_id = c.id)
        ORDER BY l.date, c.id
    """)).fetchall()
    for r in rows:
        _insert_thread(bind, [tuple(r[:5])], 'hold' if r[5] == 'hold' else 'open')


def upgrade():
    _create_tables()
    bind = op.get_bind()
    _add_memo_category(bind)
    _migrate_carry_chains(bind)
    _migrate_open_cards(bind)


def downgrade():
    op.drop_table('skywatch_card_memo_checks')
    op.drop_table('skywatch_card_memos')
    op.drop_index('ix_skywatch_work_thread_cards_thread_id', table_name='skywatch_work_thread_cards')
    op.drop_table('skywatch_work_thread_cards')
    op.drop_table('skywatch_work_thread_phases')
    op.drop_index('ix_work_threads_status', table_name='skywatch_work_threads')
    op.drop_table('skywatch_work_threads')
