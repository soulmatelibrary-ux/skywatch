"""add manager approval state to PR verification reports"""
from alembic import op
import sqlalchemy as sa

revision = "f4a5b6c7d8e9"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("skywatch_pr_verifications", sa.Column("approval_status", sa.String(20), nullable=False, server_default="결재대기"))
    op.add_column("skywatch_pr_verifications", sa.Column("approved_by", sa.Integer(), sa.ForeignKey("skywatch_users.id"), nullable=True))
    op.add_column("skywatch_pr_verifications", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("skywatch_pr_verifications", sa.Column("approval_note", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("skywatch_pr_verifications", "approval_note")
    op.drop_column("skywatch_pr_verifications", "approved_at")
    op.drop_column("skywatch_pr_verifications", "approved_by")
    op.drop_column("skywatch_pr_verifications", "approval_status")
