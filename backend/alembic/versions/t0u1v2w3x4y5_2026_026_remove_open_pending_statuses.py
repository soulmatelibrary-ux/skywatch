"""2026_026 remove open/pending card statuses and migrate affected cards

Revision ID: t0u1v2w3x4y5
Revises: s9t0u1v2w3x4
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

revision = 't0u1v2w3x4y5'
down_revision = 's9t0u1v2w3x4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(timezone.utc)

    conn.execute(sa.text(
        "UPDATE skywatch_log_cards SET status = 'in_progress' "
        "WHERE status IN ('open', 'pending') AND is_deleted = FALSE"
    ))

    conn.execute(sa.text(
        "UPDATE skywatch_card_statuses SET is_deleted = TRUE, is_active = FALSE, deleted_at = :now "
        "WHERE key IN ('open', 'pending') AND is_deleted = FALSE"
    ), {"now": now})


def downgrade() -> None:
    # NOTE: lossy downgrade — skywatch_log_cards.status values are NOT restored.
    # Cards that were 'open'/'pending' before upgrade() remain 'in_progress' after this downgrade.
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE skywatch_card_statuses SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL "
        "WHERE key IN ('open', 'pending')"
    ))
