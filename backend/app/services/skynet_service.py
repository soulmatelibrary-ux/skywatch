# SkyNet 서비스 — crawl_* 테이블 조회 (기존 DB 세션 재사용)
import json
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_documents(db: Session, q: str = '', year: str = '',
                  source_dept: str = '', keyword_only: bool = False,
                  page: int = 1, size: int = 20):
    tokens = [t.strip() for t in q.split('&') if t.strip()] if q else []
    inc = [t for t in tokens if not t.startswith('!')]
    exc = [t[1:] for t in tokens if t.startswith('!') and len(t) > 1]

    search_fields = ['title', 'reg_number', 'doc_number', 'charger_nm', 'dept_name', 'aprv_nm', 'memo']
    conditions = ['is_hidden = 0']
    params: dict = {}

    for i, kw in enumerate(inc):
        k = f'i{i}'
        conditions.append(f"({' OR '.join(f'{f} ILIKE :{k}' for f in search_fields)})")
        params[k] = f'%{kw}%'
    for i, kw in enumerate(exc):
        k = f'e{i}'
        conditions.append(f"NOT ({' OR '.join(f'{f} ILIKE :{k}' for f in search_fields)})")
        params[k] = f'%{kw}%'

    if source_dept:
        conditions.append("dept_name = :source_dept")
        params['source_dept'] = source_dept
    if year:
        conditions.append("LEFT(reg_date, 4) = :year")
        params['year'] = year
    if keyword_only:
        conditions.append("matched_keyword IS NOT NULL")

    where = ' AND '.join(conditions)
    page_params = {**params, 'limit': size, 'offset': (page - 1) * size}
    total = db.execute(text(f"SELECT COUNT(*) FROM crawl_documents WHERE {where}"), params).scalar() or 0
    rows = db.execute(text(f"""
        SELECT id, dept_name, doc_type, title, reg_date, reg_number, doc_number,
               detail_url, crawled_at, charger_nm, matched_keyword,
               aprv_nm, is_locked, COALESCE(recv_name, '') AS recv_name, COALESCE(memo, '') AS memo,
               CASE WHEN COALESCE(TRIM(reg_number),'') <> ''
                    AND TRIM(reg_number) = TRIM(doc_number)
                    THEN '생산' ELSE '접수' END AS flow_type
        FROM crawl_documents WHERE {where}
        ORDER BY reg_date DESC,
                 CASE WHEN reg_number ~ '-[0-9]+$'
                      THEN CAST(REGEXP_REPLACE(reg_number, '^.*-', '') AS INTEGER)
                      ELSE 0 END DESC,
                 id DESC
        LIMIT :limit OFFSET :offset
    """), page_params).mappings().all()
    return [dict(r) for r in rows], int(total)


def get_doc_stats(db: Session) -> dict:
    """대시보드용 문서 통계 — 키워드 검출 기준."""
    today = str(date.today())
    week_start = str(date.today() - timedelta(days=date.today().weekday()))
    total = db.execute(
        text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden = 0 AND matched_keyword IS NOT NULL")
    ).scalar() or 0
    total_all = db.execute(
        text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden = 0")
    ).scalar() or 0
    today_count = db.execute(
        text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden = 0 AND LEFT(crawled_at, 10) = :d"), {'d': today}
    ).scalar() or 0
    today_board = db.execute(
        text("SELECT COUNT(*) FROM crawl_board_posts WHERE LEFT(crawled_at, 10) = :d"), {'d': today}
    ).scalar() or 0
    week_count = db.execute(
        text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden = 0 AND LEFT(crawled_at, 10) >= :w"), {'w': week_start}
    ).scalar() or 0
    last_row = db.execute(
        text("SELECT value FROM crawl_session_store WHERE key = 'last_crawled_at'")
    ).fetchone()
    run_row = db.execute(
        text("SELECT value FROM crawl_session_store WHERE key = 'last_crawl_run'")
    ).fetchone()
    run_data: dict = {}
    if run_row and run_row[0]:
        try:
            run_data = json.loads(run_row[0])
        except Exception:
            pass
    return {
        'total': int(total),
        'total_all': int(total_all),
        'today': int(today_count),
        'today_board': int(today_board),
        'week': int(week_count),
        'last_crawled': last_row[0] if last_row else None,
        'last_run_at': run_data.get('ran_at'),
        'last_run_fetched': run_data.get('fetched'),
        'last_run_saved': run_data.get('saved'),
    }


def get_source_depts(db: Session) -> list:
    """생산부서 목록 (키워드 검출 문서 기준, 건수 내림차순)."""
    rows = db.execute(text("""
        SELECT dept_name AS name, COUNT(*) AS count
        FROM crawl_documents
        WHERE is_hidden = 0 AND matched_keyword IS NOT NULL
          AND dept_name IS NOT NULL AND dept_name != ''
        GROUP BY dept_name ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


def get_board_posts(db: Session, q: str = '', page: int = 1, size: int = 20):
    """& AND 조건, ! 제외 조건을 지원하는 게시판 검색."""
    fields = ['title', 'body_text', 'author', 'brd_name']
    tokens = [t.strip() for t in q.split('&') if t.strip()] if q else []
    inc = [t for t in tokens if not t.startswith('!')]
    exc = [t[1:] for t in tokens if t.startswith('!') and len(t) > 1]

    conditions: list = []
    params: dict = {}
    for i, kw in enumerate(inc):
        k = f'i{i}'
        conditions.append(f"({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        params[k] = f'%{kw}%'
    for i, kw in enumerate(exc):
        k = f'e{i}'
        conditions.append(f"NOT ({' OR '.join(f'{f} ILIKE :{k}' for f in fields)})")
        params[k] = f'%{kw}%'

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    page_params = {**params, 'limit': size, 'offset': (page - 1) * size}

    total = db.execute(text(f"SELECT COUNT(*) FROM crawl_board_posts {where}"), params).scalar() or 0
    rows = db.execute(text(f"""
        SELECT id, atcl_id, brd_name, title, LEFT(body_text, 300) AS body_text,
               reg_dt, author, view_cnt, matched_keyword
        FROM crawl_board_posts {where}
        ORDER BY reg_dt DESC, id DESC LIMIT :limit OFFSET :offset
    """), page_params).mappings().all()
    return [dict(r) for r in rows], int(total)


def get_board_page_stats(db: Session) -> dict:
    """게시판 페이지용 통계 — 총 게시글, 오늘 수집, 키워드 수, 마지막 수집일."""
    today = str(date.today())
    total = db.execute(text("SELECT COUNT(*) FROM crawl_board_posts")).scalar() or 0
    today_count = db.execute(
        text("SELECT COUNT(*) FROM crawl_board_posts WHERE LEFT(crawled_at, 10) = :d"), {'d': today}
    ).scalar() or 0
    kw_count = db.execute(text("SELECT COUNT(*) FROM crawl_board_keywords")).scalar() or 0
    last_row = db.execute(
        text("SELECT value FROM crawl_session_store WHERE key = 'board_last_crawl_at'")
    ).fetchone()
    return {
        'total': int(total),
        'today_count': int(today_count),
        'keyword_count': int(kw_count),
        'last_crawl_at': last_row[0] if last_row else None,
    }


def get_departments(db: Session):
    rows = db.execute(
        text("SELECT id, name FROM crawl_departments WHERE enabled=1 ORDER BY name")
    ).mappings().all()
    return [dict(r) for r in rows]


def get_available_years(db: Session):
    rows = db.execute(text("""
        SELECT DISTINCT LEFT(reg_date, 4) AS year FROM crawl_documents
        WHERE reg_date IS NOT NULL AND reg_date != '' AND is_hidden = 0
        ORDER BY year DESC
    """)).scalars().all()
    return [y for y in rows if y]


def get_dashboard_stats(db: Session) -> dict:
    today = str(date.today())
    doc_total   = db.execute(text("SELECT COUNT(*) FROM crawl_documents WHERE is_hidden = 0")).scalar() or 0
    doc_today   = db.execute(text("SELECT COUNT(*) FROM crawl_documents WHERE LEFT(crawled_at,10)=:d"), {'d': today}).scalar() or 0
    board_total = db.execute(text("SELECT COUNT(*) FROM crawl_board_posts")).scalar() or 0
    board_today = db.execute(text("SELECT COUNT(*) FROM crawl_board_posts WHERE LEFT(crawled_at,10)=:d"), {'d': today}).scalar() or 0
    last_row    = db.execute(text("SELECT value FROM crawl_session_store WHERE key='last_crawled_at'")).fetchone()
    status_row  = db.execute(text("SELECT value FROM crawl_session_store WHERE key='crawl_status'")).fetchone()
    return {
        'doc_total':       int(doc_total),
        'doc_today':       int(doc_today),
        'board_total':     int(board_total),
        'board_today':     int(board_today),
        'crawl_status':    status_row[0] if status_row else 'unknown',
        'last_crawled_at': last_row[0] if last_row else None,
    }


def add_department(db: Session, name: str, dept_id: str, doc_type: str) -> dict:
    """부서 추가."""
    row = db.execute(
        text("INSERT INTO crawl_departments (name, dept_id, doc_type, enabled) VALUES (:n, :d, :t, 1) RETURNING id, name, dept_id, doc_type, enabled"),
        {'n': name, 'd': dept_id, 't': doc_type}
    ).mappings().fetchone()
    db.commit()
    return dict(row)


def delete_department(db: Session, dept_id: int):
    """부서 삭제."""
    db.execute(text("DELETE FROM crawl_departments WHERE id = :id"), {'id': dept_id})
    db.commit()


def get_board_keywords(db: Session) -> list:
    """게시판 키워드 목록."""
    rows = db.execute(text("SELECT id, keyword FROM crawl_board_keywords ORDER BY id")).mappings().all()
    return [dict(r) for r in rows]


def add_board_keyword(db: Session, keyword: str) -> dict:
    """게시판 키워드 추가."""
    db.execute(
        text("INSERT INTO crawl_board_keywords (keyword) VALUES (:k) ON CONFLICT (keyword) DO NOTHING"),
        {'k': keyword}
    )
    db.commit()
    row = db.execute(text("SELECT id, keyword FROM crawl_board_keywords WHERE keyword = :k"), {'k': keyword}).fetchone()
    return {'id': row[0], 'keyword': row[1]}


def delete_board_keyword(db: Session, kw_id: int):
    """게시판 키워드 삭제."""
    db.execute(text("DELETE FROM crawl_board_keywords WHERE id = :id"), {'id': kw_id})
    db.commit()


def get_crawl_settings(db: Session) -> dict:
    """자동 수집 설정 조회 (스케줄 시간 + 수집 속도)."""
    rows = db.execute(
        text("SELECT key, value FROM crawl_session_store WHERE key IN ('auto_crawl_times', 'crawl_speed')")
    ).fetchall()
    data = {r[0]: r[1] for r in rows}
    times: list = []
    try:
        times = json.loads(data.get('auto_crawl_times', '[]'))
    except Exception:
        pass
    return {'auto_crawl_times': times, 'crawl_speed': data.get('crawl_speed', 'balanced')}


def save_crawl_settings(db: Session, auto_crawl_times: list, crawl_speed: str):
    """자동 수집 설정 저장."""
    for key, val in [('auto_crawl_times', json.dumps(auto_crawl_times)), ('crawl_speed', crawl_speed)]:
        db.execute(
            text("INSERT INTO crawl_session_store (key, value) VALUES (:k, :v) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"),
            {'k': key, 'v': val}
        )
    db.commit()


def ensure_skynet_crawl_logs_table(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS skywatch_skynet_crawl_logs (
            id SERIAL PRIMARY KEY,
            target VARCHAR(20),
            status VARCHAR(10) NOT NULL,
            new_count INTEGER DEFAULT 0,
            message TEXT,
            started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            finished_at TIMESTAMP WITH TIME ZONE
        )
    """))


def insert_skynet_crawl_log(
    db: Session,
    *,
    target: str,
    status: str,
    new_count: int = 0,
    message: str | None = None,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
):
    ensure_skynet_crawl_logs_table(db)
    db.execute(text("""
        INSERT INTO skywatch_skynet_crawl_logs
            (target, status, new_count, message, started_at, finished_at)
        VALUES
            (:target, :status, :new_count, :message, :started_at, :finished_at)
    """), {
        'target': target,
        'status': status,
        'new_count': int(new_count),
        'message': message,
        'started_at': started_at or datetime.now().astimezone(),
        'finished_at': finished_at,
    })
    db.commit()


def _format_crawl_doc_lines(rows: list[dict]) -> str:
    if not rows:
        return "- 수집된 문서가 없습니다."
    lines = []
    for row in rows[:120]:
        lines.append(
            f"- [{row.get('crawled_at', '')}] "
            f"{row.get('dept_name') or '-'} | "
            f"{row.get('reg_date') or '-'} | "
            f"{row.get('doc_number') or row.get('reg_number') or '-'} | "
            f"{row.get('title') or '(제목 없음)'}"
        )
    if len(rows) > 120:
        lines.append(f"- ... 외 {len(rows) - 120}건")
    return "\n".join(lines)


def collect_recent_crawled_documents(db: Session, started_at: datetime) -> list[dict]:
    start_key = started_at.strftime('%Y-%m-%d %H:%M:%S')
    today = started_at.strftime('%Y-%m-%d')
    rows = db.execute(text("""
        SELECT id, dept_name, reg_date, reg_number, doc_number, title,
               LEFT(crawled_at, 19) AS crawled_at
        FROM crawl_documents
        WHERE is_hidden = 0
          AND LEFT(crawled_at, 10) = :today
          AND LEFT(crawled_at, 19) >= :started_at
        ORDER BY LEFT(crawled_at, 19) DESC, id DESC
        LIMIT 500
    """), {'today': today, 'started_at': start_key}).mappings().all()
    return [dict(r) for r in rows]


def build_crawl_log_message(*, started_at: datetime, result: dict | None, rows: list[dict]) -> str:
    parts = [
        f"[{started_at.strftime('%Y-%m-%d %H:%M:%S')}] SkyNet 문서 수집 로그",
        f"status={result.get('status') if isinstance(result, dict) else 'unknown'}",
        f"saved={len(rows)}",
    ]
    if isinstance(result, dict):
        for key in ('new_count', 'saved', 'count', 'fetched', 'total'):
            value = result.get(key)
            if isinstance(value, int):
                parts.append(f"{key}={value}")
        if result.get('message'):
            parts.append(f"message={result.get('message')}")
    parts.append("")
    parts.append(_format_crawl_doc_lines(rows))
    return "\n".join(parts)


def get_crawl_logs(db: Session, day: str | None = None, limit: int = 30) -> list[dict]:
    ensure_skynet_crawl_logs_table(db)
    query_day = day or str(date.today())
    rows = db.execute(text("""
        SELECT id, target, status, new_count, message, started_at, finished_at
        FROM skywatch_skynet_crawl_logs
        WHERE DATE(started_at) = :day
        ORDER BY started_at DESC, id DESC
        LIMIT :limit
    """), {'day': query_day, 'limit': limit}).mappings().all()
    items = []
    for row in rows:
        item = dict(row)
        if item.get('started_at') is not None:
            item['started_at'] = item['started_at'].isoformat()
        if item.get('finished_at') is not None:
            item['finished_at'] = item['finished_at'].isoformat()
        items.append(item)
    return items


def get_today_keyword_board_posts(db: Session, limit: int = 5) -> list:
    """오늘 수집된 키워드 검출 게시글 목록 (홈 카드용)."""
    today = str(date.today())
    rows = db.execute(text("""
        SELECT id, atcl_id, brd_name, title, author, reg_dt, view_cnt, matched_keyword
        FROM crawl_board_posts
        WHERE matched_keyword IS NOT NULL
          AND LEFT(crawled_at, 10) = :today
        ORDER BY reg_dt DESC, id DESC
        LIMIT :limit
    """), {'today': today, 'limit': limit}).mappings().all()
    return [dict(r) for r in rows]


def get_today_keyword_docs(db: Session, limit: int = 5) -> list:
    """오늘 수집된 키워드 검출 문서 목록 (홈 카드용)."""
    today = str(date.today())
    rows = db.execute(text("""
        SELECT id, title, reg_date, doc_number, matched_keyword, detail_url, charger_nm, dept_name
        FROM crawl_documents
        WHERE matched_keyword IS NOT NULL AND is_hidden = 0
          AND LEFT(crawled_at, 10) = :today
        ORDER BY reg_date DESC, id DESC
        LIMIT :limit
    """), {'today': today, 'limit': limit}).mappings().all()
    return [dict(r) for r in rows]


def set_jsessionid(db: Session, jsessionid: str):
    """크롤링용 JSESSIONID 저장."""
    db.execute(
        text("INSERT INTO crawl_session_store (key, value) VALUES ('jsessionid', :v) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"),
        {'v': jsessionid}
    )
    db.commit()


def save_document_memo(db: Session, doc_id: int, memo: str) -> bool:
    """문서 메모 저장. 성공 시 True, 문서 없으면 False 반환."""
    try:
        result = db.execute(
            text("UPDATE crawl_documents SET memo = :m WHERE id = :id"),
            {'m': memo, 'id': doc_id}
        )
        db.commit()
        return result.rowcount > 0
    except Exception:
        db.rollback()
        raise


def delete_board_posts(db: Session, post_ids: list[int]) -> int:
    """게시판 게시글 삭제."""
    if not post_ids:
        return 0
    result = db.execute(
        text("DELETE FROM crawl_board_posts WHERE id = ANY(:ids)"),
        {"ids": [int(i) for i in post_ids]},
    )
    db.commit()
    return result.rowcount


def unmatch_documents(db: Session, doc_ids: list[int]) -> int:
    """매칭문서 해제 — matched_keyword를 NULL로 초기화 (문서는 유지)."""
    if not doc_ids:
        return 0
    result = db.execute(
        text("UPDATE crawl_documents SET matched_keyword = NULL WHERE id = ANY(:ids)"),
        {"ids": [int(i) for i in doc_ids]},
    )
    db.commit()
    return result.rowcount


def match_documents(db: Session, doc_ids: list[int], keyword: str) -> int:
    """수동 매칭 — 선택한 문서의 matched_keyword를 지정 키워드로 설정."""
    if not doc_ids or not keyword.strip():
        return 0
    result = db.execute(
        text("UPDATE crawl_documents SET matched_keyword = :kw WHERE id = ANY(:ids)"),
        {"kw": keyword.strip(), "ids": [int(i) for i in doc_ids]},
    )
    db.commit()
    return result.rowcount
