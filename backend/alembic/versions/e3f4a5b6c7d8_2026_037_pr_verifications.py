"""2026_037 add worker PR verification reports

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-11-03
"""
from alembic import op
import sqlalchemy as sa

revision = "e3f4a5b6c7d8"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "skywatch_pr_verifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("skywatch_pr_batch_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("round_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("result", sa.String(20), nullable=False, server_default="미제출"),
        sa.Column("test_case_code", sa.String(100), nullable=True),
        sa.Column("skyline_version", sa.String(100), nullable=True),
        sa.Column("adaptation_version", sa.String(100), nullable=True),
        sa.Column("tested_on", sa.Date(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verify_method", sa.Text(), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("report_original_name", sa.String(500), nullable=True),
        sa.Column("report_stored_name", sa.String(500), nullable=True),
        sa.Column("report_file_size", sa.Integer(), nullable=True),
        sa.Column("report_uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_by", sa.Integer(), sa.ForeignKey("skywatch_users.id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("skywatch_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.UniqueConstraint("item_id", "user_id", "round_no", name="uq_pr_verification_round"),
    )
    op.create_index("ix_pr_verifications_item", "skywatch_pr_verifications", ["item_id"])
    op.create_index("ix_pr_verifications_user", "skywatch_pr_verifications", ["user_id"])
    op.create_index("ix_pr_verifications_result", "skywatch_pr_verifications", ["result"])


def downgrade():
    op.drop_index("ix_pr_verifications_result", table_name="skywatch_pr_verifications")
    op.drop_index("ix_pr_verifications_user", table_name="skywatch_pr_verifications")
    op.drop_index("ix_pr_verifications_item", table_name="skywatch_pr_verifications")
    op.drop_table("skywatch_pr_verifications")
