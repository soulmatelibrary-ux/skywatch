"""2026_006_partial_unique_log

Replace the skywatch_logs (date, shift_type) unique constraint with a
partial unique index that ignores soft-deleted rows, so a new log can be
created after the previous one was deleted.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-06
"""
from alembic import op

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('skywatch_logs_date_shift_type_key', 'skywatch_logs', type_='unique')
    op.execute("""
        CREATE UNIQUE INDEX skywatch_logs_date_shift_type_active_uidx
        ON skywatch_logs (date, shift_type)
        WHERE is_deleted = FALSE
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS skywatch_logs_date_shift_type_active_uidx")
    op.create_unique_constraint(
        'skywatch_logs_date_shift_type_key',
        'skywatch_logs',
        ['date', 'shift_type'],
    )
