"""카드 레벨 벡터 임베딩 및 검색 서비스 (KURE-v1 기반)."""
import threading
import numpy as np
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.models.log import LogCard, CardVector
from app.services.vector_model import (
    AVAILABLE_MODELS,
    _get_encoder_for_model,
    _normalize_text,
    chunk_text,
    get_current_model_name,
)
from app.services.vector_service import _pgvector_column_ready, vector_index_scope

_DEFAULT_CARD_MODEL = "kure-v1"
_CARD_HAS_PGVEC: bool | None = None


def _card_pgvector_ready(db: Session) -> bool:
    """카드 벡터 테이블의 embedding_vector 컬럼 존재 여부 (캐시)."""
    global _CARD_HAS_PGVEC
    if _CARD_HAS_PGVEC is None:
        _CARD_HAS_PGVEC = _pgvector_column_ready(db, "skywatch_card_vectors")
    return _CARD_HAS_PGVEC


def build_card_text(card: LogCard) -> str:
    """카드 제목 + 내용 텍스트 조합 (도메인 동의어 확장 포함)."""
    from app.services.synonym_service import expand_text
    parts = []
    if card.title:
        parts.append(card.title)
    if card.content:
        parts.append(_normalize_text(card.content))
    raw = "\n".join(p for p in parts if p)
    return expand_text(raw)


def vectorize_card(card_id: int, db: Session, model_name: str = None, commit: bool = True) -> int:
    """카드를 벡터화하여 CardVector에 저장."""
    if model_name is None:
        model_name = _DEFAULT_CARD_MODEL

    card = db.scalar(select(LogCard).where(LogCard.id == card_id))
    if not card or card.is_deleted:
        return 0

    card_text = build_card_text(card)
    chunks = chunk_text(card_text, max_chars=900, overlap=120)
    if not chunks:
        return 0

    db.execute(delete(CardVector).where(
        CardVector.card_id == card_id,
        CardVector.model_name == model_name
    ))

    encoder = _get_encoder_for_model(model_name)

    chunk_count = 0
    use_pgvec = _card_pgvector_ready(db)
    for chunk_no, chunk in enumerate(chunks):
        embedding = encoder(chunk)
        embedding_bytes = embedding.astype(np.float32).tobytes()

        vector = CardVector(
            card_id=card_id,
            chunk_no=chunk_no,
            chunk_text=chunk,
            embedding=embedding_bytes,
            model_name=model_name,
        )
        if use_pgvec and hasattr(vector, 'embedding_vector') and embedding.shape[0] == 1024:
            vector.embedding_vector = embedding.astype(np.float32).tolist()

        db.add(vector)
        chunk_count += 1

    if commit:
        db.commit()
    return chunk_count


def backfill_card_vectors(db: Session, model_name: str = None, batch_size: int = 50) -> dict:
    """미벡터화 카드 일괄 벡터화."""
    if model_name is None:
        model_name = _DEFAULT_CARD_MODEL

    vectorized_card_ids = set(db.scalars(
        select(CardVector.card_id.distinct())
    ).all())

    all_cards = db.scalars(
        select(LogCard).where(LogCard.is_deleted == False)
    ).all()
    unvectorized = [c for c in all_cards if c.id not in vectorized_card_ids]

    total_processed = 0
    total_chunks = 0

    for i in range(0, len(unvectorized), batch_size):
        batch = unvectorized[i:i+batch_size]
        for card in batch:
            try:
                chunk_count = vectorize_card(card.id, db, model_name=model_name, commit=True)
                total_chunks += chunk_count
                total_processed += 1
            except Exception as e:
                print(f"[WARN] Card backfill failed for card {card.id}: {e}")
                try:
                    db.rollback()
                except Exception:
                    pass

    return {
        "total": len(unvectorized),
        "processed": total_processed,
        "chunks": total_chunks,
    }


def schedule_vectorize_card(card_id: int) -> None:
    """카드 생성/수정 후 백그라운드 스레드로 즉시 1회 임베딩."""
    def _run():
        from app.db.session import SessionLocal
        _db = SessionLocal()
        try:
            vectorize_card(card_id, _db, commit=True)
        except Exception as e:
            print(f"[WARN] schedule_vectorize_card failed for card {card_id}: {e}")
        finally:
            _db.close()
    threading.Thread(target=_run, daemon=True).start()


def vectorize_pending_cards(db: Session) -> int:
    """신규·수정된 카드를 배치 벡터화. updated_at 기준 미반영 카드만 처리."""
    subq = (
        select(CardVector.card_id, func.max(CardVector.updated_at).label("last_vec"))
        .group_by(CardVector.card_id)
        .subquery()
    )
    pending = db.scalars(
        select(LogCard)
        .outerjoin(subq, LogCard.id == subq.c.card_id)
        .where(
            LogCard.is_deleted.is_(False),
            or_(
                subq.c.last_vec.is_(None),
                LogCard.updated_at > subq.c.last_vec,
            ),
        )
    ).all()
    count = 0
    for card in pending:
        try:
            vectorize_card(card.id, db, commit=True)
            count += 1
        except Exception as e:
            print(f"[WARN] Batch card vectorization failed for card {card.id}: {e}")
            try:
                db.rollback()
            except Exception:
                pass
    return count


def backfill_pgvector_card_column(db: Session) -> int:
    """embedding(BYTEA)에서 embedding_vector(vector) 컬럼을 백필. NULL인 rows만 처리."""
    from sqlalchemy import text
    if not _pgvector_column_ready(db, "skywatch_card_vectors"):
        return 0
    try:
        rows = db.execute(text(
            "SELECT id, embedding FROM skywatch_card_vectors "
            "WHERE embedding_vector IS NULL AND embedding IS NOT NULL"
        )).fetchall()
    except Exception as e:
        print(f"[WARN] backfill_pgvector_card_column 조회 실패: {e}")
        return 0

    count = 0
    for row_id, emb_bytes in rows:
        try:
            arr = np.frombuffer(bytes(emb_bytes), dtype=np.float32)
            if arr.shape[0] != 1024:
                continue
            vec_str = "[" + ",".join(str(round(float(v), 6)) for v in arr) + "]"
            db.execute(text(
                "UPDATE skywatch_card_vectors SET embedding_vector = CAST(:v AS vector) WHERE id = :id"
            ), {"v": vec_str, "id": row_id})
            count += 1
            if count % 200 == 0:
                db.commit()
        except Exception:
            pass

    if count > 0:
        try:
            db.commit()
        except Exception as e:
            print(f"[WARN] backfill_pgvector_card_column 최종 커밋 실패: {e}")
    return count


def search_cards_by_vector(
    db: Session,
    query: str,
    model_name: str = None,
    top_k: int = 30,
    query_vec=None,
) -> list[tuple[int, float, str]]:
    """쿼리와 유사한 상위 K개 카드 검색.

    Returns:
        [(card_id, score, chunk_text), ...]
    """
    if model_name is None:
        model_name = _DEFAULT_CARD_MODEL

    if query_vec is None:
        encoder = _get_encoder_for_model(model_name)
        query_vec = encoder(query)

    if _card_pgvector_ready(db):
        return _search_pgvector(db, query_vec, model_name, top_k)
    return _search_python(db, query_vec, model_name, top_k)


def _search_pgvector(
    db: Session, query_vec: np.ndarray, model_name: str, top_k: int,
    min_similarity: float = 0.45,
) -> list[tuple[int, float, str]]:
    from sqlalchemy import text
    query_str = "[" + ",".join(str(round(float(v), 6)) for v in query_vec) + "]"
    # 카드는 대부분 청크 1개(약 1.02개/건)라 20% 여유분이면 충분 (ef_search 상한 1000)
    inner_k = min(1000, top_k + top_k // 5)
    try:
        with vector_index_scope(db, inner_k):
            # 거리순 상위 청크 → 카드별 첫 행(최고 유사도)만 사용. HNSW 인덱스가 있으면 인덱스 탐색.
            # 주의: DISTINCT ON (card_id) + LIMIT 조합은 card_id 순서로 잘려 일부 카드만 검색됨.
            rows = db.execute(text(
                "SELECT card_id, chunk_text, 1 - (embedding_vector <=> CAST(:q AS vector)) AS score "
                "FROM skywatch_card_vectors "
                "WHERE model_name = :m AND embedding_vector IS NOT NULL "
                "ORDER BY embedding_vector <=> CAST(:q AS vector) "
                "LIMIT :inner_k"
            ), {"q": query_str, "m": model_name, "inner_k": inner_k}).fetchall()
        best: dict[int, tuple[int, float, str]] = {}
        for card_id, chunk, score in rows:
            if float(score) < min_similarity:
                break
            best.setdefault(card_id, (card_id, float(score), chunk))
        return list(best.values())[:top_k]
    except Exception as e:
        print(f"[WARN] pgvector card search failed: {e}, falling back to Python")
        return _search_python(db, query_vec, model_name, top_k)


def _search_python(db: Session, query_vec: np.ndarray, model_name: str, top_k: int) -> list[tuple[int, float, str]]:
    vectors = db.scalars(
        select(CardVector).where(CardVector.model_name == model_name)
    ).all()

    card_scores: dict[int, tuple[float, str]] = {}
    for vector in vectors:
        try:
            chunk_vec = np.frombuffer(vector.embedding, dtype=np.float32)
        except (TypeError, ValueError):
            continue
        score = float(np.dot(query_vec, chunk_vec))
        if vector.card_id not in card_scores or score > card_scores[vector.card_id][0]:
            card_scores[vector.card_id] = (score, vector.chunk_text)

    return sorted(
        [(cid, score, chunk) for cid, (score, chunk) in card_scores.items()],
        key=lambda x: x[1],
        reverse=True
    )[:top_k]
