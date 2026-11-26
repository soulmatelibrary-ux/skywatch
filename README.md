# SkyWatch

관제 근무 업무 시스템. 근무일지·업무일지, 문의사항, PR(버전 검증), 관제시스템 문서, 통합검색(키워드 + 벡터)을 한 화면에서 다룬다.

- 백엔드: FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL 17 + pgvector
- 프론트: React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand 5 · TipTap
- 검색: ILIKE + 동의어 사전 + KURE-v1 임베딩(1024차원)을 RRF 로 합침

자세한 구조·업무 흐름·작업 규칙은 [`docs/HANDOVER.md`](docs/HANDOVER.md)(인수인계 문서)와 [`CLAUDE.md`](CLAUDE.md)(코딩 규칙)를 본다.

## 폴더

| 경로 | 내용 |
|---|---|
| `backend/` | FastAPI. `app/api`(라우팅) → `app/services`(로직·DB) → `app/models`(ORM), `alembic/`(마이그레이션), `scripts/`(가져오기·평가·유지보수) |
| `frontend/` | React. `src/pages`, `src/components`, `src/hooks`, `src/services/api`, `public/help`(사용 안내) |
| `db/` | `schema.sql`(스키마만), `sample_data.sql`(가상 샘플), `sample_uploads/`(샘플 첨부 파일) |
| `docs/` | 인수인계 문서 |
| `start.bat` / `stop.bat` | Windows 에서 백엔드(8000) + 화면 개발서버(5173) 실행·중지 |

## 요구 환경

- Windows 10/11 (macOS·Linux 도 수동 실행 가능), **Python 3.13**, **Node.js 22**
- **PostgreSQL 17** + **pgvector** 확장 (`pg_trgm`, `pgcrypto` 도 사용 — 스키마가 자동 생성)
- 임베딩 모델 `backend/models/kure-v1` (약 2.6GB, 저장소에 없음 — 담당자에게 따로 받는다).
  모델이 없어도 앱은 뜨고 키워드 검색은 된다. 벡터 검색·재색인만 안 된다.

## 처음 설치

```bat
:: 1) 저장소 받기
git clone https://github.com/soulmatelibrary-ux/skywatch.git
cd skywatch

:: 2) Python 가상환경 (start.bat 은 skywatch\.venv 또는 상위폴더\.venv 를 찾는다)
py -3.13 -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt

:: 3) 프론트 패키지
cd frontend && npm install && cd ..

:: 4) 설정 파일 — 값은 직접 채운다 (비밀번호·SECRET_KEY 는 저장소에 없다)
copy backend\.env.example backend\.env
```

### DB 준비 (둘 중 하나)

**A. 샘플 자료로 바로 보기 (추천)** — 빈 DB 에 스키마와 가상 샘플을 넣는다.

```bat
createdb -U postgres -E UTF8 -T template0 skywatch
psql -U postgres -d skywatch -f db\schema.sql
psql -U postgres -d skywatch -f db\sample_data.sql
xcopy /E /I db\sample_uploads backend\uploads
```

- 로그인: `admin` / `skywatch1!` (근무자 `user_a`~`user_d`, 일근 `user_day` 도 같은 비밀번호)
- 표마다 5~6건 정도의 가상 자료가 들어 있다. 사람 이름·문의·PR 내용은 모두 가상이며, 카드 분류·카드 상태·관제문서 분류 코드표만 실제 값이다.
- 벡터 표는 비어 있다. 모델을 둔 뒤 설정 → 벡터 화면의 재색인으로 만든다.

**B. 자료 없이 시작** — 스키마만 넣고 관리자 계정을 만든다.

```bat
createdb -U postgres -E UTF8 -T template0 skywatch
psql -U postgres -d skywatch -f db\schema.sql
cd backend && ..\.venv\Scripts\python scripts\create_admin.py admin 관리자
```

> 새 DB 는 반드시 `db/schema.sql` 로 만든다. Alembic 마이그레이션은 운영 DB 를 이어서 고쳐 온 기록이라 **빈 DB 에서 처음부터 돌리면 중간(015)에서 멈춘다**. `schema.sql` 끝에 현재 head(`g2h3i4j5k6l7`)가 적혀 있어, 이후 추가하는 마이그레이션만 백엔드 기동 때 이어서 실행된다.
> 스키마를 바꾸면 마이그레이션을 추가하고 `db/schema.sql` 도 다시 만든다(`db/make_sample_data.py` 머리말 참고).

### `.env` 항목

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | `postgresql://계정:비밀번호@localhost:5432/skywatch` |
| `SKYNET_DATABASE_URL` | 문서 크롤러(SkyNet) DB. 없으면 SkyNet 메뉴만 비어 있다 |
| `SECRET_KEY` | 64자 이상 임의 문자열 (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) |
| `SESSION_EXPIRE_HOURS` | 로그인 유지 시간 |
| `UPLOAD_DIR` | 첨부파일 위치 (기본 `./uploads` = `backend/uploads`) |
| `PG_DUMP_PATH`, `PSQL_PATH` | DB 백업 기능용 PostgreSQL 실행 파일 경로 |
| `SKYNET_API_URL`, `BOARD_DIRECT_URL` | SkyNet 연동 (선택) |

## 실행

```bat
start.bat   :: 백엔드 8000 + 화면 5173, 브라우저 자동 열림
stop.bat
```

수동 실행:

```bash
cd backend && ../.venv/Scripts/python -m uvicorn main:app --reload --port 8000
cd frontend && npm run dev          # http://localhost:5173 (/api 는 8000 으로 프록시)
```

- 화면: `http://localhost:5173`, API 문서: `http://localhost:8000/docs`
- 백엔드가 켜질 때 `alembic upgrade head` 가 자동 실행된다.

## 개발 규칙 (요약)

- 스키마 변경은 **Alembic 마이그레이션 추가**로만 한다. 기존 표를 지우거나 바꾸지 않는다.
- API 호출은 컴포넌트에서 직접 하지 않고 `services/api/*` → `hooks/*` 를 거친다.
- 본문 HTML 은 `DOMPurify` 로 정화해서 그린다.
- 커밋 전 `cd frontend && npx tsc -b --noEmit` 통과.
- 비밀번호·SECRET_KEY·실제 운영 자료(이름, 일지 본문, 첨부파일)는 커밋하지 않는다. `backend/.env`, `backend/uploads`, `backend/models` 는 `.gitignore` 에 들어 있다.
