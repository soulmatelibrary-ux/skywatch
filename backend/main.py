import atexit
import os
import logging
import pathlib
from logging.handlers import TimedRotatingFileHandler

# 한국어 Windows(CP949) 환경에서 psycopg2가 libpq 오류 메시지를 UTF-8로
# 디코딩하지 못하는 문제를 방지한다. 반드시 psycopg2 import 전에 설정해야 한다.
os.environ.setdefault("PGCLIENTENCODING", "UTF8")


def _configure_file_logging() -> None:
    """일별 로그 파일 설정 — skywatch/backend/logs/skywatch_YYYY-MM-DD.log, 30일 보관."""
    log_dir = pathlib.Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    handler = TimedRotatingFileHandler(
        log_dir / "skywatch.log",
        when="midnight",
        backupCount=30,
        encoding="utf-8",
    )
    handler.suffix = "%Y-%m-%d"
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    if not root_logger.level:
        root_logger.setLevel(logging.INFO)


_configure_file_logging()

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.safe_static import SafeStaticFiles

from app.api import admin, attachments, auth, backup, board, card_statuses, cards, carry_over, categories, chains, comments, inquiries, issues, logs, notices, notifications, pr_batches, schedules, search, tasks, tech_docs, users, shift_adapter, skynet_router, skynet_settings_router, vector
from app.api import admin_daily_import, commute_calc, commute_months, duty_roster, shift_logs, tech_doc_import, work_threads
from app.core.config import settings
from app.websocket import router as ws_router

# ── 마이그레이션 상태 추적 ────────────────────────────────────────────────
_migration_status = {"completed": False, "error": None}

def _get_db_connection_url() -> str:
    """데이터베이스 연결 URL을 반환합니다."""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://skywatch_user:skywatch_pass@localhost:5432/skywatch_db"
    )

_INIT_MIGRATION_REV = "2a6ea2e4feaa"  # 023 - 마지막 안정 revision (브라운필드 stamp 기준점)

def _ensure_vector_columns() -> None:
    """embedding_vector columns are added directly if they are missing."""
    try:
        from sqlalchemy import text as sa_text
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            has_vector_ext = db.execute(sa_text(
                "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"
            )).scalar()
            if not has_vector_ext:
                logging.info("[시작 검사] pgvector extension 없음, embedding_vector 점검 생략")
                return

            for table_name in ("skywatch_log_vectors", "skywatch_card_vectors"):
                has_column = db.execute(sa_text("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM pg_catalog.pg_attribute a
                        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
                        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public'
                          AND c.relname = :table_name
                          AND a.attname = 'embedding_vector'
                          AND NOT a.attisdropped
                    )
                """), {"table_name": table_name}).scalar()
                if not has_column:
                    db.execute(sa_text(
                        f"ALTER TABLE {table_name} ADD COLUMN embedding_vector vector(1024)"
                    ))
                    db.commit()
            logging.info("[시작 검사] embedding_vector 컬럼 확인 완료")
        finally:
            db.close()
    except Exception as e:
        logging.warning(f"[시작 검사] embedding_vector 컬럼 확인 실패: {e}")

def _run_migrations_safe(fail_on_error: bool = False) -> bool:
    """
    안전한 마이그레이션 실행.

    브라운필드 시나리오(테이블이 이미 존재하는 DB)에서는
    초기 마이그레이션을 stamped 처리 후 나머지를 이어서 실행한다.

    Args:
        fail_on_error: True면 마이그레이션 실패 시 앱 시작 실패

    Returns:
        성공 여부
    """
    global _migration_status

    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", _get_db_connection_url())

    try:
        command.upgrade(alembic_cfg, "head")
        logging.info("[마이그레이션] 성공적으로 업데이트 완료")
        _migration_status = {"completed": True, "error": None}
        return True

    except Exception as e:
        err_str = str(e)
        # 테이블 이미 존재 오류 → 초기 스키마가 이미 적용된 브라운필드 DB
        # 초기 마이그레이션을 stamped 처리 후 나머지 미적용 마이그레이션만 실행
        if "already exists" in err_str or "DuplicateTable" in err_str or "уже существует" in err_str:
            try:
                logging.warning("[마이그레이션] 테이블 중복 감지 — 초기 revision을 stamp 후 나머지 마이그레이션 실행")
                command.stamp(alembic_cfg, _INIT_MIGRATION_REV)
                command.upgrade(alembic_cfg, "head")
                logging.info("[마이그레이션] 브라운필드 복구 완료")
                _migration_status = {"completed": True, "error": None}
                return True
            except Exception as e2:
                error_msg = f"[마이그레이션 복구 실패] {e2}"
                logging.error(error_msg)
                _migration_status = {"completed": False, "error": str(e2)}
        else:
            error_msg = f"[마이그레이션 실패] {err_str}"
            logging.error(error_msg)
            _migration_status = {"completed": False, "error": err_str}

        if fail_on_error:
            raise RuntimeError(f"[마이그레이션 실패] {err_str}")
        logging.warning("마이그레이션 실패했지만, 앱은 계속 시작합니다. 수동 확인 필요!")
        return False

# 환경변수에 따라 마이그레이션 실패 시 동작 결정 (기본값 false: 배포 환경 안전 시작)
_FAIL_ON_MIGRATION = os.getenv("FAIL_ON_MIGRATION_ERROR", "false").lower() == "true"
_run_migrations_safe(fail_on_error=_FAIL_ON_MIGRATION)
_ensure_vector_columns()  # 마이그레이션 실패 시에도 embedding_vector 컬럼 보장

app = FastAPI(title="Skywatch API", version="1.0.0")


@app.on_event("startup")
async def _reset_stuck_vector_jobs():
    """서버 시작 시 이전 실행 중 중단된 벡터화 작업을 failed 로 초기화."""
    try:
        from sqlalchemy import text as sa_text
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            result = db.execute(
                sa_text(
                    "UPDATE skywatch_reindex_jobs"
                    " SET status = 'failed', completed_at = now()"
                    " WHERE status = 'running'"
                )
            )
            db.commit()
            if result.rowcount:
                logging.info(f"[시작] stuck 벡터화 작업 {result.rowcount}건 초기화 완료")
        finally:
            db.close()
    except Exception as e:
        logging.warning(f"[시작] stuck 벡터화 작업 초기화 실패: {e}")


@app.on_event("startup")
async def _store_event_loop():
    import asyncio
    from app.core.loop_ref import set_loop
    set_loop(asyncio.get_running_loop())


@app.on_event("startup")
async def _warmup_embedding_model():
    import threading
    def _run():
        try:
            from app.services.vector_service import warmup_model
            warmup_model()
        except Exception as e:
            logging.warning(f"Embedding model warmup skipped: {e}")
    threading.Thread(target=_run, daemon=True).start()


@app.on_event("startup")
async def _start_skynet_vector_backfill():
    import threading
    def _run():
        try:
            from app.db.skynet_session import SkynetSessionLocal
            from app.services import skynet_vector_service
            skynet_vector_service.start_backfill(SkynetSessionLocal)
            logging.info("[SkyNet] KURE-v1 vector backfill started")
        except Exception as e:
            logging.warning(f"SkyNet vector backfill skipped: {e}")
    threading.Thread(target=_run, daemon=True).start()

@app.on_event("startup")
async def _backfill_pgvector_columns():
    """서버 시작 시 기존 embedding 바이트를 embedding_vector 컬럼으로 백필 (배경 스레드)."""
    import threading
    def _run():
        try:
            from app.db.session import SessionLocal
            from app.services import vector_service, card_vector_service
            _db = SessionLocal()
            try:
                log_n = vector_service.backfill_pgvector_log_column(_db)
                card_n = card_vector_service.backfill_pgvector_card_column(_db)
                if log_n or card_n:
                    logging.info(f"[pgvector 백필] 일지 {log_n}건, 카드 {card_n}건 완료")
                vector_service._HAS_EMB_COLUMN = None      # 캐시 초기화 — 다음 검색 시 재확인
                card_vector_service._CARD_HAS_PGVEC = None  # 카드 캐시도 초기화
            finally:
                _db.close()
        except Exception as e:
            logging.warning(f"[pgvector 백필] 실패: {e}")
    threading.Thread(target=_run, daemon=True).start()


_UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", SafeStaticFiles(directory=_UPLOADS_DIR), name="uploads")

_PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
os.makedirs(_PUBLIC_DIR, exist_ok=True)
app.mount("/public", StaticFiles(directory=_PUBLIC_DIR), name="public")

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(admin.router)
app.include_router(admin_daily_import.router)
app.include_router(attachments.router)
app.include_router(auth.router)
app.include_router(backup.router)
app.include_router(logs.router)
app.include_router(cards.router)
app.include_router(chains.router)
app.include_router(inquiries.router)
app.include_router(issues.router)
app.include_router(pr_batches.router)
app.include_router(comments.router)
app.include_router(categories.router)
app.include_router(card_statuses.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(carry_over.router)
app.include_router(notices.router)
app.include_router(notifications.router)
app.include_router(board.router)
app.include_router(schedules.router)
app.include_router(search.router)
app.include_router(tech_docs.router)
app.include_router(tech_doc_import.router)
app.include_router(vector.router)
app.include_router(shift_adapter.router)
app.include_router(skynet_router.router)
app.include_router(skynet_settings_router.router)
app.include_router(ws_router.router)
app.include_router(shift_logs.router)
app.include_router(work_threads.router)
app.include_router(duty_roster.router)
app.include_router(commute_calc.router)
app.include_router(commute_months.router)


_KO_WEEKDAY = {'월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6}


def _calc_next_run(tpl, now):
    """frequency + days_of_week 기반 다음 실행 일정 계산."""
    from datetime import timedelta
    if tpl.frequency == 'weekly' and tpl.days_of_week:
        target_days = sorted(_KO_WEEKDAY[d] for d in tpl.days_of_week if d in _KO_WEEKDAY)
        today_wd = now.weekday()
        for d in target_days:
            diff = (d - today_wd) % 7
            if diff > 0:
                return now + timedelta(days=diff)
        # 오늘이 마지막 대상 요일이거나 모든 diff==0 → 다음 주 첫 번째 대상 요일
        return now + timedelta(days=(target_days[0] - today_wd) % 7 or 7)
    if tpl.frequency == 'weekly':
        return now + timedelta(weeks=1)
    if tpl.frequency in ('monthly', 'quarterly'):
        from dateutil.relativedelta import relativedelta
        # relativedelta 는 1/31 + 1달 → 2/28 처럼 그 달 마지막 날로 맞춘다
        return now + relativedelta(months=1 if tpl.frequency == 'monthly' else 3)
    return now + timedelta(days=1)  # daily


def _run_recurring_tasks() -> None:
    """정기 템플릿 → Task 자동 생성 (매일 09:00)."""
    from datetime import datetime, timezone

    from sqlalchemy import select
    from app.db.session import SessionLocal
    from app.models.task import RecurringTaskTemplate
    from app.schemas.task import TaskCreate
    from app.services import task_service

    db = SessionLocal()

    results = {
        "total": 0,
        "skipped": 0,
        "success": 0,
        "failed": 0,
        "errors": [],
    }

    try:
        now = datetime.now(timezone.utc)
        templates = db.scalars(select(RecurringTaskTemplate).order_by(RecurringTaskTemplate.id)).all()

        for tpl in templates:
            try:
                # 실행 조건 체크
                if not tpl.is_active:
                    results["skipped"] += 1
                    continue
                if tpl.next_run_at and tpl.next_run_at > now:
                    results["skipped"] += 1
                    continue

                # 실제 시도할 템플릿 카운팅
                results["total"] += 1

                # Task 생성 (실패 가능성 높음)
                content = tpl.template_content or {}
                template_title = (content.get("title") or "").strip() if isinstance(content, dict) else ""
                template_body = (content.get("body") or "").strip() if isinstance(content, dict) else ""

                payload = TaskCreate(
                    title=template_title or tpl.name,
                    body=template_body,
                    importance="normal",
                    recipients_mode="teams" if tpl.target_teams else "all",
                    target_teams=list(tpl.target_teams or []),
                )
                task_service.create_task(db, tpl.created_by or 1, payload)

                # 메타데이터 업데이트
                tpl.last_run_at = now
                tpl.next_run_at = _calc_next_run(tpl, now)
                db.commit()

                results["success"] += 1
                logging.info(f"✓ 정기 작업: 템플릿 {tpl.id} ({tpl.name}) - Task 생성 완료")

            except ValueError as e:
                # 비즈니스 로직 에러 (사용자 없음 등)
                results["failed"] += 1
                error_msg = f"템플릿 {tpl.id} ({tpl.name}): {str(e)}"
                results["errors"].append(error_msg)
                logging.warning(f"⚠ 정기 작업 실패: {error_msg}")
                try:
                    db.rollback()
                except Exception:
                    pass
                continue

            except Exception as e:
                # 예상 밖의 에러
                results["failed"] += 1
                error_msg = f"템플릿 {tpl.id} ({tpl.name}): 예상 밖의 에러 - {str(e)}"
                results["errors"].append(error_msg)
                logging.error(f"✗ 정기 작업 오류: {error_msg}")
                try:
                    db.rollback()
                except Exception:
                    pass
                continue

    except Exception as e:
        # 템플릿 목록 조회 실패 등 전체 작업 실패
        logging.error(f"[정기 작업 전체 실패] {str(e)}")
        results["errors"].append(f"전체 작업 실패: {str(e)}")

    finally:
        try:
            db.close()
        except Exception:
            pass

        # 최종 결과 요약 로깅
        _log_scheduler_results(results)


def _log_scheduler_results(results: dict) -> None:
    """스케줄러 실행 결과를 로깅합니다."""
    total = results["total"]
    skipped = results["skipped"]
    success = results["success"]
    failed = results["failed"]

    summary = (
        f"[정기 작업 완료] "
        f"시도 {total}개 중 성공 {success}개, 실패 {failed}개"
    )
    if skipped > 0:
        summary += f" (건너뜀 {skipped}개)"

    if failed == 0:
        logging.info(f"✓ {summary}")
    else:
        logging.warning(f"⚠ {summary}")
        for error in results["errors"]:
            logging.warning(f"  - {error}")


_scheduler = BackgroundScheduler(timezone="Asia/Seoul")
_scheduler.add_job(_run_recurring_tasks, "cron", hour=9, minute=0)

# DB 백업 (매일 새벽 3시)
from app.services import backup_service


def _run_db_backups() -> None:
    """SkyWatch 및 SkyNet DB 자동 백업 (순차 실행)."""
    from app.db.session import SessionLocal
    from app.services.backup_log_service import BackupAction, BackupStatus, record as _log

    for target in (['skywatch', 'skynet'] if settings.SKYNET_DATABASE_URL else ['skywatch']):
        db = SessionLocal()
        try:
            filename, size = backup_service.run_backup(target)
            logging.info("[자동 백업] %s DB 백업 완료: %s", target, filename)
            _log(db, action=BackupAction.BACKUP, status=BackupStatus.SUCCESS,
                 performed_by=None, filename=filename, file_size_bytes=size)
        except Exception as e:
            logging.error("[자동 백업 실패] %s: %s", target, e)
            try:
                _log(db, action=BackupAction.BACKUP, status=BackupStatus.FAILURE,
                     performed_by=None, error_message=str(e)[:500])
            except Exception:
                pass
        finally:
            db.close()


_scheduler.add_job(_run_db_backups, "cron", hour=3, minute=0)


def _run_archive_tasks() -> None:
    """전원 완료 후 30일 지난 Task 자동 보관 (매일 새벽 2시)."""
    from app.db.session import SessionLocal
    from app.services import task_service as _ts
    db = SessionLocal()
    try:
        count = _ts.archive_old_tasks(db)
        if count:
            logging.info(f"[자동 보관] Task {count}건 보관 처리 완료")
    except Exception as e:
        logging.error(f"[자동 보관 실패] {e}")
    finally:
        db.close()


_scheduler.add_job(_run_archive_tasks, "cron", hour=2, minute=0)


def _run_vector_batch() -> None:
    """신규·수정 일지 배치 벡터화 (1시간 단위)."""
    from app.db.session import SessionLocal
    from app.services.vector_service import vectorize_pending_logs
    db = SessionLocal()
    try:
        count = vectorize_pending_logs(db)
        if count:
            logging.info(f"[벡터화 배치] {count}개 일지 벡터화 완료")
    except Exception as e:
        logging.error(f"[벡터화 배치 실패] {e}")
    finally:
        db.close()


_scheduler.add_job(_run_vector_batch, "interval", hours=1)


def _run_card_vector_batch() -> None:
    """신규·수정 카드 배치 벡터화 (1시간 단위)."""
    from app.db.session import SessionLocal
    from app.services.card_vector_service import vectorize_pending_cards
    db = SessionLocal()
    try:
        count = vectorize_pending_cards(db)
        if count:
            logging.info(f"[카드 벡터화 배치] {count}개 카드 벡터화 완료")
    except Exception as e:
        logging.error(f"[카드 벡터화 배치 실패] {e}")
    finally:
        db.close()


_scheduler.add_job(_run_card_vector_batch, "interval", hours=1)


def _run_skynet_vector_batch() -> None:
    """SkyNet 신규 문서 배치 벡터화 (2시간 단위)."""
    try:
        from app.db.skynet_session import SkynetSessionLocal
        from app.services import skynet_vector_service
        started = skynet_vector_service.start_backfill(SkynetSessionLocal)
        if started:
            logging.info("[SkyNet 벡터화 배치] 백그라운드 backfill 시작")
    except Exception as e:
        logging.error(f"[SkyNet 벡터화 배치 실패] {e}")


_scheduler.add_job(_run_skynet_vector_batch, "interval", hours=2)


def _run_inquiry_vector_batch() -> None:
    """문의사항 배치 벡터화 (매일 새벽 2시 30분)."""
    from app.db.session import SessionLocal
    from app.services import inquiry_vector_service
    db = SessionLocal()
    try:
        count = inquiry_vector_service.vectorize_pending_inquiries(db)
        if count:
            logging.info(f"[문의사항 벡터화] {count}건 처리 완료")
    except Exception as e:
        logging.error(f"[문의사항 벡터화 실패] {e}")
    finally:
        db.close()


_scheduler.add_job(_run_inquiry_vector_batch, "cron", hour=2, minute=30)


def _run_issue_vector_batch() -> None:
    """PR관리 벡터 배치 (2시간 단위)."""
    from app.db.session import SessionLocal
    from app.services import issue_vector_service
    db = SessionLocal()
    try:
        count = issue_vector_service.vectorize_pending_issues(db)
        if count:
            logging.info(f"[PR관리 벡터 배치] {count}건 처리 완료")
    except Exception as e:
        logging.error(f"[PR관리 벡터 배치 실패] {e}")
    finally:
        db.close()


_scheduler.add_job(_run_issue_vector_batch, "interval", hours=2)

_scheduler.start()
atexit.register(_scheduler.shutdown)


@app.get("/health")
def health():
    """기본 헬스 체크 (마이그레이션 상태 포함)."""
    return {
        "status": "ok",
        "database": "connected",
        "migrations": "completed" if _migration_status["completed"] else "pending",
    }

@app.get("/health/ready")
def readiness():
    """Kubernetes readiness probe - 마이그레이션 완료 후에만 트래픽 받음."""
    if not _migration_status["completed"]:
        raise HTTPException(
            status_code=503,
            detail=f"마이그레이션 필요: {_migration_status['error']}"
        )
    return {"ready": True}


# ── 프론트엔드 정적 파일 서빙 (빌드된 dist/ 존재 시) ─────────────────────────
# app.mount()는 내부망 접속 시 StaticFiles가 404를 반환해도 catch-all로 넘기지 않아
# JS/CSS가 로드되지 않는 문제가 있으므로, catch-all 하나로 모든 정적 파일을 처리한다.
@app.get("/shift-calendar.html", include_in_schema=False)
@app.get("/shift-calendar", include_in_schema=False)
def shift_calendar():
    """Shift calendar popup page."""
    return FileResponse(
        str(pathlib.Path(_PUBLIC_DIR) / "shift-calendar.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


_FRONTEND_DIST = pathlib.Path(__file__).parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        dist_root = _FRONTEND_DIST.resolve()
        file_path = (dist_root / full_path).resolve()
        # 절대경로·'..' 로 dist 바깥(.env 등)을 가리키면 파일로 내려주지 않고 index.html 로 넘긴다
        if file_path.is_relative_to(dist_root) and file_path.is_file():
            # JS/CSS 파일은 Vite 해시 기반 캐싱 (max-age 1년)
            # 파일명 변경 시 자동으로 새 버전 요청
            if str(file_path).endswith(('.js', '.css', '.woff2', '.woff', '.ttf', '.eot')):
                return FileResponse(
                    str(file_path),
                    headers={"Cache-Control": "public, max-age=31536000, immutable"}
                )
            return FileResponse(str(file_path))
        return FileResponse(
            str(_FRONTEND_DIST / "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
        )
