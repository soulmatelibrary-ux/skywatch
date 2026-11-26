"""SkyNet 수집 문서/게시판 KURE-v1 자연어 벡터 검색 서비스."""
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.vector_model import _get_encoder_for_model

_MODEL = "kure-v1"
_MIN_SIMILARITY = 0.40


def search_skynet_by_vector(
    db: Session,
    query: str,
    limit: int = 30,
    min_similarity: float = _MIN_SIMILARITY,
    query_vec=None,
) -> list[dict]:
    """KURE-v1 벡터 유사도로 SkyNet 문서/게시판 검색.

    numpy 행렬 연산으로 전체 청크 대비 cosine similarity를 일괄 계산하고,
    source별 최고 유사도를 집계하여 상위 K개를 반환한다.
    """
    if query_vec is None:
        encoder = _get_encoder_for_model(_MODEL)
        query_vec = encoder(query)

    rows = db.execute(
        text(
            "SELECT source_type, source_id, kure_embedding "
            "FROM crawl_text_chunks "
            "WHERE kure_model_name = :m AND kure_embedding IS NOT NULL"
        ),
        {"m": _MODEL},
    ).fetchall()

    if not rows:
        return []

    # 행렬 연산으로 일괄 유사도 계산
    source_keys: list[tuple[str, int]] = []
    embeddings: list[np.ndarray] = []
    for source_type, source_id, raw in rows:
        try:
            vec = np.frombuffer(bytes(raw), dtype=np.float32)
            if vec.shape[0] != query_vec.shape[0]:
                continue
            embeddings.append(vec)
            source_keys.append((source_type, source_id))
        except Exception:
            continue

    if not embeddings:
        return []

    matrix = np.vstack(embeddings)
    scores = matrix @ query_vec  # 정규화된 벡터이므로 dot product = cosine similarity

    # source별 최고 유사도 집계
    best: dict[tuple, float] = {}
    for i, score_val in enumerate(scores):
        key = source_keys[i]
        s = float(score_val)
        if key not in best or s > best[key]:
            best[key] = s

    hits = sorted(
        [(k, s) for k, s in best.items() if s >= min_similarity],
        key=lambda x: x[1], reverse=True,
    )[:limit]
    if not hits:
        return []

    doc_ids = [sid for (st, sid), _ in hits if st == "document"]
    board_ids = [sid for (st, sid), _ in hits if st == "board"]

    # 파라미터 바인딩으로 SQL 인젝션 방지
    doc_map: dict[int, dict] = {}
    if doc_ids:
        for r in db.execute(text(
            "SELECT id, title, reg_date, dept_name, charger_nm, aprv_nm, "
            "matched_keyword, detail_url, is_locked, doc_number, reg_number "
            "FROM crawl_documents WHERE id = ANY(:ids)"
        ), {"ids": doc_ids}).fetchall():
            flow = ""
            if r.reg_number and r.doc_number:
                flow = "생산" if r.reg_number == r.doc_number else "접수"
            doc_map[r.id] = {
                "kind": "document", "id": r.id, "title": r.title, "reg_date": r.reg_date,
                "source_dept": r.dept_name, "charger_nm": r.charger_nm, "aprv_nm": r.aprv_nm,
                "matched_keyword": r.matched_keyword, "detail_url": r.detail_url,
                "is_locked": r.is_locked, "doc_number": r.doc_number,
                "reg_number": r.reg_number, "flow_type": flow,
            }

    board_map: dict[int, dict] = {}
    if board_ids:
        for r in db.execute(text(
            "SELECT id, title, reg_dt, brd_name, author, atcl_id "
            "FROM crawl_board_posts WHERE id = ANY(:ids)"
        ), {"ids": board_ids}).fetchall():
            board_map[r.id] = {
                "kind": "board", "id": r.id, "title": r.title, "reg_date": r.reg_dt,
                "source_dept": f"게시판 / {r.brd_name or ''}", "charger_nm": r.author,
                "aprv_nm": "", "matched_keyword": None, "detail_url": "",
                "is_locked": 0, "doc_number": "", "reg_number": r.atcl_id, "flow_type": "",
            }

    results = []
    for (st, sid), score in hits:
        meta = doc_map.get(sid) if st == "document" else board_map.get(sid)
        if meta:
            results.append({**meta, "_score": round(score, 4)})
    return results
