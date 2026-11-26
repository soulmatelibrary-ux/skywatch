"""store latest worker workbook and link imported verification rows"""
from alembic import op
import sqlalchemy as sa

revision = "b6c7d8e9f0a1"
down_revision = "a5b6c7d8e9f0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "skywatch_pr_workbook_imports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("skywatch_pr_batches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("skywatch_users.id"), nullable=False),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("stored_name", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("imported_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("batch_id", "user_id", name="uq_pr_workbook_batch_user"),
    )
    op.add_column("skywatch_pr_verifications", sa.Column("source_import_id", sa.Integer(), sa.ForeignKey("skywatch_pr_workbook_imports.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_pr_workbook_import_batch", "skywatch_pr_workbook_imports", ["batch_id"])
    op.create_index("ix_pr_workbook_import_user", "skywatch_pr_workbook_imports", ["user_id"])


def downgrade():
    op.drop_index("ix_pr_workbook_import_user", table_name="skywatch_pr_workbook_imports")
    op.drop_index("ix_pr_workbook_import_batch", table_name="skywatch_pr_workbook_imports")
    op.drop_column("skywatch_pr_verifications", "source_import_id")
    op.drop_table("skywatch_pr_workbook_imports")
