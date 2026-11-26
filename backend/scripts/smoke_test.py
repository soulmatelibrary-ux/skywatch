"""백엔드 스모크 테스트 — 서버를 띄우지 않고 주요 API 가 응답하는지 본다.

전제: .env 의 DATABASE_URL 이 db/schema.sql + db/sample_data.sql 을 넣은 DB 를 가리킨다.
실행 (backend 폴더에서):  python scripts/smoke_test.py [로그인ID] [비밀번호]
기본 계정: admin / skywatch1! (샘플 자료). 실패가 있으면 종료 코드 1.
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import os  # noqa: E402

os.chdir(BACKEND)  # .env·uploads 상대경로 기준

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

LOGIN = sys.argv[1] if len(sys.argv) > 1 else "admin"
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else "skywatch1!"

# (경로, 기대 상태코드)
CHECKS = [
    ("/api/auth/me", 200),
    ("/api/logs?page=1", 200),
    ("/api/shift-logs/view?date=2026-11-20&shift_type=주간", 200),
    ("/api/shift-logs/history", 200),
    ("/api/work-threads", 200),
    ("/api/inquiries", 200),
    ("/api/issues", 200),
    ("/api/pr-batches", 200),
    ("/api/tech-docs", 200),
    ("/api/search/unified?q=CPDLC", 200),
    ("/api/attachments/1/download", 200),  # db/sample_uploads 를 backend/uploads 에 복사해야 통과
    ("/..%2f..%2fbackend%2f.env", 200),     # 경로 탈출 → index.html 또는 404 여야 함 (아래에서 내용 검사)
]


def main_() -> int:
    failed = 0
    with TestClient(main.app) as c:
        r = c.post("/api/auth/login", json={"login_id": LOGIN, "password": PASSWORD})
        print(f"{'OK ' if r.status_code == 200 else 'FAIL'} login {r.status_code}")
        if r.status_code != 200:
            return 1
        bad = c.post("/api/auth/login", json={"login_id": LOGIN, "password": PASSWORD + "x"})
        ok = bad.status_code == 401
        failed += not ok
        print(f"{'OK ' if ok else 'FAIL'} wrong-password {bad.status_code} (expect 401)")

        for path, expect in CHECKS:
            r = c.get(path)
            ok = r.status_code == expect or (path.startswith("/..") and r.status_code == 404)
            if path.startswith("/.."):
                ok = ok and "DATABASE_URL" not in r.text
            failed += not ok
            print(f"{'OK ' if ok else 'FAIL'} {path} {r.status_code}")
    print(f"\n{'모두 통과' if not failed else f'{failed}건 실패'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main_())
