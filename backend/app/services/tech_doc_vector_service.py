"""기록문서(TechDoc) KURE-v1 임베딩 저장 및 검색 서비스."""
from __future__ import annotations

import threading
import numpy as np
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.tech_doc import TechDoc, TechDocVector
from app.services.vector_model import _normalize_text, chunk_text, _get_encoder_for_model

_MODEL = "kure-v1"
_MIN_SIMILARITY = 0.40
_backfill_running = False


def build_tech_doc_text(doc: TechDoc) -> str:
    parts = []
    if doc.title:
        parts.append(f"제목: {doc.title}")
    if doc.summary:
        parts.append(_normalize_text(doc.summary))
    if doc.detail_summary:
        parts.append(_normalize_text(doc.detail_summary))
    if doc.content:
        parts.append(_normalize_text(doc.content))
    if doc.reference:
        parts.append(_normalize_text(doc.reference))
    for att in (doc.attachments or []):
        if att.content_text:
            parts.append(_normalize_text(att.content_text))
    return "\n".join(p for p in parts if p)


def vectorize_tech_doc(tech_doc_id: int, db: Session, commit: bool = True) -> int:
    """기록문서를 벡터화하여 TechDocVector에 저장. 저장된 청크 수 반환."""
    doc = db.scalar(
        select(TechDoc).where(TechDoc.id == tech_doc_id, TechDoc.is_deleted.is_(False))
    )
    if not doc:
        return 0
    chunks = chunk_text(build_tech_doc_text(doc))
    if not chunks:
        return 0
    db.execute(delete(TechDocVector).where(TechDocVector.tech_doc_id == tech_doc_id))
    encoder = _get_encoder_for_model(_MODEL)
    for idx, chunk in enumerate(chunks):
        vec = encoder(chunk).astype(np.float32).tolist()
        db.add(TechDocVector(tech_doc_id=tech_doc_id, chunk_index=idx, chunk_text=chunk, embedding=vec))
    if commit:
        db.commit()
    return len(chunks)


def vectorize_pending_tech_docs(db: Session) -> int:
    """미벡터화 기록문서 배치 처리. 처리된 건수 반환."""
    vectorized_ids = set(db.scalars(select(TechDocVector.tech_doc_id.distinct())).all())
    docs = db.scalars(select(TechDoc).where(TechDoc.is_deleted.is_(False))).all()
    count = 0
    for doc in docs:
        if doc.id in vectorized_ids:
            continue
        try:
            if vectorize_tech_doc(doc.id, db, commit=True):
                count += 1
        except Exception as e:
            print(f"[WARN] TechDoc vector {doc.id} failed: {e}")
            try:
                db.rollback()
            except Exception:
                pass
    return count


def is_backfill_running() -> bool:
    return _backfill_running


def schedule_vectorize_tech_doc(tech_doc_id: int) -> None:
    """기록문서 생성/수정 후 백그라운드 스레드로 즉시 1회 임베딩."""
    def _run():
        from app.db.session import SessionLocal
        _db = SessionLocal()
        try:
            vectorize_tech_doc(tech_doc_id, _db)
        except Exception as e:
            print(f"[WARN] TechDoc auto-vectorize {tech_doc_id} failed: {e}")
        finally:
            _db.close()
    threading.Thread(target=_run, daemon=True).start()


def search_tech_docs_by_vector(
    db: Session,
    query: str,
    top_k: int = 30,
    min_similarity: float = _MIN_SIMILARITY,
    query_vec=None,
) -> list[tuple[int, float, str]]:
    """자연어 쿼리로 유사 기록문서 검색. [(tech_doc_id, score, chunk_text), ...] 반환."""
    encoder = _get_encoder_for_model(_MODEL)
    if query_vec is None:
        query_vec = encoder(query)
    q_str = "[" + ",".join(str(round(float(v), 6)) for v in query_vec) + "]"
    try:
        from sqlalchemy import text
        with db.begin_nested():
            rows = db.execute(text(
                "SELECT tech_doc_id, chunk_text, embedding <=> CAST(:q AS vector) AS dist "
                "FROM skywatch_tech_doc_vectors WHERE embedding IS NOT NULL "
                "ORDER BY dist ASC LIMIT :k"
            ), {"q": q_str, "k": top_k}).fetchall()
        scored = [(doc_id, max(0.0, 1.0 - float(d)), c or "") for doc_id, c, d in rows]
        return [r for r in scored if r[1] >= min_similarity]
    except Exception as e:
        print(f"[WARN] TechDoc pgvector search failed: {e}")
        return _search_python(db, query_vec, top_k, min_similarity)


def _search_python(db: Session, query_vec, top_k: int, min_sim: float) -> list[tuple[int, float, str]]:
    best: dict[int, tuple[float, str]] = {}
    for tv in db.scalars(select(TechDocVector)).all():
        if tv.embedding is None:
            continue
        try:
            vec = np.array(tv.embedding, dtype=np.float32)
            score = float(np.dot(query_vec, vec))
        except Exception:
            continue
        if score >= min_sim and (tv.tech_doc_id not in best or score > best[tv.tech_doc_id][0]):
            best[tv.tech_doc_id] = (score, tv.chunk_text or "")
    return sorted([(d, s, c) for d, (s, c) in best.items()], key=lambda x: x[1], reverse=True)[:top_k]
