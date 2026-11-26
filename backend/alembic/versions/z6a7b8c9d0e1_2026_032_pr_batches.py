"""2026_032 add pr_batches tables

Revision ID: z6a7b8c9d0e1
Revises: y5z6a7b8c9d0
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'z6a7b8c9d0e1'
down_revision = 'y5z6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'skywatch_pr_batches',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('batch_no', sa.String(20), nullable=False, unique=True),
        sa.Column('sw_version', sa.String(50), nullable=False),
        sa.Column('agreed_date', sa.Date(), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('delivery_date', sa.Date(), nullable=True),
        sa.Column('verified_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='합의중'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        'skywatch_pr_batch_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('batch_id', sa.Integer(), sa.ForeignKey('skywatch_pr_batches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('issue_id', sa.Integer(), sa.ForeignKey('skywatch_issues.id'), nullable=True),
        sa.Column('kac_pr_no', sa.String(20), nullable=True),
        sa.Column('lm_pr_no', sa.String(50), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('agreed_content', sa.Text(), nullable=True),
        sa.Column('actual_fix', sa.Text(), nullable=True),
        sa.Column('verify_method', sa.Text(), nullable=True),
        sa.Column('item_status', sa.String(20), nullable=False, server_default='대기'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        'skywatch_pr_batch_attachments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('batch_id', sa.Integer(), sa.ForeignKey('skywatch_pr_batches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doc_type', sa.String(20), nullable=False, server_default='기타'),
        sa.Column('original_name', sa.String(500), nullable=False),
        sa.Column('stored_name', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('skywatch_users.id'), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index('ix_pr_batches_status', 'skywatch_pr_batches', ['status'])
    op.create_index('ix_pr_batch_items_batch_id', 'skywatch_pr_batch_items', ['batch_id'])
    op.create_index('ix_pr_batch_attachments_batch_id', 'skywatch_pr_batch_attachments', ['batch_id'])


def downgrade():
    op.drop_index('ix_pr_batch_attachments_batch_id', table_name='skywatch_pr_batch_attachments')
    op.drop_index('ix_pr_batch_items_batch_id', table_name='skywatch_pr_batch_items')
    op.drop_index('ix_pr_batches_status', table_name='skywatch_pr_batches')
    op.drop_table('skywatch_pr_batch_attachments')
    op.drop_table('skywatch_pr_batch_items')
    op.drop_table('skywatch_pr_batches')
