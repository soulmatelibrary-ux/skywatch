"""2026_035 replace ivfflat with HNSW indexes for card/log vector search

카드·일지 벡터 검색을 "거리순 상위 N개" 질의로 바꾸면서 인덱스를 HNSW로 교체한다.
(기존 ivfflat은 데이터가 적을 때 학습되어 군집 품질을 보장할 수 없고, 매 검색마다 425MB 전체 스캔이 발생했음)
pgvector < 0.5.0 (HNSW 미지원)이면 NOTICE만 남기고 기존 ivfflat 인덱스를 유지한다.

Revision ID: c1d2e3f4a5b6
Revises: b8c9d0e1f2a4
Create Date: 2026-10-24
"""
from alembic import op

revision = 'c1d2e3f4a5b6'
down_revision = 'b8c9d0e1f2a4'
branch_labels = None
depends_on = None

_TARGETS = (
    ("skywatch_card_vectors", "idx_card_vectors_embedding_hnsw", "idx_card_vectors_embedding_ivf"),
    ("skywatch_log_vectors", "idx_log_vectors_embedding_hnsw", "idx_log_vectors_embedding_ivf"),
)


def upgrade() -> None:
    for table, hnsw_name, ivf_name in _TARGETS:
        op.execute(f"""
            DO $$
            BEGIN
                CREATE INDEX IF NOT EXISTS {hnsw_name}
                    ON {table} USING hnsw (embedding_vector vector_cosine_ops);
                DROP INDEX IF EXISTS {ivf_name};
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'HNSW index skipped for {table}: %', SQLERRM;
            END $$;
        """)


def downgrade() -> None:
    for table, hnsw_name, ivf_name in _TARGETS:
        op.execute(f"DROP INDEX IF EXISTS {hnsw_name}")
        op.execute(
            f"CREATE INDEX IF NOT EXISTS {ivf_name} ON {table} "
            "USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 50)"
        )
