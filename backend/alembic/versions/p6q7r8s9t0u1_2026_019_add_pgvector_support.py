"""2026_019_add_pgvector_support

pgvector 확장을 사용한 벡터 검색 최적화

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-06-02
"""
from alembic import op
from sqlalchemy import text


revision = 'p6q7r8s9t0u1'
down_revision = 'o5p6q7r8s9t0'
branch_labels = None
depends_on = None


def upgrade():
	connection = op.get_bind()

	# 1. pgvector 확장 활성화
	try:
		connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
		connection.commit()
		print("[OK] pgvector extension created")
	except Exception as e:
		print(f"[WARN] pgvector extension: {e}")

	# 2. vector(768) 타입 컬럼 추가
	try:
		connection.execute(text(
			"ALTER TABLE skywatch_log_vectors ADD COLUMN embedding_vector vector(768)"
		))
		connection.commit()
		print("[OK] embedding_vector column added")
	except Exception as e:
		print(f"[WARN] embedding_vector column: {e}")

	# 3. 기존 바이너리 데이터를 vector로 변환
	try:
		connection.execute(text(
			"""
			UPDATE skywatch_log_vectors
			SET embedding_vector = (
				SELECT string_agg('[' || substring(encode(embedding, 'escape') from 1 for 100) || ']'::text, '')
			)
			WHERE embedding IS NOT NULL AND embedding_vector IS NULL
			"""
		))
		connection.commit()
		print("[OK] Embeddings converted to vector format")
	except Exception as e:
		print(f"[WARN] Embedding conversion: {e}")

	# 4. IVFFlat 인덱스 생성 (벡터 검색 최적화)
	try:
		connection.execute(text(
			"""
			CREATE INDEX IF NOT EXISTS idx_log_vectors_embedding_ivf
			ON skywatch_log_vectors
			USING ivfflat (embedding_vector vector_cosine_ops)
			WITH (lists = 100)
			"""
		))
		connection.commit()
		print("[OK] IVFFlat index created")
	except Exception as e:
		# pgvector 없으면 일반 인덱스
		try:
			connection.execute(text(
				"CREATE INDEX IF NOT EXISTS idx_log_vectors_embedding_gin ON skywatch_log_vectors (embedding_vector)"
			))
			connection.commit()
			print("[WARN] Created GIN index instead of IVFFlat")
		except Exception as e2:
			print(f"[WARN] Index creation failed: {e2}")


def downgrade():
	connection = op.get_bind()

	# 1. 인덱스 삭제
	try:
		connection.execute(text("DROP INDEX IF EXISTS idx_log_vectors_embedding_ivf"))
		connection.execute(text("DROP INDEX IF EXISTS idx_log_vectors_embedding_gin"))
		connection.commit()
	except:
		pass

	# 2. embedding_vector 컬럼 삭제
	try:
		connection.execute(text("ALTER TABLE skywatch_log_vectors DROP COLUMN IF EXISTS embedding_vector"))
		connection.commit()
	except:
		pass
