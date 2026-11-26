"""2026_008_add_source_seq_and_content_text

- skywatch_logs.source_seq: 레거시 CSV seq 보존
- skywatch_attachments.content_text: 첨부파일 텍스트 추출 내용 (content1)

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('skywatch_logs',
        sa.Column('source_seq', sa.Integer(), nullable=True))
    op.add_column('skywatch_attachments',
        sa.Column('content_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('skywatch_logs', 'source_seq')
    op.drop_column('skywatch_attachments', 'content_text')
