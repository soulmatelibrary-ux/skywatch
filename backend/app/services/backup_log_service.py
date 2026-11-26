"""DB 백업 실행 이력 저장 서비스."""
from datetime import datetime
from enum import Enum
from sqlalchemy.orm import Session

from app.models.backup import BackupLog


class BackupAction(str, Enum):
    """백업 액션 타입."""
    BACKUP = "backup"
    RESTORE = "restore"


class BackupStatus(str, Enum):
    """백업 상태 타입."""
    SUCCESS = "success"
    FAILURE = "failure"


def record(
    db: Session,
    *,
    action: BackupAction,
    status: BackupStatus,
    performed_by: int | None,
    filename: str | None = None,
    file_size_bytes: int | None = None,
    error_message: str | None = None,
) -> BackupLog:
    """백업 또는 복구 실행 이력 저장."""
    log = BackupLog(
        action=action.value,
        status=status.value,
        performed_by=performed_by,
        filename=filename,
        file_size_bytes=file_size_bytes,
        error_message=error_message,
    )
    db.add(log)
    db.commit()
    return log


def list_logs(db: Session, limit: int = 50, include_deleted: bool = False) -> list[BackupLog]:
    """백업 실행 이력 조회 (최신순)."""
    query = db.query(BackupLog)
    if not include_deleted:
        query = query.filter(BackupLog.is_deleted == False)
    return (
        query
        .order_by(BackupLog.created_at.desc())
        .limit(limit)
        .all()
    )


def delete_log(db: Session, log_id: int, deleted_by: int) -> None:
    """백업 이력 Soft delete."""
    log = db.query(BackupLog).filter(BackupLog.id == log_id, BackupLog.is_deleted == False).first()
    if not log:
        raise ValueError(f"이력을 찾을 수 없습니다: {log_id}")
    log.is_deleted = True
    log.deleted_at = datetime.now()
    log.deleted_by = deleted_by
    db.commit()


def restore_log(db: Session, log_id: int) -> None:
    """삭제된 백업 이력 복구."""
    log = db.query(BackupLog).filter(BackupLog.id == log_id, BackupLog.is_deleted == True).first()
    if not log:
        raise ValueError(f"삭제된 이력을 찾을 수 없습니다: {log_id}")
    log.is_deleted = False
    log.deleted_at = None
    log.deleted_by = None
    db.commit()
