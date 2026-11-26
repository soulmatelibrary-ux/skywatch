# CLAUDE.md — SkyWatch (공개 저장소 · 협업 개발용)

관제 근무 업무 시스템. 근무일지·업무일지, 문의사항, PR(버전 검증), 관제시스템 문서, 통합검색을 한 곳에서 다룬다.
이 저장소는 운영 PC 의 `skywatch/` 폴더를 내보낸 것이다. 받은 사람(과 Claude Code)이 **설치 → 샘플 DB 로 실행 → 고치기 → 검증**까지 이 문서만으로 할 수 있게 썼다. 운영 이력·업무 흐름의 자세한 배경은 `docs/HANDOVER.md`(운영 PC 기준 인수인계 문서, 경로의 `skywatch/` = 이 저장소 루트).

## 0. 먼저 알 것
- **사용자 = 교대근무자.** 판단 우선순위: 근무자 사용 편의 > 기존 습관 유지 > 디자인 개성 > 구현 편의.
- **실제 서비스는 인터넷이 안 되는 내부망**에서 돈다. 코드에 외부 인터넷 의존 금지: CDN, 외부 API, 실행 중 패키지·모델 다운로드 불가. 글꼴·라이브러리는 로컬(`frontend/public/fonts`, npm 패키지)로.
- **이 저장소는 공개(public)다.** 실제 운영 자료(사람 이름, 일지·문의 본문, 첨부, 사번), 비밀번호, `.env` 는 절대 커밋하지 않는다. 시험 자료는 `db/sample_data.sql` 의 가상 자료만 쓴다.
- 소통 한국어, 코드 영어(주석 한국어 가능).
- 요청받은 것만 고친다. 주변 코드 "개선"은 하지 않는다.

## 1. 개발 환경 만들기 (Windows 기준)
요구: Python 3.13, Node.js 22, PostgreSQL 17 + pgvector.
```bat
py -3.13 -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt
cd frontend && npm install && cd ..
copy backend\.env.example backend\.env     :: DATABASE_URL 의 비밀번호만 채우면 된다
```
DB — 샘플 자료로 (권장):
```bat
createdb -U postgres -E UTF8 -T template0 skywatch
psql -U postgres -d skywatch -f db\schema.sql
psql -U postgres -d skywatch -f db\sample_data.sql
xcopy /E /I db\sample_uploads backend\uploads
```
- 로그인 `admin` / `skywatch1!` (근무자 `user_a`~`user_d`, 일근 `user_day`, 같은 비밀번호). 샘플 날짜는 2026-11-20 ~ 11-25.
- 자료 없이 시작하려면 `schema.sql` 만 넣고 `cd backend && ..\.venv\Scripts\python scripts\create_admin.py`.
- **빈 DB 에 `alembic upgrade head` 를 처음부터 돌리지 말 것.** 마이그레이션은 운영 DB 를 이어서 고쳐 온 기록이라 015 에서 멈춘다. 새 DB 는 항상 `db/schema.sql` 로 만든다(끝에 head `g2h3i4j5k6l7` 표시 포함).

임베딩 모델(선택): 벡터 검색·재색인에만 필요, 없어도 앱은 뜨고 키워드 검색은 된다.
```bat
cd backend && ..\.venv\Scripts\python scripts\download_model.py    :: nlpai-lab/KURE-v1 → backend/models/kure-v1 (약 2.3GB)
```
- 모델 경로는 `app/services/vector_model.py` 에 고정. `.env` 의 `EMBEDDING_MODEL_PATH` 는 안 쓰는 옛 설정.
- 메모리 8GB PC 에서는 모델을 올리는 프로세스를 두 개 띄우면 죽는다(백엔드 + 검색 평가 동시 실행 금지).

## 2. 실행
```bat
start.bat     :: 백엔드 8000 + 화면 개발서버 5173 창을 띄우고 브라우저를 연다 (.venv 는 이 폴더 또는 상위 폴더)
stop.bat
```
수동: `cd backend && ..\.venv\Scripts\python -m uvicorn main:app --reload --port 8000` / `cd frontend && npm run dev`
- 화면 `http://localhost:5173` (Vite 가 `/api`·`/uploads`·`/ws` 를 8000 으로 넘김), API 문서 `http://localhost:8000/docs`.
- 운영도 빌드 없이 Vite 개발서버로 뜬다. 백엔드는 켜질 때 `alembic upgrade head` 를 자동 실행한다.
- Claude Code 안에서 `start.bat` 을 실행하면 도구가 끝날 때 서버 창이 같이 닫힐 수 있다. 확인용으로는 수동 명령을 백그라운드로 띄운다.

## 3. 고친 뒤 검증 (커밋 전 필수)
| 대상 | 명령 | 기준 |
|---|---|---|
| 프론트 타입 | `cd frontend && npx tsc -b --noEmit` | 오류 0 |
| 프론트 lint | `npx eslint <고친 파일들>` | **고친 줄에 새 오류가 없을 것.** 기존 오류(약 170건: any, effect 안 setState 등)가 남아 있으니 전체 0 을 목표로 손대지 않는다 |
| 백엔드 | `cd backend && ..\.venv\Scripts\python scripts\smoke_test.py` | "모두 통과" (샘플 DB 기준: 로그인·주요 목록·검색·첨부·경로 탈출 차단) |
| 화면 | 브라우저로 직접 확인 | **라이트/다크 둘 다**, 바뀐 화면이면 기존 화면(classic)·새 화면(v2) 둘 다 |

- 소스 수정 후 스스로 **2회 리뷰**(정확성 → 기존 화면 영향).
- 이 저장소에서 Grep 도구가 파일을 빠뜨린 적이 있다. "없다"고 결론 내기 전 다른 방법(`git grep`, 실제 화면)으로 재확인.

## 4. 구조
- **백엔드** `backend/`: FastAPI, 3계층 `app/api/`(라우팅) → `app/services/`(로직·DB) → `app/models/`(ORM). SQLAlchemy 2.0, 표 접두어 `skywatch_`. 진입점 `main.py`(라우터 등록·스케줄러·SPA 서빙).
- **프론트** `frontend/src/`: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand 5, React Router v7. API 호출은 `services/api/*` → `hooks/*` 경유(컴포넌트에서 직접 호출 금지).
- **본문 편집기**: TipTap `components/logs/CardEditor.tsx` (표·이미지 붙여넣기, `#검색어` 카드 링크). 본문 링크: `#card-번호`, `#TD:번호`(관제문서), `#LOG:번호`(일지) — 클릭 처리 `hooks/useContentLinks.tsx`.
- **검색**: 키워드(ILIKE + 동의어 `backend/data/domain_synonyms.json`) + 벡터(KURE-v1, pgvector)를 RRF 로 합친다.
- **화면 두 벌**(같은 주소, 바깥 틀만 다름): 기존(classic) / 새 화면(v2). 상단 바 버튼으로 전환, `localStorage['skywatch-ui']`, 기본은 기존 화면.
  - 틀 선택 `components/layout/AppLayout.tsx`, 새 틀 `components/layout/v2/`, 메뉴 정의 `layout/navMenu.ts`.
  - 새 디자인은 Tailwind 변형 `v2:`(index.css `@custom-variant v2`, `.ui-v2` 안에서만) + 색 변수 `--v2-*` + 공용 묶음 `components/common/v2Styles.ts` 를 **기존 클래스 뒤에 덧붙인다. 기존 화면 클래스는 바꾸지 않는다.**
- **도움말**: `frontend/public/help/index.html` (외부 리소스 없음). 버튼·흐름을 바꾸면 이 파일도 고친다. (화면 사진 `help/img/*.png` 은 실제 자료가 보여 저장소에 없다.)
- **독립 HTML 도구**: `frontend/public/commute-calc.html`(통근비), `duty-roster.html`, `shift-calendar.html` — 라이브러리를 파일 안에 내장(인터넷 불가 대비).
- 주요 업무 흐름(근무일지 `/shift`, 이어지는 일·카드 묶기, PR 버전 검증, 문의 자동 등록 등)의 규칙은 `docs/HANDOVER.md` 10장.

## 5. 코딩 규칙
- 파일 최대 길이: pages 200 / components 150 / hooks·services 100 / store 80줄 (기존 초과 파일은 손댈 때 줄이는 방향).
- **카드·본문 HTML 은 반드시 `DOMPurify.sanitize` 후 렌더링**(`.sw-content` 클래스). 새 `dangerouslySetInnerHTML` 을 쓰면 정화부터. 외부 링크 열기는 `http(s):` 만.
- 파일 경로를 다룰 때는 허용 폴더 밖으로 나가지 않는지 `resolve()` 후 확인(`main.py` `serve_spa`, `attachment_service._is_servable` 참고). 업로드 원래 이름(`original_name`)은 경로로 쓰지 않는다.
- 비밀번호는 bcrypt(`app/core/security.py`), 로그인은 httpOnly 쿠키 세션(`skywatch_sessions`).
- `.bat` 파일: 줄바꿈 CRLF, **한글 echo 금지**(CP949 파싱 오류).
- Tailwind 함정:
  - `frontend/src/components/logs/` 는 Tailwind 가 읽지 않는다(index.css `@source not`, 운영 PC 와 같은 결과를 내기 위함). **그 폴더에 새 클래스를 쓰면 index.css 의 `@source inline(...)` 에 같이 적어야 만들어진다.** `v2:!클래스` 같은 강제 표기는 inline 에서 안 만들어지니 일반 CSS 로.
  - **index.css 주석 안에 별표+슬래시를 쓰면 주석이 끊겨 아래 규칙이 사라진다.**
  - 이 프로젝트는 간격 단위가 커서(`min-h-9` = 40.5px) 정확한 높이는 px 로. `[@media(...)]:` 같은 클래스는 문자열 조합 말고 통째로 적는다.

## 6. DB 규칙
- 스키마 변경은 **Alembic 마이그레이션 추가**로만(`backend/alembic/versions/`). 기존 표 파괴·교체 금지. 현재 head: **046 `g2h3i4j5k6l7`**.
- 마이그레이션을 추가하면:
  1. 샘플 DB 에서 `alembic upgrade head` 가 통과하는지 확인
  2. `db/schema.sql` 을 다시 만든다: `pg_dump --schema-only --no-owner --no-privileges --no-comments -d skywatch -f db/schema.sql` 후 머리말과 맨 끝 `INSERT INTO public.alembic_version ...`(새 head)을 다시 붙인다
  3. 새 표·컬럼이면 `db/sample_data.sql` 에 가상 샘플 몇 줄 추가(`DELETE FROM alembic_version` 다음 INSERT 의 버전도 새 head 로)
  4. PR 설명에 "DB 변경 있음 + 마이그레이션 파일명"을 적는다 — 운영(내부망) 반영용 SQL 은 원 담당자가 만든다
- 샘플 자료 원칙: 실제 이름·내용 금지, 가상 이름(김하늘·박서준·이도윤·최유나·정민호)과 형식만 본뜬 내용.

## 7. 저장소에 없는 것 (찾지 말 것)
- `backend/.env`(비밀), `backend/models/`(모델), `backend/uploads/`(첨부), 실제 DB 자료.
- 운영 전용: 내부망 배포 묶음(`patch/`), 문서 크롤러(`skynet/`, `.env` 의 `SKYNET_*` 는 비워 두면 SkyNet 메뉴만 빈다), 3D 공역 뷰어(`spa-viewer/`), 원본 가져오기 스크립트(실명 포함이라 제외), 검색 평가셋(`backend/data/search_eval_set.json`).
- `docs/HANDOVER.md` 에 나오는 위 경로·절차(patch 반영, pgAdmin INSERT 이전 등)는 운영 담당자 몫이다. 이 저장소에서 작업할 때는 따르지 않는다.

## 8. 작업 흐름 (권장)
1. `main` 에서 브랜치를 만든다 (`fix/…`, `feat/…`).
2. 화면 변경이면 먼저 근무자 시나리오(누가·언제·무엇을)와 수용 기준을 짧게 적고, 배치·문구·라이트/다크 상태를 정한 뒤 구현한다.
3. 3장 검증을 통과시키고 커밋. 커밋 메시지는 한국어 `fix:`/`feat:`/`style:` 접두어.
4. PR 에 바꾼 파일 목록, DB 변경 여부, 확인한 화면(라이트/다크, classic/v2)을 적는다. 원 담당자가 운영 PC 로 가져가 내부망에 반영한다.
