"""전달·메모 — 한 줄 카드 + 받는 사람·유지 정보, 받은 전달사항, 확인."""
from datetime import date, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.log import CardCategory, Log, LogCard
from app.models.user import User
from app.models.work_thread import CardMemo, CardMemoCheck
from app.schemas.shift_log import MemoCreate, ShiftCardOut
from app.services.shift_card_dto import build_cards
from app.services.shift_log_service import ShiftLogError, append_card, ensure_log, previous_shift

MEMO_CATEGORY = "전달사항"
_KEEP_DAYS = 7
_INBOX_LOOKBACK = 60


def memo_category_id(db: Session) -> int | None:
    return db.scalar(select(CardCategory.id).where(CardCategory.name == MEMO_CATEGORY).limit(1))


def add_memo(db: Session, user: User, data: MemoCreate) -> LogCard:
    if data.target_type == "user" and not data.target_user_id:
        raise ShiftLogError("받는 사람을 선택해 주세요.")
    log = ensure_log(db, data.date, data.shift_type, user)
    card = append_card(db, log, user, data.text, "", data.category_id or memo_category_id(db))
    db.add(CardMemo(
        card_id=card.id, target_type=data.target_type,
        target_user_id=data.target_user_id if data.target_type == "user" else None,
        keep=data.keep,
        keep_until=data.date + timedelta(days=_KEEP_DAYS - 1) if data.keep == "days" else None,
    ))
    db.commit()
    db.refresh(card)
    return card


def _shift_rank(d: date, shift: str) -> tuple:
    return (d, {"주간": 0, "주야": 1, "야간": 2}.get(shift, 3))


def inbox(db: Session, user: User, d: date, shift: str) -> list[ShiftCardOut]:
    """해당 근무 시점에 받는 사람에게 보여야 할 전달사항."""
    pd, ps = previous_shift(d, "주간" if shift == "주야" else shift)
    checked_by_me = select(CardMemoCheck.card_id).where(CardMemoCheck.user_id == user.id)
    anyone_checked = select(CardMemoCheck.card_id)
    rows = db.execute(
        select(LogCard, CardMemo, Log)
        .join(CardMemo, CardMemo.card_id == LogCard.id)
        .join(Log, Log.id == LogCard.log_id)
        .where(
            LogCard.is_deleted.is_(False), Log.is_deleted.is_(False),
            Log.date >= d - timedelta(days=_INBOX_LOOKBACK), Log.date <= d,
            or_(CardMemo.target_type.in_(("next", "all")),
                and_(CardMemo.target_type == "user", CardMemo.target_user_id == user.id)),
            or_(
                and_(CardMemo.keep == "shift", Log.date == pd, Log.shift_type.in_((ps, "주야"))),
                and_(CardMemo.keep == "days", CardMemo.keep_until >= d),
                and_(CardMemo.keep == "checked", CardMemo.target_type != "next"),
                and_(CardMemo.keep == "checked", CardMemo.target_type == "next",
                     or_(LogCard.id.notin_(anyone_checked), LogCard.id.in_(checked_by_me))),
            ),
        )
    ).all()
    me = _shift_rank(d, shift)
    cards = [c for c, _, lg in rows if _shift_rank(lg.date, lg.shift_type) < me]
    out = build_cards(db, cards)
    out.sort(key=lambda c: (user.id in (c.memo.checked_user_ids if c.memo else []),
                            -c.date.toordinal(), -c.id))
    return out


def check(db: Session, user: User, card_id: int) -> bool:
    if db.get(CardMemo, card_id) is None:
        return False
    db.execute(pg_insert(CardMemoCheck).values(card_id=card_id, user_id=user.id)
               .on_conflict_do_nothing(index_elements=["card_id", "user_id"]))
    db.commit()
    return True
