"""관제시스템 문서 목록·카테고리 조회 서비스."""
from __future__ import annotations

import re
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.tech_doc import TechDoc, TechDocAttachment, TechDocCategory
from app.models.user import User
from app.schemas.tech_doc import (
    AttachmentResponse,
    CategoryResponse,
    CategoryTree,
    TechDocDetail,
    TechDocListItem,
    TechDocListResponse,
)


_SEARCH_FIELDS = lambda: [TechDoc.title, TechDoc.summary, TechDoc.content]


def _resolve_author_name(
    doc: TechDoc,
    user_by_id: dict[int, str],
    user_by_login: dict[str, str],
) -> str:
    if doc.author_id and doc.author_id in user_by_id:
        return user_by_id[doc.author_id]
    if doc.created_by and doc.created_by in user_by_id:
        return user_by_id[doc.created_by]
    if doc.orig_user_id and doc.orig_user_id in user_by_login:
        return user_by_login[doc.orig_user_id]
    return "관리자"


def _apply_q(stmt, q: str):
    """쿼리 파싱: 공백=AND, OR=OR검색, -단어=제외."""
    or_groups = [g.strip() for g in re.split(r'\bOR\b', q, flags=re.IGNORECASE) if g.strip()]
    fields = _SEARCH_FIELDS()
    not_terms: list[str] = []

    if len(or_groups) > 1:
        or_conds = []
        for group in or_groups:
            for tok in group.split():
                if tok.startswith('-') and len(tok) > 1:
                    not_terms.append(tok[1:])
                else:
                    or_conds.append(or_(*[f.ilike(f'%{tok}%') for f in fields]))
        if or_conds:
            stmt = stmt.where(or_(*or_conds))
    else:
        for tok in q.split():
            if tok.startswith('-') and len(tok) > 1:
                not_terms.append(tok[1:])
            else:
                stmt = stmt.where(or_(*[f.ilike(f'%{tok}%') for f in fields]))

    for nt in not_terms:
        stmt = stmt.where(~or_(*[f.ilike(f'%{nt}%') for f in fields]))

    return stmt


def get_categories(db: Session) -> list[CategoryTree]:
    rows = (
        db.execute(
            select(TechDocCategory)
            .where(TechDocCategory.is_active.is_(True))
            .order_by(TechDocCategory.project_code, TechDocCategory.sort_order)
        )
        .scalars()
        .all()
    )
    grouped: dict[str, list[CategoryResponse]] = {}
    for r in rows:
        grouped.setdefault(r.project_code, []).append(CategoryResponse.model_validate(r))
    return [CategoryTree(project_code=pc, categories=cats) for pc, cats in grouped.items()]


def get_categories_for_manage(db: Session) -> list[CategoryResponse]:
    rows = (
        db.execute(
            select(TechDocCategory).order_by(TechDocCategory.project_code, TechDocCategory.sort_order)
        )
        .scalars()
        .all()
    )
    return [CategoryResponse.model_validate(r) for r in rows]


def get_tech_docs(
    db: Session,
    *,
    project_code: str | None = None,
    category_code: str | None = None,
    doc_type: str | None = None,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 50,
    semantic: bool = False,
) -> TechDocListResponse:
    stmt = select(TechDoc).where(TechDoc.is_deleted.is_(False))
    if project_code:
        stmt = stmt.where(TechDoc.project_code == project_code)
    if category_code:
        stmt = stmt.where(TechDoc.category_code == category_code)
    if doc_type:
        stmt = stmt.where(TechDoc.doc_type == doc_type)
    if date_from:
        stmt = stmt.where(TechDoc.record_date >= date_from)
    if date_to:
        stmt = stmt.where(TechDoc.record_date <= date_to)

    if q and semantic:
        from app.services.tech_doc_vector_service import search_tech_docs_by_vector
        vec_results = search_tech_docs_by_vector(db, q.strip(), top_k=100)
        if vec_results:
            doc_ids = [r[0] for r in vec_results]
            score_map = {r[0]: r[1] for r in vec_results}
            stmt = stmt.where(TechDoc.id.in_(doc_ids))
            total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
            all_rows = db.execute(stmt).scalars().all()
            all_rows = sorted(all_rows, key=lambda r: score_map.get(r.id, 0.0), reverse=True)
            rows = all_rows[(page - 1) * page_size: page * page_size]
        else:
            total = 0
            rows = []
    else:
        if q:
            stmt = _apply_q(stmt, q.strip())
        total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
        stmt = stmt.order_by(TechDoc.record_date.desc(), TechDoc.id.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        rows = db.execute(stmt).scalars().all()

    doc_ids = [r.id for r in rows]
    att_counts: dict[int, int] = {}
    if doc_ids:
        for doc_id, cnt in db.execute(
            select(TechDocAttachment.tech_doc_id, func.count(TechDocAttachment.id))
            .where(TechDocAttachment.tech_doc_id.in_(doc_ids))
            .where(TechDocAttachment.is_deleted.is_(False))
            .group_by(TechDocAttachment.tech_doc_id)
        ).fetchall():
            att_counts[doc_id] = cnt

    user_ids = {uid for r in rows for uid in (r.author_id, r.created_by) if uid}
    orig_user_ids = {r.orig_user_id for r in rows if r.orig_user_id}
    users_by_id: dict[int, str] = {}
    users_by_login: dict[str, str] = {}
    if user_ids:
        user_rows = db.execute(
            select(User.id, User.name, User.login_id).where(User.id.in_(user_ids))
        ).all()
        for uid, name, login_id in user_rows:
            users_by_id[uid] = name
            users_by_login[login_id] = name
    if orig_user_ids:
        login_rows = db.execute(
            select(User.login_id, User.name).where(User.login_id.in_(orig_user_ids))
        ).all()
        for login_id, name in login_rows:
            users_by_login[login_id] = name

    items = []
    for r in rows:
        item = TechDocListItem.model_validate(r)
        item.attachment_count = att_counts.get(r.id, 0)
        item.author_name = _resolve_author_name(r, users_by_id, users_by_login)
        items.append(item)

    return TechDocListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


def get_tech_doc_detail(db: Session, doc_id: int) -> TechDocDetail | None:
    doc = db.get(TechDoc, doc_id)
    if not doc or doc.is_deleted:
        return None
    atts = (
        db.execute(
            select(TechDocAttachment)
            .where(TechDocAttachment.tech_doc_id == doc_id, TechDocAttachment.is_deleted.is_(False))
            .order_by(TechDocAttachment.id)
        )
        .scalars()
        .all()
    )
    data = TechDocDetail.model_validate(doc)
    user_name = None
    if doc.author_id:
        user_name = db.execute(select(User.name).where(User.id == doc.author_id)).scalar_one_or_none()
    if not user_name and doc.created_by:
        user_name = db.execute(select(User.name).where(User.id == doc.created_by)).scalar_one_or_none()
    if not user_name and doc.orig_user_id:
        user_name = db.execute(select(User.name).where(User.login_id == doc.orig_user_id)).scalar_one_or_none()
    data.author_name = user_name or "관리자"
    if doc.last_edited_by:
        data.last_edited_by_name = db.execute(
            select(User.name).where(User.id == doc.last_edited_by)
        ).scalar_one_or_none()
    data.attachments = [AttachmentResponse.model_validate(a) for a in atts]
    return data
