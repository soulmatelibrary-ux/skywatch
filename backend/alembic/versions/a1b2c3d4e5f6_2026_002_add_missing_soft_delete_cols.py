"""2026_002_add_missing_cols

Revision ID: a1b2c3d4e5f6
Revises: ed92452039aa
Create Date: 2026-05-01

DB가 마이그레이션 최종본 적용 전에 생성된 경우 누락된 컬럼을 추가.
- skywatch_card_categories : soft-delete 컬럼
- skywatch_card_links      : id (SERIAL PK)
"""

from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'ed92452039aa'
branch_labels = None
depends_on = None


def _col_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    row = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    return row is not None


def _constraint_exists(name: str) -> bool:
    conn = op.get_bind()
    row = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.table_constraints "
        "WHERE constraint_name = :n"
    ), {"n": name}).fetchone()
    return row is not None


def upgrade() -> None:
    conn = op.get_bind()

    # skywatch_card_categories 의 soft-delete 컬럼은 모델에서 제거됨 — 처리 불필요

    # ── skywatch_card_links : id SERIAL PRIMARY KEY ───────────────
    if not _col_exists("skywatch_card_links", "id"):
        # 기존 복합 PK 제약 제거 (있는 경우)
        if _constraint_exists("skywatch_card_links_pkey"):
            conn.execute(sa.text(
                "ALTER TABLE skywatch_card_links DROP CONSTRAINT skywatch_card_links_pkey"
            ))
        # id 컬럼 SERIAL로 추가 후 PK 설정
        conn.execute(sa.text(
            "ALTER TABLE skywatch_card_links ADD COLUMN id SERIAL"
        ))
        conn.execute(sa.text(
            "ALTER TABLE skywatch_card_links ADD PRIMARY KEY (id)"
        ))

    # ── skywatch_card_links : created_by / created_at ─────────────
    if not _col_exists("skywatch_card_links", "created_by"):
        op.add_column("skywatch_card_links",
            sa.Column("created_by", sa.Integer(),
                      sa.ForeignKey("skywatch_users.id"), nullable=True))
    if not _col_exists("skywatch_card_links", "created_at"):
        op.add_column("skywatch_card_links",
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.func.now()))


def downgrade() -> None:
    for col in ("created_at", "created_by", "deleted_at", "deleted_by", "is_deleted"):
        if _col_exists("skywatch_card_categories", col):
            op.drop_column("skywatch_card_categories", col)
    for col in ("created_at", "created_by", "id"):
        if _col_exists("skywatch_card_links", col):
            op.drop_column("skywatch_card_links", col)
