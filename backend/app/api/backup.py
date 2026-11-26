"""DB backup and restore API."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services import backup_log_service, backup_service
from app.services.backup_log_service import BackupAction, BackupStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


def _backup_target_from_filename(filename: str) -> str:
    return "skynet" if filename.startswith("skynet_") else "skywatch"


@router.get("/info", response_model=ApiResponse[dict])
def get_backup_info(_: User = Depends(require_admin)):
    try:
        info = backup_service.get_backup_info()
        return ApiResponse.ok(data=info)
    except Exception as e:
        logger.error("Failed to get backup info: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="백업 정보 조회 중 오류가 발생했습니다")


@router.get("", response_model=ApiResponse[list[dict]])
def list_backups(
    target: Literal["skywatch", "skynet"] | None = Query(None),
    _: User = Depends(require_admin),
):
    try:
        items = backup_service.list_backups(target=target)
        return ApiResponse.ok(data=items)
    except Exception as e:
        logger.error("Failed to list backups: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="백업 목록 조회 중 오류가 발생했습니다")


@router.get("/logs", response_model=ApiResponse[list[dict]])
def list_backup_logs(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        logs = backup_log_service.list_logs(db, include_deleted=False)
        return ApiResponse.ok(data=[
            {
                "id": log.id,
                "action": log.action,
                "status": log.status,
                "filename": log.filename,
                "file_size_bytes": log.file_size_bytes,
                "error_message": log.error_message,
                "performed_by": log.performer.name if log.performer else None,
                "created_at": log.created_at.isoformat(),
                "is_deleted": log.is_deleted,
            }
            for log in logs
        ])
    except Exception as e:
        logger.error("Failed to list backup logs: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="이력 조회 중 오류가 발생했습니다")


@router.post("", response_model=ApiResponse[dict])
def create_backup(
    target: Literal["skywatch", "skynet"] = Query("skywatch"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        filename, size = backup_service.run_backup(target=target)
        backup_log_service.record(
            db,
            action=BackupAction.BACKUP,
            status=BackupStatus.SUCCESS,
            performed_by=current_user.id,
            filename=filename,
            file_size_bytes=size,
        )
        return ApiResponse.ok(data={"filename": filename, "message": "백업 완료"})
    except Exception as e:
        logger.error("Backup failed: %s", e, exc_info=True)
        try:
            backup_log_service.record(
                db,
                action=BackupAction.BACKUP,
                status=BackupStatus.FAILURE,
                performed_by=current_user.id,
                error_message="백업 중 시스템 오류가 발생했습니다",
            )
        except Exception as log_err:
            logger.error("Failed to save backup log: %s", log_err)
        raise HTTPException(status_code=500, detail="백업 중 오류가 발생했습니다")


@router.get("/{filename}/download")
def download_backup(filename: str, _: User = Depends(require_admin)):
    try:
        path = backup_service.get_backup_path(filename)
        return FileResponse(
            path=str(path),
            filename=filename,
            media_type="application/octet-stream",
        )
    except ValueError:
        logger.warning("Invalid backup filename: %s", filename)
        raise HTTPException(status_code=400, detail="유효하지 않은 파일명입니다")
    except FileNotFoundError:
        logger.warning("Backup file not found: %s", filename)
        raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다")
    except Exception as e:
        logger.error("Failed to download backup: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="다운로드 중 오류가 발생했습니다")


@router.post("/{filename}/restore", response_model=ApiResponse[dict])
def restore_backup(
    filename: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = _backup_target_from_filename(filename)
    try:
        backup_service.restore_backup(filename)
        log_db = db if target == "skynet" else SessionLocal()
        try:
            backup_log_service.record(
                log_db,
                action=BackupAction.RESTORE,
                status=BackupStatus.SUCCESS,
                performed_by=current_user.id,
                filename=filename,
            )
        finally:
            if target == "skywatch":
                log_db.close()
        return ApiResponse.ok(data={"message": "복구 완료"})
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 파일명입니다")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다")
    except Exception as e:
        logger.error("Restore failed: %s", e, exc_info=True)
        try:
            log_db = db if target == "skynet" else SessionLocal()
            try:
                backup_log_service.record(
                    log_db,
                    action=BackupAction.RESTORE,
                    status=BackupStatus.FAILURE,
                    performed_by=current_user.id,
                    filename=filename,
                    error_message="복구 중 시스템 오류가 발생했습니다",
                )
            finally:
                if target == "skywatch":
                    log_db.close()
        except Exception as log_err:
            logger.error("Failed to save restore log: %s", log_err)
        raise HTTPException(status_code=500, detail="복구 중 오류가 발생했습니다")


@router.delete("/{filename}", response_model=ApiResponse[dict])
def delete_backup(filename: str, _: User = Depends(require_admin)):
    try:
        backup_service.delete_backup(filename)
        return ApiResponse.ok(data={"message": "삭제 완료"})
    except ValueError:
        raise HTTPException(status_code=400, detail="유효하지 않은 파일명입니다")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다")
    except Exception as e:
        logger.error("Failed to delete backup: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="삭제 중 오류가 발생했습니다")


@router.delete("/logs/{log_id}", response_model=ApiResponse[dict])
def delete_backup_log(
    log_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        backup_log_service.delete_log(db, log_id, current_user.id)
        return ApiResponse.ok(data={"message": "이력 삭제 완료"})
    except ValueError:
        raise HTTPException(status_code=404, detail="이력을 찾을 수 없습니다")
    except Exception as e:
        logger.error("Failed to delete backup log: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="이력 삭제 중 오류가 발생했습니다")


@router.post("/logs/{log_id}/restore", response_model=ApiResponse[dict])
def restore_backup_log(
    log_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        backup_log_service.restore_log(db, log_id)
        return ApiResponse.ok(data={"message": "이력 복구 완료"})
    except ValueError:
        raise HTTPException(status_code=404, detail="삭제된 이력을 찾을 수 없습니다")
    except Exception as e:
        logger.error("Failed to restore backup log: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="이력 복구 중 오류가 발생했습니다")
