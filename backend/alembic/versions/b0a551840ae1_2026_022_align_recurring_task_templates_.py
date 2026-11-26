"""2026_022 align recurring_task_templates to model

Revision ID: b0a551840ae1
Revises: 68be9d761ed3
Create Date: 2026-06-13 07:54:34.834501

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b0a551840ae1'
down_revision: Union[str, Sequence[str], None] = '68be9d761ed3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "skywatch_recurring_task_templates"


def upgrade() -> None:
    """recurring_task_templates를 모델 스키마(frequency/template_content/...)로 정렬한다.

    운영 DB 상태를 확인할 수 없으므로 멱등하게 작성한다. 구 컬럼(repeat_type/...)이 있으면
    데이터를 신 컬럼으로 옮기고 구 컬럼을 제거하며, 이미 신 컬럼 상태면 아무것도 바꾸지 않는다(no-op).
    데이터는 보존한다(이미 채워진 신 컬럼 값은 덮지 않음).
    """
    op.execute(f"""
    DO $$
    BEGIN
        -- 1) 신 컬럼 추가 (없을 때만)
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS frequency varchar(20);
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS run_at_time varchar(5);
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS days_of_week jsonb;
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS day_of_month integer;
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS template_content jsonb;
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

        -- 2) 구 컬럼이 있을 때만 데이터 매핑 (아직 비어있는 행만 → 멱등/혼합상태 안전)
        IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
                   WHERE attrelid = 'public.{TABLE}'::regclass
                     AND attname = 'repeat_type'
                     AND NOT attisdropped) THEN
            UPDATE {TABLE} SET
                frequency = repeat_type,
                run_at_time = repeat_time,
                days_of_week = CASE WHEN repeat_type = 'weekly' THEN repeat_days ELSE NULL END,
                day_of_month = CASE
                    WHEN repeat_type = 'monthly' AND (repeat_days->>0) ~ '^[0-9]+$'
                    THEN (repeat_days->>0)::int ELSE NULL END,
                template_content = jsonb_build_object(
                    'title', COALESCE(NULLIF(template_title, ''), name, ''),
                    'body', COALESCE(template_body, '')),
                last_run_at = last_executed_at
            WHERE frequency IS NULL;
        END IF;

        -- 3) frequency 기본값 방어 + NOT NULL (이미 NOT NULL이면 no-op)
        UPDATE {TABLE} SET frequency = 'daily' WHERE frequency IS NULL;
        ALTER TABLE {TABLE} ALTER COLUMN frequency SET NOT NULL;

        -- 4) 구 제약·컬럼 제거 (있을 때만)
        ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS ck_template_repeat;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS repeat_type;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS repeat_days;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS repeat_time;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS template_title;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS template_body;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS template_importance;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS last_executed_at;
    END $$;
    """)


def downgrade() -> None:
    """모델 스키마 → 구 스키마로 복원 (데이터 보존, 멱등)."""
    op.execute(f"""
    DO $$
    BEGIN
        -- 1) 구 컬럼 재생성 (없을 때만)
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS repeat_type varchar(20);
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS repeat_days jsonb;
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS repeat_time varchar(5);
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS template_title varchar(255);
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS template_body text;
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS template_importance varchar(10) DEFAULT 'normal';
        ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS last_executed_at timestamptz;

        -- 2) 신 컬럼이 있을 때만 역매핑 (아직 비어있는 행만)
        IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
                   WHERE attrelid = 'public.{TABLE}'::regclass
                     AND attname = 'frequency'
                     AND NOT attisdropped) THEN
            UPDATE {TABLE} SET
                repeat_type = frequency,
                repeat_time = run_at_time,
                repeat_days = CASE
                    WHEN frequency = 'weekly' THEN days_of_week
                    WHEN frequency = 'monthly' AND day_of_month IS NOT NULL
                        THEN to_jsonb(ARRAY[day_of_month::text])
                    ELSE '[]'::jsonb END,
                template_title = COALESCE(template_content->>'title', name),
                template_body = template_content->>'body',
                template_importance = 'normal',
                last_executed_at = last_run_at
            WHERE repeat_type IS NULL;
        END IF;

        -- 3) 기본값 방어 + NOT NULL + 제약 복원
        UPDATE {TABLE} SET repeat_type = 'daily' WHERE repeat_type IS NULL;
        UPDATE {TABLE} SET template_importance = 'normal' WHERE template_importance IS NULL;
        ALTER TABLE {TABLE} ALTER COLUMN repeat_type SET NOT NULL;
        ALTER TABLE {TABLE} ALTER COLUMN template_importance SET NOT NULL;
        ALTER TABLE {TABLE} DROP CONSTRAINT IF EXISTS ck_template_repeat;
        ALTER TABLE {TABLE} ADD CONSTRAINT ck_template_repeat
            CHECK (repeat_type IN ('daily','weekly','monthly','once'));

        -- 4) 신 컬럼 제거 (있을 때만)
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS frequency;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS run_at_time;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS days_of_week;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS day_of_month;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS template_content;
        ALTER TABLE {TABLE} DROP COLUMN IF EXISTS last_run_at;
    END $$;
    """)
