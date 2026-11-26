"""SkyWatch 공개 저장소용 샘플 데이터 SQL 생성기.

- 코드표(카드 분류·카드 상태·관제문서 분류)는 개발 DB 값을 그대로 복사한다 (개인정보 없음).
- 그 밖의 자료는 실제 자료의 형식을 본뜬 가상 자료다. 사람 이름은 모두 가상.
- 실행 (backend 폴더에서, 개발 DB 접속):  set PYTHONPATH=. && python ../db/make_sample_data.py ../db/sample_data.sql
- 스키마 다시 만들기: pg_dump --schema-only --no-owner --no-privileges --no-comments -d skywatch -f db/schema.sql
  (그 뒤 머리말과 맨 끝 alembic_version INSERT 를 다시 붙인다)
"""
import json
import sys
from datetime import date, datetime

import bcrypt
from sqlalchemy import text

from app.db.session import SessionLocal

OUT = sys.argv[1]
SAMPLE_PASSWORD = "skywatch1!"
lines: list[str] = []


def v(x):
    if x is None:
        return "NULL"
    if isinstance(x, bool):
        return "TRUE" if x else "FALSE"
    if isinstance(x, (int, float)):
        return str(x)
    if isinstance(x, (dict, list)):
        return "'" + json.dumps(x, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    if isinstance(x, (date, datetime)):
        return f"'{x.isoformat()}'"
    return "'" + str(x).replace("'", "''") + "'"


def ins(table: str, rows: list[dict], comment: str = ""):
    if not rows:
        return
    lines.append("")
    lines.append(f"-- {table}" + (f" — {comment}" if comment else ""))
    cols = list(rows[0].keys())
    for r in rows:
        lines.append(
            f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(v(r[c]) for c in cols)});"
        )


def ts(d: str, t: str = "09:00") -> str:
    return f"{d} {t}:00+09"


db = SessionLocal()

# ---------------------------------------------------------------- 사용자
users = [
    (1, "관리자", "admin", "admin", "day", "4급"),
    (2, "김하늘", "user_a", "shift_worker", "A", None),
    (3, "박서준", "user_b", "shift_worker", "B", None),
    (4, "이도윤", "user_c", "shift_worker", "C", None),
    (5, "최유나", "user_d", "shift_worker", "D", None),
    (6, "정민호", "user_day", "day_worker", "day", "5급"),
]
user_rows = []
for i, name, login, role, team, grade in users:
    salt = bcrypt.gensalt(rounds=12)
    pw = bcrypt.hashpw(SAMPLE_PASSWORD.encode(), salt).decode()
    user_rows.append(dict(
        id=i, name=name, login_id=login, role=role, team=team, grade=grade,
        password_hash=pw, salt=salt.decode(), is_active=True, sort_order=i,
        joined_at=date(2024, 3, 1), resigned_at=None, note="샘플 계정",
        no_excel=False, created_by=1, created_at=ts("2026-01-02"), updated_at=ts("2026-01-02"),
    ))
ins("skywatch_users", user_rows, f"가상 사용자 6명, 비밀번호는 모두 '{SAMPLE_PASSWORD}'")

# ---------------------------------------------------------------- 코드표 (실제 값 복사)
def copy(table: str, cols: str, order: str, fix=None, comment="개발 DB 코드표 그대로"):
    rows = [dict(r._mapping) for r in db.execute(text(f"SELECT {cols} FROM {table} ORDER BY {order}"))]
    if fix:
        rows = [fix(r) for r in rows]
    ins(table, rows, comment)


def creator_admin(r):
    if "created_by" in r:
        r["created_by"] = 1
    if "deleted_by" in r and r["deleted_by"] is not None:
        r["deleted_by"] = 1
    return r


copy("skywatch_card_categories", "id,name,color,sort_order,is_active,created_by,created_at", "id", creator_admin)
copy("skywatch_card_statuses",
     "id,key,label,color,sort_order,is_system,is_active,is_deleted,deleted_by,deleted_at,created_by,created_at",
     "id", creator_admin)
copy("skywatch_tech_doc_categories", "id,project_code,category_code,name,sort_order,is_active", "id")
ins("skywatch_configs", [
    dict(id=1, setting_key="vector_model", setting_value="kure-v1", updated_at=ts("2026-11-01")),
    dict(id=2, setting_key="work_thread_candidates_decided",
         setting_value=json.dumps({"관제사문의사항": "thread", "관제실문의사항": "thread"}, ensure_ascii=False),
         updated_at=ts("2026-11-01")),
])

# ---------------------------------------------------------------- 업무일지 · 카드
logs = [
    (1, "2026-11-20", "주간", 2, "CPDLC 로그온 지연 문의 처리"),
    (2, "2026-11-20", "야간", 3, "레이더 데이터 처리기 이중화 점검"),
    (3, "2026-11-21", "주간", 4, "Skyline 6.6i 시험 버전 설치"),
    (4, "2026-11-21", "야간", 5, "AIDC 연동 메시지 지연 확인"),
    (5, "2026-11-22", "주야", 2, "주말 근무 — 특이사항 없음"),
    (6, "2026-11-24", "공지", 1, "[공지] 12월 정기 안전점검 일정 안내"),
]
ins("skywatch_logs", [dict(
    id=i, author_id=a, created_by=a, last_edited_by=a, date=d, shift_type=s, title=t,
    created_at=ts(d, "08:40" if s != "야간" else "18:40"), updated_at=ts(d, "17:30" if s != "야간" else "23:50"),
    is_deleted=False, deleted_by=None, deleted_at=None, source_seq=None, tags=[],
) for i, d, s, a, t in logs])
# tags 는 text[] 라 jsonb 표기를 배열 표기로 바꾼다
lines[:] = [ln.replace("'[]'::jsonb);", "'{}');") if ln.startswith("INSERT INTO skywatch_logs ") else ln for ln in lines]

cards = [
    # id, log, cat, pos, title, html, status, author
    (1, 1, 8, 0, "CPDLC 로그온 지연 문의 (제주섹터 CWP#12)",
     "<p>(문의내용) 제주섹터에서 CPDLC 로그온 후 DL 표시가 1분 이상 늦게 나타남</p>"
     "<p>(분석결과) 해당 시간대 데이터링크 서버 응답 지연 기록 확인, 항공기 측 재로그온 후 정상</p>"
     "<p>(조치) 관제사에게 결과 안내, 같은 현상 반복 시 #card-3 참고</p>", "done", 2),
    (2, 1, 9, 1, "전달사항 — 시험평가시스템 사용 예약",
     "<p>11/21(금) 09~12시 시험평가시스템 사용 예약됨. 다른 시험은 오후로 조정 바람.</p>", "done", 2),
    (3, 2, 2, 0, "레이더 데이터 처리기(RDP) 이중화 절체 시험",
     "<p>야간 트래픽 적은 시간(02:10~02:25) 절체 시험 수행</p>"
     "<table><tr><th>항목</th><th>결과</th></tr><tr><td>주→예비 절체</td><td>정상(3초)</td></tr>"
     "<tr><td>예비→주 복귀</td><td>정상(4초)</td></tr></table>", "done", 3),
    (4, 3, 1, 0, "Skyline 6.6i 시험 버전 설치 (시험평가시스템)",
     "<p>시험평가시스템에 6.6i 시험 버전 설치 완료. PR 검증은 PR 메뉴 6.6i 버전에서 진행.</p>"
     "<p>관련 문서 #TD:3</p>", "in_progress", 4),
    (5, 3, 5, 1, "월간 보안점검 결과 보고 상신",
     "<p>11월 보안점검 결과 보고서 상신 완료(전자결재).</p>", "done", 4),
    (6, 4, 8, 0, "AIDC 연동 메시지 지연 (후쿠오카 ACC)",
     "<p>(문의내용) 후쿠오카 ACC 로 보낸 CPL 메시지에 LAM 수신이 늦음</p>"
     "<p>(분석결과) 상대 시스템 점검 시간과 겹침. 점검 종료 후 정상 확인</p>", "done", 5),
    (7, 5, 6, 0, "주말 근무 특이사항 없음", "<p>시스템 상태 정상, 특이사항 없음.</p>", "done", 2),
    (8, 6, 9, 0, "12월 정기 안전점검 일정",
     "<p>12/24(목) 주간 정기 안전점검 예정. 담당: 주간 근무조.</p>", "done", 1),
]
ins("skywatch_log_cards", [dict(
    id=i, log_id=lg, category_id=c, position=p, title=t, content=h, status=st,
    completed_by=a if st == "done" else None, completed_at=ts(logs[lg - 1][1], "16:00") if st == "done" else None,
    status_changed_by=a, status_changed_at=ts(logs[lg - 1][1], "16:00"),
    created_by=a, last_edited_by=a, created_at=ts(logs[lg - 1][1], "10:00"), updated_at=ts(logs[lg - 1][1], "16:00"),
    is_deleted=False, deleted_by=None, deleted_at=None,
) for i, lg, c, p, t, h, st, a in cards])

ins("skywatch_log_participants", [dict(id=i, log_id=i, user_id=logs[i - 1][3], role="primary", sub_for=None, note=None)
                                  for i in range(1, 7)])
ins("skywatch_log_reads", [dict(log_id=lg, user_id=u, read_at=ts("2026-11-24", "09:10")) for lg, u in
                           [(1, 3), (1, 4), (2, 2), (3, 5), (6, 2), (6, 3)]])
ins("skywatch_log_acknowledgments", [dict(log_id=6, user_id=u, acked_at=ts("2026-11-24", "09:30")) for u in (2, 3, 4, 5, 6)])
ins("skywatch_log_versions", [
    dict(id=1, log_id=1, editor_id=2, snapshot_json={"title": "CPDLC 로그온 지연 문의", "cards": [1]}, edited_at=ts("2026-11-20", "11:00")),
    dict(id=2, log_id=3, editor_id=4, snapshot_json={"title": "Skyline 6.6i 설치", "cards": [4]}, edited_at=ts("2026-11-21", "13:00")),
])
ins("skywatch_comments", [
    dict(id=1, log_id=1, author_id=3, parent_id=None, body="같은 현상이 야간에도 한 번 있었습니다.", created_at=ts("2026-11-20", "19:00"), updated_at=ts("2026-11-20", "19:00"), is_deleted=False, deleted_by=None, deleted_at=None),
    dict(id=2, log_id=1, author_id=2, parent_id=1, body="확인했습니다. 반복되면 제작사 문의하겠습니다.", created_at=ts("2026-11-21", "08:50"), updated_at=ts("2026-11-21", "08:50"), is_deleted=False, deleted_by=None, deleted_at=None),
    dict(id=3, log_id=3, author_id=6, parent_id=None, body="@이도윤 설치 결과 보고서 공유 부탁드립니다.", created_at=ts("2026-11-21", "14:00"), updated_at=ts("2026-11-21", "14:00"), is_deleted=False, deleted_by=None, deleted_at=None),
    dict(id=4, log_id=6, author_id=5, parent_id=None, body="일정 확인했습니다.", created_at=ts("2026-11-24", "10:00"), updated_at=ts("2026-11-24", "10:00"), is_deleted=False, deleted_by=None, deleted_at=None),
])
ins("skywatch_comment_reactions", [dict(comment_id=c, user_id=u, emoji=e, created_at=ts("2026-11-24", "10:30")) for c, u, e in
                                  [(1, 2, "👍"), (2, 3, "👍"), (3, 4, "✅"), (4, 1, "👍")]])
ins("skywatch_card_links", [dict(id=1, source_card_id=1, target_card_id=6, created_by=2, created_at=ts("2026-11-21", "20:00")),
                            dict(id=2, source_card_id=4, target_card_id=3, created_by=4, created_at=ts("2026-11-21", "10:30"))])
ins("skywatch_card_memos", [
    dict(card_id=2, target_type="next", target_user_id=None, keep="shift", keep_until=None, created_at=ts("2026-11-20", "16:00")),
    dict(card_id=4, target_type="user", target_user_id=3, keep="days", keep_until=date(2026, 11, 28), created_at=ts("2026-11-21", "16:00")),
    dict(card_id=8, target_type="card", target_user_id=None, keep="checked", keep_until=None, created_at=ts("2026-11-24", "09:00")),
])
ins("skywatch_card_memo_checks", [dict(card_id=8, user_id=u, checked_at=ts("2026-11-24", "09:40")) for u in (2, 3)])
ins("skywatch_attachments", [
    dict(id=1, owner_type="card", owner_id=3, original_name="RDP_절체시험_결과.txt", file_path="./uploads/sample_rdp_switch.txt",
         file_name="sample_rdp_switch.txt", file_size=120, mime_type="text/plain", uploaded_by=3, created_at=ts("2026-11-20", "23:00"),
         is_deleted=False, content_text="RDP 절체 시험 결과 주→예비 3초 예비→주 4초 정상"),
    dict(id=2, owner_type="card", owner_id=5, original_name="11월_보안점검_결과.txt", file_path="./uploads/sample_security_check.txt",
         file_name="sample_security_check.txt", file_size=116, mime_type="text/plain", uploaded_by=4, created_at=ts("2026-11-21", "15:00"),
         is_deleted=False, content_text="11월 보안점검 결과 취약점 없음"),
])

# ---------------------------------------------------------------- 이어지는 일(과제)
ins("skywatch_work_threads", [
    dict(id=1, kind="thread", title="CPDLC 로그온 지연 문의", category_id=8, status="done", owner_id=2, started_on=date(2026, 11, 20), closed_on=date(2026, 11, 21), current_phase=0, recur_month=None, source_thread_id=None, created_by=2, created_at=ts("2026-11-20", "10:00"), updated_at=ts("2026-11-21", "20:00"), is_deleted=False),
    dict(id=2, kind="thread", title="Skyline 6.6i 시험 버전 설치·검증", category_id=1, status="open", owner_id=4, started_on=date(2026, 11, 21), closed_on=None, current_phase=0, recur_month=None, source_thread_id=None, created_by=4, created_at=ts("2026-11-21", "10:00"), updated_at=ts("2026-11-21", "10:00"), is_deleted=False),
    dict(id=3, kind="project", title="관제상황분석시스템 기능 추가", category_id=3, status="open", owner_id=6, started_on=date(2026, 9, 1), closed_on=None, current_phase=1, recur_month=None, source_thread_id=None, created_by=6, created_at=ts("2026-09-01"), updated_at=ts("2026-11-20"), is_deleted=False),
    dict(id=4, kind="thread", title="월간 보안점검", category_id=5, status="done", owner_id=4, started_on=date(2026, 11, 21), closed_on=date(2026, 11, 21), current_phase=0, recur_month=11, source_thread_id=None, created_by=4, created_at=ts("2026-11-21"), updated_at=ts("2026-11-21"), is_deleted=False),
    dict(id=5, kind="thread", title="AIDC 연동 메시지 지연", category_id=8, status="hold", owner_id=5, started_on=date(2026, 11, 21), closed_on=None, current_phase=0, recur_month=None, source_thread_id=None, created_by=5, created_at=ts("2026-11-21", "20:00"), updated_at=ts("2026-11-21", "20:00"), is_deleted=False),
])
ins("skywatch_work_thread_cards", [dict(card_id=c, thread_id=t, origin=o, linked_by=u, linked_at=ts("2026-11-21", "20:00")) for c, t, o, u in
                                  [(1, 1, "new", 2), (6, 1, "manual", 2), (4, 2, "new", 4), (5, 4, "new", 4), (3, 3, "manual", 6)]])
ins("skywatch_work_thread_phases", [
    dict(id=1, thread_id=3, seq=0, name="요구사항 정리", start_month="2026-09", end_month="2026-10"),
    dict(id=2, thread_id=3, seq=1, name="개발·시험", start_month="2026-11", end_month="2026-12"),
])

# ---------------------------------------------------------------- 문의사항
inq = [
    (1, "H00001", "2026-11-20", "1012", "관제실(제주섹터)", "skyline6.6h", "김하늘", "CPDLC", "로그온", "<p>(문의내용) CPDLC 로그온 후 DL 표시 지연</p><p>(분석결과) 데이터링크 서버 응답 지연, 재로그온 후 정상</p>", "completed", 1),
    (2, "H00002", "2026-11-20", "2230", "관제실(팀장석)", "skyline6.6h", "박서준", "Alert", "STCA", "<p>(문의내용) 안전경보가 일부 감독관석에서만 울림</p><p>(답변) 감독관석은 섹터별로 경보 동작 범위가 나뉘어 있음을 안내</p>", "completed", None),
    (3, "H00003", "2026-11-21", "0315", "관제실", "skyline6.6h", "최유나", "AIDC", "LAM", "<p>(문의내용) 후쿠오카 ACC 로 보낸 CPL 에 LAM 수신 지연</p><p>(분석결과) 상대 시스템 점검 시간과 겹침</p>", "tracking", 6),
    (4, "H00004", "2026-11-22", "1405", "관제실(군산섹터)", "skyline6.6h", "김하늘", "CWP", "Warm Start", "<p>(문의내용) 미사용 CWP 에서 Warm Start 발생</p><p>(분석결과) 디스크 경고 로그 확인, 장비 점검 요청</p>", "in_progress", None),
    (5, "H00005", "2026-11-23", "0920", "관제실(동해섹터)", "skyline6.6h", "이도윤", "ADS-B", "코드 불일치", "<p>(문의내용) ADS-B 주소와 비행계획 코드가 달라 자동 연결 안 됨</p><p>(답변) 비행계획 수정 후 수동 연결 안내</p>", "completed", None),
    (6, "H00006", "2026-11-24", "1630", "관제실", "skyline6.6h", "정민호", "FDP", "XFL", "<p>(문의내용) XFL 입력 후 데이터블럭에 반영되지 않음</p>", "in_progress", None),
]
ins("skywatch_inquiries", [dict(
    id=i, inquiry_no=no, occurred_date=d, occurred_time=t, controller_sector=sec, sw_version=ver,
    received_by=next(u[0] for u in users if u[1] == rb), received_by_raw=rb, category=cat, keyword=kw, content=c,
    status=st, completed_date=d if st == "completed" else None, pr_no=None, note=None, card_id=card,
    created_by=1, created_at=ts(d, "17:00"), updated_at=ts(d, "17:00"), last_edited_by=1,
    is_deleted=False, deleted_by=None, deleted_at=None,
) for i, no, d, t, sec, ver, rb, cat, kw, c, st, card in inq], "가상 문의 (관제사·근무자 이름 가상)")

# ---------------------------------------------------------------- PR(이슈) · 버전 검증
iss = [
    (1, 9001, "I-2026-001", None, "CPDLC Clearance 창에서 INS→DEL→SND 순서로 누르면 HCI Warm Start", "CPDLC", "진행중"),
    (2, 9002, "I-2026-002", None, "지연 수신 레이더의 Coast 방지를 위한 Sector Hold 최대값 변경", "Sector Hold", "진행중"),
    (3, 9003, "I-2026-003", "LM-1203", "AIDC CPL 재전송 시 LAM 타이머가 초기화되지 않음", "AIDC", "수정완료"),
    (4, 9004, "I-2026-004", None, "INSET 창 단축키로 Big DB 설정 시 Small DB 로 되돌아감", "INSET", "반환"),
    (5, 9005, "I-2026-005", "LM-1207", "ADS-B 코드 불일치 항적의 자동 연결 규칙 개선", "ADS-B", "진행중"),
    (6, 9006, "D-2026-001", None, "STCA 경보 이력 통계 화면 추가", "STCA", "경고"),
]
ins("skywatch_issues", [dict(
    id=i, source_seq=s, kac_pr_no=k, lm_pr_no=lm, title=t,
    content=f"- {k}: {t}\n. 문제 상황\n A. 재현 절차와 로그는 첨부 참고 (샘플)",
    status=st, acc_type=k[0], keyword=kw, version="skyline 6.6h", mod_version="skyline 6.6i",
    reg_date=date(2026, 11, 1), action_date=date(2026, 11, 20) if st == "수정완료" else None, acc_pr=None,
    created_by=6, assigned_to=None, created_at=ts("2026-11-01"), updated_at=ts("2026-11-20"), last_edited_by=6,
    is_deleted=False, deleted_by=None, deleted_at=None,
) for i, s, k, lm, t, kw, st in iss])
ins("skywatch_issue_comments", [
    dict(id=1, issue_id=1, content="제작사 수정방향 - 메시지 목록이 비었을 때 SND 버튼 비활성화", is_certified=True, created_by=6, created_at=ts("2026-11-10"), is_deleted=False),
    dict(id=2, issue_id=3, content="6.6i 에서 수정 확인 (시험평가시스템)", is_certified=True, created_by=4, created_at=ts("2026-11-21"), is_deleted=False),
    dict(id=3, issue_id=4, content="PR 검토회의 결과 성능 이슈로 수정하지 않기로 함", is_certified=False, created_by=1, created_at=ts("2026-11-12"), is_deleted=False),
])
ins("skywatch_pr_batches", [
    dict(id=1, batch_no="20261121-1", sw_version="6.6i", agreed_date=date(2026, 11, 21), target_date=None, delivery_date=None, verified_date=None, status="검증중", summary="6.6i PR 검증", notes=None, created_by=4, created_at=ts("2026-11-21"), updated_at=ts("2026-11-21"), is_deleted=False, deleted_by=None, deleted_at=None, previous_version="6.6h", skyline_version="6.6i", adaptation_version="ADP 6.6i-1", test_segment="시험평가시스템"),
    dict(id=2, batch_no="20261001-1", sw_version="6.6h", agreed_date=date(2026, 10, 1), target_date=None, delivery_date=None, verified_date=date(2026, 10, 20), status="완료", summary="6.6h PR 검증", notes=None, created_by=6, created_at=ts("2026-10-01"), updated_at=ts("2026-10-20"), is_deleted=False, deleted_by=None, deleted_at=None, previous_version="6.6g", skyline_version="6.6h", adaptation_version="ADP 6.6h-2", test_segment="시험평가시스템"),
])
items = [(1, 1, 1, "I-2026-001"), (2, 1, 2, "I-2026-002"), (3, 1, 3, "I-2026-003"), (4, 1, 5, "I-2026-005"), (5, 2, 4, "I-2026-004")]
ins("skywatch_pr_batch_items", [dict(
    id=i, batch_id=b, issue_id=isu, kac_pr_no=k, lm_pr_no=iss[isu - 1][3], title=iss[isu - 1][4],
    agreed_content="제작사 수정 방향대로 반영", actual_fix=None, verify_method="시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인",
    item_status="대기", sort_order=i, created_at=ts("2026-11-21"), updated_at=ts("2026-11-21"), item_kind="개별 PR",
) for i, b, isu, k in items])
ins("skywatch_pr_verifications", [dict(
    id=i, item_id=it, user_id=u, round_no=1, result=res, test_case_code=items[it - 1][3], skyline_version="6.6i",
    adaptation_version="ADP 6.6i-1", tested_on=date(2026, 11, 22), started_at=ts("2026-11-22", "10:00"), ended_at=ts("2026-11-22", "11:00"),
    verify_method="재현 절차 수행", result_summary=f"<p>{summ}</p>", notes=None, report_original_name=None, report_stored_name=None,
    report_file_size=None, report_uploaded_at=None, submitted_by=u, submitted_at=ts("2026-11-22", "11:30"), created_by=u,
    created_at=ts("2026-11-22", "11:30"), updated_at=ts("2026-11-22", "11:30"), is_deleted=False, approval_status="결재대기",
    approved_by=None, approved_at=None, approval_note=None, source_import_id=None, test_segment="시험평가시스템", attendees=att,
) for i, it, u, res, summ, att in [
    (1, 1, 2, "PASS", "SND 버튼 비활성화 확인, Warm Start 미발생", "김하늘, 박서준"),
    (2, 2, 3, "PASS", "Sector Hold 최대값 변경 확인", "박서준"),
    (3, 3, 4, "보류", "상대 시스템 연동 시험 필요", "이도윤"),
    (4, 4, 5, "미제출", "", None),
]])
ins("skywatch_pr_batch_attachments", [
    dict(id=1, batch_id=1, doc_type="기준 엑셀", original_name="PR목록_Skyline_6_6i.xlsx", stored_name="sample_pr_list.xlsx", file_size=0, uploaded_by=4, uploaded_at=ts("2026-11-21"), is_deleted=False),
    dict(id=2, batch_id=1, doc_type="기타", original_name="시험 결과.txt", stored_name="sample_pr_result.txt", file_size=0, uploaded_by=4, uploaded_at=ts("2026-11-22"), is_deleted=False),
], "파일 본체는 없음 (목록 표시용)")
ins("skywatch_pr_workbook_imports", [dict(id=1, batch_id=1, user_id=3, original_name="시험확인서_Skyline_6_6i_B조.xlsm", stored_name="sample_workbook.xlsm", file_size=0, file_hash="sample", imported_items=1, uploaded_at=ts("2026-11-22"), updated_at=ts("2026-11-22"))])

# ---------------------------------------------------------------- 관제시스템 문서
tds = [
    (1, "GEN", "GEN01", "2026년 11월 4주차 주간회의자료", "<p>① CPDLC 통계 프로그램 운영<br> - 로그인 성공·실패, 고도/항로 변경 건수</p><p>② 12월 정기 안전점검 계획</p>", None),
    (2, "SKYLINE", "SKY04", "DVS (Display Volume Suppression) 설정 방법", "<p>설정 위치: CWP - Sup - System Settings - Display Volume Suppression</p><p>최근 관련 문의 #LOG:1</p>", "항적"),
    (3, "SKYLINE", "SKY04", "Skyline 6.6i 설치 절차서", "<ol><li>설치 전 백업</li><li>패키지 반입·무결성 확인</li><li>시험평가시스템 설치 후 기능 점검</li></ol>", "절차서"),
    (4, "SECURITY", "SEC", "2026년 11월 보안점검 결과", "<p>주요정보통신기반시설 점검 항목 기준, 취약점 없음.</p>", "보안취약점"),
    (5, "SUPPORT", None, "AIDC 메시지 흐름 정리", "<p>CPL → LAM, 미수신 시 재전송 타이머 동작 설명</p>", "AIDC"),
]
cat_codes = {(r[0], r[1]) for r in db.execute(text("SELECT project_code, category_code FROM skywatch_tech_doc_categories"))}
td_rows = []
for i, p, c, t, h, dt in tds:
    if c is None or (p, c) not in cat_codes:
        c = next((cc for pp, cc in sorted(cat_codes) if pp == p), None)
    td_rows.append(dict(
        id=i, legacy_seq=None, record_date=date(2026, 11, 20 + i), project_code=p, category_code=c, title=t, content=h,
        summary=None, detail_summary=None, doc_type=dt, adapt_version="6.6i" if i == 3 else None, service_date=None,
        reference=None, orig_user_id=None, author_id=6, created_at=ts(f"2026-11-{20 + i}"), updated_at=ts(f"2026-11-{20 + i}"),
        created_by=6, last_edited_by=6, is_deleted=False,
    ))
ins("skywatch_tech_docs", td_rows)
ins("skywatch_tech_doc_attachments", [
    dict(id=1, tech_doc_id=3, legacy_doc_seq=None, original_name="설치절차서_6.6i.hwp", stored_name="sample_install.hwp", file_extension="hwp", content_text=None, reg_date=date(2026, 11, 23), uploaded_by=6, created_at=ts("2026-11-23"), is_deleted=False),
    dict(id=2, tech_doc_id=4, legacy_doc_seq=None, original_name="보안점검_결과.pdf", stored_name="sample_security.pdf", file_extension="pdf", content_text=None, reg_date=date(2026, 11, 24), uploaded_by=6, created_at=ts("2026-11-24"), is_deleted=False),
], "파일 본체는 없음 (목록 표시용)")

# ---------------------------------------------------------------- 알림 · 업무 지시
ins("skywatch_notifications", [
    dict(id=1, user_id=3, type="new_log", ref_type="log", ref_id=1, body="[새 일지] 김하늘님이 2026-11-20 주간 일지를 작성했습니다.", read_at=None, created_at=ts("2026-11-20", "17:00")),
    dict(id=2, user_id=2, type="comment", ref_type="log", ref_id=1, body="박서준님이 댓글을 남겼습니다.", read_at=ts("2026-11-21", "08:45"), created_at=ts("2026-11-20", "19:00")),
    dict(id=3, user_id=4, type="mention", ref_type="log", ref_id=3, body="정민호님이 회원님을 언급했습니다.", read_at=None, created_at=ts("2026-11-21", "14:00")),
    dict(id=4, user_id=2, type="card", ref_type="card", ref_id=4, body="이도윤님이 카드를 수정했습니다.", read_at=None, created_at=ts("2026-11-21", "16:00")),
    dict(id=5, user_id=5, type="task", ref_type="task", ref_id=1, body="[업무] 12월 정기 안전점검", read_at=None, created_at=ts("2026-11-24", "09:00")),
])
all_ids = [u[0] for u in users]
ins("skywatch_tasks", [
    dict(id=1, title="12월 정기 안전점검", body="정기 안전점검 수행 후 결과 문서 상신", due_date=ts("2026-12-24", "18:00"), importance="high", sender_id=1, recipients=all_ids, recipients_mode="all", target_teams=[], completed_by=[], linked_card_id=8, created_at=ts("2026-11-24"), updated_at=ts("2026-11-24"), is_deleted=False, deleted_by=None, deleted_at=None, is_archived=False, archived_at=None),
    dict(id=2, title="6.6i PR 검증 결과 입력", body="담당 PR 검증 결과를 PR 메뉴에 입력", due_date=ts("2026-11-28", "18:00"), importance="normal", sender_id=6, recipients=[2, 3, 4, 5], recipients_mode="teams", target_teams=["A", "B", "C", "D"], completed_by=[2, 3], linked_card_id=None, created_at=ts("2026-11-21"), updated_at=ts("2026-11-22"), is_deleted=False, deleted_by=None, deleted_at=None, is_archived=False, archived_at=None),
    dict(id=3, title="근무편성표 확인", body="12월 근무편성 확인 바랍니다.", due_date=None, importance="low", sender_id=1, recipients=[6], recipients_mode="individual", target_teams=[], completed_by=[6], linked_card_id=None, created_at=ts("2026-11-25"), updated_at=ts("2026-11-25"), is_deleted=False, deleted_by=None, deleted_at=None, is_archived=False, archived_at=None),
])
ins("skywatch_recurring_task_templates", [
    dict(id=1, name="정기 안전점검", frequency="monthly", run_at_time=None, days_of_week=[], day_of_month=24, run_once_date=None, template_content={"title": "정기 안전점검", "body": "정기 안전점검 수행\n- 문서 상신"}, target_teams=[], target_shift_types=["주간"], next_run_at=ts("2026-12-24", "08:00"), last_run_at=ts("2026-11-24", "08:00"), is_active=True, created_by=1, created_at=ts("2026-01-02")),
    dict(id=2, name="주간 백업 확인", frequency="weekly", run_at_time="09:00", days_of_week=["월"], day_of_month=None, run_once_date=None, template_content={"title": "주간 백업 확인", "body": "DB 백업 파일 생성 여부 확인"}, target_teams=[], target_shift_types=["주간"], next_run_at=ts("2026-11-30", "09:00"), last_run_at=None, is_active=True, created_by=1, created_at=ts("2026-01-02")),
])

# ---------------------------------------------------------------- 근무표 · 일정
ins("skywatch_shift_data", [dict(date=date(2026, 11, d), memo=m, shift_code=c, repeat_type=None, data_date=date(2026, 11, d)) for d, m, c in
                            [(20, [], "AB"), (21, [], "CD"), (22, ["주말"], "AB"), (23, [], "CD"), (24, ["안전점검"], "AB"), (25, [], "CD")]],
    "shift_code 'AB' = 주간 A조, 야간 B조")
ins("skywatch_shift_staff_master", [dict(id=u[0], name=u[1], emp_no=1000 + u[0], grade=u[5] or "6급", shift=u[4], from_date=date(2024, 3, 1), to_date=None, no_excel=False) for u in users[1:]])
ins("skywatch_shift_staff_memos", [
    dict(id=1, date=date(2026, 11, 24), user_id=1, memo_type="M0000", memo_text="안전점검", created_at=ts("2026-11-01"), updated_at=ts("2026-11-01")),
    dict(id=2, date=date(2026, 11, 25), user_id=3, memo_type="연차", memo_text="개인 사유", created_at=ts("2026-11-10"), updated_at=ts("2026-11-10")),
    dict(id=3, date=date(2026, 11, 26), user_id=4, memo_type="교육", memo_text="관제시스템 보수교육", created_at=ts("2026-11-10"), updated_at=ts("2026-11-10")),
    dict(id=4, date=date(2026, 11, 27), user_id=5, memo_type="대체", memo_text="박서준 대신 근무", created_at=ts("2026-11-12"), updated_at=ts("2026-11-12")),
    dict(id=5, date=date(2026, 11, 25), user_id=6, memo_type="home_일근", memo_text=json.dumps({"user_ids": [6], "leave_ids": [], "temp_names": []}), created_at=ts("2026-11-12"), updated_at=ts("2026-11-12")),
])
ins("skywatch_shift_notices", [
    dict(id=1, text="12/24 정기 안전점검 — 주간조 참석", start_date=date(2026, 11, 24), end_date=date(2026, 12, 24), created_by=1, created_at=ts("2026-11-24"), deleted_at=None),
    dict(id=2, text="시험평가시스템 사용 시 PR 메뉴에 예약 기록", start_date=date(2026, 11, 20), end_date=date(2026, 11, 30), created_by=6, created_at=ts("2026-11-20"), deleted_at=None),
])
ins("skywatch_shift_overrides", [
    dict(id=1, date=date(2026, 11, 27), original_user_id=3, actual_user_id=5, type="substitution", swap_group_id=None, approved_by=1, note="교육 참석", created_at=ts("2026-11-12")),
    dict(id=2, date=date(2026, 11, 28), original_user_id=2, actual_user_id=4, type="swap", swap_group_id="7d3f6a1e-0b1c-4c55-9a8e-2f1b3c4d5e6f", approved_by=1, note="근무 교환", created_at=ts("2026-11-12")),
])
ins("skywatch_shift_carry_over", [
    dict(id=1, user_id=2, entry_type="earned", entry_date=date(2026, 11, 22), shift_type="주야", hours=8, note="주말 근무", created_at=ts("2026-11-22")),
    dict(id=2, user_id=2, entry_type="used", entry_date=date(2026, 11, 26), shift_type="주간", hours=8, note="대휴", created_at=ts("2026-11-23")),
    dict(id=3, user_id=3, entry_type="earned", entry_date=date(2026, 11, 20), shift_type="야간", hours=4, note="연장 근무", created_at=ts("2026-11-21")),
])
ins("skywatch_shift_carry_raw", [dict(id=i, year="2026", name=n, hours=h) for i, n, h in [(1, "김하늘", 16), (2, "박서준", 4), (3, "이도윤", 0), (4, "최유나", 8)]])
ins("skywatch_leave_requests", [
    dict(id=1, user_id=3, date_from=date(2026, 11, 25), date_to=date(2026, 11, 25), reason="개인 사유", status="approved", approved_by=1, created_at=ts("2026-11-10")),
    dict(id=2, user_id=5, date_from=date(2026, 12, 10), date_to=date(2026, 12, 11), reason="가족 행사", status="pending", approved_by=None, created_at=ts("2026-11-25")),
])
ins("skywatch_schedules", [dict(id=i, team=t, date=date(2026, 11, 20 + i), shift_type=s, capacity=3, created_by=1, created_at=ts("2026-11-01")) for i, t, s in
                           [(1, "A", "주간"), (2, "B", "야간"), (3, "C", "주간"), (4, "D", "야간"), (5, "day", "주간")]])
ins("skywatch_commute_months", [dict(id=1, ym="2026-10", file_name="sample_근태_2026-10.xlsx", row_count=3, rows=[
    {"name": "김하늘", "d": 1, "sched": "주간", "daily": "", "holi": "", "duty": "", "attend": "출근"},
    {"name": "김하늘", "d": 2, "sched": "야간", "daily": "", "holi": "", "duty": "", "attend": "출근"},
    {"name": "박서준", "d": 1, "sched": "비번", "daily": "", "holi": "", "duty": "", "attend": ""},
], uploaded_by=1, uploaded_at=ts("2026-11-02"))])

# ---------------------------------------------------------------- 검색 · 운영 기록
ins("skywatch_search_suggestions", [dict(id=i, query_text=q, search_count=c, result_count=r, last_searched_at=ts("2026-11-24"), created_at=ts("2026-11-01")) for i, q, c, r in
                                    [(1, "cpdlc 로그온", 7, 120), (2, "데이터블럭", 3, 466), (3, "aidc lam", 5, 88), (4, "warm start", 4, 64), (5, "ads-b 코드 불일치", 2, 31), (6, "안전점검", 6, 52)]])
ins("skywatch_reindex_jobs", [dict(id=1, job_id="00000000-0000-4000-8000-000000000001", model_name="kure-v1", status="completed", total_logs=6, processed_logs=6, progress_percent=100, error_message=None, started_at=ts("2026-11-25", "02:00"), completed_at=ts("2026-11-25", "02:01"), created_at=ts("2026-11-25", "02:00"))])
ins("skywatch_backup_logs", [
    dict(id=1, action="backup", status="success", filename="skywatch_20261120_0300.backup", file_size_bytes=1048576, error_message=None, performed_by=1, created_at=ts("2026-11-20", "03:00"), is_deleted=False, deleted_at=None, deleted_by=None),
    dict(id=2, action="backup", status="failure", filename=None, file_size_bytes=None, error_message="pg_dump 경로를 찾을 수 없습니다 (.env 의 PG_DUMP_PATH 확인)", performed_by=1, created_at=ts("2026-11-21", "03:00"), is_deleted=False, deleted_at=None, deleted_by=None),
])

db.close()

# ---------------------------------------------------------------- 시퀀스 맞추기 · 머리말
id_tables = []
for ln in lines:
    if ln.startswith("INSERT INTO ") and " (id," in ln:
        t = ln.split()[2]
        if t not in id_tables:
            id_tables.append(t)
seq = [f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), (SELECT MAX(id) FROM {t}));" for t in id_tables]

header = f"""-- =====================================================================
-- SkyWatch 샘플 데이터 (가상 자료)
--   * 실제 운영 자료가 아니다. 코드표(카드 분류·상태, 관제문서 분류)만 실제 값.
--   * 사람 이름·문의 내용·PR 은 형식을 보여 주기 위한 가상 예시.
--   * 로그인: admin / {SAMPLE_PASSWORD}  (user_a, user_b, user_c, user_d, user_day 도 같은 비밀번호)
--   * 벡터(임베딩) 표는 비워 둔다. 모델(kure-v1)을 둔 뒤 관리 화면의 재색인으로 만든다.
-- 넣는 순서: schema.sql → sample_data.sql (빈 DB 에서)
-- =====================================================================
SET client_encoding = 'UTF8';
BEGIN;

-- alembic: 스키마가 최신(head)임을 표시 → 백엔드가 켜질 때 마이그레이션을 다시 돌리지 않는다
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('g2h3i4j5k6l7');"""
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(header + "\n" + "\n".join(lines) + "\n\n-- 시퀀스\n" + "\n".join(seq) + "\n\nCOMMIT;\n")
print("written", OUT, len(lines), "lines")
