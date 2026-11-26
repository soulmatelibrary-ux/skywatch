"""PostgreSQL database backup and restore service."""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)

_BACKUP_FILENAME_RE = re.compile(r"^(skywatch|skynet)_backup_\d{8}_\d{6}\.sql$")


def _get_pg_tool(tool_name: str) -> str:
    """Return the configured PostgreSQL tool path, falling back to PATH."""
    configured_path = settings.PG_DUMP_PATH if tool_name == "pg_dump" else settings.PSQL_PATH
    if os.path.exists(configured_path):
        return configured_path

    found_path = shutil.which(tool_name)
    if found_path:
        return found_path

    return tool_name


def _parse_db_url() -> dict[str, str | int]:
    parsed = urlparse(settings.DATABASE_URL)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/"),
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
    }


def _parse_skynet_db_url() -> dict[str, str | int]:
    if not settings.SKYNET_DATABASE_URL:
        raise ValueError("SKYNET_DATABASE_URL not configured")
    parsed = urlparse(settings.SKYNET_DATABASE_URL)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/"),
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
    }


def _ensure_backup_dir() -> Path:
    backup_dir = Path(settings.BACKUP_DIR)
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def _sql_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _sql_string_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _validate_backup_filename(filename: str) -> Path:
    if not _BACKUP_FILENAME_RE.match(filename):
        raise ValueError("유효하지 않은 백업 파일명입니다")

    backup_dir = _ensure_backup_dir().resolve()
    backup_file = (backup_dir / filename).resolve()
    if not str(backup_file).startswith(str(backup_dir)):
        raise ValueError("유효하지 않은 백업 파일명입니다")
    if not backup_file.exists():
        raise FileNotFoundError("백업 파일을 찾을 수 없습니다")
    return backup_file


def _cleanup_old_backups(prefix: str, max_age_days: int = 20) -> int:
    """20일이 지난 백업 파일을 하나씩 삭제한다."""
    backup_dir = _ensure_backup_dir()
    pattern = f"{prefix}_backup_*.sql"
    cutoff = datetime.now() - timedelta(days=max_age_days)

    backups = sorted(
        backup_dir.glob(pattern),
        key=lambda path: path.stat().st_mtime,
    )

    removed = 0
    for path in backups:
        try:
            mtime = datetime.fromtimestamp(path.stat().st_mtime)
            if mtime < cutoff:
                age_days = (datetime.now() - mtime).days
                path.unlink()
                logger.info("[backup cleanup] deleted %s (age: %d days)", path.name, age_days)
                removed += 1
        except Exception:
            logger.warning("[backup cleanup] failed to delete %s", path, exc_info=True)
    return removed


def _build_env(db_info: dict[str, str | int]) -> dict[str, str]:
    env = os.environ.copy()
    password = str(db_info.get("password") or "")
    if password:
        env["PGPASSWORD"] = password
    return env


def _run_psql(
    psql_path: str,
    *,
    db_info: dict[str, str | int],
    database: str,
    sql: str,
    env: dict[str, str],
    timeout: int = 30,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        [
            psql_path,
            "-h", str(db_info["host"]),
            "-p", str(db_info["port"]),
            "-U", str(db_info["user"]),
            "-d", database,
            "-v", "ON_ERROR_STOP=1",
            "-X",
        ],
        input=sql.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        check=True,
    )


def run_backup(target: str = "skywatch") -> tuple[str, int]:
    """Create a full logical backup for one database."""
    if target == "skynet":
        db_info = _parse_skynet_db_url()
        prefix = "skynet"
    else:
        db_info = _parse_db_url()
        prefix = "skywatch"

    backup_dir = _ensure_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"{prefix}_backup_{timestamp}.sql"
    env = _build_env(db_info)

    # Plain SQL dump so it can be inspected and restored manually if needed.
    cmd = [
        _get_pg_tool("pg_dump"),
        "-h", str(db_info["host"]),
        "-p", str(db_info["port"]),
        "-U", str(db_info["user"]),
        "-d", str(db_info["dbname"]),
        "-F", "p",
        "--no-owner",
        "--no-privileges",
        "--encoding=UTF8",
    ]

    try:
        with open(backup_file, "w", encoding="utf-8", newline="\n") as f:
            subprocess.run(
                cmd,
                stdout=f,
                stderr=subprocess.PIPE,
                env=env,
                timeout=300,
                check=True,
            )

        size = backup_file.stat().st_size
        removed = _cleanup_old_backups(prefix, max_age_days=20)
        if removed:
            logger.info("[backup cleanup] removed %s old %s backups", removed, prefix)
        return backup_file.name, size
    except subprocess.CalledProcessError as e:
        if backup_file.exists():
            backup_file.unlink()
        err_msg = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
        raise RuntimeError(f"pg_dump failed: {err_msg}")
    except Exception as e:
        if backup_file.exists():
            backup_file.unlink()
        raise RuntimeError(f"백업 오류: {str(e)}")


def list_backups(target: str | None = None) -> list[dict]:
    backup_dir = _ensure_backup_dir()
    pattern = "*_backup_*.sql" if target is None else f"{target}_backup_*.sql"

    items: list[dict] = []
    for path in sorted(backup_dir.glob(pattern), reverse=True):
        stat = path.stat()
        items.append({
            "filename": path.name,
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return items


def delete_backup(filename: str) -> None:
    resolved = _validate_backup_filename(filename)
    resolved.unlink()


def _do_restore(resolved: Path, db_info: dict[str, str | int], env: dict[str, str], psql_path: str, target: str) -> None:
    """DROP → CREATE → load SQL dump. Raises RuntimeError on failure."""
    dbname = str(db_info["dbname"])
    admin_db = "postgres"
    quoted_dbname = _sql_identifier(dbname)
    dbname_literal = _sql_string_literal(dbname)

    try:
        # 1) Terminate active connections (best-effort).
        try:
            _run_psql(psql_path, db_info=db_info, database=admin_db, env=env, sql=(
                f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity"
                f" WHERE datname = {dbname_literal} AND pid <> pg_backend_pid();"
            ))
        except subprocess.CalledProcessError:
            logger.warning("[restore] terminate connections failed – continuing")

        # 2) Drop and recreate the database.
        _run_psql(psql_path, db_info=db_info, database=admin_db, env=env,
                  sql=f"DROP DATABASE IF EXISTS {quoted_dbname};")
        _run_psql(psql_path, db_info=db_info, database=admin_db, env=env,
                  sql=f"CREATE DATABASE {quoted_dbname};")

        # 3) Recreate required extensions for SkyWatch.
        if target == "skywatch":
            _run_psql(psql_path, db_info=db_info, database=dbname, env=env, sql=(
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
                "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
                "CREATE EXTENSION IF NOT EXISTS vector;"
            ))

        # 4) Load SQL dump.
        with open(resolved, "r", encoding="utf-8") as f:
            subprocess.run(
                [psql_path, "-h", str(db_info["host"]), "-p", str(db_info["port"]),
                 "-U", str(db_info["user"]), "-d", dbname, "-v", "ON_ERROR_STOP=1", "-X"],
                stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                env=env, timeout=600, check=True,
            )
    except subprocess.TimeoutExpired:
        raise RuntimeError("복구 시간이 10분을 초과했습니다")
    except subprocess.CalledProcessError as e:
        err = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
        raise RuntimeError(f"복구 실패: {err}")
    except UnicodeDecodeError:
        raise RuntimeError("복구 파일 읽기 실패: 파일 인코딩이 UTF-8이 아닙니다")


def restore_backup(filename: str) -> str:
    """Restore a backup. Creates a safety backup first for automatic rollback on failure."""
    resolved = _validate_backup_filename(filename)
    if filename.startswith("skynet_"):
        db_info = _parse_skynet_db_url()
        target = "skynet"
    else:
        db_info = _parse_db_url()
        target = "skywatch"

    env = _build_env(db_info)
    psql_path = _get_pg_tool("psql")
    dbname = str(db_info["dbname"])

    # Create a safety backup before destructive operations.
    backup_dir = _ensure_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safety_file = backup_dir / f"{target}_safety_{timestamp}.sql"
    try:
        with open(safety_file, "w", encoding="utf-8", newline="\n") as f:
            subprocess.run(
                [_get_pg_tool("pg_dump"), "-h", str(db_info["host"]), "-p", str(db_info["port"]),
                 "-U", str(db_info["user"]), "-d", dbname,
                 "-F", "p", "--no-owner", "--no-privileges", "--encoding=UTF8"],
                stdout=f, stderr=subprocess.PIPE, env=env, timeout=300, check=True,
            )
        logger.info("[restore] safety backup created: %s", safety_file.name)
    except Exception as e:
        if safety_file.exists():
            safety_file.unlink()
        err = e.stderr.decode("utf-8", errors="replace") if isinstance(e, subprocess.CalledProcessError) and e.stderr else str(e)
        raise RuntimeError(f"복구 전 안전 백업 실패: {err}")

    logger.info("[restore start] file=%s target=%s db=%s", filename, target, dbname)

    try:
        _do_restore(resolved, db_info, env, psql_path, target)
    except Exception as restore_err:
        logger.error("[restore failed] %s – attempting rollback", filename, exc_info=True)
        try:
            _do_restore(safety_file, db_info, env, psql_path, target)
            logger.info("[restore rollback] success")
        except Exception as rb_err:
            logger.error("[restore rollback] FAILED: %s", rb_err, exc_info=True)
            raise RuntimeError(
                f"복구 실패 및 롤백 실패. 안전 백업({safety_file.name})으로 수동 복구하세요. "
                f"원인: {restore_err}"
            )
        raise RuntimeError(f"복구 실패 (롤백 완료): {restore_err}")

    logger.info("[restore complete] file=%s target=%s", filename, target)
    try:
        safety_file.unlink()
    except Exception:
        logger.warning("[restore] failed to remove safety backup: %s", safety_file.name)
    return target


def get_backup_path(filename: str) -> Path:
    return _validate_backup_filename(filename)


def get_backup_info() -> dict:
    return {
        "backup_scope": "전체 데이터베이스",
        "description": (
            "SkyWatch와 SkyNet을 각각 별도 파일로 전체 백업합니다. "
            "복구 시에는 대상 데이터베이스를 완전히 삭제하고 새로 생성한 뒤 "
            "백업 파일을 다시 적재합니다."
        ),
        "restore_policy": "기존 데이터베이스 삭제 후 전체 복구",
    }
