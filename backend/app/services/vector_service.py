"""일지 레벨 벡터 임베딩 및 자연어 검색 서비스 (KURE-v1 기반)."""
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

import numpy as np
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.models.config import Config, ReindexJob
from app.models.log import Log, LogCard, LogVector
from app.services.vector_model import (
    AVAILABLE_MODELS,
    _normalize_text,
    chunk_text,
    encode_texts,
    get_available_models,
    get_current_model_name as _model_get_current,
    warmup_model as _warmup,
)

_DEFAULT_MIN_SIMILARITY = 0.45
_HAS_EMB_COLUMN: bool | None = None


def _pgvector_column_ready(db: Session, table_name: str, expected_dim: int = 1024) -> bool:
    """embedding_vector 컬럼이 존재하는지 pg_catalog 직접 조회로 확인."""
    from sqlalchemy import text
    try:
        with db.begin_nested():
            result = db.execute(text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_catalog.pg_attribute a
                    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relname = :table_name
                      AND a.attname = 'embedding_vector'
                      AND NOT a.attisdropped
                )
            """), {"table_name": table_name}).scalar()
        return bool(result)
    except Exception:
        return False


@contextmanager
def vector_index_scope(db: Session, limit: int):
    """벡터 인덱스(HNSW/ivfflat)를 쓰도록 설정한 세이브포인트 범위. 조회 전용.

    - hnsw.ef_search: LIMIT 이상이어야 함 (기본값 40이면 결과가 40건으로 잘림)
    - ivfflat.probes: HNSW 미지원 환경에서 ivfflat 인덱스 사용 시 재현율 확보 (기본값 1)
    - enable_seqscan/enable_sort off: 벡터가 TOAST 저장이라 플래너가 전체 스캔 비용을 과소평가해
      LIMIT이 크면 인덱스 대신 전체 스캔(수 초)을 고르므로 이 질의에 한해 인덱스 사용을 유도
    범위를 벗어나면 세이브포인트를 롤백해 설정을 원복한다 (같은 트랜잭션의 다른 질의에 영향 없음).
    설정 실패(미지원 버전 등) 시에도 검색은 계속 진행.
    """
    from sqlalchemy import text
    ef = min(1000, max(100, int(limit)))  # pgvector 허용 범위 1~1000
    scope = db.begin_nested()
    try:
        for stmt in (
            f"SET LOCAL hnsw.ef_search = {ef}",
            "SET LOCAL ivfflat.probes = 10",
            "SET LOCAL enable_seqscan = off",
            "SET LOCAL enable_sort = off",
        ):
            try:
                with db.begin_nested():
                    db.execute(text(stmt))
            except Exception:
                pass
        yield
    finally:
        scope.rollback()


def get_current_model_name(db: Session) -> str:
    return _model_get_current(db)


def warmup_model() -> None:
    _warmup()


def get_min_similarity(db: Session) -> float:
    config = db.scalar(select(Config).where(Config.setting_key == "vector_min_similarity"))
    if config and config.setting_value:
        try:
            return float(config.setting_value)
        except ValueError:
            pass
    return _DEFAULT_MIN_SIMILARITY


def _embedding_column_available(db: Session) -> bool:
    global _HAS_EMB_COLUMN
    if _HAS_EMB_COLUMN is None:
        try:
            from pgvector.sqlalchemy import Vector  # noqa: F401
            _HAS_EMB_COLUMN = _pgvector_column_ready(db, "skywatch_log_vectors")
        except Exception:
            _HAS_EMB_COLUMN = False
    return _HAS_EMB_COLUMN


def build_log_text(log: Log, db: Session) -> str:
    """일지 메타 + 전체 카드 텍스트 결합."""
    parts = []
    if log.title:
        parts.append(f"제목: {_normalize_text(log.title)}")
    if log.date:
        parts.append(f"날짜: {log.date}")
    if log.shift_type:
        parts.append(f"근무: {log.shift_type}")

    cards = db.scalars(
        select(LogCard)
        .where(LogCard.log_id == log.id, LogCard.is_deleted.is_(False))
        .order_by(LogCard.position)
    ).all()

    for card in cards:
        if card.title:
            parts.append(f"카드: {_normalize_text(card.title)}")
        if card.content:
            parts.append(_normalize_text(card.content))

    from app.services.synonym_service import expand_text
    raw = "\n".join(p for p in parts if p)
    return expand_text(raw)


def vectorize_log(log_id: int, db: Session, model_name: str | None = None, commit: bool = True) -> int:
    """일지를 벡터화하여 LogVector에 저장."""
    if model_name is None:
        model_name = get_current_model_name(db)

    log = db.scalar(select(Log).where(Log.id == log_id, Log.is_deleted.is_(False)))
    if not log:
        return 0

    full_text = build_log_text(log, db)
    chunks = chunk_text(full_text, max_chars=2000, overlap=200)
    if not chunks:
        return 0

    db.execute(delete(LogVector).where(LogVector.log_id == log_id))

    embeddings = encode_texts(chunks, model_name=model_name)
    use_pgvec = _embedding_column_available(db)

    chunk_count = 0
    for chunk_no, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        if not np.any(embedding):
            continue
        emb_bytes = embedding.astype(np.float32).tobytes()
        vec = LogVector(
            log_id=log_id,
            chunk_no=chunk_no,
            chunk_text=chunk,
            embedding=emb_bytes,
            model_name=model_name,
        )
        if use_pgvec and hasattr(vec, "embedding_vector") and embedding.shape[0] == 1024:
            vec.embedding_vector = embedding.astype(np.float32).tolist()
        db.add(vec)
        chunk_count += 1

    if commit:
        db.commit()
    return chunk_count


def vectorize_pending_logs(db: Session) -> int:
    """신규·수정된 일지를 배치 벡터화. updated_at 기준으로 미반영 일지만 처리."""
    subq = (
        select(LogVector.log_id, func.max(LogVector.updated_at).label("last_vec"))
        .group_by(LogVector.log_id)
        .subquery()
    )
    pending = db.scalars(
        select(Log)
        .outerjoin(subq, Log.id == subq.c.log_id)
        .where(
            Log.is_deleted.is_(False),
            or_(
                subq.c.last_vec.is_(None),
                Log.updated_at > subq.c.last_vec,
            ),
        )
    ).all()

    count = 0
    for log in pending:
        try:
            vectorize_log(log.id, db, commit=True)
            count += 1
        except Exception as e:
            print(f"[WARN] Batch vectorization failed for log {log.id}: {e}")
            try:
                db.rollback()
            except Exception:
                pass
    return count


def backfill_pgvector_log_column(db: Session) -> int:
    """embedding(BYTEA)에서 embedding_vector(vector) 컬럼을 백필. NULL인 rows만 처리."""
    from sqlalchemy import text
    if not _pgvector_column_ready(db, "skywatch_log_vectors"):
        return 0
    try:
        rows = db.execute(text(
            "SELECT id, embedding FROM skywatch_log_vectors "
            "WHERE embedding_vector IS NULL AND embedding IS NOT NULL"
        )).fetchall()
    except Exception as e:
        print(f"[WARN] backfill_pgvector_log_column 조회 실패: {e}")
        return 0

    count = 0
    for row_id, emb_bytes in rows:
        try:
            arr = np.frombuffer(bytes(emb_bytes), dtype=np.float32)
            if arr.shape[0] != 1024:
                continue
            vec_str = "[" + ",".join(str(round(float(v), 6)) for v in arr) + "]"
            db.execute(text(
                "UPDATE skywatch_log_vectors SET embedding_vector = CAST(:v AS vector) WHERE id = :id"
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
            print(f"[WARN] backfill_pgvector_log_column 최종 커밋 실패: {e}")
    return count


def schedule_vectorize_log(log_id: int) -> None:
    """일지 벡터화를 daemon 스레드로 비동기 실행."""
    def _run():
        from app.db.session import SessionLocal
        _db = SessionLocal()
        try:
            vectorize_log(log_id, _db, commit=True)
        except Exception as e:
            print(f"[WARN] schedule_vectorize_log failed for log {log_id}: {e}")
        finally:
            _db.close()
    threading.Thread(target=_run, daemon=True).start()


def search_logs_by_vector(
    db: Session,
    query: str,
    model_name: str | None = None,
    top_k: int = 30,
    min_similarity: float | None = None,
    query_vec=None,
) -> list[tuple[int, float, str]]:
    """쿼리와 유사한 상위 K개 일지 검색.

    Returns:
        [(log_id, score, chunk_text), ...]
    """
    if model_name is None:
        model_name = get_current_model_name(db)
    if min_similarity is None:
        min_similarity = get_min_similarity(db)

    if query_vec is None:
        vecs = encode_texts([query], model_name=model_name)
        if not vecs:
            return []
        query_vec = vecs[0]

    if _embedding_column_available(db):
        return _search_pgvector(db, query_vec, model_name, top_k, min_similarity)
    return _search_python(db, query_vec, model_name, top_k, min_similarity)


def _search_pgvector(
    db: Session,
    query_vec: np.ndarray,
    model_name: str,
    top_k: int,
    min_similarity: float,
) -> list[tuple[int, float, str]]:
    from sqlalchemy import text
    query_str = "[" + ",".join(str(round(float(v), 6)) for v in query_vec) + "]"
    inner_k = min(1000, top_k * 3)  # 일지 1건이 여러 청크로 나뉘므로 여유분 확보 (ef_search 상한 1000)
    try:
        with vector_index_scope(db, inner_k):
            # 거리순 상위 청크 → 일지별 첫 행(최고 유사도)만 사용. HNSW 인덱스가 있으면 인덱스 탐색.
            # 주의: DISTINCT ON (log_id) + LIMIT 조합은 log_id 순서로 잘려 일부 일지만 검색됨.
            rows = db.execute(text(
                "SELECT log_id, chunk_text, 1 - (embedding_vector <=> CAST(:q AS vector)) AS score "
                "FROM skywatch_log_vectors "
                "WHERE model_name = :m AND embedding_vector IS NOT NULL "
                "ORDER BY embedding_vector <=> CAST(:q AS vector) "
                "LIMIT :inner_k"
            ), {"q": query_str, "m": model_name, "inner_k": inner_k}).fetchall()
        best: dict[int, tuple[int, float, str]] = {}
        for log_id, chunk, score in rows:
            if float(score) < min_similarity:
                break
            best.setdefault(log_id, (log_id, float(score), chunk))
        return list(best.values())[:top_k]
    except Exception as e:
        print(f"[WARN] pgvector log search failed: {e}, falling back to Python")
        return _search_python(db, query_vec, model_name, top_k, min_similarity)


def _search_python(
    db: Session,
    query_vec: np.ndarray,
    model_name: str,
    top_k: int,
    min_similarity: float,
) -> list[tuple[int, float, str]]:
    vectors = db.scalars(select(LogVector).where(LogVector.model_name == model_name)).all()

    log_best: dict[int, tuple[float, str]] = {}
    for v in vectors:
        try:
            chunk_vec = np.frombuffer(v.embedding, dtype=np.float32)
        except (TypeError, ValueError):
            continue
        if chunk_vec.shape[0] != query_vec.shape[0]:
            continue
        score = float(np.dot(query_vec, chunk_vec))
        if score < min_similarity:
            continue
        if v.log_id not in log_best or score > log_best[v.log_id][0]:
            log_best[v.log_id] = (score, v.chunk_text)

    return sorted(
        [(lid, score, chunk) for lid, (score, chunk) in log_best.items()],
        key=lambda x: x[1],
        reverse=True,
    )[:top_k]


def get_latest_reindex_job(db: Session) -> dict | None:
    """가장 최근 재벡터화 작업 상태 반환. 1시간 이상 running인 작업은 자동 실패 처리."""
    from datetime import timedelta
    job = db.scalar(select(ReindexJob).order_by(ReindexJob.created_at.desc()))
    if not job:
        return None
    if job.status == "running" and job.started_at:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        started = job.started_at if job.started_at.tzinfo else job.started_at.replace(tzinfo=timezone.utc)
        if started < cutoff:
            job.status = "failed"
            job.error_message = "1시간 초과로 자동 취소됨"
            db.commit()
    return {
        "job_id": job.job_id,
        "model": job.model_name,
        "status": job.status,
        "total": job.total_logs or 0,
        "processed": job.processed_logs or 0,
        "progress": job.progress_percent or 0,
        "error": job.error_message,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


def get_reindex_job_status(db: Session, job_id: str) -> dict | None:
    job = db.scalar(select(ReindexJob).where(ReindexJob.job_id == job_id))
    if not job:
        return None
    return {
        "job_id": job.job_id,
        "model_name": job.model_name,
        "status": job.status,
        "total": job.total_logs or 0,
        "processed": job.processed_logs or 0,
        "progress": job.progress_percent or 0,
        "error": job.error_message,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


def reindex_all_logs(model_name: str, job_id: str) -> None:
    """모든 일지 재벡터화 (배경 스레드에서 실행)."""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        job = db.scalar(select(ReindexJob).where(ReindexJob.job_id == job_id))
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        all_logs = db.scalars(select(Log).where(Log.is_deleted.is_(False))).all()
        job.total_logs = len(all_logs)
        db.commit()

        for i, log in enumerate(all_logs):
            try:
                vectorize_log(log.id, db, model_name=model_name, commit=True)
            except Exception as e:
                print(f"[WARN] Reindex failed for log {log.id}: {e}")
                try:
                    db.rollback()
                except Exception:
                    pass
            job.processed_logs = i + 1
            job.progress_percent = int((i + 1) / len(all_logs) * 100) if all_logs else 100
            db.commit()

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        print(f"[ERROR] Reindex job {job_id} failed: {e}")
        try:
            job = db.scalar(select(ReindexJob).where(ReindexJob.job_id == job_id))
            if job:
                job.status = "failed"
                job.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
