"""Task CRUD service."""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.user import User

_KST = timezone(timedelta(hours=9))


def _now() -> str:
    return datetime.now(_KST).strftime('%Y-%m-%d %H:%M')


def _today() -> str:
    return datetime.now(_KST).strftime('%Y-%m-%d')


def _in_3days() -> str:
    return (datetime.now(_KST) + timedelta(days=3)).strftime('%Y-%m-%d')


def _expand(db: Session, mode: str, teams: list, given: list) -> list:
    if mode == 'all':
        return [u.id for u in db.scalars(select(User).where(User.is_active.is_(True)))]
    if mode == 'teams':
        return [u.id for u in db.scalars(select(User).where(User.is_active.is_(True), User.team.in_(teams)))]
    return given


def _completed_expr():
    completed_count = func.coalesce(func.jsonb_array_length(Task.completed_by), 0)
    recipient_count = func.coalesce(func.jsonb_array_length(Task.recipients), 0)
    return and_(recipient_count > 0, completed_count >= recipient_count)


def _is_completed_task(task: Task) -> bool:
    recipients = list(task.recipients or [])
    if not recipients:
        return False
    return len(task.completed_by or []) >= len(recipients)


def _apply_date_filter(q, date_field: str | None, date_from: str | None, date_to: str | None):
    if date_field == 'due':
        if date_from:
            q = q.where(Task.due_date.isnot(None), Task.due_date >= f'{date_from} 00:00')
        if date_to:
            q = q.where(Task.due_date.isnot(None), Task.due_date <= f'{date_to} 23:59')
        return q

    if date_from:
        start = datetime.strptime(date_from, '%Y-%m-%d').replace(tzinfo=_KST)
        q = q.where(Task.created_at >= start)
    if date_to:
        end = datetime.strptime(date_to, '%Y-%m-%d').replace(tzinfo=_KST) + timedelta(days=1)
        q = q.where(Task.created_at < end)
    return q


def list_tasks(
    db: Session,
    uid: int,
    tab: str = 'all',
    days: int = 60,
    status: str = 'active',
    date_field: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[Task]:
    q = select(Task).where(Task.is_deleted.is_(False), Task.is_archived.is_(False))

    if tab == 'all' and status != 'completed':
        cutoff = datetime.now(_KST) - timedelta(days=days)
        q = q.where(Task.created_at >= cutoff)
    elif tab == 'mine':
        q = q.where(Task.recipients.contains([uid]))
    elif tab == 'created':
        q = q.where(Task.sender_id == uid)
    elif tab == 'todo':
        q = q.where(Task.recipients.contains([uid]), ~Task.completed_by.contains([uid]))
    elif tab == 'overdue':
        q = q.where(Task.due_date.isnot(None), Task.due_date < _now())
    elif tab == 'due-soon':
        q = q.where(
            Task.due_date.isnot(None),
            Task.due_date >= _now(),
            Task.due_date <= f'{_in_3days()} 23:59',
        )
    elif tab == 'deadline':
        q = q.where(
            Task.due_date.isnot(None),
            Task.due_date <= f'{_in_3days()} 23:59',
        )
    elif tab == 'archived':
        q = select(Task).where(Task.is_deleted.is_(False), Task.is_archived.is_(True))

    if tab != 'archived':
        if status == 'completed':
            q = q.where(_completed_expr())
        elif status == 'active':
            q = q.where(~_completed_expr())

    q = _apply_date_filter(q, date_field, date_from, date_to)
    tasks = list(db.scalars(q.order_by(Task.created_at.desc())).all())

    if tab == 'archived':
        return tasks

    if status == 'completed':
        return [t for t in tasks if _is_completed_task(t)]
    if status == 'active':
        return [t for t in tasks if not _is_completed_task(t)]
    return tasks


def get_task(db: Session, task_id: int) -> Task | None:
    t = db.get(Task, task_id)
    return t if t and not t.is_deleted else None


def create_task(db: Session, uid: int, data) -> Task:
    recipients = _expand(db, data.recipients_mode, data.target_teams or [], data.recipients or [])
    t = Task(
        sender_id=uid,
        title=data.title,
        body=data.body,
        importance=data.importance,
        due_date=data.due_date,
        recipients_mode=data.recipients_mode,
        recipients=recipients,
        target_teams=data.target_teams or [],
        linked_card_id=getattr(data, 'linked_card_id', None),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    try:
        _push_task_notifications(db, t)
    except Exception:
        pass
    return t


def update_task(db: Session, task_id: int, data) -> Task | None:
    t = db.scalars(
        select(Task).where(Task.id == task_id).with_for_update()
    ).first()
    if not t or t.is_deleted:
        return None
    mode = data.recipients_mode or t.recipients_mode
    teams = data.target_teams if data.target_teams is not None else list(t.target_teams or [])
    given = data.recipients if data.recipients is not None else list(t.recipients or [])
    if data.title is not None:
        t.title = data.title
    if data.body is not None:
        t.body = data.body
    if data.importance is not None:
        t.importance = data.importance
    if data.due_date is not None:
        t.due_date = None if data.due_date == '' else data.due_date
    t.recipients_mode = mode
    t.target_teams = teams
    t.recipients = _expand(db, mode, teams, given)
    db.commit()
    db.refresh(t)
    return t


def toggle_complete(db: Session, task_id: int, uid: int) -> Task | None:
    t = db.scalars(
        select(Task).where(Task.id == task_id).with_for_update()
    ).first()
    if not t or t.is_deleted:
        return None
    done = list(t.completed_by or [])
    if uid in done:
        done.remove(uid)
    else:
        done.append(uid)
    t.completed_by = done
    db.commit()
    db.refresh(t)
    return t


def _push_task_notifications(db: Session, task: Task) -> None:
    """Task recipients notification helper."""
    from app.services.notification_service import create_notification
    from app.websocket.manager import manager
    from app.core.loop_ref import get_loop

    sender = db.get(User, task.sender_id)
    sender_name = sender.name if sender else "Unknown"
    body = f"[업무] {sender_name}님이 업무를 보냈습니다: {task.title}"
    sender_body = f"[업무] 업무를 등록했습니다: {task.title}"
    loop = get_loop()

    # notify sender
    sender_notif = create_notification(db, task.sender_id, "task", sender_body, ref_type="task", ref_id=task.id)
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.send_to_user(task.sender_id, {"type": "notification", "id": sender_notif.id, "body": sender_body}),
            loop,
        )

    for uid in (task.recipients or []):
        if uid == task.sender_id:
            continue
        notif = create_notification(db, uid, "task", body, ref_type="task", ref_id=task.id)
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                manager.send_to_user(uid, {"type": "notification", "id": notif.id, "body": body}),
                loop,
            )


def delete_task(db: Session, task_id: int, uid: int) -> bool:
    t = db.scalars(
        select(Task).where(Task.id == task_id).with_for_update()
    ).first()
    if not t or t.is_deleted:
        return False
    t.is_deleted = True
    t.deleted_by = uid
    t.deleted_at = datetime.now(_KST)
    db.commit()
    return True


def archive_old_tasks(db: Session) -> int:
    """Archive tasks completed more than 30 days ago."""
    cutoff = datetime.now(_KST) - timedelta(days=30)
    tasks = db.scalars(
        select(Task).where(
            Task.is_deleted.is_(False),
            Task.is_archived.is_(False),
            Task.updated_at < cutoff,
        )
    ).all()

    count = 0
    for t in tasks:
        if not t.recipients:
            continue
        if len(t.completed_by or []) < len(t.recipients):
            continue
        t.is_archived = True
        t.archived_at = datetime.now(_KST)
        count += 1

    if count:
        db.commit()
    return count
