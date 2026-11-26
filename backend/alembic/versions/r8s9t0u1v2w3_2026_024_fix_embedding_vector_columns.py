"""2026_024 fix missing embedding_vector columns in log_vectors and card_vectors

Repair migration: migration 020 may have silently skipped adding the
embedding_vector vector(1024) column if pgvector was not yet installed.
This migration adds the column idempotently to both tables.

Revision ID: r8s9t0u1v2w3
Revises: 2a6ea2e4feaa
Create Date: 2026-06-18
"""
from alembic import op
from sqlalchemy import text

revision = 'r8s9t0u1v2w3'
down_revision = '2a6ea2e4feaa'
branch_labels = None
depends_on = None


def _exec_safe(connection, sql: str, label: str = "") -> bool:
    try:
        connection.execute(text("SAVEPOINT mig024"))
        connection.execute(text(sql))
        connection.execute(text("RELEASE SAVEPOINT mig024"))
        return True
    except Exception as e:
        connection.execute(text("ROLLBACK TO SAVEPOINT mig024"))
        connection.execute(text("RELEASE SAVEPOINT mig024"))
        if label:
            print(f"[WARN] {label}: {e}")
        return False


def upgrade():
    connection = op.get_bind()

    # 1. pgvector 확장 활성화 (이미 있으면 no-op)
    ok = _exec_safe(connection, "CREATE EXTENSION IF NOT EXISTS vector", "create vector extension")
    if not ok:
        print("[WARN] pgvector extension을 설치할 수 없습니다. embedding_vector 컬럼을 건너뜁니다.")
        return

    # 2. skywatch_log_vectors.embedding_vector 추가 (없을 때만)
    connection.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_catalog.pg_attribute
                WHERE attrelid = 'public.skywatch_log_vectors'::regclass
                  AND attname = 'embedding_vector'
                  AND NOT attisdropped
            ) THEN
                ALTER TABLE skywatch_log_vectors ADD COLUMN embedding_vector vector(1024);
                RAISE NOTICE 'skywatch_log_vectors.embedding_vector 컬럼 추가 완료';
            ELSE
                RAISE NOTICE 'skywatch_log_vectors.embedding_vector 이미 존재 (건너뜀)';
            END IF;
        END $$;
    """))
    print("[OK] skywatch_log_vectors.embedding_vector 처리 완료")

    # 3. skywatch_card_vectors.embedding_vector 추가 (없을 때만)
    _exec_safe(connection, """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_catalog.pg_attribute
                WHERE attrelid = 'public.skywatch_card_vectors'::regclass
                  AND attname = 'embedding_vector'
                  AND NOT attisdropped
            ) THEN
                ALTER TABLE skywatch_card_vectors ADD COLUMN embedding_vector vector(1024);
                RAISE NOTICE 'skywatch_card_vectors.embedding_vector 컬럼 추가 완료';
            ELSE
                RAISE NOTICE 'skywatch_card_vectors.embedding_vector 이미 존재 (건너뜀)';
            END IF;
        END $$;
    """, "card_vectors embedding_vector column")
    print("[OK] skywatch_card_vectors.embedding_vector 처리 완료")

    # 4. log_vectors IVFFlat 인덱스 (벡터가 있을 때만 의미있음)
    _exec_safe(
        connection,
        "CREATE INDEX IF NOT EXISTS idx_log_vectors_embedding_ivf "
        "ON skywatch_log_vectors "
        "USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 50)",
        "log_vectors IVFFlat index"
    )

    # 5. card_vectors IVFFlat 인덱스
    _exec_safe(
        connection,
        "CREATE INDEX IF NOT EXISTS idx_card_vectors_embedding_ivf "
        "ON skywatch_card_vectors "
        "USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 50)",
        "card_vectors IVFFlat index"
    )


def downgrade():
    connection = op.get_bind()
    _exec_safe(connection, "DROP INDEX IF EXISTS idx_log_vectors_embedding_ivf", "drop log ivf index")
    _exec_safe(connection, "DROP INDEX IF EXISTS idx_card_vectors_embedding_ivf", "drop card ivf index")
    _exec_safe(
        connection,
        "ALTER TABLE skywatch_log_vectors DROP COLUMN IF EXISTS embedding_vector",
        "drop log_vectors embedding_vector"
    )
    _exec_safe(
        connection,
        "ALTER TABLE skywatch_card_vectors DROP COLUMN IF EXISTS embedding_vector",
        "drop card_vectors embedding_vector"
    )
