"""PR관리(KAC PR) KURE-v1 임베딩 저장 및 검색 서비스 (skywatch_issue_vectors 활용)."""
from __future__ import annotations

import threading

import numpy as np
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.models.issue import Issue, IssueComment, IssueVector
from app.services.vector_model import _normalize_text, chunk_text, _get_encoder_for_model

_MODEL = "kure-v1"
_MIN_SIMILARITY = 0.45
_backfill_lock = threading.Lock()
_backfill_running = False


def _build_issue_text(db: Session, issue_id: int) -> str:
    issue = db.scalar(
        select(Issue).where(Issue.id == issue_id, Issue.is_deleted.is_(False))
    )
    if not issue:
        return ""

    comments = db.execute(
        text("""
            SELECT content FROM skywatch_issue_comments
            WHERE issue_id = :id AND is_deleted = FALSE
            ORDER BY created_at ASC
        """),
        {"id": issue_id},
    ).fetchall()

    parts: list[str] = []
    if issue.kac_pr_no:
        parts.append(f"KAC PR: {issue.kac_pr_no}")
    if issue.lm_pr_no:
        parts.append(f"LM PR: {issue.lm_pr_no}")
    if issue.title:
        parts.append(f"제목: {issue.title}")
    if issue.keyword:
        parts.append(f"키워드: {issue.keyword}")
    if issue.status:
        parts.append(f"상태: {issue.status}")
    if issue.acc_type:
        parts.append(f"접수유형: {issue.acc_type}")
    if issue.version:
        parts.append(f"버전: {issue.version}")
    if issue.mod_version:
        parts.append(f"수정버전: {issue.mod_version}")
    if issue.acc_pr:
        parts.append(f"수용 PR: {issue.acc_pr}")
    if issue.content:
        parts.append(_normalize_text(issue.content))
    for row in comments:
        if row.content:
            parts.append(f"댓글: {_normalize_text(row.content)}")
    return "\n".join(p for p in parts if p)


def vectorize_issue(db: Session, issue_id: int) -> int:
    """단일 PR 임베딩. 저장된 청크 수 반환."""
    full_text = _build_issue_text(db, issue_id)
    if not full_text.strip():
        return 0

    chunks = chunk_text(full_text)
    if not chunks:
        return 0

    db.execute(delete(IssueVector).where(IssueVector.issue_id == issue_id))
    encoder = _get_encoder_for_model(_MODEL)
    for idx, chunk in enumerate(chunks):
        vec = encoder(chunk).astype(np.float32).tolist()
        db.add(IssueVector(issue_id=issue_id, chunk_index=idx, chunk_text=chunk, embedding=vec))
    db.commit()
    return len(chunks)


def is_backfill_running() -> bool:
    return _backfill_running


def vectorize_pending_issues(db: Session) -> int:
    """미벡터화 또는 수정된 PR 배치 처리. 처리된 건수 반환."""
    issues = db.execute(
        text("SELECT id, updated_at FROM skywatch_issues WHERE is_deleted=FALSE ORDER BY id")
    ).fetchall()
    if not issues:
        return 0

    vectorized = {
        row[0]: row[1]
        for row in db.execute(
            text("""
                SELECT issue_id, MAX(created_at)
                FROM skywatch_issue_vectors
                GROUP BY issue_id
            """)
        ).fetchall()
    }

    count = 0
    for issue_id, updated_at in issues:
        last_vec = vectorized.get(issue_id)
        if last_vec is not None and updated_at is not None and updated_at <= last_vec:
            continue
        try:
            n = vectorize_issue(db, issue_id)
            if n:
                count += 1
        except Exception as e:
            print(f"[WARN] issue vector {issue_id} failed: {e}")
            try:
                db.rollback()
            except Exception:
                pass
    return count


def schedule_vectorize_issue(issue_id: int) -> None:
    """PR 생성/수정 후 백그라운드 스레드로 즉시 1회 임베딩."""
    def _run():
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            vectorize_issue(db, issue_id)
        except Exception as e:
            print(f"[WARN] issue auto-vectorize {issue_id} failed: {e}")
        finally:
            db.close()
    threading.Thread(target=_run, daemon=True).start()


def search_issues_by_vector(
    db: Session,
    query: str,
    top_k: int = 50,
    min_similarity: float = _MIN_SIMILARITY,
    query_vec=None,
) -> list[tuple[int, float]]:
    """자연어 쿼리로 유사 PR 검색. [(issue_id, score), ...] 반환."""
    encoder = _get_encoder_for_model(_MODEL)
    if query_vec is None:
        query_vec = encoder(query)

    q_str = "[" + ",".join(str(round(float(v), 6)) for v in query_vec) + "]"
    try:
        rows = db.execute(
            text(
                "SELECT issue_id, chunk_text, embedding <=> CAST(:q AS vector) AS dist "
                "FROM skywatch_issue_vectors WHERE embedding IS NOT NULL "
                "ORDER BY dist ASC LIMIT :k"
            ),
            {"q": q_str, "k": top_k},
        ).fetchall()
        best: dict[int, float] = {}
        for issue_id, _, dist in rows:
            score = max(0.0, 1.0 - float(dist))
            if score >= min_similarity and (issue_id not in best or score > best[issue_id]):
                best[issue_id] = score
        return sorted(best.items(), key=lambda x: x[1], reverse=True)[:top_k]
    except Exception as e:
        print(f"[WARN] Issue pgvector search failed, fallback: {e}")
        return _search_python(db, query_vec, top_k, min_similarity)


def _search_python(db: Session, query_vec, top_k: int, min_sim: float) -> list[tuple[int, float]]:
    best: dict[int, float] = {}
    for iv in db.scalars(select(IssueVector)).all():
        if iv.embedding is None:
            continue
        try:
            vec = np.array(iv.embedding, dtype=np.float32)
            score = float(np.dot(query_vec, vec))
        except Exception:
            continue
        if score >= min_sim and (iv.issue_id not in best or score > best[iv.issue_id]):
            best[iv.issue_id] = score
    return sorted(best.items(), key=lambda x: x[1], reverse=True)[:top_k]
