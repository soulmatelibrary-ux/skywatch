from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _fix_env_encoding():
    """CP949로 저장된 .env 파일을 UTF-8로 자동 변환 (한국어 Windows 대응)."""
    env_path = Path('.env')
    if not env_path.exists():
        return
    try:
        env_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        try:
            content = env_path.read_text(encoding='cp949')
            env_path.write_text(content, encoding='utf-8', newline='\n')
        except Exception:
            pass


_fix_env_encoding()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql://skywatch:password@localhost:5432/skywatch"
    SKYNET_DATABASE_URL: str = ""
    SECRET_KEY: str = "change-me-in-production"
    SESSION_EXPIRE_HOURS: int = 16
    EMBEDDING_MODEL_PATH: str = "./models/paraphrase-multilingual-MiniLM-L12-v2"
    UPLOAD_DIR: str = "./uploads"
    BACKUP_DIR: str = "./backups"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
    # PostgreSQL 도구 경로 (명시적 지정)
    PG_DUMP_PATH: str = "pg_dump"  # .env에서 오버라이드 가능
    PSQL_PATH: str = "psql"  # .env에서 오버라이드 가능
    # SkyNet Flask 엔드포인트
    SKYNET_API_URL: str = "http://localhost:5000"
    # 게시판 게시글 직접 열기 URL (atcl_id 파라미터 앞부분)
    BOARD_DIRECT_URL: str = ""


settings = Settings()
