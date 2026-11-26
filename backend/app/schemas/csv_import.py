"""CSV·엑셀 가져오기 결과 (관제시스템 문서, 업무일지 공용)."""
from pydantic import BaseModel


class CsvImportSkip(BaseModel):
    line: int
    key: str
    name: str
    reason: str


class CsvImportResult(BaseModel):
    total: int
    imported: int
    skipped: list[CsvImportSkip]
    new_categories: list[str] = []
    missing_files: list[str] = []
    warnings: list[str] = []
