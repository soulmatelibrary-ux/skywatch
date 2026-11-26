"""PR 검증 결과를 기존 '시험 확인서' 2페이지 양식 PDF로 생성."""
import io
import os
from functools import lru_cache
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.fonts import addMapping
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.platypus.doctemplate import LayoutError

from app.models.pr_batch import PrBatchItem, PrVerification
from app.services.pr_report_html import html_to_flowables, html_to_text

CONTENT_WIDTH = 511
CID_FONT = "HYGothic-Medium"
FONT_DIR = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
DEFAULT_SEGMENT = "시험평가시스템"
_GRID = [
    ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#333333")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]
_HEADER_BG = colors.HexColor("#eef1f5")


def _esc(text, br: bool = False) -> str:
    s = str(text) if text not in (None, "") else "-"
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return s.replace("\n", "<br/>") if br else s


@lru_cache(maxsize=1)
def _font() -> str:
    # 맑은 고딕을 PDF에 내장해야 뷰어(Adobe 등)에 한글 글꼴이 없어도 보고서가 깨지지 않는다.
    regular, bold = FONT_DIR / "malgun.ttf", FONT_DIR / "malgunbd.ttf"
    if not regular.is_file():
        pdfmetrics.registerFont(UnicodeCIDFont(CID_FONT))
        return CID_FONT
    pdfmetrics.registerFont(TTFont("Malgun", str(regular)))
    pdfmetrics.registerFont(TTFont("Malgun-Bold", str(bold if bold.is_file() else regular)))
    for is_bold, is_italic, name in ((0, 0, "Malgun"), (1, 0, "Malgun-Bold"), (0, 1, "Malgun"), (1, 1, "Malgun-Bold")):
        addMapping("Malgun", is_bold, is_italic, name)
    return "Malgun"


def _styles() -> dict[str, ParagraphStyle]:
    FONT = _font()
    return {
        "title": ParagraphStyle("KoTitle", fontName=FONT, fontSize=20, alignment=TA_CENTER, leading=26),
        "label": ParagraphStyle("KoLabel", fontName=FONT, fontSize=10, leading=14),
        "body": ParagraphStyle("KoBody", fontName=FONT, fontSize=10, leading=16),
        "section": ParagraphStyle("KoSection", fontName=FONT, fontSize=11, leading=15),
        "head": ParagraphStyle("KoHead", fontName=FONT, fontSize=10, alignment=TA_CENTER, leading=14),
    }


def _table(rows, widths, extra=()) -> Table:
    table = Table(rows, colWidths=widths)
    table.setStyle(TableStyle([*_GRID, *extra]))
    return table


# (뒷장을 원본 양식처럼 한 표로 묶을지, 본문을 글자만으로 줄일지) — 앞에서부터 시도
_LAYOUTS = ((True, False), (False, False), (False, True))


def make_report_pdf(item: PrBatchItem, v: PrVerification, author: str) -> bytes:
    """원본 양식(뒷장 한 표)으로 만들고, 표 한 칸이 한 페이지를 넘으면 표 밖 흐름 배치 → 글자만 순으로 다시 만든다."""
    for boxed, text_only in _LAYOUTS:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=42, leftMargin=42, topMargin=42, bottomMargin=42)
        try:
            doc.build(_story(item, v, author, text_only, boxed))
            return buf.getvalue()
        except LayoutError:
            if (boxed, text_only) == _LAYOUTS[-1]:
                raise
    raise RuntimeError("unreachable")


def _body(content: str | None, style: ParagraphStyle, text_only: bool) -> list:
    if not text_only:
        return html_to_flowables(content, style, CONTENT_WIDTH)
    text, rich = html_to_text(content, limit=None)
    note = "\n(그림·표가 너무 커서 글자만 표시했습니다. 원본은 화면에서 확인하세요.)" if rich else ""
    return [Paragraph(_esc(text + note, br=True), style)]


def _detail_table(item: PrBatchItem, v: PrVerification, st: dict, text_only: bool) -> Table:
    """뒷장 원본 양식: [시험항목 | 시험명] / 시험방법 / (내용) / 시험결과 / (내용) 를 한 표로.

    본문은 문단마다 한 줄(행)로 넣어 내용이 길면 표가 다음 페이지로 이어지게 한다 (한 칸은 페이지를 못 넘음).
    """
    head, body = st["head"], st["body"]
    rows = [[Paragraph("<b>시험항목</b>", head), Paragraph(_esc(item.title), body)]]
    section_rows = []
    sections = [("시험방법", _body(v.verify_method, body, text_only)),
                ("<b>시험결과</b>", _body(v.result_summary, body, text_only))]
    if v.notes:  # 비고도 칸으로 (줄마다 한 행)
        sections.append(("<b>비고</b>", [Paragraph(_esc(ln), body) for ln in v.notes.splitlines() if ln.strip()]))
    for name, flows in sections:
        section_rows.append(len(rows))
        rows.append([Paragraph(name, head), ""])
        rows += [[f, ""] for f in (flows or [Paragraph("-", body)])]
    last = len(rows) - 1
    style = [
        ("SPAN", (0, r), (1, r)) for r in range(1, len(rows))
    ] + [
        ("BOX", (0, 0), (-1, -1), 1.2, colors.black),
        ("LINEAFTER", (0, 0), (0, 0), 0.6, colors.HexColor("#333333")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, 0), 6), ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, last), (-1, last), 8),
    ]
    for r in section_rows:  # 구역 제목 줄: 위·아래 선, 위아래 여백
        style += [("LINEABOVE", (0, r), (-1, r), 0.6, colors.HexColor("#333333")),
                  ("LINEBELOW", (0, r), (-1, r), 0.6, colors.HexColor("#333333")),
                  ("TOPPADDING", (0, r), (-1, r), 5), ("BOTTOMPADDING", (0, r), (-1, r), 5),
                  ("TOPPADDING", (0, r + 1), (-1, r + 1), 6)]
    table = Table(rows, colWidths=[110, 401])
    table.setStyle(TableStyle(style))
    return table


def _story(item: PrBatchItem, v: PrVerification, author: str, text_only: bool, boxed: bool = True) -> list:
    st = _styles()
    label, body, head = st["label"], st["body"], st["head"]
    pr_no = v.test_case_code or item.kac_pr_no or item.lm_pr_no or "-"
    tested_on = v.tested_on.strftime("%Y년 %m월 %d일") if v.tested_on else "-"
    started = v.started_at.strftime("%Y-%m-%d %H:%M") if v.started_at else "-"
    ended = v.ended_at.strftime("%Y-%m-%d %H:%M") if v.ended_at else "-"
    attendees = v.attendees or author
    summary, has_rich = html_to_text(v.result_summary)
    if has_rich:
        summary = f"{summary}\n(그림·표는 뒷장 시험결과 참조)".strip()

    def row(name: str, value) -> list:
        return [Paragraph(f"<b>{name}</b>", label), Paragraph(_esc(value), body), "", ""]

    info_rows = [
        [Paragraph("<b>작성자</b>", label), Paragraph(_esc(author), body),
         Paragraph("<b>관련 PR번호</b>", label), Paragraph(_esc(pr_no), body)],
        # 원본 양식과 같은 칸만 (판정은 시스템 목록에서 관리)
        row("시 험 명", item.title), row("Skyline 버전", v.skyline_version),
        row("Adaptation 버전", v.adaptation_version),
        row("시 험 일 자", tested_on), row("시험 세그먼트", v.test_segment or DEFAULT_SEGMENT),
        row("시험 참석자", attendees),
    ]
    spans = [("SPAN", (1, r), (3, r)) for r in range(1, len(info_rows))]
    info = _table(info_rows, [110, 130, 92, 179], spans)  # 첫 칸: "Adaptation 버전"이 한 줄에 들어가는 폭
    result = _table(
        [[Paragraph("<b>시험항목</b>", head), Paragraph("<b>시험결과</b>", head)],
         [Paragraph(_esc(pr_no), body), Paragraph(_esc(summary, br=True), body)]],
        [110, 401], [("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG), ("ALIGN", (0, 1), (0, 1), "CENTER")],
    )
    item_row = _table([[Paragraph("<b>시험항목</b>", head), Paragraph(_esc(item.title), body)]], [110, 401])

    story = [
        Paragraph("<b>시험 확인서</b>", st["title"]), Spacer(1, 20), info, Spacer(1, 16),
        Paragraph("□ 시험항목 및 결과", st["section"]), Spacer(1, 6), result, Spacer(1, 14),
        Paragraph("☞ 뒷장 &lt;시험보고서&gt; : 시험항목별 시험방법 등의 세부내역 기술", body),
        PageBreak(),
        Paragraph("<b>시험 확인서</b>", st["title"]), Spacer(1, 20),
        Paragraph(f"□ 작 성 자: {_esc(author)}", body),
        Paragraph(f"□ 시 험 명: {_esc(item.title)}", body),
        Paragraph(f"□ 시험 시작 시간: {started}", body),
        Paragraph(f"□ 시험 종료 시간: {ended}", body),
        Spacer(1, 10),
    ]
    if boxed:
        story.append(_detail_table(item, v, st, text_only))
    else:
        story += [
            item_row, Spacer(1, 10),
            Paragraph("<b>시험방법</b>", st["section"]), Spacer(1, 4),
            *_body(v.verify_method, body, text_only), Spacer(1, 12),
            Paragraph("<b>시험결과</b>", st["section"]), Spacer(1, 4),
            *_body(v.result_summary, body, text_only),
        ]
    if v.notes and not boxed:
        story += [Spacer(1, 12), Paragraph(f"<b>비고</b><br/>{_esc(v.notes, br=True)}", body)]
    return story
