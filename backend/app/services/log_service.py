"""일지 조회, 상태 변경, 삭제 서비스."""
from datetime import date as Date, datetime, timezone
from typing import Optional

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.models.log import CardLink, Comment, Log, LogCard, LogParticipant, LogRead
from app.models.schedule import Attachment
from app.models.user import User
from app.schemas.common import Pagination
from app.schemas.log import LogOut


class LogNotFoundError(Exception):
    """일지를 찾을 수 없음."""
    pass

_NOTICE_FIRST = case((Log.shift_type == "공지", 0), else_=1)

_SHIFT_ORDER = case(
    (Log.shift_type == "야간", 0),
    (Log.shift_type == "주간", 1),
    (Log.shift_type == "주야", 2),
    (Log.shift_type == "비번", 3),
    (Log.shift_type == "휴가", 4),
    else_=9,
)


def _base_stmt(current_user_id: int):
    """공통 SELECT 절 (LEFT JOIN + GROUP BY로 최적화)."""
    # 첨부파일 서브쿼리: 카드 소속 첨부파일만 카운트
    att_sq = select(Attachment.id, LogCard.log_id).select_from(Attachment).join(
        LogCard,
        and_(
            LogCard.id == Attachment.owner_id,
            Attachment.owner_type == "card",
        ),
    ).where(Attachment.is_deleted.is_(False)).subquery("att_subq")

    link_sq = select(CardLink.id, LogCard.log_id).select_from(CardLink).join(
        LogCard, LogCard.id == CardLink.source_card_id,
    ).subquery("link_subq")

    # 주 근무자(primary participant) 서브쿼리
    from sqlalchemy.orm import aliased
    PWorker = aliased(User, name="primary_worker")
    primary_sq = (
        select(
            LogParticipant.log_id,
            func.min(PWorker.name).label("primary_worker_name"),
            func.min(PWorker.team).label("primary_worker_team"),
        )
        .join(PWorker, PWorker.id == LogParticipant.user_id)
        .where(LogParticipant.role == "primary")
        .group_by(LogParticipant.log_id)
        .subquery("primary_sq")
    )

    return (
        select(
            Log,
            User.name.label("author_name"),
            User.team.label("team"),
            primary_sq.c.primary_worker_name,
            primary_sq.c.primary_worker_team,
            func.count(LogCard.id.distinct()).label("card_count"),
            func.count(LogCard.id.distinct()).filter(LogCard.status == "open").label("open_count"),
            func.count(LogCard.id.distinct()).filter(
                LogCard.status.notin_(["done", "cancelled"])
            ).label("in_progress_count"),
            func.count(Comment.id.distinct()).label("comment_count"),
            func.count(att_sq.c.id.distinct()).label("attach_count"),
            func.count(link_sq.c.id.distinct()).label("link_count"),
            func.max(case((LogRead.user_id == current_user_id, 1), else_=0)).label("read_count"),
        )
        .join(User, User.id == Log.author_id)
        .outerjoin(LogCard, and_(LogCard.log_id == Log.id, LogCard.is_deleted.is_(False)))
        .outerjoin(Comment, and_(Comment.log_id == Log.id, Comment.is_deleted.is_(False)))
        .outerjoin(att_sq, att_sq.c.log_id == Log.id)
        .outerjoin(link_sq, link_sq.c.log_id == Log.id)
        .outerjoin(LogRead, and_(LogRead.log_id == Log.id, LogRead.user_id == current_user_id))
        .outerjoin(primary_sq, primary_sq.c.log_id == Log.id)
        .where(Log.is_deleted.is_(False))
        .group_by(Log.id, User.id, primary_sq.c.primary_worker_name, primary_sq.c.primary_worker_team)
    )


def _row_to_out(row) -> LogOut:
    log, author_name, team, primary_worker_name, primary_worker_team, card_count, open_count, in_progress_count, comment_count, attach_count, link_count, read_count = row
    return LogOut(
        id=log.id,
        author_id=log.author_id,
        author_name=author_name,
        team=team,
        primary_worker_name=primary_worker_name,
        primary_worker_team=primary_worker_team,
        date=log.date,
        shift_type=log.shift_type,
        title=log.title,
        tags=log.tags or [],
        created_at=log.created_at,
        updated_at=log.updated_at,
        card_count=card_count or 0,
        open_count=open_count or 0,
        in_progress_count=in_progress_count or 0,
        comment_count=comment_count or 0,
        attach_count=attach_count or 0,
        link_count=link_count or 0,
        is_read=bool(read_count),
    )


def get_logs(
    db: Session,
    current_user_id: int,
    page: int = 1,
    per_page: int = 50,
    team: Optional[str] = None,
    date_from: Optional[Date] = None,
    date_to: Optional[Date] = None,
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    exclude_notice: bool = False,
) -> tuple[list[LogOut], Pagination]:
    stmt = _base_stmt(current_user_id)

    if exclude_notice:
        stmt = stmt.where(Log.shift_type != "공지")
    if team:
        worker_in_team = (
            select(LogParticipant.id)
            .join(User, User.id == LogParticipant.user_id)
            .where(LogParticipant.log_id == Log.id, User.team == team)
            .correlate(Log)
            .exists()
        )
        stmt = stmt.where(worker_in_team)
    if category_id:
        cat_exists = (
            select(LogCard.id)
            .where(
                LogCard.log_id == Log.id,
                LogCard.category_id == category_id,
                LogCard.is_deleted.is_(False),
            )
            .correlate(Log)
            .exists()
        )
        stmt = stmt.where(cat_exists)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)
    if q:
        from app.services.search_service import _parse_search_query
        or_groups, exclude_terms = _parse_search_query(q)

        # 통합검색과 동일하게 동의어 확장 적용
        try:
            from app.services.synonym_service import get_expanded_terms as _get_expanded
            expanded: list[list[str]] = []
            for group in or_groups:
                merged: list[str] = []
                seen: set[str] = set()
                for t in group:
                    if not t:
                        continue
                    for s in _get_expanded(t):
                        if s.lower() not in seen:
                            seen.add(s.lower())
                            merged.append(s)
                if merged:
                    expanded.append(merged[:12])
            if expanded:
                or_groups = expanded
        except Exception:
            pass

        def _term_match(term: str):
            esc = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            lk = f"%{esc}%"
            card_m = (
                select(LogCard.id)
                .where(LogCard.log_id == Log.id, LogCard.is_deleted.is_(False),
                       or_(LogCard.title.ilike(lk, escape="\\"), LogCard.content.ilike(lk, escape="\\")))
                .correlate(Log).exists()
            )
            comment_m = (
                select(Comment.id)
                .where(Comment.log_id == Log.id, Comment.is_deleted.is_(False),
                       Comment.body.ilike(lk, escape="\\"))
                .correlate(Log).exists()
            )
            attach_m = (
                select(Attachment.id)
                .join(LogCard, and_(LogCard.id == Attachment.owner_id, LogCard.is_deleted.is_(False)))
                .where(Attachment.owner_type == "card", Attachment.is_deleted.is_(False),
                       Attachment.original_name.ilike(lk, escape="\\"), LogCard.log_id == Log.id)
                .correlate(Log).exists()
            )
            part_m = (
                select(LogParticipant.id)
                .join(User, User.id == LogParticipant.user_id)
                .where(LogParticipant.log_id == Log.id,
                       or_(User.name.ilike(lk, escape="\\"),
                           func.coalesce(LogParticipant.note, "").ilike(lk, escape="\\")))
                .correlate(Log).exists()
            )
            return or_(Log.title.ilike(lk, escape="\\"), Log.shift_type.ilike(lk, escape="\\"),
                       User.name.ilike(lk, escape="\\"), card_m, comment_m, attach_m, part_m)

        # OR 그룹: 그룹 내 OR, 그룹 간 AND
        for group in or_groups:
            stmt = stmt.where(or_(*[_term_match(t) for t in group if t]))
        for term in exclude_terms:
            stmt = stmt.where(~_term_match(term))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(_NOTICE_FIRST, Log.date.desc(), _SHIFT_ORDER)
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    total_pages = max(1, (total + per_page - 1) // per_page)
    return (
        [_row_to_out(r) for r in rows],
        Pagination(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


def get_log_by_id(db: Session, log_id: int) -> Log:
    """
    일지를 ID로 조회합니다 (삭제되지 않은 일지만).

    Args:
        db: SQLAlchemy 세션
        log_id: 조회할 일지 ID

    Returns:
        Log 객체

    Raises:
        LogNotFoundError: 일지를 찾을 수 없음
    """
    log = db.query(Log).filter(
        Log.id == log_id,
        Log.is_deleted.is_(False)
    ).first()

    if not log:
        raise LogNotFoundError(f"일지 {log_id}를 찾을 수 없습니다")

    return log


def soft_delete_log(db: Session, log_id: int, deleted_by: int) -> Log:
    """
    일지를 소프트 삭제합니다 (커밋하지 않음).

    Args:
        db: SQLAlchemy 세션
        log_id: 삭제할 일지 ID
        deleted_by: 삭제 수행자 ID

    Returns:
        삭제된 Log 객체

    Raises:
        LogNotFoundError: 일지를 찾을 수 없음

    Note:
        호출자가 db.commit()을 호출해야 합니다.
    """
    log = get_log_by_id(db, log_id)

    log.is_deleted = True
    log.deleted_by = deleted_by
    log.deleted_at = datetime.now(timezone.utc)

    return log
