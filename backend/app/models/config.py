"""시스템 설정 및 벡터 재벡터화 관리."""
from sqlalchemy import Column, DateTime, Integer, String, Text, func
from app.db.database import Base


class Config(Base):
	"""시스템 설정 (key-value 저장소)."""
	__tablename__ = "skywatch_configs"

	id = Column(Integer, primary_key=True)
	setting_key = Column(String(100), unique=True, nullable=False)
	setting_value = Column(Text)
	updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ReindexJob(Base):
	"""벡터 재벡터화 작업 진행 상황."""
	__tablename__ = "skywatch_reindex_jobs"

	id = Column(Integer, primary_key=True)
	job_id = Column(String(100), unique=True, nullable=False)
	model_name = Column(String(50), nullable=False)
	status = Column(String(20), nullable=False, default='pending')  # pending, running, completed, failed
	total_logs = Column(Integer)
	processed_logs = Column(Integer, default=0)
	progress_percent = Column(Integer, default=0)
	error_message = Column(Text)
	started_at = Column(DateTime(timezone=True))
	completed_at = Column(DateTime(timezone=True))
	created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
