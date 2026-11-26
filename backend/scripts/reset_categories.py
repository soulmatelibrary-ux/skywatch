"""카테고리 재설정 스크립트 — data/카테고리.png 기준으로 정리.

사용법:
    python scripts/reset_categories.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal

# 레퍼런스 카테고리 정의: (project_code, category_code, name, sort_order, is_active)
REFERENCE_CATEGORIES = [
    # GEN
    ("GEN",       "GEN01", "사무실",          1, True),
    ("GEN",       "GEN02", "참고자료",         2, True),
    # SECURITY
    ("SECURITY",  "SEC",   "보안점검",         1, True),
    # SKYLINE
    ("SKYLINE",   "SKY07", "SKYLINE 매뉴얼",   1, True),
    ("SKYLINE",   "SKY06", "분석결과",         2, True),
    ("SKYLINE",   "SKY10", "알림장",           3, True),
    ("SKYLINE",   "SKY14", "분석 보고서",      4, True),
    ("SKYLINE",   "SKY09", "업무일지",         5, True),
    ("SKYLINE",   "SKY15", "유지보수용역",     6, True),
    ("SKYLINE",   "SKY08", "교육훈련실",       7, True),
    ("SKYLINE",   "SKY16", "제작사QNA",        8, True),
    ("SKYLINE",   "SKY17", "적용자료",         9, True),
    ("SKYLINE",   "SKY99", "운영일지",        10, True),
    # SKYLINE-1
    ("SKYLINE-1", "SKY03", "운영이슈관리",     0, True),
    ("SKYLINE-1", "SKY11", "전산개발심의",     1, True),
    ("SKYLINE-1", "SKY12", "SKYLINE 수정본",   2, True),
    ("SKYLINE-1", "SKY04", "외부인터페이스",   3, True),
    ("SKYLINE-1", "SKY05", "FDT",              4, True),
    ("SKYLINE-1", "SKY13", "기타",             5, True),
    # SUPPORT
    ("SUPPORT",   "SPT04", "데이터베이스",     1, True),
    ("SUPPORT",   "SPT13", "정보 노하우",      2, True),
    ("SUPPORT",   "SPT14", "쿼리 & 매크로",   3, True),
    ("SUPPORT",   "SPT06", "통계시스템",       4, True),
    ("SUPPORT",   "SPT09", "프로그램 TIP",     5, True),
    ("SUPPORT",   "SPT03", "항공기상정보",     6, True),
    ("SUPPORT",   "SPT08", "사이트 매뉴얼",   7, True),
    ("SUPPORT",   "SPT11", "일반업무",         8, True),
    # TOPEN
    ("TOPEN",     "TST01", "A조(SKYLINE)",     1, True),
    ("TOPEN",     "TST02", "B조(AIDC)",        2, True),
    ("TOPEN",     "TST03", "C조(EFW)",         3, True),
    ("TOPEN",     "TST04", "D조(CSAT)",        4, True),
    ("TOPEN",     "TST05", "자료보관",         5, True),
    ("TOPEN",     "TST06", "외부교육",         6, True),
]

# category_code → 올바른 project_code 매핑 (문서 project_code 일괄 수정용)
CODE_TO_PROJECT: dict[str, str] = {
    "GEN01": "GEN",   "GEN02": "GEN",
    "SEC":   "SECURITY",
    "SKY03": "SKYLINE-1", "SKY04": "SKYLINE-1", "SKY05": "SKYLINE-1",
    "SKY11": "SKYLINE-1", "SKY12": "SKYLINE-1", "SKY13": "SKYLINE-1",
    "SKY06": "SKYLINE", "SKY07": "SKYLINE", "SKY08": "SKYLINE",
    "SKY09": "SKYLINE", "SKY10": "SKYLINE", "SKY14": "SKYLINE",
    "SKY15": "SKYLINE", "SKY16": "SKYLINE", "SKY17": "SKYLINE",
    "SKY99": "SKYLINE",
    "SPT03": "SUPPORT", "SPT04": "SUPPORT", "SPT06": "SUPPORT",
    "SPT08": "SUPPORT", "SPT09": "SUPPORT", "SPT11": "SUPPORT",
    "SPT13": "SUPPORT", "SPT14": "SUPPORT",
    "TST01": "TOPEN", "TST02": "TOPEN", "TST03": "TOPEN",
    "TST04": "TOPEN", "TST05": "TOPEN", "TST06": "TOPEN",
}


def reset(db) -> None:
    # 1. 기존 카테고리 전체 비활성화
    db.execute(text("UPDATE skywatch_tech_doc_categories SET is_active = FALSE"))
    print("[카테고리] 기존 항목 전체 비활성화")

    # 2. 레퍼런스 카테고리 upsert
    for proj, code, name, sort, active in REFERENCE_CATEGORIES:
        exists = db.execute(text(
            "SELECT id FROM skywatch_tech_doc_categories "
            "WHERE project_code=:p AND category_code=:c"
        ), {"p": proj, "c": code}).fetchone()

        if exists:
            db.execute(text(
                "UPDATE skywatch_tech_doc_categories "
                "SET name=:n, sort_order=:s, is_active=:a "
                "WHERE project_code=:p AND category_code=:c"
            ), {"n": name, "s": sort, "a": active, "p": proj, "c": code})
        else:
            db.execute(text(
                "INSERT INTO skywatch_tech_doc_categories "
                "(project_code, category_code, name, sort_order, is_active) "
                "VALUES (:p, :c, :n, :s, :a)"
            ), {"p": proj, "c": code, "n": name, "s": sort, "a": active})

    db.commit()
    print(f"[카테고리] {len(REFERENCE_CATEGORIES)}개 upsert 완료")

    # 3. 문서 project_code 일괄 수정
    updated_total = 0
    for ccode, pcode in CODE_TO_PROJECT.items():
        result = db.execute(text(
            "UPDATE skywatch_tech_docs "
            "SET project_code=:p "
            "WHERE category_code=:c AND project_code != :p AND is_deleted=FALSE"
        ), {"p": pcode, "c": ccode})
        cnt = result.rowcount
        if cnt:
            print(f"  [문서] {ccode} → project_code={pcode} ({cnt}건 수정)")
            updated_total += cnt

    db.commit()
    print(f"[문서] project_code 수정 완료: {updated_total}건")


def main() -> None:
    db = SessionLocal()
    try:
        reset(db)
        print("\n카테고리 재설정 완료.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
