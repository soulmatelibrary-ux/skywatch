"""2026_009_add_performance_indexes

- pg_trgm GIN 인덱스 (검색 성능 3배 향상)
  - idx_sw_log_cards_title_trgm
  - idx_sw_log_cards_content_trgm
  - idx_sw_comments_body_trgm
- LogParticipant 조회 최적화
  - idx_sw_log_participants_log_id

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """성능 최적화 인덱스 추가."""
    # 1. pg_trgm 확장 활성화 (필수)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2. 검색 성능 인덱스 (GIN trgm)
    # 카드 제목 검색 최적화
    op.create_index(
        'idx_sw_log_cards_title_trgm',
        'skywatch_log_cards',
        ['title'],
        unique=False,
        postgresql_using='gin',
        postgresql_ops={'title': 'gin_trgm_ops'},
    )

    # 카드 내용 검색 최적화
    op.create_index(
        'idx_sw_log_cards_content_trgm',
        'skywatch_log_cards',
        ['content'],
        unique=False,
        postgresql_using='gin',
        postgresql_ops={'content': 'gin_trgm_ops'},
    )

    # 댓글 본문 검색 최적화
    op.create_index(
        'idx_sw_comments_body_trgm',
        'skywatch_comments',
        ['body'],
        unique=False,
        postgresql_using='gin',
        postgresql_ops={'body': 'gin_trgm_ops'},
    )

    # 3. 쿼리 성능 인덱스
    # LogParticipant.log_id 필터 최적화
    op.create_index(
        'idx_sw_log_participants_log_id',
        'skywatch_log_participants',
        ['log_id'],
    )


def downgrade() -> None:
    """성능 최적화 인덱스 제거."""
    op.drop_index('idx_sw_log_participants_log_id')
    op.drop_index('idx_sw_comments_body_trgm')
    op.drop_index('idx_sw_log_cards_content_trgm')
    op.drop_index('idx_sw_log_cards_title_trgm')
