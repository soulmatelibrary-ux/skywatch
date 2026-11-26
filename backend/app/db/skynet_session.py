from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# SkyNet 전용 DB 엔진 — SKYNET_DATABASE_URL 미설정 시 기본 DB 공유
_url = settings.SKYNET_DATABASE_URL or settings.DATABASE_URL
skynet_engine = create_engine(_url, pool_pre_ping=True)
SkynetSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=skynet_engine)


def get_skynet_db() -> Generator[Session, None, None]:
    db = SkynetSessionLocal()
    try:
        yield db
    finally:
        db.close()
