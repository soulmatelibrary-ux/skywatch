"""SkyNet 수집 문서/게시판 KURE-v1 임베딩 저장 및 backfill 서비스."""
import threading

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.vector_model import _normalize_text, chunk_text, encode_texts
from app.services.synonym_service import expand_text

_MODEL = "kure-v1"
_backfill_lock = threading.Lock()
_backfill_running = False


def _upsert_chunks(db: Session, source_type: str, source_id: int, chunks: list[str]) -> int:
    """청크를 KURE-v1로 임베딩하여 crawl_text_chunks에 저장 (BYTEA)."""
    if not chunks:
        return 0
    vectors = encode_texts(chunks, model_name=_MODEL)
    db.execute(
        text("DELETE FROM crawl_text_chunks WHERE source_type=:st AND source_id=:sid AND kure_model_name=:m"),
        {"st": source_type, "sid": source_id, "m": _MODEL},
    )
    for chunk_no, (chunk, vec) in enumerate(zip(chunks, vectors)):
        db.execute(
            text("""
                INSERT INTO crawl_text_chunks
                    (source_type, source_id, chunk_no, chunk_text,
                     embedding_json, embedding_dim, model_name,
                     kure_embedding, kure_model_name)
                VALUES (:st, :sid, :cn, :ct, '[]'::jsonb, 1024, :mn, :ke, :km)
            """),
            {"st": source_type, "sid": source_id, "cn": chunk_no, "ct": chunk,
             "mn": _MODEL, "ke": vec.astype(np.float32).tobytes(), "km": _MODEL},
        )
    db.commit()
    return len(chunks)


def vectorize_document(db: Session, doc_id: int) -> int:
    """단일 문서 임베딩 저장. 제목+키워드+부서+본문 포함. 청크 수 반환."""
    row = db.execute(
        text("SELECT title, matched_keyword, dept_name, memo FROM crawl_documents WHERE id=:id AND is_hidden=0"),
        {"id": doc_id},
    ).fetchone()
    if not row:
        return 0
    full_text = " ".join(p for p in [row.title, row.matched_keyword, row.dept_name, row.memo] if p)
    full_text = expand_text(_normalize_text(full_text))
    return _upsert_chunks(db, "document", doc_id, chunk_text(full_text))


def vectorize_board_post(db: Session, post_id: int) -> int:
    """단일 게시판 글 임베딩 저장. 청크 수 반환."""
    row = db.execute(
        text("SELECT title, body_text, brd_name FROM crawl_board_posts WHERE id=:id"),
        {"id": post_id},
    ).fetchone()
    if not row:
        return 0
    full_text = " ".join(p for p in [row.title, row.body_text, row.brd_name] if p)
    full_text = expand_text(_normalize_text(full_text))
    return _upsert_chunks(db, "board", post_id, chunk_text(full_text))


def get_vector_coverage(db: Session) -> dict:
    """벡터화 진행률 통계 반환."""
    doc_total   = db.execute(text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden=0")).scalar() or 0
    doc_done    = db.execute(text("SELECT COUNT(DISTINCT source_id) FROM crawl_text_chunks WHERE source_type='document' AND kure_model_name=:m"), {"m": _MODEL}).scalar() or 0
    board_total = db.execute(text("SELECT COUNT(*) FROM crawl_board_posts")).scalar() or 0
    board_done  = db.execute(text("SELECT COUNT(DISTINCT source_id) FROM crawl_text_chunks WHERE source_type='board' AND kure_model_name=:m"), {"m": _MODEL}).scalar() or 0
    return {
        "docs_total": int(doc_total), "docs_vectorized": int(doc_done),
        "board_total": int(board_total), "board_vectorized": int(board_done),
        "model": _MODEL, "running": _backfill_running,
    }


def _run_backfill(db_factory, batch_size: int):
    global _backfill_running
    db: Session | None = None
    try:
        db = db_factory()
        for kind, fn, sql in [
            ("document", vectorize_document,
             "SELECT d.id FROM crawl_documents d WHERE d.is_hidden=0 AND NOT EXISTS "
             "(SELECT 1 FROM crawl_text_chunks c WHERE c.source_type='document' AND c.source_id=d.id AND c.kure_model_name=:m)"),
            ("board", vectorize_board_post,
             "SELECT b.id FROM crawl_board_posts b WHERE NOT EXISTS "
             "(SELECT 1 FROM crawl_text_chunks c WHERE c.source_type='board' AND c.source_id=b.id AND c.kure_model_name=:m)"),
        ]:
            rows = db.execute(text(sql), {"m": _MODEL}).fetchall()
            for i in range(0, len(rows), batch_size):
                for (rid,) in rows[i:i + batch_size]:
                    try:
                        fn(db, rid)
                    except Exception as e:
                        print(f"[WARN] skynet vector {kind} {rid} failed: {e}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
    except Exception as e:
        print(f"[ERROR] skynet backfill: {e}")
    finally:
        _backfill_running = False
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


def start_backfill(db_factory, batch_size: int = 50) -> bool:
    """백그라운드 스레드로 backfill 시작. 이미 실행 중이면 False."""
    global _backfill_running
    with _backfill_lock:
        if _backfill_running:
            return False
        _backfill_running = True
    threading.Thread(target=_run_backfill, args=(db_factory, batch_size), daemon=True).start()
    return True
