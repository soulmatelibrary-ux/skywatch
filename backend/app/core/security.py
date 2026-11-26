import secrets
import bcrypt


def hash_password(password: str) -> tuple[str, str]:
    """Returns (password_hash, salt) using bcrypt round 12."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode(), salt.decode()


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        # 빈 문자열·bcrypt 형식이 아닌 해시 → 로그인 실패 (500 방지)
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(64)
