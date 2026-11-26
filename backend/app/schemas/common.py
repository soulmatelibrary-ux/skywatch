"""4번 문서 기준 표준 API 응답 스키마."""
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiError(BaseModel):
    code: str
    message: str
    details: Any = None


class Pagination(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class ApiResponse(BaseModel, Generic[T]):
    status: str = "success"
    data: T | None = None
    message: str | None = None
    pagination: Pagination | None = None
    error: ApiError | None = None

    @classmethod
    def ok(cls, data: Any = None, message: str | None = None,
           pagination: Pagination | None = None) -> "ApiResponse":
        return cls(status="success", data=data, message=message, pagination=pagination)

    @classmethod
    def fail(cls, code: str, message: str, details: Any = None) -> "ApiResponse":
        return cls(status="error", error=ApiError(code=code, message=message, details=details))
