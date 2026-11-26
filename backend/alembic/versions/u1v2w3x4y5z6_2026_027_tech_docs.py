"""2026_027 add tech_docs tables

Revision ID: u1v2w3x4y5z6
Revises: t0u1v2w3x4y5
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'u1v2w3x4y5z6'
down_revision = 't0u1v2w3x4y5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS skywatch_tech_doc_categories (
            id            SERIAL PRIMARY KEY,
            project_code  VARCHAR(30)  NOT NULL,
            category_code VARCHAR(20)  NOT NULL,
            name          VARCHAR(100) NOT NULL,
            sort_order    INTEGER      NOT NULL DEFAULT 0,
            is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
            UNIQUE (project_code, category_code)
        )
    """))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS skywatch_tech_docs (
            id             SERIAL PRIMARY KEY,
            legacy_seq     INTEGER,
            record_date    DATE,
            project_code   VARCHAR(30),
            category_code  VARCHAR(20),
            title          VARCHAR(500),
            content        TEXT,
            summary        TEXT,
            detail_summary TEXT,
            doc_type       VARCHAR(100),
            adapt_version  VARCHAR(50),
            service_date   DATE,
            reference      TEXT,
            orig_user_id   VARCHAR(20),
            author_id      INTEGER REFERENCES skywatch_users(id),
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by     INTEGER REFERENCES skywatch_users(id),
            last_edited_by INTEGER REFERENCES skywatch_users(id),
            is_deleted     BOOLEAN     NOT NULL DEFAULT FALSE
        )
    """))

    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_docs_project_code  ON skywatch_tech_docs(project_code)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_docs_category_code ON skywatch_tech_docs(category_code)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_docs_record_date   ON skywatch_tech_docs(record_date DESC)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_docs_legacy_seq    ON skywatch_tech_docs(legacy_seq)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_docs_is_deleted    ON skywatch_tech_docs(is_deleted)"))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS skywatch_tech_doc_attachments (
            id             SERIAL PRIMARY KEY,
            tech_doc_id    INTEGER NOT NULL REFERENCES skywatch_tech_docs(id),
            legacy_doc_seq INTEGER,
            original_name  VARCHAR(500) NOT NULL,
            stored_name    VARCHAR(500) NOT NULL,
            file_extension VARCHAR(20),
            content_text   TEXT,
            reg_date       DATE,
            uploaded_by    INTEGER REFERENCES skywatch_users(id),
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted     BOOLEAN     NOT NULL DEFAULT FALSE
        )
    """))

    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_doc_att_doc_id ON skywatch_tech_doc_attachments(tech_doc_id)"))

    # pgvector 없으면 TEXT 폴백
    has_vector = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"
    )).scalar()

    if has_vector:
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS skywatch_tech_doc_vectors (
                id          SERIAL PRIMARY KEY,
                tech_doc_id INTEGER NOT NULL REFERENCES skywatch_tech_docs(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text  TEXT,
                embedding   VECTOR(1024),
                UNIQUE (tech_doc_id, chunk_index)
            )
        """))
    else:
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS skywatch_tech_doc_vectors (
                id          SERIAL PRIMARY KEY,
                tech_doc_id INTEGER NOT NULL REFERENCES skywatch_tech_docs(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text  TEXT,
                embedding   TEXT,
                UNIQUE (tech_doc_id, chunk_index)
            )
        """))

    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tech_doc_vec_doc_id ON skywatch_tech_doc_vectors(tech_doc_id)"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_tech_doc_vectors CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_tech_doc_attachments CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_tech_docs CASCADE"))
    conn.execute(sa.text("DROP TABLE IF EXISTS skywatch_tech_doc_categories CASCADE"))
