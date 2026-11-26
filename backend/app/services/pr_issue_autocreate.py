"""기준 엑셀의 PR 이 개별 PR(skywatch_issues)에 없을 때 자동 등록.

엑셀 번호(SL-xxxx)는 제작사(LM) PR번호라 우리 부서의 KAC PR번호와 체계가 다르다.
그래서 제작사 번호(lm_pr_no)로 저장하고, KAC PR번호는 나중에 사람이 채운다.
"""
import threading

from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.pr_batch import PrBatch


def create_from_catalog(db: Session, batch: PrBatch, actor_id: int, pr_no: str, title: str, content: str | None) -> Issue:
    """버전 정보로 채운 새 개별 PR. 번호 외 값은 기존 6.6g 개별 PR 과 같은 형식(skyline 버전, 진행중)."""
    issue = Issue(
        lm_pr_no=pr_no,
        title=(title or pr_no)[:500],
        content=content or None,
        status="진행중",
        version=f"skyline {batch.previous_version}" if batch.previous_version else None,
        mod_version=f"skyline {batch.sw_version}"[:100],
        reg_date=batch.agreed_date,
        assigned_to=actor_id,
        created_by=actor_id,
    )
    db.add(issue)
    db.flush()
    return issue


def vectorize_later(issue_ids: list[int]) -> None:
    """검색용 임베딩을 한 스레드에서 차례로 만든다 (모델을 동시에 여러 번 쓰지 않도록)."""
    if not issue_ids:
        return

    def _run() -> None:
        from app.db.session import SessionLocal
        from app.services.issue_vector_service import vectorize_issue
        db = SessionLocal()
        try:
            for issue_id in issue_ids:
                try:
                    vectorize_issue(db, issue_id)
                except Exception as exc:
                    print(f"[WARN] issue auto-vectorize {issue_id} failed: {exc}")
        finally:
            db.close()

    threading.Thread(target=_run, daemon=True).start()
