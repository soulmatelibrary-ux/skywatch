"""start.bat 이 백엔드를 띄우기 전에 실행하는 내부망 배포 패치 자동 적용.

1) (서비스 루트)\\wheels\\*.whl 이 있으면 오프라인 설치. 같은 wheel 목록으로 이미 설치했으면 건너뛴다.
2) skywatch\\db_patch\\*.sql 이 있으면 이름순으로 실행하고, 성공한 파일은 *.sql.applied 로 이름을 바꿔
   다음 시작부터 건너뛴다. 실패하면 그 파일에서 멈춘다(뒤 파일이 앞 파일에 의존할 수 있음).
둘 다 없으면 아무것도 하지 않는다. 하나라도 실패하면 종료코드 1 (start.bat 이 경고를 보여 준다).

실행 위치: skywatch\\backend (app.core.config 가 현재 폴더의 .env 를 읽는다)
"""
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SKYWATCH = BACKEND.parent
WHEELS = SKYWATCH.parent / "wheels"
WHEEL_MARKER = WHEELS / "installed.txt"
SQL_DIR = SKYWATCH / "db_patch"
PIP_TIMEOUT = 600
DB_CONNECT_TIMEOUT = 10
# PR 보고서·엑셀 기능에 필요한 라이브러리. 시작할 때마다 설치 여부와 버전을 보여 준다.
REQUIRED_PACKAGES = ("pypdf", "reportlab", "openpyxl")


def log(message: str) -> None:
    print(f"    {message}", flush=True)


def install_wheels() -> bool:
    files = sorted(WHEELS.glob("*.whl")) if WHEELS.is_dir() else []
    if not files:
        log(f"라이브러리: {WHEELS} 에 설치할 파일 없음 (건너뜀)")
        return True
    signature = "\n".join(f.name for f in files)
    if WHEEL_MARKER.is_file() and WHEEL_MARKER.read_text(encoding="utf-8").strip() == signature:
        log("라이브러리: 이미 설치됨 (건너뜀)")
        return True
    # 패키지 이름만 넘긴다: 이미 설치된 패키지는 그대로 두고(버전 내림 방지) 없는 것만 wheels 에서 설치
    names = sorted({f.name.split("-")[0] for f in files})
    log(f"라이브러리 오프라인 설치: {', '.join(names)}")
    cmd = [sys.executable, "-m", "pip", "install", "--no-index", "--find-links", str(WHEELS), *names]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=PIP_TIMEOUT)
    except subprocess.TimeoutExpired:
        log(f"라이브러리 설치 실패: {PIP_TIMEOUT}초 안에 끝나지 않았습니다.")
        return False
    if result.returncode != 0:
        log("라이브러리 설치 실패:")
        print((result.stdout + result.stderr)[-3000:], flush=True)
        return False
    WHEEL_MARKER.write_text(signature, encoding="utf-8")
    log("라이브러리 설치 완료")
    return True


def check_packages() -> bool:
    """필수 라이브러리 설치 여부를 매 시작마다 한 줄로 보여 준다. 없으면 실패."""
    from importlib.metadata import PackageNotFoundError, version

    found, missing = [], []
    for name in REQUIRED_PACKAGES:
        try:
            found.append(f"{name} {version(name)}")
        except PackageNotFoundError:
            missing.append(name)
    if found:
        log(f"라이브러리 확인: {', '.join(found)}")
    if missing:
        log(f"라이브러리 없음: {', '.join(missing)} — wheels 폴더를 서비스 루트에 복사했는지 확인하세요.")
        return False
    return True


def run_sql_files() -> bool:
    files = sorted(SQL_DIR.glob("*.sql")) if SQL_DIR.is_dir() else []
    if not files:
        log("DB 스크립트: 실행할 파일 없음 (건너뜀)")
        return True
    sys.path.insert(0, str(BACKEND))
    from app.core.config import settings

    url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    for path in files:
        log(f"DB 스크립트 실행: {path.name}")
        try:
            conn = psycopg2_connect(url)
        except Exception as exc:
            log(f"  DB 접속 실패: {exc}".strip())
            return False
        conn.autocommit = True  # 파일 안의 BEGIN/COMMIT·단계별 DO 블록을 pgAdmin 실행과 같게 처리
        try:
            with conn.cursor() as cur:
                cur.execute(path.read_text(encoding="utf-8-sig"))
            for notice in conn.notices:
                log("  " + notice.replace("NOTICE:", "").strip())
            path.replace(path.with_name(path.name + ".applied"))
            log("  완료 (다음 시작부터 건너뜀)")
        except Exception as exc:
            for notice in conn.notices:
                log("  " + notice.replace("NOTICE:", "").strip())
            log(f"  실패: {str(exc).strip()}")
            log("  파일은 그대로 두었습니다. 원인을 해결한 뒤 다시 start.bat 을 실행하면 이어서 적용됩니다.")
            return False
        finally:
            conn.close()
    _warn_timezone(url)
    return True


def _warn_timezone(url: str) -> None:
    """보고서 시각 기준. Asia/Seoul 이 아니면 안내만 한다 (변경은 INSTALL 문서 부록 A)."""
    try:
        conn = psycopg2_connect(url)
        with conn.cursor() as cur:
            cur.execute("SHOW timezone")
            tz = cur.fetchone()[0]
        conn.close()
    except Exception:
        return
    if tz not in ("Asia/Seoul", "ROK"):
        log(f"[주의] DB 시간대가 {tz} 입니다. 보고서 시각이 9시간 다르게 보일 수 있습니다 (INSTALL 문서 부록 A).")


def psycopg2_connect(url: str):
    import psycopg2
    return psycopg2.connect(url, connect_timeout=DB_CONNECT_TIMEOUT)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    wheels_ok = install_wheels() and check_packages()
    sql_ok = run_sql_files()
    return 0 if wheels_ok and sql_ok else 1


if __name__ == "__main__":
    sys.exit(main())
