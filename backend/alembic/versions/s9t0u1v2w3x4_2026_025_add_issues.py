"""2026_025 add skywatch_issues and skywatch_issue_comments

Revision ID: s9t0u1v2w3x4
Revises: r8s9t0u1v2w3
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = 's9t0u1v2w3x4'
down_revision = 'r8s9t0u1v2w3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'skywatch_issues',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('source_seq', sa.Integer(), nullable=True, unique=True),
        sa.Column('kac_pr_no', sa.String(20), nullable=True),
        sa.Column('lm_pr_no', sa.String(50), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='진행중'),
        sa.Column('acc_type', sa.String(5), nullable=True),
        sa.Column('keyword', sa.String(200), nullable=True),
        sa.Column('version', sa.String(100), nullable=True),
        sa.Column('mod_version', sa.String(100), nullable=True),
        sa.Column('reg_date', sa.Date(), nullable=False),
        sa.Column('action_date', sa.Date(), nullable=True),
        sa.Column('acc_pr', sa.String(50), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('last_edited_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'skywatch_issue_comments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('issue_id', sa.Integer(), sa.ForeignKey('skywatch_issues.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_certified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )

    op.create_index('ix_skywatch_issues_reg_date', 'skywatch_issues', ['reg_date'])
    op.create_index('ix_skywatch_issues_status', 'skywatch_issues', ['status'])
    op.create_index('ix_skywatch_issue_comments_issue_id', 'skywatch_issue_comments', ['issue_id'])


def downgrade() -> None:
    op.drop_table('skywatch_issue_comments')
    op.drop_table('skywatch_issues')
