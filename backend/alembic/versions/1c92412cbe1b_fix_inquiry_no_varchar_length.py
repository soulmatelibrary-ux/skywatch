"""fix_inquiry_no_varchar_length

Revision ID: 1c92412cbe1b
Revises: n4o5p6q7r8s9
Create Date: 2026-06-01 15:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c92412cbe1b'
down_revision: Union[str, Sequence[str], None] = 'n4o5p6q7r8s9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('skywatch_inquiries', 'inquiry_no',
               existing_type=sa.String(length=10),
               type_=sa.String(length=20),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('skywatch_inquiries', 'inquiry_no',
               existing_type=sa.String(length=20),
               type_=sa.String(length=10),
               existing_nullable=False)
