"""문의사항 KURE-v1 임베딩 저장 및 자연어 검색 서비스 (skywatch_inquiry_vectors 활용)."""
import threading

import numpy as np
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.models.inquiry import Inquiry, InquiryVector
from app.services.vector_model import _normalize_text, chunk_text, _get_encoder_for_model

_MODEL = "kure-v1"
_MIN_SIMILARITY = 0.45
_backfill_lock = threading.Lock()
_backfill_running = False


def _build_inquiry_text(row) -> str:
    parts = []
    if getattr(row, 'inquiry_no', None):
        parts.append(f"문의번호: {row.inquiry_no}")
    if getattr(row, 'category', None):
        parts.append(f"카테고리: {row.category}")
    if getattr(row, 'keyword', None):
        parts.append(f"키워드: {row.keyword}")
    if getattr(row, 'controller_sector', None):
        parts.append(f"관제분야: {row.controller_sector}")
    if getattr(row, 'content', None):
        parts.append(_normalize_text(row.content))
    if getattr(row, 'note', None):
        parts.append(f"비고: {_normalize_text(row.note)}")
    return "\n".join(p for p in parts if p)


def vectorize_inquiry(db: Session, inquiry_id: int) -> int:
    """단일 문의사항 임베딩. 저장된 청크 수 반환."""
    row = db.scalar(
        select(Inquiry).where(Inquiry.id == inquiry_id, Inquiry.is_deleted.is_(False))
    )
    if not row:
        return 0
    full_text = _build_inquiry_text(row)
    if not full_text.strip():
        return 0

    chunks = chunk_text(full_text)
    if not chunks:
        return 0

    db.execute(delete(InquiryVector).where(InquiryVector.inquiry_id == inquiry_id))
    encoder = _get_encoder_for_model(_MODEL)
    for idx, chunk in enumerate(chunks):
        vec = encoder(chunk).astype(np.float32).tolist()
        db.add(InquiryVector(inquiry_id=inquiry_id, chunk_index=idx, chunk_text=chunk, embedding=vec))
    db.commit()
    return len(chunks)


def is_backfill_running() -> bool:
    return _backfill_running


def vectorize_pending_inquiries(db: Session) -> int:
    """미벡터화 또는 수정된 문의사항 배치 처리. 처리된 건수 반환."""
    inquiries = db.execute(
        text("SELECT id, updated_at FROM skywatch_inquiries WHERE is_deleted=FALSE ORDER BY id")
    ).fetchall()
    if not inquiries:
        return 0

    vectorized = {
        row[0]: row[1]
        for row in db.execute(
            text("""
                SELECT inquiry_id, MAX(created_at)
                FROM skywatch_inquiry_vectors
                GROUP BY inquiry_id
            """)
        ).fetchall()
    }

    count = 0
    for inq_id, updated_at in inquiries:
        last_vec = vectorized.get(inq_id)
        if last_vec is not None and updated_at is not None and updated_at <= last_vec:
            continue
        try:
            n = vectorize_inquiry(db, inq_id)
            if n:
                count += 1
        except Exception as e:
            print(f"[WARN] inquiry vector {inq_id} failed: {e}")
            try:
                db.rollback()
            except Exception:
                pass
    return count


def schedule_vectorize_inquiry(inquiry_id: int) -> None:
    """문의사항 생성/수정 후 백그라운드 스레드로 즉시 1회 임베딩."""
    def _run():
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            vectorize_inquiry(db, inquiry_id)
        except Exception as e:
            print(f"[WARN] inquiry auto-vectorize {inquiry_id} failed: {e}")
        finally:
            db.close()
    threading.Thread(target=_run, daemon=True).start()


def search_inquiries_by_vector(
    db: Session,
    query: str,
    top_k: int = 50,
    min_similarity: float = _MIN_SIMILARITY,
    query_vec=None,
) -> list[tuple[int, float]]:
    """자연어 쿼리로 유사 문의사항 검색. [(inquiry_id, score), ...] 반환."""
    encoder = _get_encoder_for_model(_MODEL)
    if query_vec is None:
        query_vec = encoder(query)

    q_str = "[" + ",".join(str(round(float(v), 6)) for v in query_vec) + "]"
    try:
        rows = db.execute(
            text(
                "SELECT inquiry_id, chunk_text, embedding <=> CAST(:q AS vector) AS dist "
                "FROM skywatch_inquiry_vectors WHERE embedding IS NOT NULL "
                "ORDER BY dist ASC LIMIT :k"
            ),
            {"q": q_str, "k": top_k},
        ).fetchall()
        best: dict[int, float] = {}
        for inq_id, _, dist in rows:
            score = max(0.0, 1.0 - float(dist))
            if score >= min_similarity and (inq_id not in best or score > best[inq_id]):
                best[inq_id] = score
        return sorted(best.items(), key=lambda x: x[1], reverse=True)[:top_k]
    except Exception as e:
        print(f"[WARN] Inquiry pgvector search failed, fallback: {e}")
        return _search_python(db, query_vec, top_k, min_similarity)


def _search_python(db: Session, query_vec, top_k: int, min_sim: float) -> list[tuple[int, float]]:
    from app.models.inquiry import InquiryVector as IV
    best: dict[int, float] = {}
    for iv in db.scalars(select(IV)).all():
        if iv.embedding is None:
            continue
        try:
            vec = np.array(iv.embedding, dtype=np.float32)
            score = float(np.dot(query_vec, vec))
        except Exception:
            continue
        if score >= min_sim and (iv.inquiry_id not in best or score > best[iv.inquiry_id]):
            best[iv.inquiry_id] = score
    return sorted(best.items(), key=lambda x: x[1], reverse=True)[:top_k]
