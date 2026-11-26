"""통근비 계산기 — 달별 ERP 근태 자료 (한 달 한 줄, 같은 달을 다시 올리면 덮어씀)."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB

from app.db.database import Base


class CommuteMonth(Base):
    __tablename__ = "skywatch_commute_months"

    id          = Column(Integer, primary_key=True)
    ym          = Column(String(7), unique=True, nullable=False)   # "YYYY-MM"
    file_name   = Column(String(255), nullable=False, default="")
    row_count   = Column(Integer, nullable=False, default=0)
    # [{name, d, sched, daily, holi, duty, attend}] — 계산에 쓰는 칸만(사번·소속 없음)
    rows        = Column(JSONB, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("skywatch_users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
