"""PR 시험확인서 빈 양식 엑셀을 만든다 (실제 양식 레이아웃)."""
import io
from openpyxl import Workbook
from openpyxl.styles import Font, Border, Side, Alignment
from sqlalchemy.orm import Session
from app.models.pr_batch import PrBatch, PrBatchItem

_T = Side(style="thin")
_BOX = Border(left=_T, right=_T, top=_T, bottom=_T)
_B12 = Font(size=12, bold=True)
_R12 = Font(size=12)
_R11 = Font(size=11)
_H20 = Font(size=20, bold=True)
_JC = Alignment(horizontal="justify", vertical="center", wrap_text=True)
_CC = Alignment(horizontal="center", vertical="center", wrap_text=True)
_LC = Alignment(horizontal="left", vertical="center", wrap_text=True)
_VC = Alignment(vertical="center", wrap_text=True)


def _s(ws, r, c, v, f=_R12, a=_LC, b=_BOX):
    cl = ws.cell(row=r, column=c, value=v)
    cl.font, cl.alignment = f, a
    if b:
        cl.border = b

def _mg(ws, r1, c1, r2, c2, v=None, f=_R12, a=_LC):
    ws.merge_cells(start_row=r1, start_column=c1, end_row=r2, end_column=c2)
    _s(ws, r1, c1, v, f, a)
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            ws.cell(row=r, column=c).border = _BOX


def _build_sheet(ws, batch: PrBatch, item: PrBatchItem):
    pr = item.kac_pr_no or item.lm_pr_no or f"PR{item.id}"
    tt = item.title or ""
    sky = batch.skyline_version or batch.sw_version or ""
    adp, seg = batch.adaptation_version or "", batch.test_segment or "시험평가시스템"
    # 열 너비
    for col, w in zip("ABCDEFG", [1.125, 16, 10, 12.25, 11.875, 26.875, 1.625]):
        ws.column_dimensions[col].width = w
    # 행 높이
    hs = {1: 31.5, 3: 30.75, 4: 54.75, 12: 20.25, 14: 29.25, 15: 116.25,
           29: 31.5, 30: 19.5, 32: 37.5, 36: 37.5}
    for r in range(5, 10):
        hs[r] = 28.5
    _17 = {2, 10, 11, 13, 31, 37}
    for r in list(range(16, 29)) + list(range(33, 36)) + list(range(38, 58)) + list(_17):
        hs.setdefault(r, 17.25 if r in _17 else 16.5)
    for r, h in hs.items():
        ws.row_dimensions[r].height = h
    # --- 1페이지 ---
    ws.merge_cells("B1:G1")
    _s(ws, 1, 2, "시험 확인서", _H20, _CC, None)
    # Row 3
    _s(ws, 3, 2, "작성자 ", _B12, _JC)
    _s(ws, 3, 3, None, _R12, _VC, Border(top=_T, bottom=_T, left=_T))
    _s(ws, 3, 4, "관련 PR번호", _B12, _JC)
    _mg(ws, 3, 5, 3, 6, pr, _R12, _CC)
    # Row 4~9: 라벨(B:C) + 값(D:F)
    for row, lbl, val in [(4, "시 험 명 ", tt), (5, "Skyline 버전", sky),
                          (6, "Adaptation 버전", adp), (7, "시 험 일 자", None),
                          (8, "시험 세그먼트", seg), (9, "시험 참석자", None)]:
        _mg(ws, row, 2, row, 3, lbl, _B12, _JC)
        _mg(ws, row, 4, row, 6, val, _R12, _LC)
    # Row 12
    ws.merge_cells("B12:C12")
    _s(ws, 12, 2, "□ 시험항목 및 결과", Font(size=13), _CC, None)
    # Row 14 header + 15~22 body
    _mg(ws, 14, 2, 14, 3, "시험항목", _B12, _CC)
    _mg(ws, 14, 4, 14, 6, "시험결과", _B12, _CC)
    _mg(ws, 15, 2, 22, 3, pr, _R12, _CC)
    _mg(ws, 15, 4, 22, 6, None, _R11, _LC)
    # Row 25
    ws.merge_cells("B25:G25")
    _s(ws, 25, 2, "☞ 뒷장 <시험보고서> : 시험항목별 시험방법 등의 세부내역 기술",
       _R11, Alignment(horizontal="left", vertical="center"), None)
    # --- 2페이지 ---
    ws.merge_cells("B29:G29")
    _s(ws, 29, 2, "시험 확인서", _H20, _CC, None)
    for r, lbl in [(31, "□ 작 성 자:"), (32, "□ 시 험 명: "),
                   (33, "□ 시험 시작 시간: "), (34, "□ 시험 종료 시간: ")]:
        _s(ws, r, 2, lbl, _R11, _VC, None)
    ws.merge_cells("C32:F32")
    _s(ws, 32, 3, tt, _R11, _LC, None)
    for r in (33, 34):
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    # Row 36~64
    _s(ws, 36, 2, "시험항목", Font(size=13, bold=True), _CC)
    _mg(ws, 36, 3, 36, 6, tt, _R11, _LC)
    ws.cell(row=36, column=2).border = _BOX
    _mg(ws, 37, 2, 37, 6, "시험방법", Font(size=12), _CC)
    _mg(ws, 38, 2, 57, 6, None, _R11, _LC)
    _mg(ws, 58, 2, 58, 6, "시험결과", Font(size=12, bold=True), _CC)
    _mg(ws, 59, 2, 64, 6, None, Font(size=10), _CC)


def build_template_workbook(
    db: Session, batch_id: int, item_ids: list[int] | None = None,
) -> tuple[bytes, str]:
    """양식 엑셀 바이트와 파일 이름을 돌려준다."""
    batch = db.query(PrBatch).filter(
        PrBatch.id == batch_id, PrBatch.is_deleted.is_(False),
    ).first()
    if batch is None:
        raise LookupError("버전을 찾을 수 없습니다")
    q = db.query(PrBatchItem).filter(PrBatchItem.batch_id == batch_id)
    if item_ids:
        q = q.filter(PrBatchItem.id.in_(item_ids))
    items = q.order_by(PrBatchItem.sort_order, PrBatchItem.id).all()
    if not items:
        raise ValueError("내보낼 PR 항목이 없습니다")
    wb = Workbook()
    wb.remove(wb.active)  # type: ignore[arg-type]
    for item in items:
        pr_no = item.kac_pr_no or item.lm_pr_no or f"PR{item.id}"
        ws = wb.create_sheet(title=pr_no[:31])
        _build_sheet(ws, batch, item)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue(), f"{batch.sw_version}_시험확인서양식.xlsx"
