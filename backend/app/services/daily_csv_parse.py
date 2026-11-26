"""업무일지 CSV(daily_*.csv) 한 행 해석 — scripts/imports/import_daily_csv.py 와 같은 규칙.

제목 "주간 - 홍길동" → 근무 유형·근무자, 본문 "작업내용" 아래 "▶ 제목" 단위 → 카드.
날짜가 2098년 이후인 행은 상단 고정 공지(근무 유형 '공지')로 저장해 왔다.
"""
from __future__ import annotations

import re

NOTICE_FROM_YEAR = 2098
DAILY_COLUMNS = {"seq", "rdate", "title", "content"}

_CAT_RULES = [
    (4, re.compile(r'down|장애|이상|에러|오류|실패|불량|fail|error|core|전환|종료|중단', re.I)),
    (2, re.compile(r'검증|시험|테스트|PR|CPDLC|재현|확인서|시나리오|test', re.I)),
    (1, re.compile(r'설치|적용|배포|업로드|패치|복사|distribute|install|adapt', re.I)),
    (3, re.compile(r'개발|개선|수정|작성|프로그램|통계|시스템|기능|소스|script', re.I)),
    (5, re.compile(r'문서|보고|상신|결재|대장|점검표|교육|mbo|행정|회의|요청', re.I)),
]
_TIME_ONLY = re.compile(r'^\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}')


def auto_category(title: str, content: str) -> int:
    text = f"{title} {content or ''}"
    return next((cat for cat, pat in _CAT_RULES if pat.search(text)), 6)  # 6 = 기타


def text_to_html(text: str) -> str:
    parts = []
    for line in text.split('\n'):
        s = line.rstrip().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        parts.append(f'<p>{s}</p>' if s else '<p></p>')
    return ''.join(parts)


def shift_type(title: str, year: int) -> str:
    if year >= NOTICE_FROM_YEAR:
        return '공지'
    before_dash = title.split('-', 1)[0]
    if '주간' in before_dash and '야간' in before_dash:
        return '주야'
    return '야간' if '야간' in before_dash else '주간'


def worker_name(title: str) -> str | None:
    parts = title.split('-', 1)
    return parts[1].strip() or None if len(parts) == 2 else None


def _time_only(title: str, content: str | None) -> bool:
    """제목+내용 또는 내용이 "HH:MM ~ HH:MM" 줄로만 된 카드."""
    def only_time(text: str) -> bool:
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        return bool(lines) and all(_TIME_ONLY.match(ln) for ln in lines)
    return only_time(f"{title}\n{content or ''}") or only_time(content or '')


def parse_cards(content: str) -> list[dict]:
    content = (content or '').replace('\r\n', '\n').replace('\r', '\n')
    m = re.search(r'작업내용\s*\n(.*)', content, re.DOTALL)
    work = m.group(1) if m else content
    cards = []
    for sec in re.split(r'(?m)^[ \t]*▶\s*', work):
        lines = sec.strip().split('\n')
        title = lines[0].strip()
        if not title:
            continue
        rest = '\n'.join(lines[1:]).strip() or None
        if _time_only(title, rest) or (title == '비고' and not rest):
            continue
        cards.append({'title': title, 'content': rest})
    return cards
