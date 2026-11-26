"""근무 일지 보기 화면의 근무 목록 — 작성된 일지 + 근무표상 빠진 근무."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import Log, LogCard, LogParticipant
from app.models.user import User
from app.models.work_thread import CardMemo
from app.schemas.shift_log import ShiftHistoryItem
from app.services.roster_service import (
    NOTICE_SHIFT, is_late, kst_today, shift_codes, team_users, teams_from_code,
)

_ORDER = {"주간": 0, "주야": 1, "야간": 2}


def history(db: Session, user: User, date_from: date, date_to: date, mine: bool) -> list[ShiftHistoryItem]:
    logs = db.scalars(select(Log).where(
        Log.date >= date_from, Log.date <= date_to, Log.is_deleted.is_(False),
        Log.shift_type != NOTICE_SHIFT,
    )).all()
    log_ids = [lg.id for lg in logs]
    parts: dict[int, list[int]] = {}
    for lid, uid in db.execute(select(LogParticipant.log_id, LogParticipant.user_id)
                               .where(LogParticipant.log_id.in_(log_ids)).order_by(LogParticipant.id)).all():
        parts.setdefault(lid, []).append(uid)
    cards: dict[int, list[LogCard]] = {}
    for c in db.scalars(select(LogCard).where(LogCard.log_id.in_(log_ids), LogCard.is_deleted.is_(False))).all():
        cards.setdefault(c.log_id, []).append(c)
    memo_ids = set(db.scalars(select(CardMemo.card_id).join(LogCard, LogCard.id == CardMemo.card_id)
                              .where(LogCard.log_id.in_(log_ids))).all())
    names = {u.id: u.name for u in db.scalars(select(User)).all()}
    codes = shift_codes(db, date_from, date_to)
    by_team = team_users(db)

    items: list[ShiftHistoryItem] = []
    member_ids: list[set[int]] = []   # items와 같은 순서의 근무자 id (내 근무 필터용)
    seen = set()
    for lg in logs:
        seen.add((lg.date, lg.shift_type))
        cs = cards.get(lg.id, [])
        pids = parts.get(lg.id, [])
        items.append(ShiftHistoryItem(
            date=lg.date, shift_type=lg.shift_type, log_id=lg.id,
            team="·".join(teams_from_code(codes.get(lg.date), lg.shift_type)),
            worker_names=[names.get(u, "") for u in pids] or [names.get(lg.author_id, "")],
            card_count=sum(1 for c in cs if c.id not in memo_ids),
            memo_count=sum(1 for c in cs if c.id in memo_ids),
            has_late=any(is_late(lg, c.created_at) for c in cs),
            has_proxy=bool(pids) and any(c.created_by not in pids for c in cs),
            missing=False,
        ))
        member_ids.append(set(pids) or {lg.author_id})
    today = kst_today()
    for d, code in codes.items():
        if d >= today:
            continue
        for shift in ("주간", "야간"):
            if (d, shift) in seen or (d, "주야") in seen:
                continue
            teams = teams_from_code(code, shift)
            items.append(ShiftHistoryItem(
                date=d, shift_type=shift, team="·".join(teams),
                worker_names=[by_team[t].name for t in teams if t in by_team],
                card_count=0, memo_count=0, has_late=False, has_proxy=False, missing=True,
            ))
            member_ids.append({by_team[t].id for t in teams if t in by_team})
    if mine:
        items = [i for i, ids in zip(items, member_ids) if user.id in ids]
    items.sort(key=lambda i: (i.date, _ORDER.get(i.shift_type, 3)), reverse=True)
    return items
