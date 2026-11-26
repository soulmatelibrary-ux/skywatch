"""2026_034 add pg_trgm GIN indexes for ILIKE search optimization

Revision ID: b8c9d0e1f2a4
Revises: a7b8c9d0e1f3
Create Date: 2026-08-31
"""
from alembic import op

revision = 'b8c9d0e1f2a4'
down_revision = 'a7b8c9d0e1f3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # LogCard title/content: 통합검색 ILIKE 가속
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_log_cards_title_trgm "
        "ON skywatch_log_cards USING GIN (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_log_cards_content_trgm "
        "ON skywatch_log_cards USING GIN (content gin_trgm_ops)"
    )

    # Log title: 일지 검색 ILIKE 가속
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_logs_title_trgm "
        "ON skywatch_logs USING GIN (title gin_trgm_ops)"
    )

    # Comment body: 댓글 검색 ILIKE 가속
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_comments_body_trgm "
        "ON skywatch_comments USING GIN (body gin_trgm_ops)"
    )

    # TechDoc title/content: 기술문서 검색 ILIKE 가속
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_tech_docs_title_trgm "
        "ON skywatch_tech_docs USING GIN (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_tech_docs_content_trgm "
        "ON skywatch_tech_docs USING GIN (content gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_tech_docs_content_trgm")
    op.execute("DROP INDEX IF EXISTS ix_tech_docs_title_trgm")
    op.execute("DROP INDEX IF EXISTS ix_comments_body_trgm")
    op.execute("DROP INDEX IF EXISTS ix_logs_title_trgm")
    op.execute("DROP INDEX IF EXISTS ix_log_cards_content_trgm")
    op.execute("DROP INDEX IF EXISTS ix_log_cards_title_trgm")
