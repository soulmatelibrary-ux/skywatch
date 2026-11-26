"""도메인 동의어 확장 서비스 (JSON 파일 기반).

data/domain_synonyms.json 에 동의어 그룹을 정의하면
벡터화 시점(문서)과 검색 시점(쿼리) 양쪽에서 자동 확장.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_SYNONYMS_PATH = Path(__file__).parent.parent.parent / "data" / "domain_synonyms.json"


@lru_cache(maxsize=1)
def _load_groups() -> list[list[str]]:
    """JSON에서 동의어 그룹 로드 (프로세스당 1회 캐시)."""
    try:
        with open(_SYNONYMS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return [g for g in data.get("synonyms", []) if isinstance(g, list)]
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"[WARN] domain_synonyms.json 로드 실패: {e}")
        return []


def reload_synonyms() -> None:
    """동의어 캐시 초기화 (파일 수정 후 즉시 반영용)."""
    _load_groups.cache_clear()


_MAX_ADDITIONS = 30  # 임베딩 품질 보호 (KURE-v1 토큰 한도)


def get_expanded_terms(term: str) -> list[str]:
    """term과 정확히 매칭되는 동의어 그룹의 모든 단어 반환.

    동의어 그룹에서 term이 정확히 일치하면 그룹 전체 반환.
    매칭 없으면 [term]만 반환.
    """
    if not term or len(term) < 2:
        return [term] if term else []
    groups = _load_groups()
    term_lower = term.lower().strip()
    result = [term]
    seen: set[str] = {term_lower}
    for group in groups:
        if any(t.lower().strip() == term_lower for t in group):
            for t in group:
                tl = t.lower().strip()
                if tl not in seen:
                    seen.add(tl)
                    result.append(t)
    return result


def expand_text(text: str) -> str:
    """텍스트에 도메인 동의어를 추가 확장.

    동의어 그룹 내 단어가 텍스트에 단어 단위로 포함되면 같은 그룹의 나머지 단어를 뒤에 추가.
    2자 이하 단어는 정확 매칭, 3자 이상은 부분 매칭 허용.
    원본 텍스트는 그대로 유지되며 확장어만 덧붙임.

    예)
        입력: "한/일 AIDC 실패"
        출력: "한/일 AIDC 실패 한일 한국 일본 KR JP 항공데이터통신 데이터링크 Air Data 장애내역 오류 고장 이상 불량"
    """
    if not text:
        return text

    groups = _load_groups()
    if not groups:
        return text

    import re
    additions: list[str] = []
    text_lower = text.lower()
    seen_additions: set[str] = set()

    for group in groups:
        matched = False
        for term in group:
            tl = term.lower().strip()
            if len(tl) <= 2:
                # 2자 이하: 단어 경계 매칭 (대소문자 무시)
                if re.search(r'(?<![a-zA-Z가-힣])' + re.escape(tl) + r'(?![a-zA-Z가-힣])', text_lower):
                    matched = True
                    break
            else:
                # 3자 이상: 부분 문자열 매칭 허용
                if tl in text_lower:
                    matched = True
                    break
        if matched:
            for t in group:
                tl = t.lower()
                if tl not in text_lower and tl not in seen_additions:
                    seen_additions.add(tl)
                    additions.append(t)

    if not additions:
        return text

    return text + " " + " ".join(additions[:_MAX_ADDITIONS])
