# 데이터 날짜 범위 확인
from sqlalchemy import select, func
from app.db.session import engine
from app.models.log import Log

with engine.begin() as conn:
    # 가장 최신 로그의 날짜
    latest = conn.scalar(
        select(Log.date).where(Log.is_deleted.is_(False))
        .order_by(Log.date.desc()).limit(1)
    )

    # 가장 오래된 로그의 날짜
    oldest = conn.scalar(
        select(Log.date).where(Log.is_deleted.is_(False))
        .order_by(Log.date).limit(1)
    )

    print(f"최신 날짜: {latest}")
    print(f"가장 오래된: {oldest}")

    # 최신 날짜의 로그 개수
    latest_count = conn.scalar(
        select(func.count()).select_from(Log)
        .where(Log.date == latest, Log.is_deleted.is_(False))
    )
    print(f"\n최신 날짜({latest})의 로그: {latest_count}개")
