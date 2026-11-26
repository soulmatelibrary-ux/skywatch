# 각 팀별 로그 개수 확인
from sqlalchemy import select, func
from app.db.session import SessionLocal, engine
from app.models.log import Log
from app.models.user import User
from app.services.log_service import get_logs

with engine.begin() as conn:
    # 모든 팀과 그 로그 개수
    result = conn.execute(
        select(User.team, func.count(Log.id.distinct()).label("log_count"))
        .select_from(Log)
        .join(User, User.id == Log.author_id)
        .where(Log.is_deleted.is_(False))
        .group_by(User.team)
        .order_by(func.count(Log.id.distinct()).desc())
    ).all()

    print("팀별 로그 개수:")
    for team, count in result:
        print(f"  {team}: {count}개")

# API로도 각 팀을 테스트
db = SessionLocal()
user = db.query(User).first()

print("\n[API 테스트]")
teams = ["A", "B", "C", "D", "day"]
for team in teams:
    items, pag = get_logs(db, user.id, page=1, per_page=100, team=team)
    print(f"  team='{team}': total={pag.total}, items={len(items)}")

db.close()
