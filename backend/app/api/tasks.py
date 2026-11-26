"""Task & 정기 템플릿 API."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.task import (
    RecurringTemplateCreate, RecurringTemplateOut, RecurringTemplateUpdate,
    TaskCreate, TaskOut, TaskUpdate,
)
from app.services import task_service, template_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _format_due_date(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


def _task_out(task) -> TaskOut:
    return TaskOut.model_validate({
        "id": task.id,
        "sender_id": task.sender_id,
        "title": task.title,
        "body": task.body,
        "importance": task.importance,
        "due_date": _format_due_date(task.due_date),
        "recipients_mode": task.recipients_mode,
        "recipients": list(task.recipients or []),
        "target_teams": list(task.target_teams or []),
        "completed_by": list(task.completed_by or []),
        "linked_card_id": task.linked_card_id,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    })

# ── 정기 템플릿 (/{task_id: int} 보다 먼저 등록) ──────────────────────────
@router.get("/templates/match", response_model=ApiResponse[list[RecurringTemplateOut]])
def match_templates(
    date: str = Query(..., description="YYYY-MM-DD"),
    shift_type: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=template_service.get_matching_for_log(db, date, shift_type))


@router.get("/templates", response_model=ApiResponse[list[RecurringTemplateOut]])
def list_templates(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=template_service.list_templates(db))

@router.post("/templates", response_model=ApiResponse[RecurringTemplateOut], status_code=201)
def create_template(body: RecurringTemplateCreate, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    return ApiResponse.ok(data=template_service.create_template(db, u.id, body))

@router.put("/templates/{tpl_id}", response_model=ApiResponse[RecurringTemplateOut])
def update_template(tpl_id: int, body: RecurringTemplateUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = template_service.update_template(db, tpl_id, body)
    if not t: raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")
    return ApiResponse.ok(data=t)

@router.post("/templates/{tpl_id}/toggle", response_model=ApiResponse[RecurringTemplateOut])
def toggle_template(tpl_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = template_service.toggle_active(db, tpl_id)
    if not t: raise HTTPException(status_code=404)
    return ApiResponse.ok(data=t)

@router.delete("/templates/{tpl_id}", response_model=ApiResponse[None])
def delete_template(tpl_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not template_service.delete_template(db, tpl_id): raise HTTPException(status_code=404)
    return ApiResponse.ok()

# ── Task CRUD ─────────────────────────────────────────────────────────────
@router.get("", response_model=ApiResponse[list[TaskOut]])
def list_tasks(
    tab: str = Query("all"),
    days: int = Query(60, ge=1),
    status: str = Query("active"),
    date_field: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    tasks = task_service.list_tasks(db, u.id, tab, days, status, date_field, date_from, date_to)
    return ApiResponse.ok(data=[_task_out(t) for t in tasks])

@router.post("", response_model=ApiResponse[TaskOut], status_code=201)
def create_task(body: TaskCreate, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    t = task_service.create_task(db, u.id, body)
    return ApiResponse.ok(data=_task_out(t))

@router.get("/{task_id}", response_model=ApiResponse[TaskOut])
def get_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = task_service.get_task(db, task_id)
    if not t: raise HTTPException(status_code=404, detail="Task를 찾을 수 없습니다")
    return ApiResponse.ok(data=_task_out(t))

@router.put("/{task_id}", response_model=ApiResponse[TaskOut])
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    t = task_service.update_task(db, task_id, body)
    if not t: raise HTTPException(status_code=404)
    return ApiResponse.ok(data=_task_out(t))

@router.post("/{task_id}/complete", response_model=ApiResponse[TaskOut])
def toggle_complete(task_id: int, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    t = task_service.toggle_complete(db, task_id, u.id)
    if not t: raise HTTPException(status_code=404)
    return ApiResponse.ok(data=_task_out(t))

@router.delete("/{task_id}", response_model=ApiResponse[None])
def delete_task(task_id: int, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    if not task_service.delete_task(db, task_id, u.id): raise HTTPException(status_code=404)
    return ApiResponse.ok()
