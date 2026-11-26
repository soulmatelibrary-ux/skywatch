# SkyNet 설정 서비스 — 부서 활성화 토글 및 키워드 CRUD
from sqlalchemy.orm import Session
from sqlalchemy import text


class DepartmentNotFoundError(Exception):
    pass


class KeywordNotFoundError(Exception):
    pass


class DuplicateKeywordError(Exception):
    pass


def toggle_department(db: Session, dept_id: int, enabled: bool) -> dict:
    row = db.execute(
        text("SELECT id, name, enabled FROM crawl_departments WHERE id = :id"),
        {'id': dept_id},
    ).mappings().fetchone()
    if not row:
        raise DepartmentNotFoundError(dept_id)

    db.execute(
        text("UPDATE crawl_departments SET enabled = :e WHERE id = :id"),
        {'e': 1 if enabled else 0, 'id': dept_id},
    )
    db.commit()
    return {'id': dept_id, 'name': row['name'], 'enabled': enabled}


def get_keywords(db: Session):
    rows = db.execute(
        text("SELECT id, keyword, project_id FROM crawl_keywords ORDER BY keyword")
    ).mappings().all()
    return [dict(r) for r in rows]


def add_keyword(db: Session, keyword: str) -> dict:
    keyword = keyword.strip()
    existing = db.execute(
        text("SELECT id FROM crawl_keywords WHERE keyword = :kw"),
        {'kw': keyword},
    ).fetchone()
    if existing:
        raise DuplicateKeywordError(keyword)

    result = db.execute(
        text("INSERT INTO crawl_keywords (keyword) VALUES (:kw) RETURNING id"),
        {'kw': keyword},
    )
    new_id = result.fetchone()[0]  # commit 전에 fetch — commit 후에는 커서가 닫힘
    db.commit()
    return {'id': new_id, 'keyword': keyword, 'project_id': None}


def delete_keyword(db: Session, keyword_id: int) -> None:
    row = db.execute(
        text("SELECT id FROM crawl_keywords WHERE id = :id"),
        {'id': keyword_id},
    ).fetchone()
    if not row:
        raise KeywordNotFoundError(keyword_id)

    db.execute(text("DELETE FROM crawl_keywords WHERE id = :id"), {'id': keyword_id})
    db.commit()
