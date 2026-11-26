"""검증 보고서 본문(HTML: 문단·목록·표·붙여넣은 이미지)을 reportlab flowable로 변환."""
import base64
import io
import re
from html import escape, unescape
from html.parser import HTMLParser

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, Spacer, Table, TableStyle

_DATA_IMAGE = re.compile(r"^data:image/(png|jpe?g|gif|bmp);base64,(.+)$", re.I | re.S)
_INLINE = {"b": "b", "strong": "b", "i": "i", "em": "i", "u": "u", "s": "strike"}
_BLOCK = {"p", "div", "h1", "h2", "h3", "h4", "li", "blockquote", "pre"}
_IMAGE_MAX_H, _CELL_IMAGE_MAX_H = 560, 320  # 표 칸 이미지는 여러 장이어도 페이지에 들어가도록 더 작게
_TABLE_STYLE = [
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#555555")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
]


def is_html(text: str | None) -> bool:
    return bool(text) and re.search(r"<(p|div|br|table|img|ul|ol|li|b|strong|h\d)\b", text, re.I) is not None


def _image(src: str, max_w: float, max_h: float):
    match = _DATA_IMAGE.match(src or "")
    if not match:
        return None
    try:
        raw = base64.b64decode(match.group(2), validate=False)
        w, h = ImageReader(io.BytesIO(raw)).getSize()
    except Exception:  # 손상·초대형(DecompressionBomb) 등 사용자가 붙여넣은 이미지는 자리표시로 대체
        return None
    scale = min(max_w / w, max_h / h, 1.0)
    return Image(io.BytesIO(raw), width=w * scale, height=h * scale)


class _Builder(HTMLParser):
    """블록 단위로 Paragraph/Image/Table 을 쌓는다. 표 안의 내용은 셀별 flowable 목록으로 모은다."""

    def __init__(self, style: ParagraphStyle, max_w: float):
        super().__init__(convert_charrefs=True)
        self.style, self.max_w = style, max_w
        self.out: list = []
        self.buf: list[str] = []
        self.lists: list[list] = []  # [kind, counter]
        self.table: list[list[list]] | None = None
        self.cell: list | None = None
        self.header_rows: set[int] = set()
        self.depth = 0  # 표 칸 안에 들어 있는 표의 깊이

    def _nested(self, tag: str, start: bool) -> bool:
        """표 칸 안의 표(한글·워드 중첩 표)는 행마다 'a | b' 문단으로 펼쳐 바깥 칸에 넣는다."""
        if tag == "table":
            self._flush()
            self.depth += 1 if start else -1
        elif tag == "tr" and not start:
            if self.buf and self.buf[-1] == " | ":
                self.buf.pop()
            self._flush()
        elif tag in ("td", "th") and not start:
            self.buf.append(" | ")
        return tag in ("table", "tr", "td", "th")

    def _target(self) -> list:
        return self.cell if self.cell is not None else self.out

    def _flush(self):
        text = "".join(self.buf).strip()
        self.buf = []
        if not text or text == "<br/>":
            return
        try:
            para = Paragraph(text, self.style)
        except ValueError:  # 서식 태그가 어긋난 경우 글자만 살린다
            para = Paragraph(re.sub(r"</?(b|i|u|strike)>", "", text), self.style)
        self._target().append(para)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if (self.depth or (tag == "table" and self.cell is not None)) and self._nested(tag, True):
            return
        if tag in _INLINE:
            self.buf.append(f"<{_INLINE[tag]}>")
        elif tag == "br":
            self.buf.append("<br/>")
        elif tag in ("ul", "ol"):
            self._flush()
            self.lists.append([tag, 0])
        elif tag == "li":
            self._flush()
            if self.lists:
                self.lists[-1][1] += 1
                kind, n = self.lists[-1]
                self.buf.append("&nbsp;" * 3 * (len(self.lists) - 1) + ("• " if kind == "ul" else f"{n}. "))
        elif tag in _BLOCK:
            self._flush()
            if tag in ("h1", "h2", "h3", "h4"):
                self.buf.append("<b>")
        elif tag == "table" and self.table is None:
            self._flush()
            self.table, self.header_rows = [], set()
        elif tag == "tr" and self.table is not None:
            self.table.append([])
        elif tag in ("td", "th") and self.table is not None:
            if not self.table:
                self.table.append([])
            self._flush()
            self.cell = []
            if tag == "th":
                self.header_rows.add(len(self.table) - 1)
        elif tag == "img":
            self._flush()
            cols = max((len(r) for r in self.table), default=1) if self.table else 1
            width = self.max_w / max(cols, 1) - 10 if self.cell is not None else self.max_w
            img = _image(a.get("src", ""), width, _CELL_IMAGE_MAX_H if self.cell is not None else _IMAGE_MAX_H)
            self._target().append(img if img else Paragraph("[이미지를 표시할 수 없습니다]", self.style))

    def handle_endtag(self, tag):
        if self.depth and self._nested(tag, False):
            return
        if tag in _INLINE:
            self.buf.append(f"</{_INLINE[tag]}>")
        elif tag in ("ul", "ol"):
            self._flush()
            if self.lists:
                self.lists.pop()
        elif tag in _BLOCK:
            if tag in ("h1", "h2", "h3", "h4"):
                self.buf.append("</b>")
            self._flush()
        elif tag in ("td", "th") and self.cell is not None:
            self._flush()
            self.table[-1].append(self.cell or [Paragraph("", self.style)])
            self.cell = None
        elif tag == "table" and self.table is not None:
            self._emit_table()

    def handle_data(self, data):
        if self.table is not None and self.cell is None:
            return
        self.buf.append(escape(data, quote=False).replace("\n", " "))

    @staticmethod
    def _blank(cell: list) -> bool:
        return all(isinstance(f, Paragraph) and not f.getPlainText().strip() for f in cell)

    def _emit_table(self):
        rows = [r for r in self.table if r and not all(self._blank(c) for c in r)]
        self.table = None
        if not rows:
            return
        ncols = max(len(r) for r in rows)
        rows = [r + [[Paragraph("", self.style)]] * (ncols - len(r)) for r in rows]
        # 이미지를 넣을 때는 열 수가 확정되지 않았으므로(첫 행 등) 실제 칸 폭에 맞춰 다시 줄인다.
        fit = self.max_w / ncols - 10
        for flow in (f for r in rows for cell in r for f in cell):
            if isinstance(flow, Image) and flow.drawWidth > fit:
                scale = fit / flow.drawWidth
                flow.drawWidth, flow.drawHeight = fit, flow.drawHeight * scale
        extra =[("BACKGROUND", (0, i), (-1, i), colors.HexColor("#eef1f5")) for i in sorted(self.header_rows)]
        # splitInRow: 내용이 긴 칸은 행 중간에서 다음 페이지로 넘긴다 (안 하면 LayoutError)
        table = Table(rows, colWidths=[self.max_w / ncols] * ncols,
                      repeatRows=1 if 0 in self.header_rows else 0, splitInRow=1)
        table.setStyle(TableStyle([*_TABLE_STYLE, *extra]))
        self.out += [table, Spacer(1, 6)]

    def close(self):
        super().close()
        if self.table is not None:
            self._emit_table()
        self._flush()


def html_to_flowables(content: str | None, style: ParagraphStyle, max_w: float) -> list:
    if not content or not content.strip():
        return [Paragraph("-", style)]
    if not is_html(content):
        safe = escape(content.strip(), quote=False).replace("\n", "<br/>")
        return [Paragraph(safe, style)]
    builder = _Builder(style, max_w)
    builder.feed(content)
    builder.close()
    return builder.out or [Paragraph("-", style)]


def _cap(text: str, limit: int | None, max_lines: int) -> str:
    if limit is None:
        return text
    lines = text.splitlines()
    clipped = "\n".join(lines[:max_lines])
    cut = len(lines) > max_lines or len(clipped) > limit
    return clipped[:limit] + "..." if cut else clipped


def html_to_text(content: str | None, limit: int | None = 600, max_lines: int = 15) -> tuple[str, bool]:
    """표지용 요약 텍스트와 그림/표 포함 여부. limit=None이면 자르지 않는다."""
    if not content:
        return "", False
    if not is_html(content):
        return _cap(content.strip(), limit, max_lines), False
    rich = bool(re.search(r"<(img|table)\b", content, re.I))
    text = re.sub(r"(<t[dh][^>]*>)\s*<p[^>]*>|</p>\s*(</t[dh]>)", r"\1\2", content, flags=re.I)
    text = re.sub(r"</t[dh]>", " | ", text, flags=re.I)
    text = re.sub(r"\s*\|\s*</tr>", "</tr>", text, flags=re.I)
    text = re.sub(r"<(br|/p|/div|/li|/tr|/h\d)\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", re.sub(r"&nbsp;", " ", text))
    text = unescape("\n".join(line.strip() for line in text.splitlines() if line.replace("|", "").strip()))
    return _cap(text, limit, max_lines), rich
