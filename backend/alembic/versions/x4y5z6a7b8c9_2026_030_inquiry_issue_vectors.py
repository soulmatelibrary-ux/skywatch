"""2026_030 migrate inquiry and issue vectors to skywatch db

Revision ID: x4y5z6a7b8c9
Revises: w3x4y5z6a7b8
Create Date: 2026-07-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'x4y5z6a7b8c9'
down_revision = 'w3x4y5z6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS skywatch_inquiry_vectors (
            id          SERIAL PRIMARY KEY,
            inquiry_id  INTEGER NOT NULL REFERENCES skywatch_inquiries(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text  TEXT,
            embedding   vector(1024),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_inquiry_vectors_inquiry_id ON skywatch_inquiry_vectors(inquiry_id)"
    ))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS skywatch_issue_vectors (
            id          SERIAL PRIMARY KEY,
            issue_id    INTEGER NOT NULL REFERENCES skywatch_issues(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text  TEXT,
            embedding   vector(1024),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_issue_vectors_issue_id ON skywatch_issue_vectors(issue_id)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_issue_vectors"))
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_inquiry_vectors"))
