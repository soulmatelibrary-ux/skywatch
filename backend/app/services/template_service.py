"""정기 Task 템플릿 CRUD 서비스."""
from datetime import date as _date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import RecurringTaskTemplate


def _to_repeat_days(t: RecurringTaskTemplate) -> list:
    if t.frequency == "monthly":
        return [str(t.day_of_month)] if t.day_of_month is not None else []
    if t.frequency == "weekly":
        return list(t.days_of_week or [])
    return []


def _template_text(content: object, key: str) -> str:
    if isinstance(content, dict):
        value = content.get(key)
        return str(value) if value is not None else ""
    if key == "body" and isinstance(content, str):
        return content
    return ""


def _build_template_content(title: str | None, body: str | None) -> dict:
    safe_title = (title or "").strip()
    safe_body = (body or "").strip()
    return {
        "title": safe_title,
        "body": safe_body,
    }


def _serialize_template(t: RecurringTaskTemplate) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "repeat_type": t.frequency,
        "repeat_days": _to_repeat_days(t),
        "repeat_time": t.run_at_time,
        "template_title": _template_text(t.template_content, "title") or t.name,
        "template_body": _template_text(t.template_content, "body"),
        "template_importance": "normal",
        "target_teams": list(t.target_teams or []),
        "target_shift_types": list(t.target_shift_types or []),
        "is_active": t.is_active,
        "next_run_at": t.next_run_at,
        "last_executed_at": t.last_run_at,
    }


def _normalize_repeat_days(values: list | None) -> list:
    if not values:
        return []
    return [str(v) for v in values if str(v).strip()]


def _first_day_of_month(values: list | None) -> int | None:
    for raw in _normalize_repeat_days(values):
        try:
            day = int(raw)
        except ValueError:
            continue
        if 1 <= day <= 31:
            return day
    return None


def list_templates(db: Session) -> list[dict]:
    templates = db.scalars(select(RecurringTaskTemplate).order_by(RecurringTaskTemplate.id)).all()
    return [_serialize_template(t) for t in templates]


def get_template(db: Session, tpl_id: int) -> RecurringTaskTemplate | None:
    return db.get(RecurringTaskTemplate, tpl_id)


def create_template(db: Session, uid: int, data) -> dict:
    repeat_type = data.repeat_type or "daily"
    repeat_days = _normalize_repeat_days(data.repeat_days)

    t = RecurringTaskTemplate(
        name=data.name,
        frequency=repeat_type,
        run_at_time=data.repeat_time,
        days_of_week=repeat_days if repeat_type == "weekly" else None,
        day_of_month=_first_day_of_month(repeat_days) if repeat_type == "monthly" else None,
        run_once_date=getattr(data, "run_once_date", None),
        template_content=_build_template_content(data.template_title or data.name, data.template_body),
        target_teams=data.target_teams or [],
        target_shift_types=data.target_shift_types or [],
        is_active=True,
        created_by=uid,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize_template(t)


def update_template(db: Session, tpl_id: int, data) -> dict | None:
    t = db.get(RecurringTaskTemplate, tpl_id)
    if not t:
        return None

    payload = data.model_dump(exclude_none=True)

    if "name" in payload:
        t.name = payload["name"]

    repeat_type = payload.get("repeat_type", t.frequency)
    repeat_days = _normalize_repeat_days(payload.get("repeat_days", _to_repeat_days(t)))

    t.frequency = repeat_type
    if "repeat_time" in payload:
        t.run_at_time = payload["repeat_time"]

    if repeat_type == "weekly":
        t.days_of_week = repeat_days
        t.day_of_month = None
    elif repeat_type == "monthly":
        t.day_of_month = _first_day_of_month(repeat_days)
        t.days_of_week = None
    else:
        t.days_of_week = None
        t.day_of_month = None

    if "run_once_date" in payload:
        t.run_once_date = payload["run_once_date"]

    if "template_body" in payload or "template_title" in payload:
        current_title = _template_text(t.template_content, "title") or t.name
        current_body = _template_text(t.template_content, "body")
        next_title = payload.get("template_title", current_title)
        next_body = payload.get("template_body", current_body)
        t.template_content = _build_template_content(next_title, next_body)

    if "target_teams" in payload:
        t.target_teams = payload["target_teams"] or []
    if "target_shift_types" in payload:
        t.target_shift_types = payload["target_shift_types"] or []
    if "is_active" in payload:
        t.is_active = bool(payload["is_active"])

    db.commit()
    db.refresh(t)
    return _serialize_template(t)


def toggle_active(db: Session, tpl_id: int) -> dict | None:
    t = db.get(RecurringTaskTemplate, tpl_id)
    if not t:
        return None
    t.is_active = not t.is_active
    db.commit()
    db.refresh(t)
    return _serialize_template(t)


def delete_template(db: Session, tpl_id: int) -> bool:
    t = db.get(RecurringTaskTemplate, tpl_id)
    if not t:
        return False
    db.delete(t)
    db.commit()
    return True


def get_matching_for_log(db: Session, log_date: _date | str, shift_type: str) -> list[dict]:
    """날짜·근무유형에 맞는 활성 monthly 템플릿 반환."""
    try:
        day = log_date.day if isinstance(log_date, _date) else int(log_date.split('-')[2])
    except (ValueError, IndexError, AttributeError):
        return []

    templates = db.scalars(
        select(RecurringTaskTemplate).where(
            RecurringTaskTemplate.is_active.is_(True),
            RecurringTaskTemplate.frequency == 'monthly',
            RecurringTaskTemplate.day_of_month == day,
        )
    ).all()

    result = []
    for t in templates:
        if t.target_shift_types and shift_type not in t.target_shift_types:
            continue
        result.append(_serialize_template(t))
    return result
