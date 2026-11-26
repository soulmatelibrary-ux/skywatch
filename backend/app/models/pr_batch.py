"""PR 배치 관리 모델."""
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint, func,
)
from app.db.database import Base


class PrBatch(Base):
    __tablename__ = "skywatch_pr_batches"

    id            = Column(Integer, primary_key=True)
    batch_no      = Column(String(20), unique=True, nullable=False)
    sw_version    = Column(String(50), nullable=False)
    previous_version = Column(String(50), nullable=True)
    # 검증 보고서 기본값 (버전마다 같은 값)
    skyline_version    = Column(String(100), nullable=True)
    adaptation_version = Column(String(100), nullable=True)
    test_segment       = Column(String(100), nullable=True)
    agreed_date   = Column(Date, nullable=False)
    target_date   = Column(Date, nullable=True)
    delivery_date = Column(Date, nullable=True)
    verified_date = Column(Date, nullable=True)
    status        = Column(String(20), nullable=False, default="합의중")
    summary       = Column(Text, nullable=True)
    notes         = Column(Text, nullable=True)
    created_by    = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    is_deleted    = Column(Boolean, nullable=False, default=False)
    deleted_by    = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    deleted_at    = Column(DateTime(timezone=True), nullable=True)


class PrBatchItem(Base):
    __tablename__ = "skywatch_pr_batch_items"

    id             = Column(Integer, primary_key=True)
    batch_id       = Column(Integer, ForeignKey("skywatch_pr_batches.id", ondelete="CASCADE"), nullable=False)
    issue_id       = Column(Integer, ForeignKey("skywatch_issues.id"), nullable=True)
    item_kind      = Column(String(30), nullable=False, default="개별 PR")
    kac_pr_no      = Column(String(20), nullable=True)
    lm_pr_no       = Column(String(50), nullable=True)
    title          = Column(String(500), nullable=False)
    agreed_content = Column(Text, nullable=True)
    actual_fix     = Column(Text, nullable=True)
    verify_method  = Column(Text, nullable=True)
    item_status    = Column(String(20), nullable=False, default="대기")
    sort_order     = Column(Integer, nullable=False, default=0)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class PrBatchAttachment(Base):
    __tablename__ = "skywatch_pr_batch_attachments"

    id            = Column(Integer, primary_key=True)
    batch_id      = Column(Integer, ForeignKey("skywatch_pr_batches.id", ondelete="CASCADE"), nullable=False)
    doc_type      = Column(String(20), nullable=False, default="기타")
    original_name = Column(String(500), nullable=False)
    stored_name   = Column(String(500), nullable=False)
    file_size     = Column(Integer, nullable=True)
    uploaded_by   = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    uploaded_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_deleted    = Column(Boolean, nullable=False, default=False)


class PrVerification(Base):
    """버전별 PR 항목에 대한 근무자 검증 및 원본 보고서."""
    __tablename__ = "skywatch_pr_verifications"
    __table_args__ = (
        UniqueConstraint("item_id", "user_id", "round_no", name="uq_pr_verification_round"),
    )

    id                   = Column(Integer, primary_key=True)
    item_id              = Column(Integer, ForeignKey("skywatch_pr_batch_items.id", ondelete="CASCADE"), nullable=False)
    user_id              = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    round_no             = Column(Integer, nullable=False, default=1)
    result               = Column(String(20), nullable=False, default="미제출")
    test_case_code       = Column(String(100), nullable=True)
    skyline_version      = Column(String(100), nullable=True)
    adaptation_version   = Column(String(100), nullable=True)
    test_segment         = Column(String(100), nullable=True)
    attendees            = Column(String(200), nullable=True)
    tested_on            = Column(Date, nullable=True)
    started_at           = Column(DateTime(timezone=True), nullable=True)
    ended_at             = Column(DateTime(timezone=True), nullable=True)
    verify_method        = Column(Text, nullable=True)
    result_summary       = Column(Text, nullable=True)
    notes                = Column(Text, nullable=True)
    report_original_name = Column(String(500), nullable=True)
    report_stored_name   = Column(String(500), nullable=True)
    report_file_size     = Column(Integer, nullable=True)
    report_uploaded_at   = Column(DateTime(timezone=True), nullable=True)
    source_import_id     = Column(Integer, ForeignKey("skywatch_pr_workbook_imports.id", ondelete="SET NULL"), nullable=True)
    submitted_by         = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    submitted_at         = Column(DateTime(timezone=True), nullable=True)
    approval_status      = Column(String(20), nullable=False, default="결재대기")
    approved_by          = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    approved_at           = Column(DateTime(timezone=True), nullable=True)
    approval_note         = Column(Text, nullable=True)
    created_by           = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at           = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    is_deleted           = Column(Boolean, nullable=False, default=False)


class PrWorkbookImport(Base):
    """근무자별 업로드 최신 엑셀과 import 결과 요약."""
    __tablename__ = "skywatch_pr_workbook_imports"
    __table_args__ = (UniqueConstraint("batch_id", "user_id", name="uq_pr_workbook_batch_user"),)

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("skywatch_pr_batches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    original_name = Column(String(500), nullable=False)
    stored_name = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    imported_items = Column(Integer, nullable=False, default=0)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
