"""2026_013_add_vector_config_and_reindex_job

벡터 검색 모델 설정 및 재벡터화 진행 관리

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa


revision = 'j0k1l2m3n4o5'
down_revision = 'i9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade():
	# 1. skywatch_configs 테이블 생성
	op.create_table('skywatch_configs',
		sa.Column('id', sa.Integer, primary_key=True),
		sa.Column('setting_key', sa.String(100), nullable=False, unique=True),
		sa.Column('setting_value', sa.Text),
		sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
	)

	# 2. skywatch_reindex_jobs 테이블 생성
	op.create_table('skywatch_reindex_jobs',
		sa.Column('id', sa.Integer, primary_key=True),
		sa.Column('job_id', sa.String(100), nullable=False, unique=True),
		sa.Column('model_name', sa.String(50), nullable=False),
		sa.Column('status', sa.String(20), nullable=False, default='pending'),
		sa.Column('total_logs', sa.Integer),
		sa.Column('processed_logs', sa.Integer, server_default='0'),
		sa.Column('progress_percent', sa.Integer, server_default='0'),
		sa.Column('error_message', sa.Text),
		sa.Column('started_at', sa.DateTime(timezone=True)),
		sa.Column('completed_at', sa.DateTime(timezone=True)),
		sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
	)

	# 3. 인덱스 생성
	op.create_index('idx_reindex_jobs_status', 'skywatch_reindex_jobs', ['status'])
	op.create_index('idx_reindex_jobs_created_at', 'skywatch_reindex_jobs', ['created_at'])


def downgrade():
	op.drop_table('skywatch_reindex_jobs')
	op.drop_table('skywatch_configs')
