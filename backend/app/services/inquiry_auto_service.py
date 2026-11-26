"""문의 분류 카드가 완료되면 문의사항(skywatch_inquiries)에 한 건을 자동으로 만든다.

카드 저장 흐름(일지 저장·상태 변경·묶음 종료 등)이 부른다. 가져오기(CSV·관리)는 부르지 않는다.
카드 하나당 자동 등록 한 번(card_id 로 연결된 문의사항이 있으면 건너뜀). 커밋은 호출자가 한다.
실패해도 카드 저장은 막지 않는다 — SAVEPOINT 안에서 만들고 실패는 경고 로그만 남긴다.
"""
import logging
from collections.abc import Iterable
from zoneinfo import ZoneInfo

from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.models.inquiry import Inquiry
from app.models.log import CardCategory, Log, LogCard
from app.services.inquiry_service import _next_inquiry_no
from app.services.roster_service import kst_today

logger = logging.getLogger(__name__)
_KST = ZoneInfo("Asia/Seoul")
INQUIRY_WORD = "문의"


def _targets(db: Session, ids: list[int]) -> list[tuple[LogCard, object]]:
    """완료·문의 분류·미연결 카드와 그 일지 날짜."""
    rows = db.execute(
        select(LogCard, Log.date)
        .join(Log, Log.id == LogCard.log_id)
        .join(CardCategory, CardCategory.id == LogCard.category_id)
        .where(LogCard.id.in_(ids), LogCard.is_deleted.is_(False), LogCard.status == "done",
               CardCategory.name.contains(INQUIRY_WORD))
        .order_by(LogCard.id)
    ).all()
    linked = set(db.scalars(
        select(Inquiry.card_id).where(Inquiry.card_id.in_(ids), Inquiry.is_deleted.is_(False))
    ).all())
    return [(card, log_date) for card, log_date in rows if card.id not in linked]


def latest_sw_version(db: Session) -> str | None:
    """가장 최근에 입력된(등록 순) 문의사항의 발생버전 — 새 문의사항 발생버전의 기본값."""
    return db.scalar(
        select(Inquiry.sw_version)
        .where(Inquiry.is_deleted.is_(False), Inquiry.sw_version.is_not(None), Inquiry.sw_version != "")
        .order_by(Inquiry.created_at.desc(), Inquiry.id.desc())
        .limit(1)
    )


def _create(db: Session, card: LogCard, log_date, user_id: int) -> Inquiry:
    created = card.created_at.astimezone(_KST) if card.created_at else None
    inq = Inquiry(
        inquiry_no=_next_inquiry_no(db),
        occurred_date=log_date,
        occurred_time=created.strftime("%H:%M") if created else None,
        sw_version=latest_sw_version(db),
        received_by=card.created_by,
        keyword=(card.title or "")[:255] or None,
        content=card.content,
        status="completed",
        completed_date=kst_today(),
        card_id=card.id,
        created_by=user_id,
    )
    db.add(inq)
    db.flush()
    return inq


def _vectorize_after_commit(db: Session, inquiry_ids: list[int]) -> None:
    """바깥 트랜잭션이 커밋된 뒤에만 임베딩을 건다 (못 하면 새벽 배치가 처리)."""
    def _run(_session) -> None:
        from app.services.inquiry_vector_service import schedule_vectorize_inquiry
        for iid in inquiry_ids:
            schedule_vectorize_inquiry(iid)
    event.listen(db, "after_commit", _run, once=True)


def on_cards_done(db: Session, card_ids: Iterable[int | None], user_id: int) -> list[str]:
    """완료된 카드 중 문의 분류 카드마다 문의사항을 만들고 만든 번호 목록을 돌려준다."""
    ids = [i for i in dict.fromkeys(card_ids) if i]
    if not ids:
        return []
    db.flush()  # 세션이 autoflush=False — 방금 바꾼 카드 상태·분류를 DB 에서 보게
    try:
        with db.begin_nested():
            created = [_create(db, card, log_date, user_id) for card, log_date in _targets(db, ids)]
    except Exception:  # noqa: BLE001 — 문의사항 실패가 카드 저장을 막으면 안 된다
        logger.warning("문의사항 자동 등록 실패 (카드 %s)", ids, exc_info=True)
        return []
    if created:
        _vectorize_after_commit(db, [i.id for i in created])
    return [i.inquiry_no for i in created]
