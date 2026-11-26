"""2026_004_update_card_categories

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-06
"""
from alembic import op

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


NEW_CATEGORIES = [
    (1, '관제시스템 설치/적용', 'blue',   0),
    (2, '관제시스템 검증/시험', 'green',  1),
    (3, '관제지원 개발/개선',   'purple', 2),
    (4, '시스템 장애/이상처리', 'red',    3),
    (5, '행정/문서 관리',       'orange', 4),
    (6, '기타',                 'gray',   5),
]

OLD_CATEGORIES = [
    (1, '서버 점검',   'blue',   0),
    (2, '소프트웨어',  'green',  1),
    (3, '네트워크',    'orange', 2),
    (4, '보안',        'red',    3),
    (5, '사용자 지원', 'purple', 4),
    (6, '기타',        'gray',   5),
]


def upgrade() -> None:
    for cat_id, name, color, sort_order in NEW_CATEGORIES:
        op.execute(f"""
            UPDATE skywatch_card_categories
            SET name = '{name}', color = '{color}', sort_order = {sort_order}
            WHERE id = {cat_id}
        """)


def downgrade() -> None:
    for cat_id, name, color, sort_order in OLD_CATEGORIES:
        op.execute(f"""
            UPDATE skywatch_card_categories
            SET name = '{name}', color = '{color}', sort_order = {sort_order}
            WHERE id = {cat_id}
        """)
