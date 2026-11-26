"""통합검색 정확도 평가 스크립트.

사용법:
    python scripts/eval_search.py                      # 기본 평가셋(data/search_eval_set.json)
    python scripts/eval_search.py --out before.json    # 결과 저장
    python scripts/eval_search.py --compare before.json  # 이전 결과와 비교

지표:
    natural(자연어 질의)
      - Hit@10   : 상위 10건 안에 정답이 1건 이상 있으면 1
      - Recall@20: 정답 중 상위 20건 안에 들어온 비율
      - MRR      : 첫 정답 순위의 역수 (50위 밖이면 0)
      - card     : 카드 탭(target=card) 기준
      - all      : 업무 탭(source=skywatch, target=all) 기준. 정답 카드가 속한 일지도 정답으로 인정
    keyword(정확 키워드 회귀)
      - P@10     : 카드 탭 상위 10건 중 정답 패턴(제목/본문 ILIKE)에 맞는 비율

외부 의존성 없음 (앱 모듈만 사용) — 내부망에서 그대로 실행 가능.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("PGCLIENTENCODING", "UTF8")

from sqlalchemy import or_, select

from app.db.session import SessionLocal
from app.models.log import LogCard
from app.services.search_service import unified_search

_DEFAULT_SET = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "search_eval_set.json")
_DEPTH = 50


def _ranked(db, q: str, target: str) -> list[tuple[str, int]]:
    out = unified_search(db, q=q, source="skywatch", target=target, page=1, page_size=_DEPTH)
    return [(item.target_type, item.target_id) for item in out.items]


def _metrics(ranked: list[tuple[str, int]], relevant: set[tuple[str, int]], n_rel: int) -> dict:
    hit_ranks = [i + 1 for i, key in enumerate(ranked) if key in relevant]
    found_cards = {key for key in ranked[:20] if key in relevant and key[0] == "card"}
    return {
        "hit10": 1.0 if any(r <= 10 for r in hit_ranks) else 0.0,
        "recall20": len(found_cards) / n_rel if n_rel else 0.0,
        "mrr": 1.0 / hit_ranks[0] if hit_ranks else 0.0,
        "first": hit_ranks[0] if hit_ranks else None,
    }


def _eval_natural(db, case: dict) -> dict:
    card_ids = set(case["relevant_cards"])
    log_ids = set(db.scalars(select(LogCard.log_id).where(LogCard.id.in_(card_ids))).all())
    rel_card = {("card", cid) for cid in card_ids}
    rel_all = rel_card | {("log", lid) for lid in log_ids}

    t0 = time.perf_counter()
    card_res = _metrics(_ranked(db, case["query"], "card"), rel_card, len(card_ids))
    elapsed = time.perf_counter() - t0
    all_res = _metrics(_ranked(db, case["query"], "all"), rel_all, len(card_ids))
    return {"id": case["id"], "card": card_res, "all": all_res, "sec": round(elapsed, 2)}


def _eval_keyword(db, case: dict) -> dict:
    ranked = [tid for ttype, tid in _ranked(db, case["query"], "card") if ttype == "card"][:10]
    if not ranked:
        return {"id": case["id"], "p10": 0.0, "n": 0}
    conds = []
    for pat in case["relevant_like"]:
        conds.append(LogCard.title.ilike(pat))
        conds.append(LogCard.content.ilike(pat))
    ok = set(db.scalars(select(LogCard.id).where(LogCard.id.in_(ranked), or_(*conds))).all())
    return {"id": case["id"], "p10": len(ok) / len(ranked), "n": len(ranked)}


def _avg(rows: list[dict], path: tuple[str, ...]) -> float:
    vals = []
    for r in rows:
        v = r
        for p in path:
            v = v[p]
        vals.append(v)
    return sum(vals) / len(vals) if vals else 0.0


def _summary(result: dict) -> dict:
    nat, kw = result["natural"], result["keyword"]
    return {
        "card_hit10": _avg(nat, ("card", "hit10")),
        "card_recall20": _avg(nat, ("card", "recall20")),
        "card_mrr": _avg(nat, ("card", "mrr")),
        "all_hit10": _avg(nat, ("all", "hit10")),
        "all_mrr": _avg(nat, ("all", "mrr")),
        "kw_p10": _avg(kw, ("p10",)),
        "avg_sec": _avg(nat, ("sec",)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="통합검색 정확도 평가")
    parser.add_argument("--set", default=_DEFAULT_SET, help="평가셋 JSON 경로")
    parser.add_argument("--out", help="결과 저장 JSON 경로")
    parser.add_argument("--compare", help="비교할 이전 결과 JSON 경로")
    args = parser.parse_args()

    with open(args.set, encoding="utf-8") as f:
        eval_set = json.load(f)

    db = SessionLocal()
    try:
        _ranked(db, "워밍업", "card")  # 모델 로딩 시간 제외
        result = {
            "natural": [_eval_natural(db, c) for c in eval_set["natural"]],
            "keyword": [_eval_keyword(db, c) for c in eval_set["keyword"]],
        }
    finally:
        db.close()
    result["summary"] = _summary(result)

    print(f"{'id':<24}{'card first':>11}{'card R@20':>11}{'all first':>11}{'sec':>7}")
    for r in result["natural"]:
        print(f"{r['id']:<24}{str(r['card']['first']):>11}{r['card']['recall20']:>11.2f}"
              f"{str(r['all']['first']):>11}{r['sec']:>7.2f}")
    for r in result["keyword"]:
        print(f"{r['id']:<24}{'P@10':>11}{r['p10']:>11.2f}")

    prev = None
    if args.compare:
        with open(args.compare, encoding="utf-8") as f:
            prev = json.load(f).get("summary")
    print("\n[summary]")
    for key, val in result["summary"].items():
        line = f"  {key:<14}{val:8.3f}"
        if prev and key in prev:
            line += f"   (이전 {prev[key]:.3f}, 변화 {val - prev[key]:+.3f})"
        print(line)

    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n저장: {args.out}")


if __name__ == "__main__":
    main()
