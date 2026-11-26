"""2026_018_vectorize_embedding_binary

벡터 임베딩을 JSON TEXT → BYTEA(바이너리)로 변환

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-06-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import json
import numpy as np


revision = 'o5p6q7r8s9t0'
down_revision = 'n4o5p6q7r8s9'
branch_labels = None
depends_on = None


def upgrade():
	# 1. 새로운 embedding_bytes 컬럼 추가 (BYTEA)
	op.add_column('skywatch_log_vectors',
		sa.Column('embedding_bytes', sa.LargeBinary, nullable=True))

	# 2. 기존 JSON 데이터를 바이너리로 변환
	# (주의: 이 작업은 DB가 충분한 메모리를 가지고 있어야 함)
	connection = op.get_bind()

	# embedding이 NULL이 아닌 행만 처리
	rows = connection.execute(text(
		"SELECT id, embedding FROM skywatch_log_vectors WHERE embedding IS NOT NULL"
	)).fetchall()

	for row_id, embedding_json in rows:
		try:
			# JSON 파싱
			embedding_list = json.loads(embedding_json)
			# numpy 배열로 변환 후 바이너리로 변환
			embedding_array = np.array(embedding_list, dtype=np.float32)
			embedding_bytes = embedding_array.tobytes()

			# UPDATE
			connection.execute(text(
				"UPDATE skywatch_log_vectors SET embedding_bytes = :bytes WHERE id = :id"
			), {"bytes": embedding_bytes, "id": row_id})
		except Exception as e:
			print(f"[WARN] Failed to convert embedding for id {row_id}: {e}")
			continue

	connection.commit()

	# 3. 기존 embedding 컬럼 삭제
	op.drop_column('skywatch_log_vectors', 'embedding')

	# 4. embedding_bytes를 embedding으로 이름 변경
	op.alter_column('skywatch_log_vectors', 'embedding_bytes',
		new_column_name='embedding', existing_type=sa.LargeBinary, nullable=False)


def downgrade():
	# 1. embedding 컬럼을 embedding_bytes로 이름 변경
	op.alter_column('skywatch_log_vectors', 'embedding',
		new_column_name='embedding_bytes', existing_type=sa.LargeBinary, nullable=True)

	# 2. 기존 바이너리 데이터를 JSON으로 역변환
	connection = op.get_bind()

	rows = connection.execute(text(
		"SELECT id, embedding_bytes FROM skywatch_log_vectors WHERE embedding_bytes IS NOT NULL"
	)).fetchall()

	# 새로운 TEXT 컬럼 추가
	op.add_column('skywatch_log_vectors',
		sa.Column('embedding_text', sa.Text, nullable=True))

	for row_id, embedding_bytes in rows:
		try:
			# 바이너리를 numpy 배열로 변환
			embedding_array = np.frombuffer(embedding_bytes, dtype=np.float32)
			# JSON으로 변환
			embedding_json = json.dumps(embedding_array.tolist())

			# UPDATE
			connection.execute(text(
				"UPDATE skywatch_log_vectors SET embedding_text = :json WHERE id = :id"
			), {"json": embedding_json, "id": row_id})
		except Exception as e:
			print(f"[WARN] Failed to convert embedding for id {row_id}: {e}")
			continue

	connection.commit()

	# 3. embedding_bytes 삭제
	op.drop_column('skywatch_log_vectors', 'embedding_bytes')

	# 4. embedding_text를 embedding으로 이름 변경
	op.alter_column('skywatch_log_vectors', 'embedding_text',
		new_column_name='embedding', existing_type=sa.Text, nullable=True)
