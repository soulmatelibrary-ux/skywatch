"""카드 이월 서비스 — 미완료 카드를 오늘 일지로 원클릭 이월."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import CardLink, Log, LogCard
from app.models.user import User
from app.schemas.log import LogCardOut
from app.services import work_thread_sync
from app.services.card_service import _card_to_out
from app.services.notification_service import create_notification


class CarryOverError(Exception):
    pass


def carry_over_card(
    db: Session, card_id: int, user_id: int, target_date: date | None = None,
) -> LogCardOut:
    """미완료 카드를 target_date(기본: 오늘) 일지로 이월.

    1. 원본 카드 검증 (존재·미삭제·미완료)
    2. target_date 일지 찾기 (없으면 자동 생성)
    3. 새 카드 생성 (같은 제목·카테고리, 내용은 이전 카드 참조)
    4. CardLink 자동 생성 (원본 → 새 카드)
    5. 원본 카드 상태를 'hold'로 변경 (이월됨 표시)

    Returns: 새로 생성된 카드 정보.
    """
    # 1. 원본 카드 검증
    source = db.get(LogCard, card_id)
    if not source or source.is_deleted:
        raise CarryOverError("카드를 찾을 수 없습니다.")
    if source.status == "done":
        raise CarryOverError("완료된 카드는 이월할 수 없습니다.")
    if source.status == "hold":
        raise CarryOverError("이미 이월된(보류) 카드입니다.")

    source_log = db.get(Log, source.log_id)
    if not source_log:
        raise CarryOverError("원본 일지를 찾을 수 없습니다.")

    # 2. 대상 날짜 결정 (기본: 오늘)
    today = target_date or date.today()
    if source_log.date >= today:
        raise CarryOverError("같은 날 또는 미래 일지의 카드는 이월할 수 없습니다.")

    # 3. 대상 일지 찾기 — 오늘 날짜 + 원본과 같은 근무유형
    shift = source_log.shift_type
    if shift == "공지":
        shift = "주간"  # 공지 카드는 주간으로 이월

    target_log = db.scalar(
        select(Log).where(
            Log.date == today,
            Log.shift_type == shift,
            Log.is_deleted.is_(False),
        )
    )

    # 대상 일지 없으면 자동 생성
    if not target_log:
        user = db.get(User, user_id)
        user_name = user.name if user else ""
        target_log = Log(
            author_id=user_id,
            date=today,
            shift_type=shift,
            title=f"{today.strftime('%Y-%m-%d')} {shift} {user_name}",
            tags=[],
            created_by=user_id,
        )
        db.add(target_log)
        db.flush()

    # 4. 새 카드 생성 — 마지막 position + 1
    max_pos = db.scalar(
        select(func.coalesce(func.max(LogCard.position), -1))
        .where(LogCard.log_id == target_log.id, LogCard.is_deleted.is_(False))
    )
    new_card = LogCard(
        log_id=target_log.id,
        category_id=source.category_id,
        position=max_pos + 1,
        title=source.title,
        content=f'<p><em>이전 카드에서 이월됨</em></p>',
        status="open",
        created_by=user_id,
    )
    db.add(new_card)
    db.flush()

    # 5. CardLink 생성 (원본 → 새 카드)
    db.add(CardLink(
        source_card_id=source.id,
        target_card_id=new_card.id,
        created_by=user_id,
    ))

    # 6. 원본 카드 상태를 'hold'로 변경 (이월됨)
    now = datetime.now(timezone.utc)
    source.status = "hold"
    source.status_changed_by = user_id
    source.status_changed_at = now

    # 7. 과제 테이블에 이월 기록 (원본 카드의 과제에 새 카드 연결)
    work_thread_sync.on_carry_over(db, source, new_card, user_id)

    db.commit()
    db.refresh(new_card)

    # 알림: 원본 일지 작성자에게 이월 알림
    if source_log.author_id != user_id:
        editor = db.get(User, user_id)
        editor_name = editor.name if editor else "사용자"
        create_notification(
            db, user_id=source_log.author_id, type="card",
            body=f'{editor_name} 님이 카드 "{source.title}"를 이월했습니다.',
            ref_type="card", ref_id=new_card.id,
        )

    return _card_to_out(new_card, db)
