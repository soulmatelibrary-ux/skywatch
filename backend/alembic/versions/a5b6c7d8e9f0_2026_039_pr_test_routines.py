"""classify version test routines and track previous software version"""
from alembic import op
import sqlalchemy as sa

revision = "a5b6c7d8e9f0"
down_revision = "f4a5b6c7d8e9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("skywatch_pr_batches", sa.Column("previous_version", sa.String(50), nullable=True))
    op.add_column("skywatch_pr_batch_items", sa.Column("item_kind", sa.String(30), nullable=False, server_default="개별 PR"))


def downgrade():
    op.drop_column("skywatch_pr_batch_items", "item_kind")
    op.drop_column("skywatch_pr_batches", "previous_version")
