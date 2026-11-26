"""2026_043 allow owner_type 'issue' in skywatch_attachments (PR/issue attachments)

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-11-10
"""
from alembic import op

revision = "e9f0a1b2c3d4"
down_revision = "d8e9f0a1b2c3"
branch_labels = None
depends_on = None

TABLE = "skywatch_attachments"
CONSTRAINT = "skywatch_attachments_owner_type_check"


def upgrade():
    # 초기 스키마 제약(card/task/comment)이 이슈 첨부(owner_type='issue')를 막고 있었다.
    # 환경마다 제약 이름이 다를 수 있어 두 이름 모두 IF EXISTS 로 지운다.
    op.execute(f"ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS ck_attachments_owner_type")
    op.execute(f"ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS {CONSTRAINT}")
    op.execute(
        f"ALTER TABLE {TABLE} ADD CONSTRAINT {CONSTRAINT} "
        "CHECK (owner_type IN ('card','task','comment','issue'))"
    )


def downgrade():
    # 'issue' 첨부 행이 남아 있으면 제약 추가가 실패한다 (데이터는 지우지 않는다).
    op.execute(f"ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS {CONSTRAINT}")
    op.execute(
        f"ALTER TABLE {TABLE} ADD CONSTRAINT {CONSTRAINT} "
        "CHECK (owner_type IN ('card','task','comment'))"
    )
