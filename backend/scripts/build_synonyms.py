"""동의어 후보 자동 추출 스크립트.

DB 카드 본문에서 자주 같이 쓰이는 단어쌍(co-occurrence)을 분석하여
동의어 사전에 추가할 후보를 제안한다.

사용법 (skywatch/backend 에서 실행, 루트 .venv):
  python scripts/build_synonyms.py
  python scripts/build_synonyms.py --min-cooc 10 --top 100
  python scripts/build_synonyms.py --out suggestions.json

출력: 동의어 후보 목록 (기존 사전에 없는 쌍만)
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

# 프로젝트 경로 설정
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.log import LogCard

SYNONYMS_PATH = Path(__file__).parent.parent / "data" / "domain_synonyms.json"

# 불용어 (너무 흔하거나 의미 없는 단어)
STOPWORDS = {
    "있다", "없다", "하다", "되다", "이다", "않다", "보다", "오다", "가다",
    "있는", "없는", "하는", "되는", "않는", "관련", "내용", "확인", "발생",
    "조치", "현황", "사항", "시스템", "프로그램", "서버", "운용", "정상",
    "결과", "상태", "작업", "완료", "진행", "요청", "처리", "보고",
    "운영", "점검", "장애", "문의", "관리", "변경", "설정", "기록",
    "대한", "통해", "위한", "따른", "의한", "대해", "하여", "이후",
}

# 약어 패턴 (영문 대문자 2~6자)
ABBR_RE = re.compile(r'\b[A-Z][A-Z0-9]{1,5}\b')
# 한글 복합명사 (2~8자)
KR_TERM_RE = re.compile(r'[가-힣]{2,8}')


def clean_text(raw: str) -> str:
    """HTML 태그 제거, 특수문자 정리."""
    text = html.unescape(re.sub(r'<[^>]+>', ' ', raw or ""))
    return re.sub(r'\s+', ' ', text).strip()


def extract_terms(text: str) -> list[str]:
    """텍스트에서 의미 있는 용어 추출."""
    text = clean_text(text)
    terms = set()

    # 영문 약어
    for m in ABBR_RE.finditer(text):
        t = m.group()
        if len(t) >= 2 and t not in {"OK", "AM", "PM", "ID", "OR", "AN", "IF", "IT", "NO", "ON", "UP"}:
            terms.add(t)

    # 영문+숫자 혼합 (SL-8670, D-2024-004 등은 제외)
    for m in re.finditer(r'\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b', text):
        terms.add(m.group())  # CamelCase 단어

    # 한글 복합명사 (불용어 제외)
    for m in KR_TERM_RE.finditer(text):
        t = m.group()
        if t not in STOPWORDS and len(t) >= 2:
            terms.add(t)

    return list(terms)


def load_existing_synonyms() -> set[frozenset[str]]:
    """기존 동의어 사전의 단어쌍 집합."""
    try:
        with open(SYNONYMS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        groups = data.get("synonyms", [])
        pairs = set()
        for g in groups:
            lower = [t.lower().strip() for t in g]
            for a, b in combinations(lower, 2):
                pairs.add(frozenset([a, b]))
        return pairs
    except Exception:
        return set()


def analyze_cooccurrence(min_cooc: int = 5, top_n: int = 200) -> list[dict]:
    """DB 카드에서 co-occurrence 분석."""
    db = SessionLocal()
    try:
        # 활성 카드 조회
        rows = db.execute(
            select(LogCard.title, LogCard.content)
            .where(LogCard.is_deleted.is_(False))
        ).all()
        print(f"카드 {len(rows)}건 분석 중...")

        # 카드별 용어 추출
        doc_terms: list[set[str]] = []
        term_df: Counter = Counter()  # 문서 빈도

        for title, content in rows:
            text = f"{title or ''} {content or ''}"
            terms = set(extract_terms(text))
            if terms:
                doc_terms.append(terms)
                for t in terms:
                    term_df[t] += 1

        # co-occurrence 계산 (같은 카드에 함께 등장)
        cooc: Counter = Counter()
        for terms in doc_terms:
            # 너무 흔한 단어(전체 카드의 20% 이상)는 제외
            threshold = len(doc_terms) * 0.2
            filtered = [t for t in terms if term_df[t] < threshold]
            for a, b in combinations(sorted(filtered), 2):
                cooc[frozenset([a, b])] += 1

        # 기존 사전에 이미 있는 쌍 제외
        existing = load_existing_synonyms()
        new_pairs = [
            (pair, count)
            for pair, count in cooc.most_common(top_n * 3)
            if count >= min_cooc and pair not in existing
        ]

        # PMI (Pointwise Mutual Information) 기반 정렬
        total_docs = len(doc_terms)
        suggestions = []
        for pair, count in new_pairs:
            a, b = list(pair)
            pmi = (count / total_docs) / ((term_df[a] / total_docs) * (term_df[b] / total_docs) + 1e-10)
            suggestions.append({
                "terms": sorted(pair),
                "cooccurrence": count,
                "pmi": round(pmi, 2),
                "df_a": term_df[a],
                "df_b": term_df[b],
            })

        # PMI 높은 순 (강한 연관성)
        suggestions.sort(key=lambda x: x["pmi"], reverse=True)
        return suggestions[:top_n]

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="동의어 후보 자동 추출")
    parser.add_argument("--min-cooc", type=int, default=5, help="최소 동시 출현 횟수 (기본 5)")
    parser.add_argument("--top", type=int, default=200, help="상위 N개 출력 (기본 200)")
    parser.add_argument("--out", type=str, help="결과 저장 파일 (JSON)")
    args = parser.parse_args()

    suggestions = analyze_cooccurrence(min_cooc=args.min_cooc, top_n=args.top)

    if not suggestions:
        print("새로운 동의어 후보가 없습니다.")
        return

    print(f"\n=== 동의어 후보 상위 {len(suggestions)}개 ===\n")
    print(f"{'순위':>4} {'단어 A':<20} {'단어 B':<20} {'동시출현':>6} {'PMI':>6}")
    print("-" * 70)
    for i, s in enumerate(suggestions, 1):
        a, b = s["terms"]
        print(f"{i:4d} {a:<20} {b:<20} {s['cooccurrence']:6d} {s['pmi']:6.1f}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(suggestions, f, ensure_ascii=False, indent=2)
        print(f"\n결과 저장: {args.out}")

    print(f"\n검수 후 data/domain_synonyms.json 에 추가하세요.")
    print("사용 예: [\"단어A\", \"단어B\", \"단어C\"] 형태로 synonyms 배열에 추가")


if __name__ == "__main__":
    main()
