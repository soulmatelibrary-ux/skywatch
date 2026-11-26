"""2026_003_add_card_statuses

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-05-06

카드 상태 분류 마스터 테이블 추가.
시스템 기본 상태 3종 시드 포함.
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "skywatch_card_statuses",
        sa.Column("id",         sa.Integer,     primary_key=True),
        sa.Column("key",        sa.String(30),  nullable=False, unique=True),
        sa.Column("label",      sa.String(50),  nullable=False),
        sa.Column("color",      sa.String(20)),
        sa.Column("sort_order", sa.Integer,     nullable=False, server_default="0"),
        sa.Column("is_system",  sa.Boolean,     nullable=False, server_default=sa.false()),
        sa.Column("is_active",  sa.Boolean,     nullable=False, server_default=sa.true()),
        sa.Column("is_deleted", sa.Boolean,     nullable=False, server_default=sa.false()),
        sa.Column("deleted_by", sa.Integer,     sa.ForeignKey("skywatch_users.id")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", sa.Integer,     sa.ForeignKey("skywatch_users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

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
            {"key": "open",  "label": "진행중", "color": "#f59e0b", "sort_order": 0, "is_system": True, "is_active": True, "is_deleted": False},
            {"key": "hold",  "label": "보류",   "color": "#94a3b8", "sort_order": 1, "is_system": True, "is_active": True, "is_deleted": False},
            {"key": "done",  "label": "완료",   "color": "#22c55e", "sort_order": 2, "is_system": True, "is_active": True, "is_deleted": False},
        ],
    )


def downgrade() -> None:
    op.drop_table("skywatch_card_statuses")
