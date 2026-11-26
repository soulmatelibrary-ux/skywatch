"""신규 화면용 카드 응답 변환 — 종류(당일 종료·이어지는 일·장기 과제·전달), 지연·대리 작성 계산."""
import html
import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, Log, LogCard, LogParticipant
from app.models.schedule import Attachment
from app.models.user import User
from app.models.work_thread import CardMemo, CardMemoCheck, WorkThread, WorkThreadCard
from app.schemas.shift_log import AttachmentBrief, MemoInfo, ShiftCardOut
from app.services.roster_service import is_late

_BREAK_RE = re.compile(r"<br\s*/?>|</p>|</li>|</h[1-6]>|</div>|</tr>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_CELL_RE = re.compile(r"</t[dh]>", re.IGNORECASE)   # 표 칸 사이는 공백으로


def html_to_text(content: str | None) -> str:
    """카드 HTML 본문을 줄 단위 평문으로 변환."""
    if not content:
        return ""
    text = _TAG_RE.sub("", _BREAK_RE.sub("\n", _CELL_RE.sub(" ", content)))
    lines = [html.unescape(line).replace("\xa0", " ").strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def text_to_html(text: str | None) -> str:
    """평문 줄을 기존 편집기와 호환되는 <p> 문단으로 변환."""
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    return "".join(f"<p>{html.escape(line)}</p>" for line in lines)


def _lookup(db: Session, cards: list[LogCard]) -> dict:
    card_ids = [c.id for c in cards]
    log_ids = list({c.log_id for c in cards})
    logs = {lg.id: lg for lg in db.scalars(select(Log).where(Log.id.in_(log_ids))).all()}
    parts: dict[int, set[int]] = {}
    for log_id, user_id in db.execute(
        select(LogParticipant.log_id, LogParticipant.user_id).where(LogParticipant.log_id.in_(log_ids))
    ).all():
        parts.setdefault(log_id, set()).add(user_id)
    links = {cid: t for cid, t in db.execute(
        select(WorkThreadCard.card_id, WorkThread)
        .join(WorkThread, WorkThread.id == WorkThreadCard.thread_id)
        .where(WorkThreadCard.card_id.in_(card_ids))
    ).all()}
    memos = {m.card_id: m for m in db.scalars(select(CardMemo).where(CardMemo.card_id.in_(card_ids))).all()}
    checks: dict[int, list[int]] = {}
    for cid, uid in db.execute(
        select(CardMemoCheck.card_id, CardMemoCheck.user_id).where(CardMemoCheck.card_id.in_(card_ids))
    ).all():
        checks.setdefault(cid, []).append(uid)
    counts = {}
    thread_ids = {t.id for t in links.values() if t.kind == "thread"}
    if thread_ids:   # 이어지는 일 묶음의 카드 수 (삭제된 카드 제외) — 수정·삭제 안내 문구용
        counts = dict(db.execute(
            select(WorkThreadCard.thread_id, func.count(LogCard.id))
            .join(LogCard, LogCard.id == WorkThreadCard.card_id)
            .where(WorkThreadCard.thread_id.in_(thread_ids), LogCard.is_deleted.is_(False))
            .group_by(WorkThreadCard.thread_id)
        ).all())
    users = {u.id: u.name for u in db.scalars(select(User)).all()}
    cats = {c.id: c for c in db.scalars(select(CardCategory)).all()}
    files: dict[int, list[AttachmentBrief]] = {}
    for a in db.scalars(
        select(Attachment).where(Attachment.owner_type == "card", Attachment.owner_id.in_(card_ids),
                                 Attachment.is_deleted.is_(False)).order_by(Attachment.id)
    ).all():
        files.setdefault(a.owner_id, []).append(
            AttachmentBrief(id=a.id, original_name=a.original_name, file_size=a.file_size))
    return {"logs": logs, "parts": parts, "links": links, "memos": memos,
            "checks": checks, "users": users, "counts": counts, "cats": cats, "files": files}


def _memo_info(memo: CardMemo, checked: list[int], users: dict[int, str]) -> MemoInfo:
    return MemoInfo(
        target_type=memo.target_type, target_user_id=memo.target_user_id,
        target_user_name=users.get(memo.target_user_id) if memo.target_user_id else None,
        keep=memo.keep, keep_until=memo.keep_until,
        checked_user_ids=checked, checked_names=[users.get(u, "") for u in checked],
    )


def build_cards(db: Session, cards: list[LogCard]) -> list[ShiftCardOut]:
    if not cards:
        return []
    ctx = _lookup(db, cards)
    result = []
    for c in cards:
        log = ctx["logs"].get(c.log_id)
        if log is None:
            continue
        thread = ctx["links"].get(c.id)
        memo = ctx["memos"].get(c.id)
        cat = ctx["cats"].get(c.category_id)
        participants = ctx["parts"].get(log.id, set())
        kind = "memo" if memo else (thread.kind if thread else "single")
        result.append(ShiftCardOut(
            id=c.id, log_id=log.id, date=log.date, shift_type=log.shift_type,
            title=c.title, body_text=html_to_text(c.content), content=c.content,
            category_id=c.category_id, category_name=cat.name if cat else None,
            category_color=cat.color if cat else None, status=c.status,
            author_id=c.created_by, author_name=ctx["users"].get(c.created_by),
            created_at=c.created_at, kind=kind,
            thread_id=thread.id if thread else None, thread_title=thread.title if thread else None,
            thread_status=thread.status if thread else None,
            memo=_memo_info(memo, ctx["checks"].get(c.id, []), ctx["users"]) if memo else None,
            is_late=is_late(log, c.created_at),
            is_proxy=bool(participants) and c.created_by not in participants,
            attachments=ctx["files"].get(c.id, []),
            updated_at=c.updated_at,
            edited_by_name=ctx["users"].get(c.last_edited_by) if c.last_edited_by else None,
            edited_at=c.updated_at if c.last_edited_by else None,
            thread_card_count=ctx["counts"].get(thread.id) if thread else None,
        ))
    return result
