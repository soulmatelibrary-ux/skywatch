"""과제 묶기 — 기존 카드의 반복 제목을 정규화해 과제 후보를 제안하고 적용한다."""
import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.config import Config
from app.models.log import Log, LogCard
from app.models.work_thread import CardMemo, WorkThread, WorkThreadCard, WorkThreadPhase
from app.schemas.shift_log import CandidateApply, CandidateOut
from app.services.roster_service import kst_today
from app.services.work_thread_card_status import card_status_of, set_cards_status
from app.services.work_thread_sync import close_thread_cards

_DECIDED_KEY = "work_thread_candidates_decided"
_GAP_DAYS = 3
_MIN_COUNT = 3


def _norm_expr():
    stripped = func.regexp_replace(LogCard.title, r"\([^)]*\)|\[[^]]*\]", "", "g")
    return func.lower(func.regexp_replace(stripped, r"\s+", "", "g"))


def _decided(db: Session) -> dict[str, str]:
    row = db.scalar(select(Config).where(Config.setting_key == _DECIDED_KEY))
    try:
        return json.loads(row.setting_value) if row and row.setting_value else {}
    except ValueError:
        return {}


def _save_decided(db: Session, decided: dict[str, str]) -> None:
    row = db.scalar(select(Config).where(Config.setting_key == _DECIDED_KEY))
    if row is None:
        row = Config(setting_key=_DECIDED_KEY)
        db.add(row)
    row.setting_value = json.dumps(decided, ensure_ascii=False)


def _free_cards():
    """아직 과제·메모에 연결되지 않은 일반 카드."""
    return (
        select(LogCard, Log).join(Log, Log.id == LogCard.log_id)
        .where(LogCard.is_deleted.is_(False), Log.is_deleted.is_(False), Log.shift_type != "공지",
               ~LogCard.id.in_(select(WorkThreadCard.card_id)), ~LogCard.id.in_(select(CardMemo.card_id)))
    )


def _recommend(count: int, span: int) -> str:
    if count >= 10 and span > 365:
        return "thread"      # 오래 반복된 제목 → 날짜 간격으로 끊어 이어지는 일로
    if span >= 21:
        return "project"
    return "thread"


def candidates(db: Session, limit: int = 50) -> list[CandidateOut]:
    norm = _norm_expr().label("norm")
    sub = _free_cards().with_only_columns(norm, LogCard.title, Log.date).subquery()
    rows = db.execute(
        select(sub.c.norm, func.count(), func.min(sub.c.date), func.max(sub.c.date),
               func.array_agg(func.distinct(sub.c.title)))
        .where(sub.c.norm != "")
        .group_by(sub.c.norm).having(func.count() >= _MIN_COUNT)
        .order_by(func.count().desc()).limit(limit + 50)
    ).all()
    decided = _decided(db)
    result = []
    for n, count, first, last, titles in rows:
        if n in decided:
            continue
        span = (last - first).days
        if span == 0:
            continue
        result.append(CandidateOut(norm=n, count=count, first_date=first, last_date=last,
                                   examples=sorted(titles, key=len)[:3], recommend=_recommend(count, span)))
    return result[:limit]


def _segments(pairs: list[tuple[LogCard, Log]]) -> list[list[tuple[LogCard, Log]]]:
    segs: list[list[tuple[LogCard, Log]]] = []
    for pair in pairs:
        if segs and (pair[1].date - segs[-1][-1][1].date).days <= _GAP_DAYS:
            segs[-1].append(pair)
        else:
            segs.append([pair])
    return segs


def _make_thread(db: Session, kind: str, pairs: list[tuple[LogCard, Log]], user_id: int) -> None:
    first, last = pairs[0], pairs[-1]
    recent = (kst_today() - last[1].date).days <= (30 if kind == "project" else _GAP_DAYS)
    t = WorkThread(kind=kind, title=first[0].title[:255], category_id=first[0].category_id,
                   status="open" if recent else "done", owner_id=first[0].created_by,
                   started_on=first[1].date, closed_on=None if recent else last[1].date, created_by=user_id)
    if kind == "project":
        t.phases = [WorkThreadPhase(seq=0, name="진행", start_month=first[1].date.strftime("%Y-%m"),
                                    end_month=last[1].date.strftime("%Y-%m"))]
        t.current_phase = 0 if recent else 1
    db.add(t)
    db.flush()
    for card, _ in pairs:
        db.add(WorkThreadCard(card_id=card.id, thread_id=t.id, origin="migration", linked_by=user_id))
    if t.status == "done":
        # 종료로 묶은 과제는 기존 미완료 카드 탭에서도 사라지도록 남은 카드를 완료 처리
        db.flush()
        close_thread_cards(db, t.id, user_id, auto_inquiry=False)  # 옛 카드 정리 — 문의사항 자동 등록 안 함
    elif kind == "thread":  # 진행중으로 묶은 일은 카드도 진행중으로 맞춘다
        set_cards_status(db, t.id, card_status_of("open"), user_id)


def apply(db: Session, user_id: int, data: CandidateApply) -> int:
    """적용한 과제 수를 반환한다."""
    pairs = list(db.execute(
        _free_cards().where(_norm_expr() == data.norm).order_by(Log.date, LogCard.id)
    ).tuples().all())
    made = 0
    if data.action == "project" and pairs:
        _make_thread(db, "project", pairs, user_id)
        made = 1
    elif data.action == "thread":
        for seg in _segments(pairs):
            if len(seg) >= 2:
                _make_thread(db, "thread", seg, user_id)
                made += 1
    decided = _decided(db)
    decided[data.norm] = data.action
    _save_decided(db, decided)
    db.commit()
    return made
