"""2026_021 widen log_cards status to 20

Revision ID: 68be9d761ed3
Revises: q7r8s9t0u1v2
Create Date: 2026-06-13 07:54:34.615318

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68be9d761ed3'
down_revision: Union[str, Sequence[str], None] = 'q7r8s9t0u1v2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 모델은 status=String(20)이나 DB가 VARCHAR(10)에 머물러 'in_progress'(11자) 저장 시 실패.
    op.alter_column(
        "skywatch_log_cards",
        "status",
        existing_type=sa.String(length=10),
        type_=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # 10자 초과 값은 잘라낸 뒤 축소(데이터 손실 방지 위해 명시).
    op.execute("UPDATE skywatch_log_cards SET status = left(status, 10) WHERE length(status) > 10")
    op.alter_column(
        "skywatch_log_cards",
        "status",
        existing_type=sa.String(length=20),
        type_=sa.String(length=10),
        existing_nullable=False,
    )
