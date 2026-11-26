"""동의어 후보 추출 스크립트 (KURE-v1 임베딩 기반).

사용법:
    python scripts/build_synonym_candidates.py \\
        --seed "CA,SA,데이터블럭,이중항적,STCA,경고전시,경고해제" \\
        --top-k 15 \\
        --out synonym_candidates.csv

동작:
    1. DB에서 log_cards + tech_docs 본문 전체 로드
    2. seed 단어가 포함된 문장 추출
    3. 해당 문장에서 n-gram 후보 추출
    4. KURE-v1으로 seed + 후보 임베딩 → 코사인 유사도 계산
    5. 상위 K개를 CSV로 출력 (사람 검수용)
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("PGCLIENTENCODING", "UTF8")

import numpy as np
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.vector_model import _normalize_text, encode_texts

_MIN_SENT_LEN = 10   # 이 길이 미만 문장 제외
_PHRASE_MIN = 2      # 후보 최소 문자 수
_PHRASE_MAX = 30     # 후보 최대 문자 수
_BATCH_SIZE = 256    # 임베딩 배치 크기


def split_sentences(raw: str) -> list[str]:
    """HTML 제거 후 문장 단위 분리."""
    text = _normalize_text(raw)
    parts = re.split(r'(?<=[.!?。])\s+|[\n\r;]+', text)
    return [s.strip() for s in parts if len(s.strip()) >= _MIN_SENT_LEN]


def extract_ngrams(sentence: str) -> list[str]:
    """1~3 토큰 n-gram 후보 추출 (문자 길이 필터 적용)."""
    tokens = sentence.split()
    phrases: set[str] = set()
    for n in range(1, 4):
        for i in range(len(tokens) - n + 1):
            phrase = " ".join(tokens[i : i + n])
            if _PHRASE_MIN <= len(phrase) <= _PHRASE_MAX:
                phrases.add(phrase)
    return list(phrases)


def load_corpus(db) -> list[tuple[str, str]]:
    """(source_label, content) 목록 반환."""
    rows: list[tuple[str, str]] = []
    for row in db.execute(text(
        "SELECT id, content FROM skywatch_log_cards"
        " WHERE is_deleted = false AND content IS NOT NULL AND content <> ''"
    )):
        rows.append((f"log_card:{row[0]}", row[1]))
    for row in db.execute(text(
        "SELECT id, content FROM skywatch_tech_docs"
        " WHERE content IS NOT NULL AND content <> ''"
    )):
        rows.append((f"tech_doc:{row[0]}", row[1]))
    return rows


def batch_encode(texts: list[str]) -> list[np.ndarray]:
    """배치 분할 encode_texts 래퍼."""
    result: list[np.ndarray] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        result.extend(encode_texts(texts[i : i + _BATCH_SIZE]))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="동의어 후보 추출")
    parser.add_argument(
        "--seed",
        default="CA,SA,데이터블럭,이중항적,STCA,경고전시,경고해제",
    )
    parser.add_argument("--top-k", type=int, default=15)
    parser.add_argument("--min-score", type=float, default=0.70)
    parser.add_argument("--out", default="synonym_candidates.csv")
    args = parser.parse_args()

    seeds = [s.strip() for s in args.seed.split(",") if s.strip()]
    print(f"[INFO] Seed 단어 ({len(seeds)}개): {seeds}")

    db = SessionLocal()
    try:
        print("[INFO] 코퍼스 로드 중...")
        corpus = load_corpus(db)
    finally:
        db.close()

    print(f"[INFO] {len(corpus):,}개 문서 로드 완료")

    # seed별 (phrase → (source, snippet)) 수집
    seed_phrases: dict[str, dict[str, tuple[str, str]]] = defaultdict(dict)

    print("[INFO] 문장 분리 및 후보 수집 중...")
    for source, content in corpus:
        for sentence in split_sentences(content):
            sent_lower = sentence.lower()
            for seed in seeds:
                if seed.lower() not in sent_lower:
                    continue
                for phrase in extract_ngrams(sentence):
                    if phrase.lower() == seed.lower():
                        continue
                    pm = seed_phrases[seed]
                    if phrase not in pm:
                        pm[phrase] = (source, sentence[:120])

    records: list[dict] = []

    for seed in seeds:
        phrase_map = seed_phrases[seed]
        if not phrase_map:
            print(f"[WARN] '{seed}' 관련 후보 없음 — 스킵")
            continue

        unique = list(phrase_map.keys())
        print(f"[INFO] '{seed}': 후보 {len(unique):,}개 임베딩 중...")

        try:
            vecs = batch_encode([seed] + unique)
        except Exception as exc:
            print(f"[ERROR] '{seed}' 임베딩 실패: {exc}")
            continue

        seed_vec = np.array(vecs[0])
        scored = sorted(
            ((unique[i], float(np.dot(seed_vec, vecs[i + 1]))) for i in range(len(unique))),
            key=lambda x: x[1],
            reverse=True,
        )

        for phrase, score in scored[: args.top_k]:
            if score < args.min_score:
                break
            src, snippet = phrase_map[phrase]
            records.append({
                "seed": seed,
                "candidate": phrase,
                "score": f"{score:.4f}",
                "source": src,
                "snippet": snippet,
                "include": "",   # 검수자: O=포함 / X=제외
            })

    fieldnames = ["seed", "candidate", "score", "source", "snippet", "include"]
    with open(args.out, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"\n[DONE] {len(records)}개 후보 → {args.out}")
    print("'include' 열에 O/X 표시 후 domain_synonyms.json에 반영하세요.")


if __name__ == "__main__":
    main()
