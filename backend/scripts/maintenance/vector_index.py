# -*- coding: utf-8 -*-
"""
벡터 인덱싱 CLI 스크립트.

사용법:
  python vector_index.py status              -- 전체 현황 조회
  python vector_index.py missing             -- 미완료 항목 목록 출력
  python vector_index.py run [대상] [옵션]   -- 벡터화 실행

대상 (기본값: all):
  all, logs, cards, inquiries, issues, tech_docs

옵션:
  --batch N   배치 크기 (기본 50)
  --dry-run   실제 저장 없이 미완료 개수만 출력
"""
import sys
import os
import time
import argparse

# 백엔드 루트를 sys.path에 추가
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.abspath(os.path.join(_HERE, "..", ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from sqlalchemy import select, func, text
from app.db.session import SessionLocal

# ──────────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────────

def _bar(current, total, width=30):
    pct = current / total if total else 0
    filled = int(width * pct)
    bar = "#" * filled + "-" * (width - filled)
    return f"[{bar}] {current}/{total} ({pct*100:.1f}%)"


def _print_section(title):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


# ──────────────────────────────────────────────
# STATUS (현황)
# ──────────────────────────────────────────────

def cmd_status():
    _print_section("벡터 인덱싱 현황")
    db = SessionLocal()
    try:
        rows = [
            _status_logs(db),
            _status_cards(db),
            _status_inquiries(db),
            _status_issues(db),
            _status_tech_docs(db),
        ]
        print(f"  {'항목':<12} {'전체':>7} {'완료':>7} {'미완료':>7}  {'커버리지':>8}")
        print("  " + "-" * 48)
        for name, total, done in rows:
            missing = total - done
            cov = f"{done/total*100:.1f}%" if total else "N/A"
            flag = "  [!]" if missing > 0 else ""
            print(f"  {name:<12} {total:>7,} {done:>7,} {missing:>7,}  {cov:>8}{flag}")
        print()
    finally:
        db.close()


def _status_logs(db):
    total = db.scalar(select(func.count()).select_from(text("skywatch_logs")).where(text("is_deleted = FALSE")))
    done  = db.scalar(select(func.count(text("DISTINCT log_id"))).select_from(text("skywatch_log_vectors")))
    return "일지(Logs)", total or 0, done or 0


def _status_cards(db):
    total = db.scalar(select(func.count()).select_from(text("skywatch_log_cards")).where(text("is_deleted = FALSE")))
    done  = db.scalar(select(func.count(text("DISTINCT card_id"))).select_from(text("skywatch_card_vectors")))
    return "카드(Cards)", total or 0, done or 0


def _status_inquiries(db):
    total = db.scalar(select(func.count()).select_from(text("skywatch_inquiries")).where(text("is_deleted = FALSE")))
    done  = db.scalar(select(func.count(text("DISTINCT inquiry_id"))).select_from(text("skywatch_inquiry_vectors")))
    return "문의(Inquiries)", total or 0, done or 0


def _status_issues(db):
    total = db.scalar(select(func.count()).select_from(text("skywatch_issues")).where(text("is_deleted = FALSE")))
    done  = db.scalar(select(func.count(text("DISTINCT issue_id"))).select_from(text("skywatch_issue_vectors")))
    return "PR관리(Issues)", total or 0, done or 0


def _status_tech_docs(db):
    total = db.scalar(select(func.count()).select_from(text("skywatch_tech_docs")).where(text("is_deleted = FALSE")))
    done  = db.scalar(select(func.count(text("DISTINCT tech_doc_id"))).select_from(text("skywatch_tech_doc_vectors")))
    return "기록문서(TechDocs)", total or 0, done or 0


# ──────────────────────────────────────────────
# MISSING (미완료 목록)
# ──────────────────────────────────────────────

def cmd_missing(target="all"):
    _print_section(f"미완료 항목 목록 [{target}]")
    db = SessionLocal()
    try:
        targets = _resolve_targets(target)
        for t in targets:
            ids = _get_missing_ids(db, t)
            if not ids:
                print(f"  [{t}] 모두 완료됨.")
                continue
            print(f"\n  [{t}] 미완료 {len(ids):,}건:")
            # 최대 100개만 출력
            show = ids[:100]
            for chunk in _chunks(show, 10):
                print("    " + "  ".join(str(i) for i in chunk))
            if len(ids) > 100:
                print(f"    ... 외 {len(ids)-100}건 더 있음.")
        print()
    finally:
        db.close()


def _get_missing_ids(db, target):
    queries = {
        "logs": (
            "SELECT id FROM skywatch_logs WHERE is_deleted=FALSE",
            "SELECT DISTINCT log_id FROM skywatch_log_vectors",
        ),
        "cards": (
            "SELECT id FROM skywatch_log_cards WHERE is_deleted=FALSE",
            "SELECT DISTINCT card_id FROM skywatch_card_vectors",
        ),
        "inquiries": (
            "SELECT id FROM skywatch_inquiries WHERE is_deleted=FALSE",
            "SELECT DISTINCT inquiry_id FROM skywatch_inquiry_vectors",
        ),
        "issues": (
            "SELECT id FROM skywatch_issues WHERE is_deleted=FALSE",
            "SELECT DISTINCT issue_id FROM skywatch_issue_vectors",
        ),
        "tech_docs": (
            "SELECT id FROM skywatch_tech_docs WHERE is_deleted=FALSE",
            "SELECT DISTINCT tech_doc_id FROM skywatch_tech_doc_vectors",
        ),
    }
    all_q, done_q = queries[target]
    all_ids  = set(r[0] for r in db.execute(text(all_q)).fetchall())
    done_ids = set(r[0] for r in db.execute(text(done_q)).fetchall())
    return sorted(all_ids - done_ids)


def _chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]


# ──────────────────────────────────────────────
# RUN (벡터화 실행)
# ──────────────────────────────────────────────

def cmd_run(target="all", batch_size=50, dry_run=False):
    _print_section(f"벡터화 실행 [{target}]  batch={batch_size}  dry_run={dry_run}")
    db = SessionLocal()
    try:
        targets = _resolve_targets(target)
        for t in targets:
            _run_target(db, t, batch_size, dry_run)
    finally:
        db.close()
    print("\n[완료] 모든 작업 종료.\n")


def _resolve_targets(target):
    all_targets = ["logs", "cards", "inquiries", "issues", "tech_docs"]
    if target == "all":
        return all_targets
    if target not in all_targets:
        print(f"[오류] 알 수 없는 대상: {target}")
        print(f"  가능한 값: all, {', '.join(all_targets)}")
        sys.exit(1)
    return [target]


def _run_target(db, target, batch_size, dry_run):
    missing = _get_missing_ids(db, target)
    total = len(missing)
    if total == 0:
        print(f"\n  [{target}] 미완료 항목 없음. 건너뜀.")
        return

    print(f"\n  [{target}] 미완료 {total:,}건 처리 시작...")
    if dry_run:
        print(f"  [dry-run] 실제 저장 없이 종료.")
        return

    fn_map = {
        "logs":      _run_log,
        "cards":     _run_card,
        "inquiries": _run_inquiry,
        "issues":    _run_issue,
        "tech_docs": _run_tech_doc,
    }
    run_fn = fn_map[target]

    ok = 0
    err = 0
    start = time.time()

    for i, item_id in enumerate(missing, 1):
        try:
            run_fn(db, item_id)
            ok += 1
        except Exception as e:
            err += 1
            try:
                db.rollback()
            except Exception:
                pass
            print(f"\n  [WARN] id={item_id} 실패: {e}")

        # 진행 상황 출력 (배치마다 or 마지막)
        if i % batch_size == 0 or i == total:
            elapsed = time.time() - start
            speed = i / elapsed if elapsed > 0 else 0
            eta = (total - i) / speed if speed > 0 else 0
            print(f"\r  {_bar(i, total)}  오류:{err}  {speed:.1f}건/s  ETA:{eta:.0f}s  ", end="", flush=True)

    elapsed = time.time() - start
    print(f"\n  [{target}] 완료: 성공 {ok:,}건 / 실패 {err}건 / {elapsed:.1f}초")


def _run_log(db, log_id):
    from app.services.vector_service import vectorize_log
    vectorize_log(log_id, db, commit=True)


def _run_card(db, card_id):
    from app.services.card_vector_service import vectorize_card
    vectorize_card(card_id, db, commit=True)


def _run_inquiry(db, inquiry_id):
    from app.services.inquiry_vector_service import vectorize_inquiry
    vectorize_inquiry(db, inquiry_id)


def _run_issue(db, issue_id):
    from app.services.issue_vector_service import vectorize_issue
    vectorize_issue(db=db, issue_id=issue_id)


def _run_tech_doc(db, tech_doc_id):
    from app.services.tech_doc_vector_service import vectorize_tech_doc
    vectorize_tech_doc(tech_doc_id, db, commit=True)


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SkyWatch 벡터 인덱싱 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="cmd")

    # status
    sub.add_parser("status", help="전체 현황 조회")

    # missing
    p_missing = sub.add_parser("missing", help="미완료 항목 목록 출력")
    p_missing.add_argument("target", nargs="?", default="all",
                           choices=["all","logs","cards","inquiries","issues","tech_docs"])

    # run
    p_run = sub.add_parser("run", help="벡터화 실행")
    p_run.add_argument("target", nargs="?", default="all",
                       choices=["all","logs","cards","inquiries","issues","tech_docs"])
    p_run.add_argument("--batch", type=int, default=50, metavar="N", help="배치 크기 (기본 50)")
    p_run.add_argument("--dry-run", action="store_true", help="미완료 개수만 확인, 실제 저장 안 함")

    args = parser.parse_args()

    if args.cmd == "status":
        cmd_status()
    elif args.cmd == "missing":
        cmd_missing(args.target)
    elif args.cmd == "run":
        cmd_run(args.target, args.batch, args.dry_run)
    else:
        # 인수 없이 실행 → status + missing 요약
        cmd_status()
        print("사용법: python vector_index.py [status|missing|run] [대상]")
        print("  대상: all, logs, cards, inquiries, issues, tech_docs")
        print("  예시: python vector_index.py run logs --batch 100")


if __name__ == "__main__":
    main()
