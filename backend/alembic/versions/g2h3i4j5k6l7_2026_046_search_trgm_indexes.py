"""2026_046 문의사항·개별PR GIN 트라이그램 인덱스 추가

034에서 카드·일지·댓글·관제문서에 pg_trgm 인덱스를 만들었다.
이 마이그레이션은 034에 빠져 있던 문의사항·개별PR 테이블에 같은 인덱스를 추가한다.

내부망은 patch/skywatch/db_patch/46_search_trgm_indexes.sql 이 같은 작업을 한다.

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
Create Date: 2026-11-18
"""
from alembic import op

revision = "g2h3i4j5k6l7"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    # 문의사항 — content, keyword
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_inquiries_content_trgm
        ON skywatch_inquiries USING gin (content gin_trgm_ops)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_inquiries_keyword_trgm
        ON skywatch_inquiries USING gin (keyword gin_trgm_ops)
    """)

    # 개별 PR — title, content
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_issues_title_trgm
        ON skywatch_issues USING gin (title gin_trgm_ops)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_issues_content_trgm
        ON skywatch_issues USING gin (content gin_trgm_ops)
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_inquiries_content_trgm")
    op.execute("DROP INDEX IF EXISTS ix_inquiries_keyword_trgm")
    op.execute("DROP INDEX IF EXISTS ix_issues_title_trgm")
    op.execute("DROP INDEX IF EXISTS ix_issues_content_trgm")
