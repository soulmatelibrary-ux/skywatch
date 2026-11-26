"""장애관리 서비스 — CRUD 및 코멘트."""
import os
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import aliased, Session

from app.models.issue import Issue, IssueComment
from app.models.schedule import Attachment
from app.models.user import User
from app.schemas.issue import IssueCommentCreate, IssueCreate, IssueUpdate

STATUSES = ["진행중", "수정완료", "경고", "반환"]


def _user_name(db: Session, user_id: int | None) -> str | None:
    if not user_id:
        return None
    return db.execute(select(User.name).where(User.id == user_id)).scalar_one_or_none()


_SORT_COLUMNS = {
    "reg_date": Issue.reg_date, "kac_pr_no": Issue.kac_pr_no, "lm_pr_no": Issue.lm_pr_no,
    "title": Issue.title, "status": Issue.status, "updated_at": Issue.updated_at,
}


def _order_by(sort: str | None, order: str | None) -> list:
    """sort 가 없으면 기본 정렬: KAC PR번호가 있는 PR 먼저(제작사 번호만 있는 자동등록 건은 뒤), 등록일 최신순."""
    column = _SORT_COLUMNS.get(sort or "")
    if column is None:
        return [func.coalesce(Issue.kac_pr_no, "") == "", Issue.reg_date.desc(), Issue.id.desc()]
    direction = column.asc() if order == "asc" else column.desc()
    return [direction.nulls_last(), Issue.id.desc()]


def list_issues(
    db: Session,
    status: str | None = None,
    keyword: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    skip: int = 0,
    limit: int = 100,
    sort: str | None = None,
    order: str | None = None,
) -> tuple[list[dict], int]:
    creator = aliased(User)
    assignee = aliased(User)
    q = (
        select(
            Issue,
            creator.name.label("created_by_name"),
            assignee.name.label("assigned_to_name"),
        )
        .outerjoin(creator, creator.id == Issue.created_by)
        .outerjoin(assignee, assignee.id == Issue.assigned_to)
        .where(Issue.is_deleted.is_(False))
    )
    if status:
        q = q.where(Issue.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.where(Issue.title.ilike(like) | Issue.keyword.ilike(like)
                    | Issue.kac_pr_no.ilike(like) | Issue.lm_pr_no.ilike(like))
    if date_from:
        q = q.where(Issue.reg_date >= date_from)
    if date_to:
        q = q.where(Issue.reg_date <= date_to)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    rows = db.execute(
        q.order_by(*_order_by(sort, order)).offset(skip).limit(limit)
    ).all()

    if not rows:
        return [], total

    ids = [issue.id for issue, _, _ in rows]

    comment_counts: dict[int, int] = dict(
        db.execute(
            select(IssueComment.issue_id, func.count().label("cnt"))
            .where(IssueComment.issue_id.in_(ids), IssueComment.is_deleted.is_(False))
            .group_by(IssueComment.issue_id)
        ).all()
    )
    att_counts: dict[int, int] = dict(
        db.execute(
            select(Attachment.owner_id, func.count().label("cnt"))
            .where(
                Attachment.owner_type == "issue",
                Attachment.owner_id.in_(ids),
                Attachment.is_deleted.is_(False),
            )
            .group_by(Attachment.owner_id)
        ).all()
    )
    return [
        {
            "id": issue.id,
            "kac_pr_no": issue.kac_pr_no,
            "lm_pr_no": issue.lm_pr_no,
            "title": issue.title,
            "status": issue.status,
            "acc_type": issue.acc_type,
            "version": issue.version,
            "mod_version": issue.mod_version,
            "reg_date": issue.reg_date,
            "action_date": issue.action_date,
            "created_by_name": created_by_name or "관리자",
            "assigned_to_name": assigned_to_name or "관리자",
            "comment_count": comment_counts.get(issue.id, 0),
            "attachment_count": att_counts.get(issue.id, 0),
        }
        for issue, created_by_name, assigned_to_name in rows
    ], total


def get_issue(db: Session, issue_id: int) -> dict | None:
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not issue:
        return None

    comments = db.execute(
        select(IssueComment)
        .where(IssueComment.issue_id == issue_id, IssueComment.is_deleted.is_(False))
        .order_by(IssueComment.created_at)
    ).scalars().all()

    attachments = db.execute(
        select(Attachment)
        .where(
            Attachment.owner_type == "issue",
            Attachment.owner_id == issue_id,
            Attachment.is_deleted.is_(False),
        )
        .order_by(Attachment.id)
    ).scalars().all()

    return {
        "id": issue.id,
        "source_seq": issue.source_seq,
        "kac_pr_no": issue.kac_pr_no,
        "lm_pr_no": issue.lm_pr_no,
        "title": issue.title,
        "content": issue.content,
        "status": issue.status,
        "acc_type": issue.acc_type,
        "keyword": issue.keyword,
        "version": issue.version,
        "mod_version": issue.mod_version,
        "reg_date": issue.reg_date,
        "action_date": issue.action_date,
        "acc_pr": issue.acc_pr,
        "created_by": issue.created_by,
        "created_by_name": _user_name(db, issue.created_by),
        "assigned_to": issue.assigned_to,
        "assigned_to_name": _user_name(db, issue.assigned_to),
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "comments": [
            {
                "id": c.id,
                "issue_id": c.issue_id,
                "content": c.content,
                "is_certified": c.is_certified,
                "created_by": c.created_by,
                "created_by_name": _user_name(db, c.created_by),
                "created_at": c.created_at,
            }
            for c in comments
        ],
        "attachments": [
            {
                "id": a.id,
                "original_name": a.original_name,
                "file_name": a.file_name,
                "file_size": a.file_size,
            }
            for a in attachments
        ],
    }


def create_issue(db: Session, user_id: int, body: IssueCreate) -> dict:
    issue = Issue(
        kac_pr_no=body.kac_pr_no,
        lm_pr_no=body.lm_pr_no,
        title=body.title,
        content=body.content,
        status=body.status,
        acc_type=body.acc_type,
        keyword=body.keyword,
        version=body.version,
        mod_version=body.mod_version,
        reg_date=body.reg_date,
        action_date=body.action_date,
        acc_pr=body.acc_pr,
        assigned_to=body.assigned_to if body.assigned_to is not None else user_id,
        created_by=user_id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return get_issue(db, issue.id)  # type: ignore[return-value]


def update_issue(db: Session, issue_id: int, user_id: int, body: IssueUpdate) -> dict | None:
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not issue:
        return None
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(issue, field, val)
    issue.last_edited_by = user_id
    db.commit()
    return get_issue(db, issue_id)


def delete_issue(db: Session, issue_id: int, user_id: int) -> bool:
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not issue:
        return False
    issue.is_deleted = True
    issue.deleted_by = user_id
    issue.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return True


def add_comment(db: Session, issue_id: int, user_id: int, body: IssueCommentCreate) -> dict | None:
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not issue:
        return None
    c = IssueComment(
        issue_id=issue_id,
        content=body.content,
        is_certified=body.is_certified,
        created_by=user_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {
        "id": c.id,
        "issue_id": c.issue_id,
        "content": c.content,
        "is_certified": c.is_certified,
        "created_by": c.created_by,
        "created_by_name": _user_name(db, c.created_by),
        "created_at": c.created_at,
    }


def delete_comment(db: Session, comment_id: int, user_id: int) -> bool:
    c = db.execute(
        select(IssueComment).where(
            IssueComment.id == comment_id, IssueComment.is_deleted.is_(False)
        )
    ).scalar_one_or_none()
    if not c:
        return False
    c.is_deleted = True
    db.commit()
    return True


def delete_attachment(db: Session, att_id: int) -> bool:
    att = db.execute(
        select(Attachment).where(
            Attachment.id == att_id,
            Attachment.owner_type == "issue",
            Attachment.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not att:
        return False
    if os.path.exists(att.file_path):
        os.remove(att.file_path)
    att.is_deleted = True
    db.commit()
    return True
