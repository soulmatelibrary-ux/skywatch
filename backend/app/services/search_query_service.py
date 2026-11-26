"""자연어(문장형) 검색 질의 처리.

공백 AND 검색은 문장형 질의("CA가 끝났는데 데이터블럭에 계속 남아있는 경우")에서
모든 단어가 들어간 문서만 찾으므로 결과가 거의 없다.
문장형 질의는 조사·어미를 떼어 핵심어만 남기고, 핵심어별 IDF 가중치로
"얼마나 많은 핵심어가 맞는지" 순위를 매긴다 (외부 형태소 분석기 없이 동작).
"""
from __future__ import annotations

import math
import re
import time
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.log import LogCard

# IDF 가중치 TTL 캐시 (10분). 매 쿼리마다 전체 카드 코퍼스 집계하던 것을 캐시.
_IDF_CACHE: dict[str, Any] = {}  # {cache_key: (timestamp, weights)}
_IDF_TTL = 600  # 초 (10분)

_MIN_NATURAL_GROUPS = 3
_OPERATOR_RE = re.compile(r'["|&!]')

# 긴 것부터 검사 (예: "에서"를 "서"보다 먼저)
_JOSA = sorted([
    "에서는", "으로는", "에게서", "이라는", "에서", "으로", "에게", "까지", "부터", "이랑", "하고",
    "처럼", "보다", "마다", "에는", "와는", "과는", "이나", "라는", "은", "는", "이", "가", "을",
    "를", "에", "의", "와", "과", "도", "만", "로", "랑",
    # 관형형 어미 ("실패한" → "실패"). 부분일치 검색이라 명사 끝음절이 잘려도 상위집합이 됨
    "한", "된", "던", "진",
], key=len, reverse=True)

# 서술어 어미로 끝나는 토큰은 핵심어가 아님 (명사 오삭제를 피하려고 확실한 어미만)
_PREDICATE_ENDINGS = (
    "는데", "는지", "하면", "되면", "으면", "해서", "돼서", "되서", "라서", "어서", "아서",
    "했는데", "됐는데", "해야", "돼야", "되어야", "했음", "됐음", "하였음", "됨", "하는", "되는",
    "있는", "없는", "않는", "했다", "됐다", "한다", "된다", "는가", "나요", "까요", "어요",
    "다고", "라고", "었다", "았다", "였다", "졌다",
)

_STOPWORDS = {
    "경우", "문제", "이유", "원인", "현상", "관련", "의미", "방법", "내용", "어떻게", "어떤",
    "무엇", "뭐", "왜", "계속", "다른", "그리고", "또는", "및", "등", "때", "것", "수", "안", "못",
    "때문", "다름", "보임", "못함",
}


def contains(column, term: str):
    """부분일치 조건. 대소문자가 없는 검색어(한글·숫자 등)는 LIKE를 사용.

    결과는 ILIKE와 같고, 한글은 ILIKE의 소문자 변환 비용이 커서 LIKE가 약 18배 빠름 (실측).
    """
    pattern = f"%{term}%"
    return column.like(pattern) if term.lower() == term.upper() else column.ilike(pattern)


def is_natural_query(q: str, or_groups: list[list[str]]) -> bool:
    """연산자 없이 3단어 이상이면 문장형 질의로 본다 (2단어 이하는 기존 AND 유지)."""
    return not _OPERATOR_RE.search(q) and len(or_groups) >= _MIN_NATURAL_GROUPS


def _strip_token(token: str) -> str:
    token = token.strip(" .,?!~()[]")
    if any(token.endswith(e) for e in _PREDICATE_ENDINGS):
        return ""
    if token.endswith("는") and len(token) <= 2:  # "뜨는", "오는" 등 1음절 어간 동사
        return ""
    for josa in _JOSA:
        if token.endswith(josa) and len(token) - len(josa) >= 2:
            return token[: -len(josa)]
    return token


def extract_keywords(or_groups: list[list[str]]) -> list[list[str]]:
    """문장형 질의의 각 단어에서 조사·어미·불용어를 제거한 핵심어 그룹 반환."""
    result: list[list[str]] = []
    seen: set[str] = set()
    for group in or_groups:
        for raw in group:
            token = _strip_token(raw)
            if len(token) < 2 or token in _STOPWORDS or token.lower() in seen:
                continue
            seen.add(token.lower())
            result.append([token])
    return result


def term_group_weights(db: Session, term_groups: list[list[str]], max_terms: int = 6) -> list[float]:
    """그룹별 IDF 가중치 (업무일지 카드 전체 기준). 흔한 단어일수록 가중치가 낮다.

    TTL 캐시: 같은 검색어 그룹은 10분간 DB 재조회 없이 캐시 반환 (~100-200ms 절약).
    """
    if not term_groups:
        return []

    # 캐시 키: 그룹 내 단어를 정렬·소문자로 고정
    cache_key = "|".join(
        ",".join(sorted(t.lower() for t in g[:max_terms])) for g in term_groups
    )
    now = time.monotonic()
    cached = _IDF_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _IDF_TTL:
        return cached[1]

    counts = [
        func.count().filter(or_(*[
            or_(contains(LogCard.title, t), contains(LogCard.content, t)) for t in group[:max_terms]
        ]))
        for group in term_groups
    ]
    row = db.execute(select(func.count(), *counts).where(LogCard.is_deleted.is_(False))).one()
    total = row[0] or 1
    weights = [math.log((total + 1) / (df + 1)) if df else 0.0 for df in row[1:]]

    # 캐시 저장 (오래된 항목 정리: 100개 초과 시 가장 오래된 것 삭제)
    if len(_IDF_CACHE) > 100:
        oldest_key = min(_IDF_CACHE, key=lambda k: _IDF_CACHE[k][0])
        del _IDF_CACHE[oldest_key]
    _IDF_CACHE[cache_key] = (now, weights)
    return weights


def min_match_weight(weights: list[float], ratio: float = 0.3) -> float:
    """결과로 인정할 최소 매칭 가중치 (실제로 존재하는 핵심어 가중치 합의 일정 비율)."""
    return sum(w for w in weights if w > 0) * ratio
