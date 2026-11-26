# 데이터베이스의 모든 팀 코드와 사용자 확인
from sqlalchemy import select, func
from app.db.session import engine
from app.models.user import User
from app.models.log import Log

with engine.begin() as conn:
    # 모든 활성 사용자의 팀 코드
    teams_with_users = conn.execute(
        select(User.team, func.count(User.id).label("user_count"), func.count(Log.id).label("log_count"))
        .select_from(User)
        .outerjoin(Log, Log.author_id == User.id)
        .where(User.is_active.is_(True))
        .group_by(User.team)
        .order_by(User.team)
    ).all()

    print("모든 팀 코드:")
    for team, user_count, log_count in teams_with_users:
        print(f"  '{team}': {user_count}명 사용자, {log_count}개 로그")

    # "인천"이 포함된 팀 찾기
    print("\n'인천'이 포함된 팀:")
    all_users = conn.execute(select(User.team, User.name).where(User.is_active.is_(True))).all()
    for team, name in all_users:
        if "인천" in name or "인천" in str(team):
            print(f"  team='{team}', name='{name}'")
