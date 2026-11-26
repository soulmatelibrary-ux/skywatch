"""shiftCalendar.html 전용 어댑터 라우터 — SkyWatch DB 사용.

HTML이 기대하는 포맷:
  GET  /api/shift/data-all  → { staff, master, notices, carryOver }
  POST /api/shift/save-all  ← { staff, master, notices, carryOver }
  GET  /api/shift/export    → 위와 동일 (다운로드용)
  POST /api/shift/merge     ← { staff, master, notices, carryOver }
  POST /api/shift/rollback  ← { snapshot_id }
  POST /api/shift/clear     → 전체 초기화

SkyWatch DB 테이블:
  skywatch_shift_data         (date, memo jsonb, shift_code, repeat_type, updated_at)
  skywatch_shift_staff_master (name, emp_no, grade, shift, from_date, to_date, no_excel)
  skywatch_shift_notices      (id, text, start_date, end_date, deleted_at, created_at)
  skywatch_shift_carry_raw    (year, name, hours)
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/api/shift", tags=["shift-adapter"])


def _to_int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


# ─── 읽기 헬퍼 ────────────────────────────────────────────────────────────────

def _build_staff(db: Session) -> Dict[str, Any]:
    rows = db.execute(text(
        "SELECT date, memo, shift_code, repeat_type FROM skywatch_shift_data ORDER BY date"
    )).fetchall()
    result: Dict[str, Any] = {}
    for row in rows:
        memo = row[1]
        if isinstance(memo, str):
            try:
                memo = json.loads(memo)
            except Exception:
                memo = []
        elif memo is None:
            memo = []
        if not isinstance(memo, list):
            memo = [str(memo)] if memo else []
        else:
            memo = [str(item) for item in memo if item is not None]
        entry: Dict[str, Any] = {"memo": memo}
        if row[2]:
            entry["shift"] = row[2]
        if row[3]:
            entry["repeat"] = row[3]
        result[str(row[0])] = entry
    return result


def _build_master(db: Session) -> list:
    rows = db.execute(text(
        "SELECT name, emp_no, grade, shift, from_date, to_date, no_excel "
        "FROM skywatch_shift_staff_master ORDER BY from_date, name"
    )).fetchall()
    return [
        {
            "name":    row[0],
            "empNo":   row[1],
            "grade":   row[2] or "",
            "shift":   row[3] or "",
            "from":    str(row[4]) if row[4] else "",
            "to":      str(row[5]) if row[5] else None,
            "noExcel": bool(row[6]),
        }
        for row in rows
    ]


def _build_notices(db: Session) -> Dict[str, Any]:
    rows = db.execute(text(
        "SELECT id, text, start_date, end_date, deleted_at FROM skywatch_shift_notices ORDER BY id"
    )).fetchall()
    notices, history = [], []
    for row in rows:
        item: Dict[str, Any] = {
            "id":    row[0],
            "text":  row[1],
            "start": str(row[2]) if row[2] else "",
            "end":   str(row[3]) if row[3] else "",
        }
        if row[4]:
            item["deletedAt"] = str(row[4])
            history.append(item)
        else:
            notices.append(item)
    return {"notices": notices, "history": history}


def _build_carry_over(db: Session) -> Dict[str, Any]:
    rows = db.execute(text(
        "SELECT year, name, hours FROM skywatch_shift_carry_raw ORDER BY year, name"
    )).fetchall()
    result: Dict[str, Any] = {}
    for row in rows:
        result.setdefault(str(row[0]), {})[row[1]] = float(row[2])
    return result


# ─── 쓰기 헬퍼 ────────────────────────────────────────────────────────────────

def _save_staff(db: Session, staff: Dict[str, Any]) -> int:
    count = 0
    for date_str, entry in staff.items():
        if not (isinstance(date_str, str) and len(date_str) == 10):
            continue
        # 날짜 형식 검증: YYYY-MM-DD
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            continue
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue
        memo_list = entry.get("memo")
        if not isinstance(memo_list, list):
            memo_list = []
        memo_json = json.dumps(memo_list, ensure_ascii=False)
        try:
            db.execute(text("""
                INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, updated_at)
                VALUES (:date, CAST(:memo AS JSONB), :shift_code, :repeat_type, NOW())
                ON CONFLICT (date) DO UPDATE SET
                    memo        = EXCLUDED.memo,
                    shift_code  = EXCLUDED.shift_code,
                    repeat_type = EXCLUDED.repeat_type,
                    updated_at  = NOW()
            """), {
                "date":        date_str,
                "memo":        memo_json,
                "shift_code":  entry.get("shift") or None,
                "repeat_type": entry.get("repeat") or None,
            })
            count += 1
        except Exception as e:
            print(f"[ERROR] Failed to save shift data for {date_str}: {str(e)}")
            raise
    return count


def _save_master(db: Session, master: list) -> int:
    db.execute(text("DELETE FROM skywatch_shift_staff_master"))
    count = 0
    for s in master:
        name = (s.get("name") or "").strip()
        if not name:
            continue
        try:
            db.execute(text("""
                INSERT INTO skywatch_shift_staff_master (name, emp_no, grade, shift, from_date, to_date, no_excel)
                VALUES (:name, :emp_no, :grade, :shift, :from_date, :to_date, :no_excel)
            """), {
                "name":      name,
                "emp_no":    _to_int(s.get("empNo") or s.get("emp_no")),
                "grade":     s.get("grade") or "4급",
                "shift":     s.get("shift") or "일근",
                "from_date": s.get("from") or s.get("from_date") or None,
                "to_date":   s.get("to") or s.get("to_date") or None,
                "no_excel":  bool(s.get("noExcel") or s.get("no_excel") or False),
            })
            count += 1
        except Exception as e:
            print(f"[ERROR] Failed to save master entry for {name}: {str(e)}")
            raise
    return count


def _save_notices(db: Session, notices_data: Dict[str, Any]) -> int:
    notices_list = notices_data.get("notices", [])
    if not isinstance(notices_list, list):
        return 0
    db.execute(text("DELETE FROM skywatch_shift_notices WHERE deleted_at IS NULL"))
    count = 0
    for n in notices_list:
        text_val = n.get("text", "")
        if not text_val:
            continue
        try:
            db.execute(text("""
                INSERT INTO skywatch_shift_notices (text, start_date, end_date, deleted_at, created_at)
                VALUES (:text, :start_date, :end_date, NULL, :created_at)
            """), {
                "text":       text_val,
                "start_date": n.get("start") or n.get("startDate") or None,
                "end_date":   n.get("end") or n.get("endDate") or None,
                "created_at": n.get("createdAt") or datetime.now().isoformat(timespec="seconds"),
            })
            count += 1
        except Exception as e:
            print(f"[ERROR] Failed to save notice: {str(e)}")
            raise
    return count


def _save_carry_over(db: Session, carry_data: Dict[str, Any]) -> int:
    if not isinstance(carry_data, dict):
        return 0
    db.execute(text("DELETE FROM skywatch_shift_carry_raw"))
    count = 0
    for year, names in carry_data.items():
        if not isinstance(names, dict):
            continue
        for name, hours in names.items():
            try:
                db.execute(text("""
                    INSERT INTO skywatch_shift_carry_raw (year, name, hours)
                    VALUES (:year, :name, :hours)
                    ON CONFLICT (year, name) DO UPDATE SET hours = EXCLUDED.hours
                """), {"year": str(year), "name": str(name), "hours": float(hours)})
                count += 1
            except (TypeError, ValueError) as e:
                print(f"[WARNING] Skipped carry_over entry {year}/{name}: {str(e)}")
                continue
            except Exception as e:
                print(f"[ERROR] Failed to save carry_over {year}/{name}: {str(e)}")
                raise
    return count


# ─── 엔드포인트 ──────────────────────────────────────────────────────────────

@router.get("/notices-only")
def get_notices_only(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return _build_notices(db)


@router.get("/data-all")
def get_data_all(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return {
        "staff":     _build_staff(db),
        "master":    _build_master(db),
        "notices":   _build_notices(db),
        "carryOver": _build_carry_over(db),
    }


class SaveAllPayload(BaseModel):
    staff:     Dict[str, Any] = {}
    master:    list = []
    notices:   Dict[str, Any] = {}
    carryOver: Dict[str, Any] = {}


@router.post("/save-all")
def save_all(
    payload: SaveAllPayload,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        _save_staff(db, payload.staff)
        if payload.master:
            _save_master(db, payload.master)
        _save_notices(db, payload.notices)
        _save_carry_over(db, payload.carryOver)
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"저장 실패: {str(e)[:200]}")


@router.get("/export")
def export_data(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return {
        "staff":       _build_staff(db),
        "staffMaster": _build_master(db),
        "notices":     _build_notices(db),
        "carryOver":   _build_carry_over(db),
    }


class MergePayload(BaseModel):
    staff:       Dict[str, Any] = {}
    staffMaster: list = []
    notices:     Dict[str, Any] = {}
    noticeData:  Dict[str, Any] = {}
    carryOver:   Dict[str, Any] = {}


@router.post("/merge")
def merge_data(
    payload: MergePayload,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        merged_count   = _save_staff(db, payload.staff)
        master_merged  = _save_master(db, payload.staffMaster) if payload.staffMaster else 0
        notices_src    = payload.notices if payload.notices else payload.noticeData
        notices_merged = _save_notices(db, notices_src)
        carry_merged   = _save_carry_over(db, payload.carryOver)
        db.commit()
        return {
            "ok":             True,
            "snapshot_id":    str(uuid.uuid4()),
            "total_rows":     merged_count,
            "merged_count":   merged_count,
            "master_merged":  master_merged,
            "notices_merged": notices_merged,
            "carry_merged":   carry_merged,
        }
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"[ERROR] Merge failed: {error_msg}")
        raise HTTPException(status_code=500, detail=f"병합 실패: {error_msg[:200]}")


class RollbackPayload(BaseModel):
    snapshot_id: str


@router.post("/rollback")
def rollback_data(
    payload: RollbackPayload,
    _db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return {"ok": True, "message": "rollback not implemented — re-load from DB"}


@router.post("/clear")
def clear_data(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    db.execute(text("DELETE FROM skywatch_shift_data"))
    db.execute(text("DELETE FROM skywatch_shift_notices"))
    db.execute(text("DELETE FROM skywatch_shift_carry_raw"))
    db.commit()
    return {"ok": True}
