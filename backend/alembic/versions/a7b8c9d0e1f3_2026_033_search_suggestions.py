"""2026_033 add search_suggestions table

Revision ID: a7b8c9d0e1f3
Revises: z6a7b8c9d0e1
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = 'a7b8c9d0e1f3'
down_revision = 'z6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'skywatch_search_suggestions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('query_text', sa.String(200), nullable=False),
        sa.Column('search_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('result_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_searched_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('query_text', name='uq_search_suggestions_query_text'),
    )
    # prefix 검색용 btree 인덱스 (varchar_pattern_ops로 LIKE 'prefix%' 최적화)
    op.create_index(
        'ix_search_suggestions_query_text_pattern',
        'skywatch_search_suggestions',
        [sa.text('query_text varchar_pattern_ops')],
    )


def downgrade() -> None:
    op.drop_index('ix_search_suggestions_query_text_pattern',
                  table_name='skywatch_search_suggestions')
    op.drop_table('skywatch_search_suggestions')
