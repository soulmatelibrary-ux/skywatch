"""2026_017_add_inquiries

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-06-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'n4o5p6q7r8s9'
down_revision = 'm3n4o5p6q7r8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "skywatch_inquiries",
        sa.Column("id", sa.Integer, nullable=False),
        sa.Column("inquiry_no", sa.String(20), nullable=False),
        sa.Column("occurred_date", sa.Date, nullable=False),
        sa.Column("occurred_time", sa.String(10), nullable=True),
        sa.Column("controller_sector", sa.String(100), nullable=True),
        sa.Column("sw_version", sa.String(20), nullable=True),
        sa.Column("received_by", sa.Integer, nullable=True),
        sa.Column("received_by_raw", sa.String(50), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("keyword", sa.String(255), nullable=True),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="in_progress"),
        sa.Column("completed_date", sa.Date, nullable=True),
        sa.Column("pr_no", sa.String(20), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("card_id", sa.Integer, nullable=True),
        sa.Column("created_by", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_edited_by", sa.Integer, nullable=True),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deleted_by", sa.Integer, nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["card_id"], ["skywatch_log_cards.id"], ),
        sa.ForeignKeyConstraint(["created_by"], ["skywatch_users.id"], ),
        sa.ForeignKeyConstraint(["deleted_by"], ["skywatch_users.id"], ),
        sa.ForeignKeyConstraint(["last_edited_by"], ["skywatch_users.id"], ),
        sa.ForeignKeyConstraint(["received_by"], ["skywatch_users.id"], ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("inquiry_no"),
    )
    op.create_index("ix_inquiries_occurred_date", "skywatch_inquiries", ["occurred_date"])
    op.create_index("ix_inquiries_status", "skywatch_inquiries", ["status"])
    op.create_index("ix_inquiries_category", "skywatch_inquiries", ["category"])


def downgrade():
    op.drop_index("ix_inquiries_category", table_name="skywatch_inquiries")
    op.drop_index("ix_inquiries_status", table_name="skywatch_inquiries")
    op.drop_index("ix_inquiries_occurred_date", table_name="skywatch_inquiries")
    op.drop_table("skywatch_inquiries")
