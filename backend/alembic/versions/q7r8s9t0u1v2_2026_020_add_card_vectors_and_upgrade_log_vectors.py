"""020 - add card vectors table and upgrade log_vectors to 1024-dim for KURE-v1.

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1, 1c92412cbe1b
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = 'q7r8s9t0u1v2'
down_revision = ('p6q7r8s9t0u1', '1c92412cbe1b')
branch_labels = None
depends_on = None


def _exec_safe(connection, sql: str, label: str = "") -> bool:
    """SAVEPOINT를 사용하여 오류 발생 시 트랜잭션을 유지하며 실행."""
    try:
        connection.execute(text("SAVEPOINT mig020"))
        connection.execute(text(sql))
        connection.execute(text("RELEASE SAVEPOINT mig020"))
        return True
    except Exception as e:
        connection.execute(text("ROLLBACK TO SAVEPOINT mig020"))
        connection.execute(text("RELEASE SAVEPOINT mig020"))
        if label:
            print(f"[WARN] {label}: {e}")
        return False


def upgrade():
    connection = op.get_bind()

    # 1. skywatch_card_vectors 테이블 생성
    op.create_table(
        'skywatch_card_vectors',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('card_id', sa.Integer,
                  sa.ForeignKey('skywatch_log_cards.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('chunk_no', sa.Integer, nullable=False),
        sa.Column('chunk_text', sa.Text, nullable=False),
        sa.Column('embedding', sa.LargeBinary, nullable=False),
        sa.Column('model_name', sa.String(50), nullable=False, server_default='kure-v1'),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint('card_id', 'chunk_no', name='uq_card_vectors_card_id_chunk_no'),
    )
    op.create_index('idx_card_vectors_card_id', 'skywatch_card_vectors', ['card_id'])
    op.create_index('idx_card_vectors_model', 'skywatch_card_vectors', ['model_name'])

    # 2. pgvector 익스텐션 설치 시도
    _exec_safe(connection, "CREATE EXTENSION IF NOT EXISTS vector", "create vector extension")

    # 3. skywatch_card_vectors에 pgvector 컬럼 추가 (1024-dim)
    _exec_safe(
        connection,
        "ALTER TABLE skywatch_card_vectors ADD COLUMN embedding_vector vector(1024)",
        "card_vectors embedding_vector column"
    )

    # 4. card_vectors IVFFlat 인덱스 (벡터가 생긴 후에 의미 있음)
    _exec_safe(
        connection,
        "CREATE INDEX IF NOT EXISTS idx_card_vectors_embedding_ivf "
        "ON skywatch_card_vectors "
        "USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 50)",
        "card_vectors IVFFlat index"
    )

    # 5. skywatch_log_vectors.embedding_vector 컬럼을 768 → 1024로 교체
    _exec_safe(
        connection,
        "ALTER TABLE skywatch_log_vectors DROP COLUMN IF EXISTS embedding_vector",
        "log_vectors drop old column"
    )
    _exec_safe(
        connection,
        "ALTER TABLE skywatch_log_vectors ADD COLUMN embedding_vector vector(1024)",
        "log_vectors embedding_vector 1024"
    )

    # 6. log_vectors IVFFlat 인덱스 재생성
    _exec_safe(connection, "DROP INDEX IF EXISTS idx_log_vectors_embedding_ivf", "drop old ivf index")
    _exec_safe(
        connection,
        "CREATE INDEX IF NOT EXISTS idx_log_vectors_embedding_ivf "
        "ON skywatch_log_vectors "
        "USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 50)",
        "log_vectors IVFFlat index"
    )

    # 7. 기존 klue-sbert 벡터 삭제 (KURE-v1으로 재인덱싱 필요)
    _exec_safe(connection, "DELETE FROM skywatch_log_vectors", "clear old log vectors")
    print("[INFO] Old klue-sbert log vectors cleared. Run POST /api/vector/backfill to reindex with KURE-v1.")


def downgrade():
    connection = op.get_bind()
    op.drop_table('skywatch_card_vectors')
    _exec_safe(connection, "ALTER TABLE skywatch_log_vectors DROP COLUMN IF EXISTS embedding_vector", "downgrade drop col")
    _exec_safe(connection, "ALTER TABLE skywatch_log_vectors ADD COLUMN embedding_vector vector(768)", "downgrade add 768")
