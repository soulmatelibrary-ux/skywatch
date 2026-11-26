"""2026_023 drop stale ck_cards_status (statuses are data-driven)

Revision ID: 2a6ea2e4feaa
Revises: b0a551840ae1
Create Date: 2026-06-13 08:01:58.585885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a6ea2e4feaa'
down_revision: Union[str, Sequence[str], None] = 'b0a551840ae1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ck_cards_status는 init에서 ('open','hold','done')만 허용하나, 카드 상태는
    # skywatch_card_statuses 테이블(open/in_progress/pending/done/hold/cancelled, 관리자 추가 가능)로
    # 데이터 주도 관리된다. 정적 CHECK는 'in_progress' 등 정상 상태 저장을 막으므로 제거한다.
    # 운영 DB에 제약이 이미 없을 수도 있으므로 IF EXISTS로 멱등 처리한다.
    op.execute("ALTER TABLE skywatch_log_cards DROP CONSTRAINT IF EXISTS ck_cards_status")


def downgrade() -> None:
    """Downgrade schema."""
    # 원래 제약 복원(주의: open/hold/done 외 상태 행이 있으면 실패할 수 있음).
    op.create_check_constraint(
        "ck_cards_status", "skywatch_log_cards",
        "status IN ('open','hold','done')",
    )
