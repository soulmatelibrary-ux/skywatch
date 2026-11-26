"""2026_045 통근비 계산기 달별 근태 자료 표 (skywatch_commute_months)

ERP 근태 엑셀을 올리면 그 파일에 든 달만 이 표에 덮어쓴다(한 달 한 줄).
내부망은 patch/skywatch/db_patch/45_commute_months.sql 이 같은 표를 만든다(먼저 실행되면 여기는 건너뜀).

Revision ID: f1a2b3c4d5e6
Revises: f0a1b2c3d4e5
Create Date: 2026-11-16
"""
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "f0a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS skywatch_commute_months (
            id serial PRIMARY KEY,
            ym varchar(7) NOT NULL UNIQUE,
            file_name varchar(255) NOT NULL DEFAULT '',
            row_count integer NOT NULL DEFAULT 0,
            rows jsonb NOT NULL,
            uploaded_by integer REFERENCES skywatch_users(id) ON DELETE SET NULL,
            uploaded_at timestamptz NOT NULL DEFAULT now()
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS skywatch_commute_months")
