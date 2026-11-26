"""2026_012_add_log_vectors

벡터 검색을 위한 일지 벡터화 테이블 추가

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa


revision = 'i9j0k1l2m3n4'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade():
	# 1. skywatch_logs에 tags 컬럼 추가
	op.add_column('skywatch_logs',
		sa.Column('tags', sa.ARRAY(sa.String), server_default='{}'))

	# 2. skywatch_log_vectors 테이블 생성
	op.create_table('skywatch_log_vectors',
		sa.Column('id', sa.Integer, primary_key=True),
		sa.Column('log_id', sa.Integer, sa.ForeignKey('skywatch_logs.id', ondelete='CASCADE'), nullable=False),
		sa.Column('chunk_no', sa.Integer, nullable=False),
		sa.Column('chunk_text', sa.Text, nullable=False),
		sa.Column('embedding', sa.Text, nullable=False),
		sa.Column('model_name', sa.String(50), server_default='hash-384-v1'),
		sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
		sa.UniqueConstraint('log_id', 'chunk_no', name='uq_log_vectors_log_id_chunk_no'),
	)

	# 3. 인덱스 생성
	op.create_index('idx_log_vectors_log_id', 'skywatch_log_vectors', ['log_id'])
	op.create_index('idx_log_vectors_model', 'skywatch_log_vectors', ['model_name'])


def downgrade():
	op.execute("DROP TABLE IF EXISTS skywatch_log_vectors;")
	op.execute("ALTER TABLE skywatch_logs DROP COLUMN IF EXISTS tags;")
