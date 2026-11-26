"""통합 검색 서비스."""
from __future__ import annotations

import html
import re
import time
from datetime import date, datetime, timedelta
from typing import Any, Literal

from sqlalchemy import and_, case, exists, func, literal, or_, select
from sqlalchemy.orm import Session, aliased

# 검색 결과 TTL 캐시 (3분). 동일 쿼리+필터 반복 시 DB 재조회 없이 즉시 응답.
_RESULT_CACHE: dict[str, Any] = {}  # {cache_key: (timestamp, result)}
_RESULT_TTL = 180  # 초 (3분)
_RESULT_CACHE_MAX = 50  # 최대 캐시 항목

from app.models.log import CardCategory, Comment, Log, LogCard
from app.models.schedule import Attachment
from app.models.user import User
from app.schemas.search import ParsedIntentOut, UnifiedSearchFacetsOut, UnifiedSearchItemOut, UnifiedSearchOut
from app.services.vector_service import search_logs_by_vector
from app.services.card_vector_service import search_cards_by_vector
from app.services.search_query_service import (
    contains as _contains,
    extract_keywords,
    is_natural_query,
    min_match_weight,
    term_group_weights,
)

SourceFilter = Literal["all", "skywatch"]
TargetFilter = Literal["all", "log", "card", "comment", "inquiry", "tech_doc", "issue"]

_PERIOD_KEYWORDS = ("오늘", "어제", "이번주", "지난주", "이번달")
_TEAM_KEYWORDS = ("A조", "B조", "C조", "D조", "일근")
_STATUS_KEYWORDS = ("미완료", "인계중", "보류", "완료")
def _parse_intent(q: str) -> ParsedIntentOut:
    periods = [token for token in _PERIOD_KEYWORDS if token in q]
    teams = [token for token in _TEAM_KEYWORDS if token in q]
    statuses = [token for token in _STATUS_KEYWORDS if token in q]
    return ParsedIntentOut(periods=periods, teams=teams, statuses=statuses, sources=[])


def _apply_intent_filters(
    q: str,
    date_from: date | None,
    date_to: date | None,
    team: str | None,
    status: str | None,
) -> tuple[str, date | None, date | None, str | None, str | None]:
    """검색어의 기간·근무조·상태 표현을 실제 필터로 옮기고 본문 검색어에서 제거한다."""
    cleaned = q
    today = date.today()

    period_ranges = {
        "오늘": (today, today),
        "어제": (today - timedelta(days=1), today - timedelta(days=1)),
        "이번주": (today - timedelta(days=today.weekday()), today),
        "지난주": (
            today - timedelta(days=today.weekday() + 7),
            today - timedelta(days=today.weekday() + 1),
        ),
        "이번달": (today.replace(day=1), today),
    }
    for token, (start, end) in period_ranges.items():
        if token in cleaned:
            if date_from is None:
                date_from = start
            if date_to is None:
                date_to = end
            cleaned = cleaned.replace(token, " ")
            break

    team_tokens = {"A조": "A", "B조": "B", "C조": "C", "D조": "D", "일근": "day"}
    for token, value in team_tokens.items():
        if re.search(re.escape(token), cleaned, flags=re.IGNORECASE):
            if team is None:
                team = value
            cleaned = re.sub(re.escape(token), " ", cleaned, flags=re.IGNORECASE)

    for token in _STATUS_KEYWORDS:
        if token in cleaned:
            if status is None:
                status = token
            cleaned = cleaned.replace(token, " ")
            break

    return re.sub(r"\s+", " ", cleaned).strip(), date_from, date_to, team, status


def _parse_search_query(q: str) -> tuple[list[list[str]], list[str]]:
    """검색 쿼리를 파싱합니다.

    문법:
    - "...": 정확히 이 순서대로 포함 (phrase search)
    - 공백 / "&": AND 조건 (각 그룹 모두 포함)
    - "|": OR 조건 (같은 AND 세그먼트 내 선택)
    - "!" (1개 이상): NOT 조건 (항목 제외)

    반환값: (or_groups, exclude_terms)
      - or_groups: 각 그룹이 OR, 그룹 간 AND
      - e.g. "FDP|데이터링크 장애" → [["FDP","데이터링크"], ["장애"]]

    예:
    - "일지" → [[일지]], []
    - "FDP COLD" → [[FDP], [COLD]], []
    - "FDP|데이터링크" → [[FDP, 데이터링크]], []
    - "FDP|데이터링크 장애" → [[FDP, 데이터링크], [장애]], []
    - '"fdp cold"' → [[fdp cold]], []
    - "FDP COLD!ERROR" → [[FDP], [COLD]], [ERROR]
    참고: phrase("...") + | 혼용은 phrase가 독립 그룹으로 분리(AND)됨
    """
    # ! (1개 이상)으로 분할하여 포함/제외 분리
    match = re.search(r'!+', q)
    if match:
        include_part = q[:match.start()].strip()
        exclude_part = q[match.end():]
        exclude_terms = [t.strip() for t in re.split(r'!+', exclude_part)]
    else:
        include_part = q
        exclude_terms = []

    # 큰따옴표로 감싼 phrase 추출 → 각각 단독 그룹
    phrases = re.findall(r'"([^"]*)"', include_part)
    remaining = re.sub(r'"[^"]*"', '', include_part)

    or_groups: list[list[str]] = []

    # phrase는 단독 그룹
    for ph in phrases:
        if ph.strip():
            or_groups.append([ph.strip()])

    # 나머지: 공백·& 로 AND 세그먼트 분할, | 로 OR 분할
    for space_part in remaining.split():
        for amp_part in space_part.split('&'):
            amp_part = amp_part.strip()
            if not amp_part:
                continue
            or_terms = [t.strip() for t in amp_part.split('|') if t.strip()]
            if or_terms:
                or_groups.append(or_terms)

    exclude_terms = [t for t in exclude_terms if t]
    return or_groups, exclude_terms


def _to_naive(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.min
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _recency_bonus(dt: datetime | None, weight: float = 0.2) -> float:
    """최근 30일 이내 항목에 최대 weight 가산 (선형 감쇠)."""
    if dt is None:
        return 0.0
    try:
        from datetime import timezone
        aware = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        days = max(0, (datetime.now(timezone.utc) - aware).days)
        return max(0.0, weight * (1.0 - days / 30.0)) if days < 30 else 0.0
    except Exception:
        return 0.0


def _build_snippet(text: str | None, fallback: str, max_len: int = 120) -> str:
    """스니펫 생성 (HTML 태그 제거 후 길이 제한)."""
    base = (text or fallback or "").strip().replace("\n", " ")
    base = html.unescape(re.sub(r'<[^>]+>', ' ', base))
    base = re.sub(r'\s+', ' ', base).strip()
    if len(base) <= max_len:
        return base
    return f"{base[:max_len - 1]}…"


def _build_keyword_snippet(
    text: str | None,
    terms: list[str],
    fallback: str,
    max_len: int = 160,
) -> str:
    """키워드 근처 컨텍스트를 스니펫으로 추출. 키워드 없으면 앞부분 반환."""
    base = (text or fallback or "").strip().replace("\n", " ")
    base = html.unescape(re.sub(r'<[^>]+>', ' ', base))
    base = re.sub(r'\s+', ' ', base).strip()
    if not base:
        return ""
    if len(base) <= max_len:
        return base

    # 의미 있는 키워드(2자 이상)의 첫 번째 등장 위치 탐색
    active = [t for t in terms if t and len(t) >= 2]
    best: int | None = None
    for term in active:
        idx = base.lower().find(term.lower())
        if idx >= 0 and (best is None or idx < best):
            best = idx

    if best is None:
        return base[: max_len - 1] + '…'

    start = max(0, best - 30)
    end = min(len(base), start + max_len)
    snippet = base[start:end]
    return ('…' if start > 0 else '') + snippet + ('…' if end < len(base) else '')


_RRF_K = 60
_RRF_MAX = 2.0 / _RRF_K  # 키워드·벡터 양쪽 모두 1위일 때의 RRF 점수 (정규화 기준)
_VEC_LIMIT = 300  # 일지·카드 벡터 후보 수 상한
_TYPE_WEIGHT = {"issue": 0.85, "inquiry": 0.85, "tech_doc": 0.85}  # 업무일지 외 자료 점수 배율 (평가셋 기준)


def _rrf_merge(
    keyword_items: list[UnifiedSearchItemOut],
    vector_items: list[UnifiedSearchItemOut],
    k: int = _RRF_K,
) -> list[UnifiedSearchItemOut]:
    """Reciprocal Rank Fusion: 두 검색 결과를 순위 기반으로 합산.

    두 리스트 모두에 나온 항목은 점수가 합산되어 상위로 올라온다.
    점수는 0~1로 정규화 (양쪽 모두 1위 = 1.0, 한쪽에서만 1위 = 0.5) — 문서 종류 간 비교 가능.
    """
    rrf: dict[int, float] = {}
    item_map: dict[int, UnifiedSearchItemOut] = {}

    # 각 목록을 자체 점수 내림차순으로 정렬해 순위를 매긴다 (안정 정렬 → 동점은 기존 순서 유지)
    for items in (keyword_items, vector_items):
        seen: set[int] = set()
        rank = 0
        for item in sorted(items, key=lambda x: x.score, reverse=True):
            if item.target_id in seen:  # 같은 목록 내 중복은 최상위 1건만 반영
                continue
            seen.add(item.target_id)
            rrf[item.target_id] = rrf.get(item.target_id, 0.0) + 1.0 / (rank + k)
            item_map.setdefault(item.target_id, item)
            rank += 1

    merged = list(item_map.values())
    for item in merged:
        item.score = rrf[item.target_id] / _RRF_MAX
    return merged


def _rank_normalize(items: list[UnifiedSearchItemOut], k: int = _RRF_K) -> list[UnifiedSearchItemOut]:
    """단일 목록(댓글, SkyNet, 벡터 실패 시)을 RRF와 같은 0~1 척도로 변환 (1위 = 0.5)."""
    ranked = sorted(items, key=lambda x: x.score, reverse=True)
    for rank, item in enumerate(ranked):
        item.score = (1.0 / (rank + k)) / _RRF_MAX
    return ranked


def _fold_logs_into_cards(db: Session, items: list[UnifiedSearchItemOut]) -> list[UnifiedSearchItemOut]:
    """같은 일지의 카드가 결과에 있으면 일지 항목은 빼고 더 높은 점수를 그 카드에 준다.

    일지 1건이 '카드'와 '일지'로 두 번 나와 상위 자리를 차지하던 중복을 없앤다.
    """
    card_ids = [i.target_id for i in items if i.target_type == "card"]
    if not card_ids:
        return items
    card_log = dict(db.execute(select(LogCard.id, LogCard.log_id).where(LogCard.id.in_(card_ids))).all())
    best_card: dict[int, UnifiedSearchItemOut] = {}
    for item in items:
        if item.target_type != "card":
            continue
        log_id = card_log.get(item.target_id)
        if log_id is not None and (log_id not in best_card or item.score > best_card[log_id].score):
            best_card[log_id] = item
    folded: list[UnifiedSearchItemOut] = []
    for item in items:
        card = best_card.get(item.target_id) if item.target_type == "log" else None
        if card is not None:
            card.score = max(card.score, item.score)
            continue
        folded.append(item)
    return folded


def _weighted_match(conds: list, term_weights: list[float] | None):
    """문장형 질의: 그룹별 IDF 가중치 합 SQL 식. 엄격(AND) 모드이거나 유효 가중치가 없으면 None."""
    if not term_weights or not any(w > 0 for w in term_weights):
        return None
    return sum(
        (case((c, w), else_=0.0) for c, w in zip(conds, term_weights) if w > 0),
        literal(0.0),
    )


def _filter_groups(stmt, conds: list, match, term_weights: list[float] | None):
    """엄격 모드: 모든 그룹 AND. 문장형 모드: 최소 매칭 가중치 이상인 항목만."""
    if match is None:
        for c in conds:
            stmt = stmt.where(c)
        return stmt
    return stmt.where(match >= min_match_weight(term_weights))


def _search_cards(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    status: str | None,
    team: str | None,
    date_from: date | None,
    date_to: date | None,
    limit: int,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    # include_terms이 실제 값을 포함하는지 확인 ([""]는 exclude-only 검색)
    has_include_terms = include_terms and any(include_terms)

    # 그룹 조건: 엄격 모드는 첨부파일명 포함, 문장형 모드는 점수 계산에 쓰이므로
    # 첨부 행 수만큼 카드가 중복되지 않도록 제목/본문만 사용
    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    _with_attach = not term_weights
    group_conds = [
        or_(*[
            or_(
                _contains(LogCard.title, t),
                _contains(func.coalesce(LogCard.content, ""), t),
                *([_contains(Attachment.original_name, t)] if _with_attach else []),
            )
            for t in group[:6]  # SQL 조건 수 제한
        ])
        for group in _groups
    ]
    match = _weighted_match(group_conds, term_weights)

    if has_include_terms:
        _title_any = or_(*[_contains(LogCard.title, t) for t in include_terms])
        _body_any = or_(*[_contains(func.coalesce(LogCard.content, ""), t) for t in include_terms])
        title_match = case((_title_any, 1.0), else_=0.0)
        body_match = case((_body_any, 1.0), else_=0.0)
        # Exact match boost: original search terms (not synonyms) appear in title
        _orig_terms = [t for t in include_terms if t]
        _exact_any = or_(*[_contains(LogCard.title, t) for t in _orig_terms]) if _orig_terms else False
        exact_boost = case((_exact_any, 0.5), else_=0.0)
    else:
        title_match = case((False, 0.0), else_=0.0)
        body_match = case((False, 0.0), else_=0.0)
        exact_boost = case((False, 0.0), else_=0.0)
    days_old_card = func.extract('epoch', func.now() - Log.date) / 86400.0
    recency_boost_card = case(
        (days_old_card <= 7, 0.30),
        (days_old_card <= 30, 0.15),
        (days_old_card <= 90, 0.05),
        else_=0.0,
    )
    score_expr = (
        title_match * 1.0 + body_match * 0.6 + exact_boost + recency_boost_card
        + (match if match is not None else 0.0)
    ).label("score")

    _attach_count_sub = (
        select(func.count())
        .select_from(Attachment)
        .where(
            Attachment.owner_id == LogCard.id,
            Attachment.owner_type == "card",
            Attachment.is_deleted.is_(False),
        )
        .correlate(LogCard)
        .scalar_subquery()
    )

    stmt = (
        select(
            LogCard.id.label("card_id"),
            LogCard.title.label("card_title"),
            LogCard.content.label("card_content"),
            LogCard.updated_at.label("updated_at"),
            Log.id.label("log_id"),
            Log.date.label("log_date"),
            User.name.label("author_name"),
            CardCategory.name.label("category_name"),
            _attach_count_sub.label("attach_count"),
            score_expr,
        )
        .join(Log, Log.id == LogCard.log_id)
        .join(User, User.id == Log.author_id)
        .outerjoin(CardCategory, CardCategory.id == LogCard.category_id)
        .outerjoin(Attachment, or_(
            and_(Attachment.owner_id == Log.id, Attachment.owner_type == "log"),
            and_(Attachment.owner_id == LogCard.id, Attachment.owner_type == "card"),
        ))
        .where(
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
        )
    )

    # 엄격 모드: 모든 include 그룹이 title/content/attachment에 포함 (동의어 OR 확장)
    # 문장형 모드: IDF 가중 매칭 점수가 기준 이상 (exclude-only 검색이면 그룹 없음)
    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    # exclude_terms는 포함되면 안 됨
    for term in exclude_terms:
        stmt = stmt.where(
            ~or_(
                _contains(LogCard.title, term),
                _contains(func.coalesce(LogCard.content, ""), term),
                _contains(Attachment.original_name, term),
            )
        )

    if status:
        if status == "미완료":
            stmt = stmt.where(LogCard.status.in_(["open", "hold"]))
        else:
            status_map = {"인계중": "open", "보류": "hold", "완료": "done"}
            mapped = status_map.get(status, status)
            stmt = stmt.where(LogCard.status == mapped)
    if team:
        stmt = stmt.where(User.team == team)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)

    rows = db.execute(
        stmt.distinct().order_by(score_expr.desc(), LogCard.updated_at.desc()).limit(limit)
    ).all()

    return [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="card",
            target_id=r.card_id,
            title=r.card_title,
            snippet=_build_keyword_snippet(r.card_content, include_terms, r.card_title),
            score=float(r.score or 0.0),
            updated_at=r.updated_at,
            work_date=r.log_date,
            author=r.author_name or "관리자",
            route=f"/logs?open={r.log_id}&card={r.card_id}",
            category=r.category_name,
            attach_count=r.attach_count or None,
        )
        for r in rows
    ]


def _search_logs_keyword(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    team: str | None,
    date_from: date | None,
    date_to: date | None,
    limit: int,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    """업무일지 키워드 검색 (Log.title, Log.tags, LogCard.title, LogCard.content)."""
    has_include_terms = include_terms and any(include_terms)

    def _log_group_cond(kw: list[str]):
        card_exists = (
            select(LogCard.id)
            .where(
                LogCard.log_id == Log.id,
                LogCard.is_deleted.is_(False),
                or_(*[
                    or_(
                        _contains(LogCard.title, t),
                        _contains(func.coalesce(LogCard.content, ""), t),
                    )
                    for t in kw
                ])
            )
            .exists()
        )
        return or_(
            or_(*[_contains(func.coalesce(Log.title, ""), t) for t in kw]),
            or_(*[_contains(func.array_to_string(Log.tags, ' '), t) for t in kw]),
            card_exists,
        )

    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    group_conds = [_log_group_cond(group[:6]) for group in _groups]
    match = _weighted_match(group_conds, term_weights)

    if has_include_terms:
        _log_title_any = or_(*[_contains(func.coalesce(Log.title, ""), t) for t in include_terms])
        _tags_any = or_(*[_contains(func.array_to_string(Log.tags, ' '), t) for t in include_terms])
        # 카드 제목에 검색어가 있으면 가산 (없으면 카드 본문만 맞은 일지가 모두 같은 점수 → 날짜순이 됨)
        _card_title_any = (
            select(LogCard.id)
            .where(
                LogCard.log_id == Log.id,
                LogCard.is_deleted.is_(False),
                or_(*[_contains(LogCard.title, t) for t in include_terms]),
            )
            .exists()
        )
        log_title_match = case((_log_title_any, 1.0), (_card_title_any, 0.6), else_=0.0)
        tags_match = case((_tags_any, 0.5), else_=0.0)
        # Exact match boost: original search terms in log title
        _orig_terms_log = [t for t in include_terms if t]
        _exact_log = or_(*[_contains(func.coalesce(Log.title, ""), t) for t in _orig_terms_log]) if _orig_terms_log else False
        exact_boost_log = case((_exact_log, 0.5), else_=0.0)
    else:
        log_title_match = case((False, 0.0), else_=0.0)
        tags_match = case((False, 0.0), else_=0.0)
        exact_boost_log = case((False, 0.0), else_=0.0)

    days_old_log = func.extract('epoch', func.now() - Log.date) / 86400.0
    recency_boost_log = case(
        (days_old_log <= 7, 0.30),
        (days_old_log <= 30, 0.15),
        (days_old_log <= 90, 0.05),
        else_=0.0,
    )
    score_expr = (
        log_title_match * 1.0 + tags_match + exact_boost_log + recency_boost_log
        + (match if match is not None else 0.0)
    ).label("score")

    stmt = (
        select(
            Log.id.label("log_id"),
            Log.title.label("log_title"),
            Log.date.label("log_date"),
            Log.shift_type.label("shift_type"),
            Log.updated_at.label("updated_at"),
            User.name.label("author_name"),
            score_expr,
        )
        .join(User, User.id == Log.author_id)
        .where(Log.is_deleted.is_(False))
    )

    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    for term in exclude_terms:
        card_has_term = (
            select(LogCard.id)
            .where(
                LogCard.log_id == Log.id,
                LogCard.is_deleted.is_(False),
                or_(_contains(LogCard.title, term), _contains(func.coalesce(LogCard.content, ""), term)),
            )
            .exists()
        )
        stmt = stmt.where(~or_(_contains(func.coalesce(Log.title, ""), term), card_has_term))

    if team:
        stmt = stmt.where(User.team == team)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)

    rows = db.execute(
        stmt.order_by(score_expr.desc(), Log.date.desc()).limit(limit)
    ).all()

    if not rows:
        return []

    # 스니펫: 검색어(동의어 포함)가 들어 있는 첫 카드, 없으면 첫 카드
    log_ids = [r.log_id for r in rows]
    snippet_terms = [t.lower() for t in dict.fromkeys(
        [*include_terms, *(t for g in (include_term_groups or []) for t in g)]
    ) if t and len(t) >= 2]
    snippets: dict[int, str] = {}
    matched: set[int] = set()
    card_rows = db.execute(
        select(LogCard.log_id, LogCard.title, LogCard.content)
        .where(LogCard.log_id.in_(log_ids), LogCard.is_deleted.is_(False))
        .order_by(LogCard.log_id, LogCard.position)
    ).all()
    for card in card_rows:
        if card.log_id in matched:
            continue
        text = f"{card.title or ''} {card.content or ''}"
        if any(t in text.lower() for t in snippet_terms):
            snippets[card.log_id] = text
            matched.add(card.log_id)
        elif card.log_id not in snippets:
            snippets[card.log_id] = card.content or card.title or ""

    return [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="log",
            target_id=r.log_id,
            title=r.log_title or f"[{r.log_date}] {r.shift_type} 근무일지",
            snippet=_build_keyword_snippet(snippets.get(r.log_id, ""), snippet_terms, r.log_title or ""),
            score=float(r.score or 0.0),
            updated_at=r.updated_at,
            work_date=r.log_date,
            author=r.author_name or "관리자",
            route=f"/logs?open={r.log_id}",
        )
        for r in rows
    ]


def _search_logs_by_vector(
    db: Session,
    query: str,
    exclude_terms: list[str] | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    team: str | None = None,
    limit: int = 50,
    query_vec=None,
) -> list[UnifiedSearchItemOut]:
    """벡터 검색으로 유사한 일지 검색.

    벡터 유사도 상위 K개를 먼저 찾은 후, 제외 키워드를 적용한 후, 날짜 필터링을 SQL에서 수행.
    매칭된 청크 텍스트도 함께 반환.

    Args:
        db: 데이터베이스 세션
        query: 검색 쿼리 (include_terms만 포함)
        exclude_terms: 제외할 키워드 목록
        date_from: 시작 날짜
        date_to: 종료 날짜
        limit: 반환할 상위 로그 개수
    """
    log_results = search_logs_by_vector(db, query, top_k=limit, query_vec=query_vec)
    if not log_results:
        return []

    log_ids = [log_id for log_id, _, _ in log_results]
    log_scores = {log_id: score for log_id, score, _ in log_results}
    log_chunks = {log_id: chunk_text for log_id, _, chunk_text in log_results}

    # 제외 키워드가 포함된 로그 제외
    if exclude_terms:
        from app.models.log import LogVector
        excluded_log_ids = set()
        for term in exclude_terms:
            term_logs = db.scalars(
                select(LogVector.log_id.distinct()).where(_contains(LogVector.chunk_text, term))
            ).all()
            excluded_log_ids.update(term_logs)

        # 제외 로그 필터링
        log_ids = [lid for lid in log_ids if lid not in excluded_log_ids]
        if not log_ids:
            return []

    # 해당 로그 정보 조회 (날짜 필터 포함)
    query_stmt = (
        select(Log)
        .join(User, User.id == Log.author_id)
        .where(
            Log.id.in_(log_ids),
            Log.is_deleted.is_(False),
        )
    )

    if team:
        query_stmt = query_stmt.where(User.team == team)
    if date_from:
        query_stmt = query_stmt.where(Log.date >= date_from)
    if date_to:
        query_stmt = query_stmt.where(Log.date <= date_to)

    logs = db.scalars(query_stmt).all()

    _author_ids = {log.author_id for log in logs}
    _user_map: dict[int, str] = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(_author_ids))).all()} if _author_ids else {}

    results = []
    for log in logs:
        # 매칭된 청크 텍스트를 snippet으로 사용 (벡터 검색이 어떤 내용으로 매칭되었는지 보여줌)
        matching_chunk = log_chunks.get(log.id, '')
        snippet = _build_snippet(matching_chunk, f"[{log.date}] {log.shift_type}")

        results.append(
            UnifiedSearchItemOut(
                source="skywatch",
                target_type="log",
                target_id=log.id,
                title=log.title or f"[{log.date}] {log.shift_type} 근무일지",
                snippet=snippet,
                score=float(log_scores.get(log.id, 0.0) * 0.9),  # 벡터 검색 스코어 약간 낮춤
                updated_at=log.updated_at,
                work_date=log.date,
                author=_user_map.get(log.author_id) or "관리자",
                route=f"/logs?open={log.id}",
            )
        )

    return sorted(results, key=lambda x: x.score, reverse=True)


def _search_cards_by_vector(
    db: Session,
    query: str,
    exclude_terms: list[str] | None,
    status: str | None,
    team: str | None,
    date_from,
    date_to,
    limit: int,
    query_vec=None,
) -> list[UnifiedSearchItemOut]:
    """KURE-v1 벡터 유사도로 카드 검색."""
    card_results = search_cards_by_vector(db, query, top_k=limit, query_vec=query_vec)
    if not card_results:
        return []

    card_ids = [cid for cid, _, _ in card_results]
    card_scores = {cid: score for cid, score, _ in card_results}
    card_chunks = {cid: chunk for cid, _, chunk in card_results}

    stmt = (
        select(LogCard, Log, User.name.label("author_name"))
        .join(Log, Log.id == LogCard.log_id)
        .join(User, User.id == Log.author_id)
        .where(
            LogCard.id.in_(card_ids),
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
        )
    )

    if exclude_terms:
        from sqlalchemy import or_, func
        for term in exclude_terms:
            stmt = stmt.where(
                ~or_(
                    _contains(LogCard.title, term),
                    _contains(func.coalesce(LogCard.content, ""), term),
                )
            )
    if status:
        if status == "미완료":
            stmt = stmt.where(LogCard.status.in_(["open", "hold"]))
        else:
            status_map = {"인계중": "open", "보류": "hold", "완료": "done"}
            stmt = stmt.where(LogCard.status == status_map.get(status, status))
    if team:
        stmt = stmt.where(User.team == team)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)

    rows = db.execute(stmt).all()

    return [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="card",
            target_id=card.id,
            title=card.title,
            snippet=_build_snippet(card_chunks.get(card.id), card.title),
            score=float(card_scores.get(card.id, 0.0) * 0.95),
            updated_at=card.updated_at,
            work_date=log.date,
            author=author_name or "관리자",
            route=f"/logs?open={log.id}&card={card.id}",
        )
        for card, log, author_name in rows
    ]


def _search_comments(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    team: str | None,
    date_from: date | None,
    date_to: date | None,
    limit: int,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    # include_terms이 실제 값을 포함하는지 확인 ([""]는 exclude-only 검색)
    has_include_terms = include_terms and any(include_terms)

    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    group_conds = [or_(*[_contains(Comment.body, t) for t in group[:6]]) for group in _groups]
    match = _weighted_match(group_conds, term_weights)

    if has_include_terms:
        _body_any = or_(*[_contains(Comment.body, t) for t in include_terms])
        body_match = case((_body_any, 1.0), else_=0.0)
    else:
        body_match = case((False, 0.0), else_=0.0)
    score_expr = (body_match * 0.8 + (match if match is not None else 0.0)).label("score")

    stmt = (
        select(
            Comment.id.label("comment_id"),
            Comment.body.label("comment_body"),
            Comment.updated_at.label("updated_at"),
            Log.id.label("log_id"),
            Log.date.label("log_date"),
            Log.title.label("log_title"),
            User.name.label("author_name"),
            score_expr,
        )
        .join(Log, Log.id == Comment.log_id)
        .join(User, User.id == Log.author_id)
        .where(
            Comment.is_deleted.is_(False),
            Log.is_deleted.is_(False),
        )
    )

    # 엄격 모드: 모든 include 그룹이 comment body에 포함 (동의어 OR 확장) / 문장형: 가중 매칭
    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    # exclude_terms는 포함되면 안 됨
    for term in exclude_terms:
        stmt = stmt.where(~_contains(Comment.body, term))

    if team:
        stmt = stmt.where(User.team == team)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)

    rows = db.execute(
        stmt.order_by(score_expr.desc(), Comment.updated_at.desc()).limit(limit)
    ).all()

    # 댓글은 키워드 목록뿐이므로 순위 기반 0~1 척도로 변환
    return _rank_normalize([
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="comment",
            target_id=r.comment_id,
            title=f"댓글: {r.log_title or f'일지 {r.log_id}'}",
            snippet=_build_keyword_snippet(r.comment_body, include_terms, "댓글"),
            score=float(r.score or 0.0),
            updated_at=r.updated_at,
            work_date=r.log_date,
            author=r.author_name or "관리자",
            route=f"/logs?open={r.log_id}&comment={r.comment_id}",
        )
        for r in rows
    ])


def _search_inquiries(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    date_from: date | None,
    date_to: date | None,
    limit: int,
    query_vec=None,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    from app.models.inquiry import Inquiry

    has_include_terms = include_terms and any(include_terms)

    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    group_conds = [
        or_(*[
            or_(
                _contains(Inquiry.content, t),
                _contains(Inquiry.keyword, t),
                _contains(Inquiry.inquiry_no, t),
                _contains(func.coalesce(Inquiry.controller_sector, ""), t),
                _contains(func.coalesce(Inquiry.category, ""), t),
            )
            for t in group[:6]
        ])
        for group in _groups
    ]
    match = _weighted_match(group_conds, term_weights)
    kw_match = (match if match is not None else literal(0.0)).label("kw_match")

    _UC = aliased(User)   # created_by FK
    _UR = aliased(User)   # received_by FK
    _UL = aliased(User)   # received_by_raw → login_id
    stmt = (
        select(Inquiry, func.coalesce(_UC.name, _UR.name, _UL.name, "관리자").label("author_name"), kw_match)
        .outerjoin(_UC, _UC.id == Inquiry.created_by)
        .outerjoin(_UR, _UR.id == Inquiry.received_by)
        .outerjoin(_UL, _UL.login_id == Inquiry.received_by_raw)
        .where(Inquiry.is_deleted.is_(False))
    )

    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    for term in exclude_terms:
        stmt = stmt.where(
            ~or_(
                _contains(func.coalesce(Inquiry.content, ""), term),
                _contains(func.coalesce(Inquiry.keyword, ""), term),
            )
        )

    if date_from:
        stmt = stmt.where(Inquiry.occurred_date >= date_from)
    if date_to:
        stmt = stmt.where(Inquiry.occurred_date <= date_to)

    rows = db.execute(stmt.order_by(kw_match.desc(), Inquiry.updated_at.desc()).limit(limit)).all()

    keyword_results = [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="inquiry",
            target_id=r.id,
            title=f"[{r.inquiry_no}] {(r.category or '').strip()} {(r.keyword or '').strip()}".strip(),
            snippet=_build_snippet(r.content, r.keyword or r.category or ""),
            score=(0.9 if (r.keyword and any(t.lower() in (r.keyword or "").lower() for t in include_terms if t)) else 0.7)
            + float(match_score or 0.0),
            updated_at=r.updated_at,
            work_date=r.occurred_date,
            author=author_name,
            route=f"/inquiries?q={r.inquiry_no}",
            category=(r.category or "").strip() or None,
        )
        for r, author_name, match_score in rows
    ]

    # 벡터 검색 (skywatch DB — 실패 시 무시)
    query_for_vector = " ".join(t for t in include_terms if t)
    if query_for_vector:
        try:
            from app.services.inquiry_vector_service import search_inquiries_by_vector
            vec_results = search_inquiries_by_vector(db, query_for_vector, top_k=limit, query_vec=query_vec)

            existing_ids = {r.target_id for r in keyword_results}
            vec_ids = {inq_id for inq_id, _ in vec_results}
            score_map = {inq_id: score for inq_id, score in vec_results}

            # 벡터에만 있는 항목을 DB에서 조회하여 SearchItem으로 변환
            vec_items: list[UnifiedSearchItemOut] = []
            new_ids = vec_ids - existing_ids
            if new_ids:
                extra_rows = db.execute(
                    select(Inquiry, func.coalesce(_UC.name, _UR.name, _UL.name, "관리자").label("author_name"))
                    .outerjoin(_UC, _UC.id == Inquiry.created_by)
                    .outerjoin(_UR, _UR.id == Inquiry.received_by)
                    .outerjoin(_UL, _UL.login_id == Inquiry.received_by_raw)
                    .where(
                        Inquiry.id.in_(new_ids),
                        Inquiry.is_deleted.is_(False),
                    )
                ).all()
                for r, author_name in extra_rows:
                    vec_items.append(UnifiedSearchItemOut(
                        source="skywatch",
                        target_type="inquiry",
                        target_id=r.id,
                        title=f"[{r.inquiry_no}] {(r.category or '').strip()} {(r.keyword or '').strip()}".strip(),
                        snippet=_build_snippet(r.content, r.keyword or r.category or ""),
                        score=float(score_map.get(r.id, 0.5)),  # 원본 유사도 (RRF 순위용)
                        updated_at=r.updated_at,
                        work_date=r.occurred_date,
                        author=author_name,
                        route=f"/inquiries?q={r.inquiry_no}",
                    ))

            # 키워드+벡터 양쪽에 있는 항목: 벡터 순위 정보를 위한 더미 항목 추가
            for inq_id in vec_ids & existing_ids:
                vec_items.append(UnifiedSearchItemOut(
                    source="skywatch", target_type="inquiry",
                    target_id=inq_id, title="", snippet="", route="",  # route: 필수 필드 (누락 시 검증 오류로 벡터 병합 전체가 실패했음)
                    score=float(score_map.get(inq_id, 0.0)),
                    updated_at=datetime.min,
                ))

            return _rrf_merge(keyword_results, vec_items)
        except Exception as e:
            print(f"[WARN] Inquiry vector search failed: {e}")

    return _rank_normalize(keyword_results)


def _search_issues(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    date_from: date | None,
    date_to: date | None,
    limit: int,
    query_vec=None,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    from app.models.issue import Issue

    has_include_terms = include_terms and any(include_terms)

    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    group_conds = [
        or_(*[
            or_(
                _contains(func.coalesce(Issue.title, ""), t),
                _contains(func.coalesce(Issue.keyword, ""), t),
                _contains(func.coalesce(Issue.kac_pr_no, ""), t),
                _contains(func.coalesce(Issue.lm_pr_no, ""), t),
                _contains(func.coalesce(Issue.content, ""), t),
                _contains(func.coalesce(Issue.acc_pr, ""), t),
            )
            for t in group[:6]
        ])
        for group in _groups
    ]
    match = _weighted_match(group_conds, term_weights)
    kw_match = (match if match is not None else literal(0.0)).label("kw_match")

    stmt = (
        select(Issue, User.name.label("author_name"), kw_match)
        .outerjoin(User, User.id == Issue.created_by)
        .where(Issue.is_deleted.is_(False))
    )

    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    for term in exclude_terms:
        stmt = stmt.where(
            ~or_(
                _contains(func.coalesce(Issue.title, ""), term),
                _contains(func.coalesce(Issue.keyword, ""), term),
                _contains(func.coalesce(Issue.content, ""), term),
                _contains(func.coalesce(Issue.kac_pr_no, ""), term),
                _contains(func.coalesce(Issue.lm_pr_no, ""), term),
            )
        )

    if date_from:
        stmt = stmt.where(Issue.reg_date >= date_from)
    if date_to:
        stmt = stmt.where(Issue.reg_date <= date_to)

    rows = db.execute(stmt.order_by(kw_match.desc(), Issue.updated_at.desc()).limit(limit)).all()

    keyword_results = [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="issue",
            target_id=r.id,
            title=f"[{(r.kac_pr_no or r.lm_pr_no or r.id)}] {(r.title or '').strip()}".strip(),
            snippet=_build_snippet(r.content, r.keyword or r.title or ""),
            score=(0.9 if (r.keyword and any(t.lower() in (r.keyword or "").lower() for t in include_terms if t)) else 0.75)
            + float(match_score or 0.0),
            updated_at=r.updated_at,
            work_date=r.reg_date,
            author=author_name or "관리자",
            route=f"/issues/view-popup?id={r.id}",
        )
        for r, author_name, match_score in rows
    ]

    query_for_vector = " ".join(t for t in include_terms if t)
    if query_for_vector:
        try:
            from app.services.issue_vector_service import search_issues_by_vector
            vec_results = search_issues_by_vector(db, query_for_vector, top_k=limit, query_vec=query_vec)

            existing_ids = {r.target_id for r in keyword_results}
            vec_ids = {issue_id for issue_id, _ in vec_results}
            score_map = {issue_id: score for issue_id, score in vec_results}

            vec_items: list[UnifiedSearchItemOut] = []
            new_ids = vec_ids - existing_ids
            if new_ids:
                extra_rows = db.execute(
                    select(Issue, User.name.label("author_name"))
                    .outerjoin(User, User.id == Issue.created_by)
                    .where(
                        Issue.id.in_(new_ids),
                        Issue.is_deleted.is_(False),
                    )
                ).all()
                for r, author_name in extra_rows:
                    vec_items.append(UnifiedSearchItemOut(
                        source="skywatch",
                        target_type="issue",
                        target_id=r.id,
                        title=f"[{(r.kac_pr_no or r.lm_pr_no or r.id)}] {(r.title or '').strip()}".strip(),
                        snippet=_build_snippet(r.content, r.keyword or r.title or ""),
                        score=float(score_map.get(r.id, 0.5)),  # 원본 유사도 (RRF 순위용)
                        updated_at=r.updated_at,
                        work_date=r.reg_date,
                        author=author_name or "관리자",
                        route=f"/issues/view-popup?id={r.id}",
                    ))

            # 키워드+벡터 양쪽에 있는 항목: 벡터 순위 반영용 더미
            for issue_id in vec_ids & existing_ids:
                vec_items.append(UnifiedSearchItemOut(
                    source="skywatch", target_type="issue",
                    target_id=issue_id, title="", snippet="", route="",  # route: 필수 필드 (누락 시 검증 오류로 벡터 병합 전체가 실패했음)
                    score=float(score_map.get(issue_id, 0.0)),
                    updated_at=datetime.min,
                ))

            return _rrf_merge(keyword_results, vec_items)
        except Exception as e:
            print(f"[WARN] Issue vector search failed: {e}")

    return _rank_normalize(keyword_results)


def _search_tech_docs(
    db: Session,
    include_terms: list[str],
    exclude_terms: list[str],
    date_from: date | None,
    date_to: date | None,
    limit: int,
    query_vec=None,
    include_term_groups: list[list[str]] | None = None,
    term_weights: list[float] | None = None,
) -> list[UnifiedSearchItemOut]:
    from app.models.tech_doc import TechDoc, TechDocAttachment, TechDocCategory

    has_include_terms = include_terms and any(include_terms)

    def _attach_has(term: str):
        # 첨부 본문 매칭은 EXISTS로 처리 (JOIN 시 첨부 수만큼 행이 중복됨)
        return exists().where(
            TechDocAttachment.tech_doc_id == TechDoc.id,
            TechDocAttachment.is_deleted.is_(False),
            _contains(func.coalesce(TechDocAttachment.content_text, ""), term),
        )

    _groups = (include_term_groups if include_term_groups else [[t] for t in include_terms]) if has_include_terms else []
    group_conds = [
        or_(*[
            or_(
                _contains(func.coalesce(TechDoc.title, ""), t),
                _contains(func.coalesce(TechDoc.summary, ""), t),
                _contains(func.coalesce(TechDoc.content, ""), t),
                _contains(func.coalesce(TechDoc.detail_summary, ""), t),
                _attach_has(t),
            )
            for t in group[:6]
        ])
        for group in _groups
    ]
    match = _weighted_match(group_conds, term_weights)
    kw_match = (match if match is not None else literal(0.0)).label("kw_match")

    stmt = (
        select(TechDoc, kw_match)
        .outerjoin(TechDocCategory, and_(
            TechDocCategory.project_code == TechDoc.project_code,
            TechDocCategory.category_code == TechDoc.category_code,
        ))
        .where(
            TechDoc.is_deleted.is_(False),
            or_(
                TechDoc.category_code.is_(None),
                TechDocCategory.is_active.is_(True),
            ),
        )
    )

    stmt = _filter_groups(stmt, group_conds, match, term_weights)

    for term in exclude_terms:
        stmt = stmt.where(
            ~or_(
                _contains(func.coalesce(TechDoc.title, ""), term),
                _contains(func.coalesce(TechDoc.summary, ""), term),
                _contains(func.coalesce(TechDoc.content, ""), term),
                _contains(func.coalesce(TechDoc.detail_summary, ""), term),
            )
        )

    if date_from:
        stmt = stmt.where(TechDoc.record_date >= date_from)
    if date_to:
        stmt = stmt.where(TechDoc.record_date <= date_to)

    _doc_rows = db.execute(stmt.order_by(kw_match.desc(), TechDoc.updated_at.desc()).limit(limit)).all()
    rows = [doc for doc, _ in _doc_rows]
    _td_match = {doc.id: float(m or 0.0) for doc, m in _doc_rows}

    _td_author_ids = {r.author_id for r in rows if r.author_id}
    _td_id_map: dict[int, str] = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(_td_author_ids))).all()} if _td_author_ids else {}

    _td_orig_ids = {r.orig_user_id for r in rows if r.orig_user_id}
    _td_login_map: dict[str, str] = {u.login_id: u.name for u in db.scalars(select(User).where(User.login_id.in_(_td_orig_ids))).all()} if _td_orig_ids else {}

    _td_ids = [r.id for r in rows]
    _td_attach_counts: dict[int, int] = {}
    if _td_ids:
        _td_attach_counts = {
            doc_id: cnt
            for doc_id, cnt in db.execute(
                select(TechDocAttachment.tech_doc_id, func.count().label("cnt"))
                .where(TechDocAttachment.tech_doc_id.in_(_td_ids))
                .group_by(TechDocAttachment.tech_doc_id)
            ).all()
        }

    def _td_kw_score(doc, terms: list[str]) -> float:
        if not terms or not any(terms):
            return 0.5
        title_hit = any(t.lower() in (doc.title or "").lower() for t in terms if t)
        if title_hit:
            return 1.0
        body_hit = any(
            t.lower() in ((doc.summary or "") + (doc.detail_summary or "") + (doc.content or "")).lower()
            for t in terms if t
        )
        return 0.7 if body_hit else 0.5

    keyword_results = [
        UnifiedSearchItemOut(
            source="skywatch",
            target_type="tech_doc",
            target_id=r.id,
            title=r.title or f"[{r.project_code}/{r.category_code}]",
            snippet=_build_snippet(r.summary or r.content, r.title or ""),
            score=_td_kw_score(r, include_terms) + _td_match.get(r.id, 0.0),
            updated_at=r.updated_at,
            work_date=r.record_date,
            author=_td_id_map.get(r.author_id) or _td_login_map.get(r.orig_user_id or "") or "관리자",
            route=f"/tech-docs-popup?id={r.id}",
            category=(r.category_code or "").strip() or None,
            attach_count=_td_attach_counts.get(r.id) or None,
        )
        for r in rows
    ]

    query_for_vector = " ".join(t for t in include_terms if t)
    if query_for_vector:
        try:
            from app.services.tech_doc_vector_service import search_tech_docs_by_vector
            vec_results = search_tech_docs_by_vector(db, query_for_vector, top_k=limit, query_vec=query_vec)
            existing_ids = {r.target_id for r in keyword_results}
            score_map = {doc_id: (score, chunk) for doc_id, score, chunk in vec_results}

            extra_ids = [doc_id for doc_id, score, _ in vec_results if doc_id not in existing_ids and score >= 0.40]
            if extra_ids:
                extra_docs = db.scalars(
                    select(TechDoc)
                    .outerjoin(TechDocCategory, and_(
                        TechDocCategory.project_code == TechDoc.project_code,
                        TechDocCategory.category_code == TechDoc.category_code,
                    ))
                    .where(
                        TechDoc.id.in_(extra_ids),
                        TechDoc.is_deleted.is_(False),
                        or_(
                            TechDoc.category_code.is_(None),
                            TechDocCategory.is_active.is_(True),
                        ),
                    )
                ).all()
                _extra_author_ids = {r.author_id for r in extra_docs if r.author_id} - set(_td_id_map)
                if _extra_author_ids:
                    _td_id_map.update({u.id: u.name for u in db.scalars(select(User).where(User.id.in_(_extra_author_ids))).all()})
                _extra_orig_ids = {r.orig_user_id for r in extra_docs if r.orig_user_id} - set(_td_login_map)
                if _extra_orig_ids:
                    _td_login_map.update({u.login_id: u.name for u in db.scalars(select(User).where(User.login_id.in_(_extra_orig_ids))).all()})
                vec_items = [
                    UnifiedSearchItemOut(
                        source="skywatch",
                        target_type="tech_doc",
                        target_id=r.id,
                        title=r.title or f"[{r.project_code}/{r.category_code}]",
                        snippet=_build_snippet(chunk, r.title or ""),
                        score=float(score),  # 원본 유사도 (RRF 순위용)
                        updated_at=r.updated_at,
                        work_date=r.record_date,
                        author=_td_id_map.get(r.author_id) or _td_login_map.get(r.orig_user_id or "") or "관리자",
                        route=f"/tech-docs-popup?id={r.id}",
                    )
                    for r in extra_docs
                    for score, chunk in [score_map.get(r.id, (0.5, ""))]
                ]
            else:
                vec_items = []

            # 키워드+벡터 양쪽에 있는 항목: 벡터 순위 반영용 더미
            vec_existing_ids = {doc_id for doc_id, _, _ in vec_results if doc_id in existing_ids}
            for doc_id in vec_existing_ids:
                s, _ = score_map.get(doc_id, (0.0, ""))
                vec_items.append(UnifiedSearchItemOut(
                    source="skywatch", target_type="tech_doc",
                    target_id=doc_id, title="", snippet="", route="",  # route: 필수 필드 (누락 시 검증 오류로 벡터 병합 전체가 실패했음)
                    score=float(s),
                    updated_at=datetime.min,
                ))

            return _rrf_merge(keyword_results, vec_items)
        except Exception as e:
            print(f"[WARN] TechDoc vector search failed: {e}")

    return _rank_normalize(keyword_results)


def unified_search(
    db: Session,
    *,
    q: str,
    source: SourceFilter = "all",
    target: TargetFilter = "all",
    page: int = 1,
    page_size: int = 20,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    team: str | None = None,
) -> UnifiedSearchOut:
    parsed = _parse_intent(q)
    raw_q = q.strip()

    if not raw_q:
        return UnifiedSearchOut(
            items=[],
            facets=UnifiedSearchFacetsOut(by_source={}, by_target={}),
            parsed_intent=parsed,
            partial=False,
            unavailable_sources=[],
        )

    # 결과 캐시 확인 (동일 쿼리+필터 3분 이내 재검색 시 즉시 반환)
    _cache_key = f"{raw_q}|{source}|{target}|{page}|{page_size}|{date_from}|{date_to}|{status}|{team}"
    _now = time.monotonic()
    _cached = _RESULT_CACHE.get(_cache_key)
    if _cached and (_now - _cached[0]) < _RESULT_TTL:
        return _cached[1]

    normalized_q, date_from, date_to, team, status = _apply_intent_filters(
        raw_q, date_from, date_to, team, status,
    )

    or_groups, exclude_terms = _parse_search_query(normalized_q)

    # or_groups이 비어있으면 exclude_terms만으로 검색 (임시 마커 추가)
    if not or_groups and exclude_terms:
        or_groups = [[""]]

    # 문장형 질의(연산자 없이 3단어 이상): 조사·어미를 뗀 핵심어로 바꾸고,
    # 그룹 AND 대신 IDF 가중 매칭 점수로 순위화 (2단어 이하·연산자 사용 시 기존 AND 유지)
    natural = is_natural_query(normalized_q, or_groups)
    if natural:
        or_groups = extract_keywords(or_groups) or or_groups

    # include_terms: OR 그룹을 평탄화 (벡터 검색용 쿼리 텍스트에 ��용)
    include_terms: list[str] = list(dict.fromkeys(t for g in or_groups for t in g))

    # 키워드 검색용 동의어 그룹 사전 계산
    # OR 그룹 내 각 term�� 동의어를 하나의 그룹으로 병합
    # �� SQL: (title ILIKE '%A%' OR title ILIKE '%syn(A)%' OR title ILIKE '%B%' OR title ILIKE '%syn(B)%')
    try:
        from app.services.synonym_service import get_expanded_terms as _get_expanded
        include_term_groups: list[list[str]] = []
        for group in or_groups:
            merged: list[str] = []
            seen: set[str] = set()
            for t in group:
                if not t:
                    continue
                for s in _get_expanded(t):
                    if s.lower() not in seen:
                        seen.add(s.lower())
                        merged.append(s)
            if merged:
                include_term_groups.append(merged[:12])  # SQL 조건 수 제한
    except Exception:
        include_term_groups = [g for g in or_groups if any(g)]

    term_weights: list[float] | None = None
    if natural:
        try:
            term_weights = term_group_weights(db, include_term_groups)
        except Exception as e:
            print(f"[WARN] Term weight calculation failed, falling back to AND: {e}")

    results: list[UnifiedSearchItemOut] = []
    fetch_limit = max(page_size * 5, 50)
    # 벡터 후보 수 상한: RRF에서 300위 밖은 영향이 미미하고, 인덱스 탐색 범위(ef_search)를 넘지 않게 함
    vec_limit = min(fetch_limit, _VEC_LIMIT)

    include_skywatch = source in ("all", "skywatch")

    # 쿼리 임베딩 1회 계산 — 모든 벡터 검색 함수에 공유
    # 문장형 질의는 원문 그대로 임베딩 (임베딩 모델은 문장 문맥을 활용)
    # 동의어 확장은 키워드 검색에만 적용 — 질의 임베딩에 동의어를 덧붙이면 의미가 희석되어
    # 정답 순위가 오히려 하락함 (평가셋 실측)
    query_for_vector = normalized_q if natural else (" ".join(t for t in include_terms if t) or normalized_q)
    pre_vec = None
    if query_for_vector:
        try:
            from app.services.vector_model import encode_texts as _encode_texts
            _vecs = _encode_texts([query_for_vector])
            pre_vec = _vecs[0] if _vecs else None
        except Exception as e:
            print(f"[WARN] Pre-embedding failed, will fall back per-call: {e}")

    # AND 강제 감지: OR 검색(|)이 없��� 2~4개 AND 그룹이거나 & 명시 사용
    _has_or = '|' in normalized_q
    _has_explicit_and = not natural and not _has_or and len(or_groups) >= 2 and (
        '&' in normalized_q or (not re.search(r'[&!""]', normalized_q) and len(or_groups) <= 4)
    )

    if include_skywatch:
        if target in ("all", "card"):
            kw_cards = _search_cards(
                db, include_terms, exclude_terms, status, team, date_from, date_to, fetch_limit,
                include_term_groups=include_term_groups, term_weights=term_weights,
            )
            if query_for_vector:
                try:
                    vec_cards = _search_cards_by_vector(
                        db, query_for_vector, exclude_terms, status, team, date_from, date_to, vec_limit,
                        query_vec=pre_vec,
                    )
                    # AND 강제: kw_cards가 존재할 때 vec_cards를 kw_cards 교집합으로 제한
                    # (자연어 질의처럼 kw_cards가 비어있으면 vec_cards 전체 허용)
                    if _has_explicit_and and kw_cards:
                        kw_ids = {item.target_id for item in kw_cards}
                        vec_cards = [item for item in vec_cards if item.target_id in kw_ids]
                    results.extend(_rrf_merge(kw_cards, vec_cards))
                except Exception as e:
                    print(f"[WARN] Card vector search failed: {e}")
                    results.extend(_rank_normalize(kw_cards))
            else:
                results.extend(_rank_normalize(kw_cards))
        _kw = {"include_term_groups": include_term_groups, "term_weights": term_weights}
        if target in ("all", "comment"):
            results.extend(_search_comments(db, include_terms, exclude_terms, team, date_from, date_to, fetch_limit, **_kw))
        if target in ("all", "inquiry"):
            results.extend(_search_inquiries(db, include_terms, exclude_terms, date_from, date_to, fetch_limit, query_vec=pre_vec, **_kw))
        if target in ("all", "tech_doc"):
            results.extend(_search_tech_docs(db, include_terms, exclude_terms, date_from, date_to, fetch_limit, query_vec=pre_vec, **_kw))
        if target in ("all", "issue"):
            results.extend(_search_issues(db, include_terms, exclude_terms, date_from, date_to, fetch_limit, query_vec=pre_vec, **_kw))
        if target in ("all", "log"):
            kw_logs = _search_logs_keyword(
                db, include_terms, exclude_terms, team, date_from, date_to, fetch_limit, **_kw,
            )
            if query_for_vector:
                try:
                    vec_logs = _search_logs_by_vector(
                        db,
                        query=query_for_vector,
                        exclude_terms=exclude_terms,
                        date_from=date_from,
                        date_to=date_to,
                        team=team,
                        limit=vec_limit,
                        query_vec=pre_vec,
                    )
                    results.extend(_rrf_merge(kw_logs, vec_logs))
                except Exception as e:
                    print(f"[WARN] Log vector search failed: {e}")
                    results.extend(_rank_normalize(kw_logs))
            else:
                results.extend(_rank_normalize(kw_logs))

    unavailable_sources: list[str] = []
    results = _fold_logs_into_cards(db, results)
    # 업무일지(카드·일지·댓글) 우선: 다른 자료는 같은 관련도일 때 한 단계 아래로
    for item in results:
        item.score *= _TYPE_WEIGHT.get(item.target_type, 1.0)

    # 단일 단어 검색이면 최근성 가중치를 높임
    # 점수는 0~1 척도(관련도)이므로 최근성은 보정 수준으로만 반영 (관련도를 뒤집지 않도록)
    _is_simple_keyword = (
        not natural
        and len(or_groups) == 1
        and len(or_groups[0]) == 1
        and len(or_groups[0][0]) <= 6
    )
    _recency_w = 0.10 if _is_simple_keyword else 0.05

    def _item_work_dt(item: UnifiedSearchItemOut) -> datetime | None:
        """work_date(업무 날짜) 기준 datetime 변환. updated_at 폴백."""
        from datetime import timezone as _tz
        if item.work_date:
            return datetime(item.work_date.year, item.work_date.month, item.work_date.day, tzinfo=_tz.utc)
        return item.updated_at

    sorted_results = sorted(
        results,
        key=lambda item: (
            item.score + _recency_bonus(_item_work_dt(item), _recency_w),
            _to_naive(item.updated_at),
        ),
        reverse=True,
    )

    start = (page - 1) * page_size
    end = start + page_size
    paged = sorted_results[start:end]

    by_source: dict[str, int] = {}
    by_target: dict[str, int] = {}
    for item in sorted_results:
        by_source[item.source] = by_source.get(item.source, 0) + 1
        by_target[item.target_type] = by_target.get(item.target_type, 0) + 1

    result = UnifiedSearchOut(
        items=paged,
        facets=UnifiedSearchFacetsOut(by_source=by_source, by_target=by_target),
        parsed_intent=parsed,
        partial=bool(unavailable_sources),
        unavailable_sources=unavailable_sources,
    )

    # 결과 캐시 저장
    if len(_RESULT_CACHE) >= _RESULT_CACHE_MAX:
        oldest = min(_RESULT_CACHE, key=lambda k: _RESULT_CACHE[k][0])
        del _RESULT_CACHE[oldest]
    _RESULT_CACHE[_cache_key] = (_now, result)

    return result
