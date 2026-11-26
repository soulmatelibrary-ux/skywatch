"""2026_001_init_schema

Revision ID: ed92452039aa
Revises:
Create Date: 2026-04-30

전체 Skywatch 테이블 초기 생성.
실행 전 DB에서:
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  -- pgvector 설치 후: CREATE EXTENSION IF NOT EXISTS vector;
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID

revision = "ed92452039aa"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 도메인 1: 사용자 & 인증 ─────────────────────────────────
    op.create_table(
        "skywatch_users",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("name",          sa.String(50),  nullable=False),
        sa.Column("login_id",      sa.String(20),  nullable=False, unique=True),
        sa.Column("role",          sa.String(20),  nullable=False),
        sa.Column("team",          sa.String(10),  nullable=False),
        sa.Column("grade",         sa.String(20)),
        sa.Column("password_hash", sa.String(255), nullable=False, server_default=""),
        sa.Column("salt",          sa.String(100), nullable=False, server_default=""),
        sa.Column("is_active",     sa.Boolean,     nullable=False, server_default=sa.true()),
        sa.Column("sort_order",    sa.Integer,     nullable=False, server_default="0"),
        sa.Column("joined_at",     sa.Date),
        sa.Column("resigned_at",   sa.Date),
        sa.Column("note",          sa.Text),
        sa.Column("no_excel",      sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_by",    sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('shift_worker','day_worker','admin')", name="ck_users_role"),
        sa.CheckConstraint("team IN ('A','B','C','D','day')", name="ck_users_team"),
    )

    op.create_table(
        "skywatch_sessions",
        sa.Column("id",           sa.String(128), primary_key=True),
        sa.Column("user_id",      sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at",   sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 도메인 2: 일지 & 카드 ──────────────────────────────────
    op.create_table(
        "skywatch_logs",
        sa.Column("id",             sa.Integer, primary_key=True),
        sa.Column("author_id",      sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("date",           sa.Date, nullable=False),
        sa.Column("shift_type",     sa.String(10), nullable=False),
        sa.Column("title",          sa.String(255)),
        sa.Column("created_at",     sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",     sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by",     sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("last_edited_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("is_deleted",     sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by",     sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at",     sa.DateTime(timezone=True)),
        sa.CheckConstraint("shift_type IN ('주간','야간','주야','비번','휴가')", name="ck_logs_shift_type"),
        sa.UniqueConstraint("date", "shift_type", name="uq_logs_date_shift"),
    )

    op.create_table(
        "skywatch_card_categories",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("name",       sa.String(50), nullable=False),
        sa.Column("color",      sa.String(20)),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active",  sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "skywatch_log_cards",
        sa.Column("id",                sa.Integer, primary_key=True),
        sa.Column("log_id",            sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id",       sa.Integer, sa.ForeignKey("skywatch_card_categories.id")),
        sa.Column("position",          sa.Integer, nullable=False, server_default="0"),
        sa.Column("title",             sa.String(255), nullable=False),
        sa.Column("content",           sa.Text),
        sa.Column("status",            sa.String(10), nullable=False, server_default="open"),
        sa.Column("completed_by",      sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("completed_at",      sa.DateTime(timezone=True)),
        sa.Column("status_changed_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("status_changed_at", sa.DateTime(timezone=True)),
        sa.Column("created_by",        sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("last_edited_by",    sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at",        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted",        sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by",        sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at",        sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('open','hold','done')", name="ck_cards_status"),
    )

    op.create_table(
        "skywatch_log_participants",
        sa.Column("id",      sa.Integer, primary_key=True),
        sa.Column("log_id",  sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("role",    sa.String(20), nullable=False),
        sa.Column("sub_for", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("note",    sa.Text),
        sa.UniqueConstraint("log_id", "user_id", name="uq_participants_log_user"),
        sa.CheckConstraint("role IN ('primary','sub','support','overtime')", name="ck_participants_role"),
    )

    op.create_table(
        "skywatch_log_reads",
        sa.Column("log_id",  sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "skywatch_log_acknowledgments",
        sa.Column("log_id",   sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id",  sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("acked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "skywatch_log_versions",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("log_id",        sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("editor_id",     sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("snapshot_json", sa.Text, nullable=False),
        sa.Column("edited_at",     sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "skywatch_card_links",
        sa.Column("id",             sa.Integer, primary_key=True),
        sa.Column("source_card_id", sa.Integer, sa.ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_card_id", sa.Integer, sa.ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by",     sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("created_at",     sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("source_card_id", "target_card_id", name="uq_card_links"),
    )
    op.create_index("idx_card_links_source", "skywatch_card_links", ["source_card_id"])
    op.create_index("idx_card_links_target", "skywatch_card_links", ["target_card_id"])

    # ── 도메인 2-A: 파일 첨부 ──────────────────────────────────
    op.create_table(
        "skywatch_attachments",
        sa.Column("id",            sa.Integer, primary_key=True),
        sa.Column("owner_type",    sa.String(20), nullable=False),
        sa.Column("owner_id",      sa.Integer, nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("file_path",     sa.String(500), nullable=False),
        sa.Column("file_name",     sa.String(255), nullable=False),
        sa.Column("file_size",     sa.BigInteger, nullable=False),
        sa.Column("mime_type",     sa.String(100)),
        sa.Column("uploaded_by",   sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted",    sa.Boolean, nullable=False, server_default=sa.false()),
        sa.CheckConstraint("owner_type IN ('card','task','comment')", name="ck_attachments_owner_type"),
    )

    # ── 도메인 2-B: 근무 스케줄 & 휴가 ──────────────────────────
    op.create_table(
        "skywatch_schedules",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("team",       sa.String(10), nullable=False),
        sa.Column("date",       sa.Date, nullable=False),
        sa.Column("shift_type", sa.String(10), nullable=False),
        sa.Column("capacity",   sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("team", "date", name="uq_schedules_team_date"),
        sa.CheckConstraint("team IN ('A','B','C','D','day')", name="ck_schedules_team"),
        sa.CheckConstraint("shift_type IN ('주간','야간','주야','비번','휴가')", name="ck_schedules_shift_type"),
    )
    op.create_index("idx_sw_schedules_date", "skywatch_schedules", ["date"])
    op.create_index("idx_sw_schedules_team", "skywatch_schedules", ["team", "date"])

    op.create_table(
        "skywatch_shift_overrides",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("date",             sa.Date, nullable=False),
        sa.Column("original_user_id", sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("actual_user_id",   sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("type",             sa.String(20), nullable=False),
        sa.Column("swap_group_id",    UUID(as_uuid=True)),
        sa.Column("approved_by",      sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("note",             sa.Text),
        sa.Column("created_at",       sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("type IN ('swap','substitution')", name="ck_overrides_type"),
    )
    op.create_index("idx_sw_overrides_date", "skywatch_shift_overrides", ["date"])

    op.create_table(
        "skywatch_leave_requests",
        sa.Column("id",          sa.Integer, primary_key=True),
        sa.Column("user_id",     sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("date_from",   sa.Date, nullable=False),
        sa.Column("date_to",     sa.Date, nullable=False),
        sa.Column("reason",      sa.Text),
        sa.Column("status",      sa.String(20), nullable=False, server_default="pending"),
        sa.Column("approved_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_leave_status"),
    )
    op.create_index("idx_sw_leave_user_date", "skywatch_leave_requests", ["user_id", "date_from", "date_to"])

    op.create_table(
        "skywatch_shift_staff_memos",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("date",       sa.Date, nullable=False),
        sa.Column("user_id",    sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("memo_type",  sa.String(20), nullable=False),
        sa.Column("memo_text",  sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("date", "user_id", "memo_type", name="uq_shift_memos"),
        sa.CheckConstraint("memo_type IN ('연차','대체','대휴','교육','출장','기타','알림')", name="ck_memo_type"),
    )
    op.create_index("idx_sw_shift_memos_date", "skywatch_shift_staff_memos", ["date"])
    op.create_index("idx_sw_shift_memos_user", "skywatch_shift_staff_memos", ["user_id", "date"])

    op.create_table(
        "skywatch_shift_carry_over",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("user_id",    sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entry_type", sa.String(10), nullable=False),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("shift_type", sa.String(20)),
        sa.Column("hours",      sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("note",       sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("entry_type IN ('earned','used')", name="ck_carry_entry_type"),
    )
    op.create_index("idx_sw_carry_user", "skywatch_shift_carry_over", ["user_id", "entry_date"])

    op.create_table(
        "skywatch_shift_notices",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("text",       sa.Text, nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date",   sa.Date, nullable=False),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_sw_notices_period", "skywatch_shift_notices", ["start_date", "end_date"])

    # ── 도메인 3: 댓글 & 반응 ──────────────────────────────────
    op.create_table(
        "skywatch_comments",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("log_id",     sa.Integer, sa.ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id",  sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("parent_id",  sa.Integer, sa.ForeignKey("skywatch_comments.id")),
        sa.Column("body",       sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by", sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "skywatch_comment_reactions",
        sa.Column("comment_id", sa.Integer, sa.ForeignKey("skywatch_comments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id",    sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("emoji",      sa.String(10), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 도메인 4: Task ─────────────────────────────────────────
    op.create_table(
        "skywatch_tasks",
        sa.Column("id",              sa.Integer, primary_key=True),
        sa.Column("sender_id",       sa.Integer, sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("title",           sa.String(255), nullable=False),
        sa.Column("body",            sa.Text),
        sa.Column("importance",      sa.String(10), nullable=False, server_default="normal"),
        sa.Column("due_date",        sa.String(16)),
        sa.Column("recipients_mode", sa.String(20), nullable=False, server_default="individual"),
        sa.Column("recipients",      JSONB, nullable=False, server_default="[]"),
        sa.Column("target_teams",    JSONB, nullable=False, server_default="[]"),
        sa.Column("completed_by",    JSONB, nullable=False, server_default="[]"),
        sa.Column("linked_card_id",  sa.Integer, sa.ForeignKey("skywatch_log_cards.id")),
        sa.Column("updated_by",      sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted",      sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by",      sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at",      sa.DateTime(timezone=True)),
        sa.CheckConstraint("importance IN ('high','normal','low')", name="ck_tasks_importance"),
        sa.CheckConstraint("recipients_mode IN ('all','teams','individual')", name="ck_tasks_mode"),
    )

    op.create_table(
        "skywatch_recurring_task_templates",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("name",                sa.String(255), nullable=False),
        sa.Column("repeat_type",         sa.String(20), nullable=False),
        sa.Column("repeat_days",         JSONB),
        sa.Column("repeat_time",         sa.String(5)),
        sa.Column("run_once_date",       sa.Date),
        sa.Column("template_title",      sa.String(255)),
        sa.Column("template_body",       sa.Text),
        sa.Column("template_importance", sa.String(10), nullable=False, server_default="normal"),
        sa.Column("target_teams",        JSONB, nullable=False, server_default="[]"),
        sa.Column("target_shift_types",  JSONB, nullable=False, server_default="[]"),
        sa.Column("is_active",           sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_by",          sa.Integer, sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at",          sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("next_run_at",         sa.DateTime(timezone=True)),
        sa.Column("last_executed_at",    sa.DateTime(timezone=True)),
        sa.CheckConstraint("repeat_type IN ('daily','weekly','monthly','once')", name="ck_template_repeat"),
    )

    # ── 도메인 5: 알림 ─────────────────────────────────────────
    op.create_table(
        "skywatch_notifications",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("user_id",    sa.Integer, sa.ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type",       sa.String(30), nullable=False),
        sa.Column("ref_type",   sa.String(20)),
        sa.Column("ref_id",     sa.Integer),
        sa.Column("body",       sa.Text),
        sa.Column("read_at",    sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 도메인 6: 검색 인덱스 ──────────────────────────────────
    op.create_table(
        "skywatch_search_index",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("target_type",  sa.String(20), nullable=False),
        sa.Column("target_id",    sa.Integer, nullable=False),
        sa.Column("content_text", TSVECTOR),
        sa.Column("updated_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("target_type", "target_id", name="uq_search_index"),
    )
    op.create_index("idx_sw_search_text", "skywatch_search_index", ["content_text"],
                    postgresql_using="gin")

    # ── 초기 데이터: admin 계정 & 기본 카테고리 6개 ────────────
    op.execute("""
        INSERT INTO skywatch_users
            (name, login_id, role, team, password_hash, salt, is_active, sort_order)
        VALUES
            ('관리자', 'admin', 'admin', 'day', '', '', true, 0)
    """)
    op.execute("""
        INSERT INTO skywatch_card_categories (name, color, sort_order, is_active, created_by, created_at)
        VALUES
            ('관제시스템 설치/적용', 'blue',   0, true, 1, NOW()),
            ('관제시스템 검증/시험', 'green',  1, true, 1, NOW()),
            ('관제지원 개발/개선',   'purple', 2, true, 1, NOW()),
            ('시스템 장애/이상처리', 'red',    3, true, 1, NOW()),
            ('행정/문서 관리',       'orange', 4, true, 1, NOW()),
            ('기타',                 'gray',   5, true, 1, NOW())
    """)


def downgrade() -> None:
    op.drop_table("skywatch_search_index")
    op.drop_table("skywatch_notifications")
    op.drop_table("skywatch_recurring_task_templates")
    op.drop_table("skywatch_tasks")
    op.drop_table("skywatch_comment_reactions")
    op.drop_table("skywatch_comments")
    op.drop_table("skywatch_shift_notices")
    op.drop_table("skywatch_shift_carry_over")
    op.drop_table("skywatch_shift_staff_memos")
    op.drop_table("skywatch_leave_requests")
    op.drop_table("skywatch_shift_overrides")
    op.drop_table("skywatch_schedules")
    op.drop_table("skywatch_attachments")
    op.drop_table("skywatch_card_links")
    op.drop_table("skywatch_log_versions")
    op.drop_table("skywatch_log_acknowledgments")
    op.drop_table("skywatch_log_reads")
    op.drop_table("skywatch_log_participants")
    op.drop_table("skywatch_log_cards")
    op.drop_table("skywatch_card_categories")
    op.drop_table("skywatch_logs")
    op.drop_table("skywatch_sessions")
    op.drop_table("skywatch_users")
