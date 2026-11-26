"""
개발용 임시 데이터 삽입 스크립트.
실행: python seed_dev.py  (backend/ 디렉토리에서)
주의: 이미 동일 login_id / date+shift_type 데이터가 있으면 중복 오류 발생.
      재실행 시 DB를 초기화하거나 --reset 플래그를 사용하세요.
"""
import sys
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import SessionLocal


# ─── 헬퍼 ────────────────────────────────────────────────
def now_kst(offset_days: int = 0) -> datetime:
    base = datetime.now(timezone.utc) + timedelta(hours=9)
    return (base - timedelta(days=offset_days)).replace(tzinfo=None)


def today(offset: int = 0) -> date:
    return (date.today() - timedelta(days=offset))


# ─── 데이터 정의 ──────────────────────────────────────────
USERS = [
    # (name, login_id, role, team, password)
    ("관리자",    "admin",  "admin",        "day", "1234"),
    ("김철수",    "24001",  "shift_worker", "A",   "1234"),
    ("이영희",    "24002",  "shift_worker", "B",   "1234"),
    ("박민준",    "24003",  "shift_worker", "C",   "1234"),
    ("최지수",    "24004",  "shift_worker", "D",   "1234"),
    ("정하늘",    "24005",  "day_worker",   "day", "1234"),
    ("홍길동",    "24006",  "shift_worker", "A",   "1234"),
]

LOGS = [
    # (offset_days, shift_type, author_login_id)
    (0, "주간",  "24001"),
    (0, "야간",  "24002"),
    (1, "주간",  "24003"),
    (1, "야간",  "24004"),
    (2, "주간",  "24001"),
    (3, "야간",  "24002"),
]

CARDS = [
    # (log_index, category_name, title, content, status)
    (0, "서버 점검",   "DB 서버 재부팅 완료",
     "오전 02:30 DB 서버(db-01) 정기 재부팅 완료.\n이상 없음.", "done"),
    (0, "네트워크",    "방화벽 정책 변경 검토 필요",
     "DMZ 구간 포트 8443 차단 요청 접수. 보안팀 승인 대기 중.", "open"),
    (0, "소프트웨어",  "Apache 취약점 패치 배포",
     "CVE-2026-1234 패치 스테이징 적용 완료. 운영 배포는 내일 야간 예정.", "hold"),
    (1, "사용자 지원", "VPN 접속 불가 민원 3건",
     "VPN 클라이언트 v3.2 업그레이드 후 접속 불가 민원 발생.\n임시방편: 구버전 클라이언트 사용 안내.", "open"),
    (1, "보안",        "이상 로그인 시도 탐지",
     "23:14 ~ 23:45 사이 외부 IP(192.0.2.55)에서 SSH 브루트포스 탐지.\niptables 차단 완료.", "done"),
    (2, "서버 점검",   "NAS 스토리지 잔여 용량 경고",
     "NAS-02 잔여 용량 12% (권고 기준 20% 이하). 정리 작업 예약 필요.", "open"),
    (2, "기타",        "서버실 에어컨 온도 점검",
     "서버실 온도 26°C → 권고 기준 초과(25°C). 유지보수팀 연락 완료.", "hold"),
    (3, "소프트웨어",  "배치 작업 실패 알람",
     "02:00 정기 배치 실패. 원인: DB 연결 타임아웃. 재실행 완료(02:35).", "done"),
    (4, "네트워크",    "라우터 펌웨어 업그레이드 완료",
     "코어 라우터(R-01) 펌웨어 v7.3.2 → v7.4.0 업그레이드 완료. 트래픽 이상 없음.", "done"),
    (5, "보안",        "보안 감사 대응 자료 준비",
     "월간 보안 감사 일정: 2026-05-10. 필요 자료 목록 작성 중.", "open"),
]

PARTICIPANTS = [
    # (log_index, user_login_id, role)
    (0, "24001", "primary"),
    (0, "24006", "sub"),
    (1, "24002", "primary"),
    (2, "24003", "primary"),
    (3, "24004", "primary"),
    (3, "24005", "support"),
    (4, "24001", "primary"),
    (5, "24002", "primary"),
]

COMMENTS = [
    # (log_index, author_login_id, body, parent_index)
    (0, "24002", "인계 확인했습니다. 방화벽 정책 건은 제가 이어서 처리하겠습니다.", None),
    (0, "24005", "Apache 패치 운영 배포 전에 사전 공지 부탁드립니다.", None),
    (0, "24001", "@이영희 네, 배포 전날 공지 올리겠습니다.", 0),
    (1, "24001", "VPN 건 확인 완료. 공식 패치 배포될 때까지 구버전 유지하겠습니다.", None),
    (2, "24005", "NAS 용량 문제 IT팀에 추가 스토리지 구매 요청했습니다.", None),
    (4, "24002", "라우터 업그레이드 수고하셨습니다. 이상 없음 확인했습니다.", None),
]


# ─── 실행 ─────────────────────────────────────────────────
def main():
    reset = "--reset" in sys.argv
    db = SessionLocal()

    try:
        if reset:
            print("데이터 초기화 중...")
            db.execute(text("TRUNCATE skywatch_comment_reactions, skywatch_comments, "
                            "skywatch_log_acknowledgments, skywatch_log_reads, "
                            "skywatch_log_participants, skywatch_log_cards, "
                            "skywatch_logs RESTART IDENTITY CASCADE"))
            db.execute(text("DELETE FROM skywatch_users WHERE login_id != 'admin'"))
            db.execute(text("DELETE FROM skywatch_sessions"))
            db.commit()

        # ─ 카테고리 ID 조회 ───────────────────────────────
        cats = {row[0]: row[1] for row in db.execute(
            text("SELECT name, id FROM skywatch_card_categories WHERE is_active = true")
        ).all()}
        print(f"카테고리 {len(cats)}개 확인")

        # ─ 사용자 삽입 ────────────────────────────────────
        user_ids: dict[str, int] = {}
        existing = {row[0] for row in db.execute(
            text("SELECT login_id FROM skywatch_users")
        ).all()}

        for name, login_id, role, team, password in USERS:
            if login_id in existing:
                row = db.execute(
                    text("SELECT id FROM skywatch_users WHERE login_id = :lid"),
                    {"lid": login_id}
                ).first()
                user_ids[login_id] = row[0]
                continue
            pw_hash, salt = hash_password(password)
            row = db.execute(
                text("""INSERT INTO skywatch_users
                    (name, login_id, role, team, password_hash, salt, is_active, sort_order)
                    VALUES (:name, :lid, :role, :team, :ph, :salt, true, 0)
                    RETURNING id"""),
                dict(name=name, lid=login_id, role=role, team=team, ph=pw_hash, salt=salt)
            ).first()
            user_ids[login_id] = row[0]
            print(f"  사용자 생성: {name} ({login_id})")
        db.commit()
        print(f"사용자 {len(user_ids)}명 완료")

        # ─ 일지 삽입 ─────────────────────────────────────
        log_ids: list[int] = []
        for i, (offset, shift_type, author_login) in enumerate(LOGS):
            log_date = today(offset)
            author_id = user_ids[author_login]
            existing_row = db.execute(
                text("SELECT id FROM skywatch_logs WHERE date=:d AND shift_type=:s"),
                {"d": log_date, "s": shift_type}
            ).first()
            if existing_row:
                log_ids.append(existing_row[0])
                continue
            title = f"[{log_date}] {shift_type} 인계일지"
            row = db.execute(
                text("""INSERT INTO skywatch_logs
                    (author_id, date, shift_type, title, created_by, is_deleted)
                    VALUES (:aid, :d, :s, :t, :cb, false) RETURNING id"""),
                dict(aid=author_id, d=log_date, s=shift_type, t=title, cb=author_id)
            ).first()
            log_ids.append(row[0])
            print(f"  일지 생성: {title}")
        db.commit()
        print(f"일지 {len(log_ids)}개 완료")

        # ─ 카드 삽입 ─────────────────────────────────────
        card_ids: list[int] = []
        pos_in_log: dict[int, int] = {}
        for li, cat_name, title, content, status in CARDS:
            log_id = log_ids[li]
            cat_id = cats.get(cat_name)
            author_id = user_ids[LOGS[li][2]]
            pos = pos_in_log.get(li, 0)
            pos_in_log[li] = pos + 1
            row = db.execute(
                text("""INSERT INTO skywatch_log_cards
                    (log_id, category_id, position, title, content, status, created_by, is_deleted)
                    VALUES (:lid, :cid, :pos, :t, :c, :s, :cb, false) RETURNING id"""),
                dict(lid=log_id, cid=cat_id, pos=pos, t=title, c=content, s=status, cb=author_id)
            ).first()
            card_ids.append(row[0])
            print(f"  카드 생성: [{status}] {title}")
        db.commit()
        print(f"카드 {len(card_ids)}개 완료")

        # ─ 참여자 삽입 ────────────────────────────────────
        for li, login_id, role in PARTICIPANTS:
            log_id = log_ids[li]
            user_id = user_ids[login_id]
            db.execute(
                text("""INSERT INTO skywatch_log_participants
                    (log_id, user_id, role) VALUES (:lid, :uid, :role)
                    ON CONFLICT (log_id, user_id) DO NOTHING"""),
                dict(lid=log_id, uid=user_id, role=role)
            )
        db.commit()
        print(f"참여자 {len(PARTICIPANTS)}건 완료")

        # ─ 댓글 삽입 ─────────────────────────────────────
        comment_ids: list[int] = []
        for li, author_login, body, parent_idx in COMMENTS:
            log_id = log_ids[li]
            author_id = user_ids[author_login]
            parent_id = comment_ids[parent_idx] if parent_idx is not None else None
            row = db.execute(
                text("""INSERT INTO skywatch_comments
                    (log_id, author_id, parent_id, body, is_deleted)
                    VALUES (:lid, :aid, :pid, :b, false) RETURNING id"""),
                dict(lid=log_id, aid=author_id, pid=parent_id, b=body)
            ).first()
            comment_ids.append(row[0])
        db.commit()
        print(f"댓글 {len(COMMENTS)}건 완료")

        # ─ 반응 삽입 ─────────────────────────────────────
        reactions = [
            (comment_ids[0], user_ids["24001"], "👍"),
            (comment_ids[0], user_ids["24005"], "✅"),
            (comment_ids[3], user_ids["24002"], "👍"),
        ]
        for cid, uid, emoji in reactions:
            db.execute(
                text("""INSERT INTO skywatch_comment_reactions
                    (comment_id, user_id, emoji)
                    VALUES (:cid, :uid, :e)
                    ON CONFLICT DO NOTHING"""),
                dict(cid=cid, uid=uid, e=emoji)
            )
        db.commit()
        print(f"반응 {len(reactions)}건 완료")

        # ─ 카드 링크 삽입 ──────────────────────────────────
        card_links = [
            (0, 1),  # 카드 0 → 카드 1
            (1, 3),  # 카드 1 → 카드 3
            (5, 6),  # 카드 5 → 카드 6
            (2, 5),  # 카드 2 → 카드 5
        ]
        for src_idx, tgt_idx in card_links:
            db.execute(
                text("""INSERT INTO skywatch_card_links
                    (source_card_id, target_card_id, created_by)
                    VALUES (:src, :tgt, :cb)
                    ON CONFLICT DO NOTHING"""),
                dict(src=card_ids[src_idx], tgt=card_ids[tgt_idx], cb=user_ids["24001"])
            )
        db.commit()
        print(f"카드 링크 {len(card_links)}개 완료")

        print("\n[완료] 시드 데이터 삽입 완료!")
        print("\n사용 가능한 계정 (비밀번호: 1234):")
        for name, login_id, _, team, _ in USERS:
            print(f"  {login_id:6s}  {name} ({team})")

    except Exception as e:
        db.rollback()
        print(f"[오류] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
