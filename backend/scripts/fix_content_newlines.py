"""기존 기록문서 평문 content를 TipTap HTML 형식으로 일괄 변환 (1회 실행용).

사용법:
    python scripts/fix_content_newlines.py [--dry-run]

--dry-run: DB를 변경하지 않고 변환 결과만 출력
"""
from __future__ import annotations

import argparse
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal


def text_to_html(s: str) -> str:
    """평문 content를 TipTap HTML 형식으로 변환.

    CSV 인코딩 과정에서 생긴 \\r\\r\\n 패턴도 처리:
      \\r\\r\\n\\r\\r\\n → 단락 구분 (빈 줄)
      \\r\\r\\n         → 줄바꿈
    """
    # \r\r\n 패턴 정규화 (CSV 과정에서 발생)
    s = s.replace('\r\r\n\r\r\n', '\n\n').replace('\r\r\n', '\n')
    # 그 외 줄바꿈 정규화
    s = s.replace('\r\n', '\n').replace('\r', '\n')

    paragraphs = s.split('\n\n')
    parts = [f'<p>{para.replace(chr(10), "<br>")}</p>' for para in paragraphs if para.strip()]
    return ''.join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description="기록문서 평문 content → HTML 일괄 변환")
    parser.add_argument('--dry-run', action='store_true', help='DB 변경 없이 결과만 출력')
    args = parser.parse_args()

    db = SessionLocal()
    try:
        rows = db.execute(text(
            "SELECT id, content FROM skywatch_tech_docs "
            "WHERE content IS NOT NULL AND content NOT LIKE '<%'"
        )).fetchall()

        print(f"변환 대상: {len(rows)}건")
        if args.dry_run:
            print("[dry-run mode - DB unchanged]")

        converted = 0
        for row in rows:
            doc_id, content = row
            html = text_to_html(content)
            if not html:
                continue
            if args.dry_run:
                preview = html[:150].replace('\n', '↵')
                print(f"  id={doc_id}: {preview}...")
            else:
                db.execute(
                    text("UPDATE skywatch_tech_docs SET content=:c WHERE id=:id"),
                    {"c": html, "id": doc_id}
                )
                converted += 1
                if converted % 200 == 0:
                    db.commit()
                    print(f"  ... {converted}건 처리 중")

        if not args.dry_run:
            db.commit()
            print(f"완료: {converted}건 변환.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
