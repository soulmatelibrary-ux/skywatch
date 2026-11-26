"""
문의사항 샘플 데이터 삽입 스크립트

사용법:
  python seed_inquiries.py          # 테이블 생성 + 데이터 삽입
  python seed_inquiries.py --reset  # 기존 데이터 삭제 후 재삽입
  python seed_inquiries.py --dry    # 미리보기
"""
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from sqlalchemy import text, inspect

# 2026년 3월 샘플 문의사항 데이터
INQUIRY_DATA = [
    # (inquiry_no, occurred_date, occurred_time, controller_sector, category, keyword, content, status, pr_no)
    ("2026-03-001", "2026-03-01", "09:30", "인천1", "시스템", "로그인 오류", "관제 시스템 로그인 불가", "completed", "PR-2026-0301"),
    ("2026-03-002", "2026-03-01", "10:45", "인천1", "보안", "접근제어", "비정상 접근 시도 탐지", "in_progress", None),
    ("2026-03-003", "2026-03-02", "11:15", "인천2", "시스템", "데이터베이스", "DB 응답 지연", "completed", "PR-2026-0302"),
    ("2026-03-004", "2026-03-02", "14:20", "인천1", "네트워크", "연결 오류", "VPN 연결 불안정", "in_progress", None),
    ("2026-03-005", "2026-03-03", "08:00", "인천2", "시스템", "성능", "CPU 사용률 높음", "completed", "PR-2026-0303"),
    ("2026-03-006", "2026-03-03", "15:30", "인천1", "운영", "점검", "정기 점검 일정", "hold", None),
    ("2026-03-007", "2026-03-04", "10:00", "인천1", "보안", "보안감시", "이상 로그인 시도", "completed", "PR-2026-0304"),
    ("2026-03-008", "2026-03-04", "16:45", "인천2", "시스템", "라이센스", "라이센스 만료 예정", "in_progress", None),
    ("2026-03-009", "2026-03-05", "09:15", "인천1", "네트워크", "방화벽", "방화벽 정책 검토", "hold", None),
    ("2026-03-010", "2026-03-05", "13:30", "인천2", "시스템", "업데이트", "시스템 패치 배포", "completed", "PR-2026-0305"),
]


def create_inquiry_table(db):
    """문의사항 테이블 생성"""
    inspector = inspect(db.get_bind())
    if 'skywatch_inquiries' in inspector.get_table_names():
        print("  테이블 이미 존재\n")
        return

    db.execute(text("""
        CREATE TABLE skywatch_inquiries (
            id SERIAL PRIMARY KEY,
            inquiry_no VARCHAR(20) NOT NULL UNIQUE,
            occurred_date DATE NOT NULL,
            occurred_time VARCHAR(10),
            controller_sector VARCHAR(100),
            sw_version VARCHAR(20),
            received_by INTEGER,
            received_by_raw VARCHAR(50),
            category VARCHAR(100),
            keyword VARCHAR(255),
            content TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
            completed_date DATE,
            pr_no VARCHAR(20),
            note TEXT,
            card_id INTEGER,
            created_by INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            last_edited_by INTEGER,
            is_deleted BOOLEAN DEFAULT false NOT NULL,
            deleted_by INTEGER,
            deleted_at TIMESTAMP WITH TIME ZONE,
            FOREIGN KEY (card_id) REFERENCES skywatch_log_cards(id),
            FOREIGN KEY (created_by) REFERENCES skywatch_users(id),
            FOREIGN KEY (deleted_by) REFERENCES skywatch_users(id),
            FOREIGN KEY (last_edited_by) REFERENCES skywatch_users(id),
            FOREIGN KEY (received_by) REFERENCES skywatch_users(id)
        )
    """))

    db.execute(text("CREATE INDEX ix_inquiries_occurred_date ON skywatch_inquiries(occurred_date)"))
    db.execute(text("CREATE INDEX ix_inquiries_status ON skywatch_inquiries(status)"))
    db.execute(text("CREATE INDEX ix_inquiries_category ON skywatch_inquiries(category)"))

    db.commit()
    print("  테이블 생성 완료\n")


def reset_inquiries(db):
    """기존 문의사항 데이터 전체 삭제"""
    cnt = db.execute(text("DELETE FROM skywatch_inquiries")).rowcount
    db.execute(text("ALTER SEQUENCE skywatch_inquiries_id_seq RESTART WITH 1"))
    db.commit()
    print(f"  기존 데이터 삭제: {cnt}건\n")


def insert_inquiries(db, data, dry_run=False):
    """문의사항 데이터 삽입"""
    success = 0
    error = 0

    for inquiry_no, occurred_date, occurred_time, sector, category, keyword, content, status, pr_no in data:
        try:
            if not dry_run:
                db.execute(
                    text("""
                        INSERT INTO skywatch_inquiries
                        (inquiry_no, occurred_date, occurred_time, controller_sector,
                         category, keyword, content, status, pr_no, created_by, created_at, updated_at, is_deleted)
                        VALUES (:ino, :odate, :otime, :sector, :cat, :kw, :content, :status, :pr, :admin_id, now(), now(), false)
                    """),
                    {
                        "ino": inquiry_no,
                        "odate": occurred_date,
                        "otime": occurred_time,
                        "sector": sector,
                        "cat": category,
                        "kw": keyword,
                        "content": content,
                        "status": status,
                        "pr": pr_no,
                        "admin_id": 8  # admin user ID
                    }
                )
            print(f"  [{status:12s}] {inquiry_no} - {occurred_date} {occurred_time} {category:8s} {keyword}")
            success += 1
        except Exception as e:
            print(f"  [오류] {inquiry_no}: {str(e)}")
            error += 1

    if not dry_run:
        db.commit()

    return success, error


def main():
    reset = "--reset" in sys.argv
    dry = "--dry" in sys.argv

    label = "[DRY RUN] " if dry else ""
    print(f"{label}문의사항 샘플 데이터 삽입\n")

    db = SessionLocal()
    try:
        # Step 1: 테이블 생성
        print("[Step 1] 테이블 생성 확인")
        if not dry:
            create_inquiry_table(db)
        else:
            print("  [DRY RUN] 테이블 생성 스킵\n")

        # Step 2: 데이터 처리
        if reset:
            print("[Step 2] 기존 데이터 삭제")
            if not dry:
                reset_inquiries(db)
            else:
                print("  [DRY RUN] 삭제 스킵\n")
            step_num = 3
        else:
            step_num = 2

        print(f"[Step {step_num}] 새 데이터 삽입 (2026년 3월 10건)")
        success, error = insert_inquiries(db, INQUIRY_DATA, dry_run=dry)

        print(f"\n{label}완료 - 성공 {success} / 오류 {error}")

    except Exception as e:
        db.rollback()
        print(f"[오류] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
