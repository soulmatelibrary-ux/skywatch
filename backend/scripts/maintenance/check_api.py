# API 응답 검증 스크립트
import json
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.log import Log
from app.models.user import User
from app.services.log_service import get_logs

# 테스트용 사용자 ID (admin이나 첫 번째 사용자)
db: Session = SessionLocal()
admin_user = db.query(User).first()
print(f"테스트 사용자: {admin_user.name if admin_user else '없음'}")

if admin_user:
    print(f"\n=== API 페이징 테스트 ===")

    # 페이지 1, 50건
    items, pagination = get_logs(
        db=db,
        current_user_id=admin_user.id,
        page=1,
        per_page=50
    )

    print(f"요청: page=1, per_page=50")
    print(f"응답 pagination:")
    print(f"  - total: {pagination.total}")
    print(f"  - total_pages: {pagination.total_pages}")
    print(f"  - page: {pagination.page}")
    print(f"  - per_page: {pagination.per_page}")
    print(f"응답 items: {len(items)}개")

    # 첫 몇 개 항목 확인
    print(f"\n응답 데이터 샘플:")
    for i, log in enumerate(items[:3], 1):
        print(f"  {i}. {log.id}: {log.title[:50]}")
        print(f"     - cards: {log.card_count}, comments: {log.comment_count}")

    # 다른 페이지 확인
    print(f"\n=== 다른 페이지 확인 ===")
    page2_items, page2_pagination = get_logs(
        db=db,
        current_user_id=admin_user.id,
        page=2,
        per_page=50
    )
    print(f"페이지 2: {len(page2_items)}개, total={page2_pagination.total}")

    # 마지막 페이지 확인
    last_page = page2_pagination.total_pages
    last_items, last_pagination = get_logs(
        db=db,
        current_user_id=admin_user.id,
        page=last_page,
        per_page=50
    )
    print(f"마지막 페이지({last_page}): {len(last_items)}개, total={last_pagination.total}")

    # 수학 확인
    expected_last_count = pagination.total % 50
    if expected_last_count == 0:
        expected_last_count = 50
    print(f"기대값: {expected_last_count}개, 실제: {len(last_items)}개")
    if len(last_items) == expected_last_count:
        print("✓ 페이징 계산 정상")
    else:
        print("✗ 페이징 계산 오류")

db.close()
