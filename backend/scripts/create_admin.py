"""관리자 계정 만들기 (또는 기존 계정 비밀번호 바꾸기).

빈 DB 에 db/schema.sql 만 넣었을 때 첫 로그인 계정을 만든다.
실행 (backend 폴더에서):  python scripts/create_admin.py [로그인ID] [이름]
비밀번호는 화면에 보이지 않게 입력받는다.
"""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402


def main() -> None:
    login_id = sys.argv[1] if len(sys.argv) > 1 else "admin"
    name = sys.argv[2] if len(sys.argv) > 2 else "관리자"
    pw = getpass.getpass(f"{login_id} 비밀번호: ")
    if len(pw) < 4 or pw != getpass.getpass("한 번 더: "):
        sys.exit("비밀번호가 짧거나(4자 미만) 서로 다릅니다.")

    pw_hash, salt = hash_password(pw)
    db = SessionLocal()
    try:
        exists = db.execute(text("SELECT id FROM skywatch_users WHERE login_id = :l"), {"l": login_id}).scalar()
        if exists:
            db.execute(
                text("UPDATE skywatch_users SET password_hash = :h, salt = :s, is_active = TRUE, updated_at = now() WHERE id = :i"),
                {"h": pw_hash, "s": salt, "i": exists},
            )
            print(f"기존 계정 {login_id} 의 비밀번호를 바꿨습니다.")
        else:
            db.execute(
                text(
                    "INSERT INTO skywatch_users (name, login_id, role, team, password_hash, salt, is_active) "
                    "VALUES (:n, :l, 'admin', 'day', :h, :s, TRUE)"
                ),
                {"n": name, "l": login_id, "h": pw_hash, "s": salt},
            )
            print(f"관리자 계정 {login_id} 를 만들었습니다.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
