"""2026_011_add_backup_logs

DB 백업 실행 이력 테이블 추가

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa


revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE skywatch_backup_logs (
            id              SERIAL PRIMARY KEY,
            action          VARCHAR(20)  NOT NULL,
            status          VARCHAR(10)  NOT NULL,
            filename        VARCHAR(255),
            file_size_bytes INTEGER,
            error_message   TEXT,
            performed_by    INTEGER NOT NULL REFERENCES skywatch_users(id),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS skywatch_backup_logs;")
