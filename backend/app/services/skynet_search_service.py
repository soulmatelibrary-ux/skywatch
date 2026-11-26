# SkyNet 통합 검색 서비스 — 문서 + 게시판 UNION 검색 (& AND, ! 제외)
from sqlalchemy.orm import Session
from sqlalchemy import text


def _parse_q(q: str):
    tokens = [t.strip() for t in q.split('&') if t.strip()]
    return (
        [t for t in tokens if not t.startswith('!')],
        [t[1:] for t in tokens if t.startswith('!') and len(t) > 1],
    )


def _doc_where(inc: list, exc: list, p: dict) -> str:
    fields = ['title', 'reg_number', 'doc_number', 'charger_nm', 'dept_name', 'aprv_nm', 'memo']
    conds = ['is_hidden = 0']
    for i, kw in enumerate(inc):
        k = f'di{i}'
        conds.append(f"({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        p[k] = f'%{kw}%'
    for i, kw in enumerate(exc):
        k = f'de{i}'
        conds.append(f"NOT ({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        p[k] = f'%{kw}%'
    return ' AND '.join(conds)


def _board_where(inc: list, exc: list, p: dict) -> str:
    fields = ['title', 'author', 'brd_name', 'body_text']
    conds = ['1=1']
    for i, kw in enumerate(inc):
        k = f'bi{i}'
        conds.append(f"({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        p[k] = f'%{kw}%'
    for i, kw in enumerate(exc):
        k = f'be{i}'
        conds.append(f"NOT ({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        p[k] = f'%{kw}%'
    return ' AND '.join(conds)


def search_unified(db: Session, q: str = '', page: int = 1, size: int = 50):
    inc, exc = _parse_q(q)
    params: dict = {}
    dw = _doc_where(inc, exc, params)
    bw = _board_where(inc, exc, params)

    union_sql = f"""
        SELECT 'document' AS kind,
               id, title, reg_date, dept_name AS source_dept,
               charger_nm, aprv_nm, matched_keyword,
               detail_url, is_locked,
               doc_number, reg_number,
               CASE WHEN COALESCE(TRIM(reg_number),'') <> ''
                    AND TRIM(reg_number) = TRIM(doc_number)
                    THEN '생산' ELSE '접수' END AS flow_type,
               COALESCE(reg_date, '') AS sort_dt
        FROM crawl_documents WHERE {dw}
        UNION ALL
        SELECT 'board' AS kind,
               id, title, reg_dt AS reg_date,
               ('게시판 / ' || COALESCE(brd_name, '')) AS source_dept,
               author AS charger_nm, '' AS aprv_nm, matched_keyword,
               '' AS detail_url, 0 AS is_locked,
               '' AS doc_number, atcl_id AS reg_number,
               '' AS flow_type,
               COALESCE(reg_dt, '') AS sort_dt
        FROM crawl_board_posts WHERE {bw}
    """

    # CTE로 UNION을 1회만 실행하여 COUNT + 페이징 동시 처리
    page_params = {**params, 'limit': size, 'offset': (page - 1) * size}
    rows = db.execute(
        text(f"""
            WITH combined AS ({union_sql})
            SELECT *, COUNT(*) OVER() AS _total
            FROM combined
            ORDER BY sort_dt DESC
            LIMIT :limit OFFSET :offset
        """),
        page_params,
    ).mappings().all()

    if rows:
        total = int(rows[0]['_total'])
        items = [{k: v for k, v in dict(r).items() if k != '_total'} for r in rows]
    else:
        total = 0
        items = []

    return items, total


def search_unified_with_semantic(
    db: Session,
    q: str = '',
    page: int = 1,
    size: int = 50,
    query_vec=None,
) -> tuple[list[dict], int]:
    """벡터 유사도 + 키워드 검색 병합 (중복 제거, score 기준 정렬)."""
    from app.services import skynet_vector_search

    try:
        vec_hits = skynet_vector_search.search_skynet_by_vector(db, q, limit=50, query_vec=query_vec)
    except Exception as e:
        print(f"[WARN] SkyNet vector search failed: {e}")
        vec_hits = []

    seen: set[tuple] = set()
    merged: list[dict] = []

    for item in vec_hits:
        key = (item["kind"], item.get("reg_number") or item.get("doc_number") or "")
        if key not in seen:
            seen.add(key)
            badge = "게시판" if item["kind"] == "board" else ("수집 목록" if item.get("matched_keyword") else "전체문서")
            badge_kind = "board" if item["kind"] == "board" else ("crawl" if item.get("matched_keyword") else "all")
            merged.append({**item, "badge": badge, "badge_kind": badge_kind})

    # 키워드 검색 결과도 병합 (벡터에서 못 찾은 것 보완)
    try:
        kw_items, _ = search_unified(db, q=q, page=1, size=100)
    except Exception as e:
        print(f"[WARN] SkyNet keyword search failed: {e}")
        kw_items = []

    for item in kw_items:
        key = (item["kind"], item.get("reg_number") or item.get("doc_number") or "")
        if key not in seen:
            seen.add(key)
            badge = "게시판" if item["kind"] == "board" else ("수집 목록" if item.get("matched_keyword") else "전체문서")
            badge_kind = "board" if item["kind"] == "board" else ("crawl" if item.get("matched_keyword") else "all")
            # 키워드 매칭 결과에도 기본 score 부여 (벡터 결과보다 약간 낮게)
            merged.append({**item, "badge": badge, "badge_kind": badge_kind, "_score": 0.35})

    total = len(merged)
    offset = (page - 1) * size
    return merged[offset:offset + size], total
