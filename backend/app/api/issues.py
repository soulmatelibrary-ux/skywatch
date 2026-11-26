"""PR관리 API."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.issue import (
    AttachmentSimple,
    IssueCommentCreate,
    IssueCommentOut,
    IssueCreate,
    IssueOut,
    IssueUpdate,
)
from app.services import issue_service
from app.services.attachment_service import upload_for_issue
from app.services.issue_vector_service import schedule_vectorize_issue

router = APIRouter(prefix="/api/issues", tags=["issues"])


@router.get("", response_model=ApiResponse[dict])
def list_issues(
    status: str | None = Query(None),
    keyword: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    sort: str | None = Query(None, description="reg_date|kac_pr_no|lm_pr_no|title|status|updated_at, 없으면 기본 정렬"),
    order: str | None = Query(None, description="asc|desc"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = issue_service.list_issues(db, status, keyword, date_from, date_to, skip, limit, sort, order)
    return ApiResponse.ok(data={"items": items, "total": total})


@router.post("", response_model=ApiResponse[IssueOut], status_code=201)
def create_issue(
    body: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = issue_service.create_issue(db, current_user.id, body)
    schedule_vectorize_issue(result["id"])
    return ApiResponse.ok(data=result)


@router.get("/{issue_id}", response_model=ApiResponse[IssueOut])
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = issue_service.get_issue(db, issue_id)
    if not result:
        raise HTTPException(status_code=404, detail="PR를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.patch("/{issue_id}", response_model=ApiResponse[IssueOut])
def update_issue(
    issue_id: int,
    body: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = issue_service.update_issue(db, issue_id, current_user.id, body)
    if not result:
        raise HTTPException(status_code=404, detail="PR를 찾을 수 없습니다")
    schedule_vectorize_issue(result["id"])
    return ApiResponse.ok(data=result)


@router.delete("/{issue_id}", response_model=ApiResponse[None])
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not issue_service.delete_issue(db, issue_id, current_user.id):
        raise HTTPException(status_code=404, detail="PR를 찾을 수 없습니다")
    return ApiResponse.ok(data=None)


@router.post("/{issue_id}/comments", response_model=ApiResponse[IssueCommentOut], status_code=201)
def add_comment(
    issue_id: int,
    body: IssueCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = issue_service.add_comment(db, issue_id, current_user.id, body)
    if not result:
        raise HTTPException(status_code=404, detail="PR를 찾을 수 없습니다")
    schedule_vectorize_issue(issue_id)
    return ApiResponse.ok(data=result, message="코멘트가 추가되었습니다")


@router.delete("/comments/{comment_id}", response_model=ApiResponse[None])
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not issue_service.delete_comment(db, comment_id, current_user.id):
        raise HTTPException(status_code=404, detail="코멘트를 찾을 수 없습니다")
    return ApiResponse.ok(data=None)


@router.post("/{issue_id}/attachments", response_model=ApiResponse[AttachmentSimple], status_code=201)
async def upload_attachment(
    issue_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        att = await upload_for_issue(db, issue_id, current_user.id, file)
        schedule_vectorize_issue(issue_id)
        return ApiResponse.ok(data={
            "id": att.id,
            "original_name": att.original_name,
            "file_name": att.file_name,
            "file_size": att.file_size,
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/attachments/{att_id}", response_model=ApiResponse[None])
def delete_attachment(
    att_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not issue_service.delete_attachment(db, att_id):
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    return ApiResponse.ok(data=None)
