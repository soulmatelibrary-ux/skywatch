# CLAUDE.md — SkyWatch 인수인계·개발 안내

> 이 문서는 개발 PC 의 상위 폴더(`SkyWatch/`) 기준으로 쓴 인수인계 문서다. 공개 저장소에는 `skywatch/` 폴더만 올라가므로, 문서의 `skywatch/...` 경로는 이 저장소 루트를 뜻한다. `skynet/`·`patch/`·`packages/`·`harness/`·`.claude/` 등은 이 저장소에 없다.


관제 근무 업무 시스템. 업무일지·근무일지, 문의사항, PR(버전 검증) 관리, 관제시스템 문서, 통합검색을 한 곳에서 다룬다.
이 문서만 보고 **설치 → 실행 → 수정 → 내부망 배포**까지 할 수 있게 정리했다. 세부 코딩 규칙은 `skywatch/CLAUDE.md`.

## 1. 운영 환경 (중요)
- **개발 PC**: 인터넷 가능. 이 저장소에서 개발·시험한다.
- **운영(내부망)**: 인터넷 불가, DB는 pgAdmin4로만 다룰 수 있음. 배포는 `patch/` 폴더를 수동 반입한다.
- 코드에 외부 인터넷 의존 금지: CDN·외부 API·실행 중 패키지/모델 다운로드 불가. 필요한 리소스(글꼴, 모델, wheel)는 로컬에 둔다.
- 접속정보(DB 비밀번호, SECRET_KEY 등)는 `skywatch/backend/.env` 에만 둔다. 문서·코드·로그에 쓰지 않는다.

## 2. 폴더 구조
| 경로 | 내용 |
|---|---|
| `skywatch/` | 메인 앱. `backend/`(FastAPI), `frontend/`(React), `start.bat`·`stop.bat`, `mockup/`(화면 목업) |
| `skynet/` | 문서 크롤러 (Flask, 포트 5000). 자체 `skynet/.venv` 사용 |
| `.venv/` | **skywatch 백엔드가 쓰는 공용 Python 가상환경** (start.bat 이 이것을 씀). `skywatch/backend/.venv` 는 쓰지 않는 잔여물 |
| `patch/` | 내부망 반입 묶음 (아래 8장) |
| `packages/` | 오프라인 설치용 분할 파일(한국어 모델, sentence-transformers wheel) + `INSTALL.md` |
| `spa-viewer/` | 3D 공역 뷰어 (메뉴 "3D 공역관리" → `:7070`) |
| `DATA/`, `TEST/`, `근무편성/` | 가져오기용 원본 자료·시험 파일 (앱 실행에는 불필요) |
| `skywatch_260702/` | 2026-07-02 시점 skywatch 사본 (참고용, 수정 대상 아님) |
| `harness/` | 역할 분리 작업 기록 (`tasks/NNN-*.md`, 틀 `TEMPLATE.md`) — 12장. 역할 정의는 `.claude/agents/` |
| `skywatch-agent/` | 첨부파일 로컬 동기화 에이전트 (별도 개발 예정, 웹과 분리 — `README.md`) |

### 넘겨줄 때 필요한 것
- **필수**: `CLAUDE.md`, `skywatch/`(폴더째 복사 — git 에서 빠지는 `backend/models`(약 2.6GB), `backend/.env`, `backend/uploads`, `frontend/node_modules` 포함), 루트 `.venv`(또는 새로 만들 수 있는 인터넷/`packages/`), DB 백업(`patch/db/*.backup`)
- **기능별**: `skynet/`(SkyNet 메뉴·크롤러), `spa-viewer/`(3D 공역), `packages/`(오프라인 설치), `patch/`(내부망 배포 진행 중일 때), `.claude/skills/`(Claude Code 프로젝트 스킬)
- `.env` 에는 비밀번호·SECRET_KEY 가 있다. 묶음과 따로, 안전한 경로로 전달한다.
- `start.bat` 은 `skywatch` **바로 위 폴더의 `.venv`** 를 찾는다. 받은 쪽도 `상위폴더\.venv` + `상위폴더\skywatch` 배치를 유지한다.

## 3. 요구 환경 (개발 PC 기준 확인된 버전)
- Windows 11, **Python 3.13** (`.venv`), **Node.js 22 / npm 11**
- **PostgreSQL 17** + **pgvector** 확장, DB 이름 `skywatch` (SkyNet 은 `skynet`)
- 임베딩 모델: `skywatch/backend/models/kure-v1` (KURE-v1, 1024차원). git 제외 — `packages/` 분할본이나 기존 PC에서 복사
- PDF 한글 글꼴: Windows 맑은 고딕(`C:\Windows\Fonts\malgun.ttf`)을 PDF에 내장

## 4. 처음 설치
1. PostgreSQL 17 설치 → pgvector 확장 설치 → 빈 DB `skywatch` 생성 (스키마는 백엔드가 처음 켜질 때 Alembic 으로 자동 생성)
   - 기존 데이터를 옮기려면 `patch/db/*.backup` 을 pgAdmin4 "복원(Restore)" 으로 넣는다 (7장).
2. Python: 저장소 루트에서 `py -3.13 -m venv .venv` → `.venv\Scripts\pip install -r skywatch\backend\requirements.txt`
   - 인터넷이 없으면 `packages/INSTALL.md` 순서로 wheel·모델을 푼다.
3. 모델: `skywatch/backend/models/kure-v1` 폴더가 있어야 한다 (경로는 `app/services/vector_model.py` 에 고정. `.env` 의 `EMBEDDING_MODEL_PATH` 는 쓰이지 않는 옛 설정)
4. 프론트: `skywatch\frontend` 에서 `npm install` (내부망은 `node_modules` 를 통째로 복사)
5. 설정: `skywatch\backend\.env.example` 을 `.env` 로 복사 후 값 채우기
   - `DATABASE_URL`, `SKYNET_DATABASE_URL` (`postgresql://계정:비밀번호@localhost:5432/skywatch`)
   - `SECRET_KEY`, `SESSION_EXPIRE_HOURS`, `UPLOAD_DIR`(기본 `./uploads` = `backend/uploads`, 첨부파일 저장 위치)
   - `PG_DUMP_PATH`, `PSQL_PATH` (DB 백업 기능용 — 설치된 PostgreSQL 버전 경로와 맞출 것. 이 PC는 17)
   - `SKYNET_API_URL`, `BOARD_DIRECT_URL`

## 5. 실행·중지
```
skywatch\start.bat   # 기존 8000/5173 프로세스 정리 → 배포 패치 확인 → 백엔드(8000) + 화면 개발서버(5173) 창을 띄우고 브라우저 열기
skywatch\stop.bat    # 두 서버 종료
skynet\start.bat     # 크롤러 (5000)
```
- **사용자 접속 주소: `http://<서버IP>:5173`** (Vite 개발서버가 `/api`·`/uploads`·`/ws` 를 8000 으로 넘김). API 문서: `http://<서버IP>:8000/docs`
- 화면은 빌드 없이 개발서버로 뜬다. 소스 수정은 저장 즉시 반영, 백엔드 수정은 재시작 필요.
- start.bat 순서: `backend\scripts\apply_deploy_patches.py`(wheel·DB 스크립트 적용) → 백엔드 기동 시 `alembic upgrade head` 자동 실행.
- Claude Code 등 도구 안에서 start.bat 을 실행하면 도구 종료 때 서버 창이 같이 닫힐 수 있다. 그때는 탐색기에서 직접 실행하거나 WMI(`Invoke-CimMethod Win32_Process Create`)로 분리 실행.

## 6. 아키텍처
- **백엔드** `skywatch/backend/app`: FastAPI, 3계층 `api/`(라우팅) → `services/`(로직·DB) → `models/`(ORM). SQLAlchemy 2.0, 테이블 접두어 `skywatch_`.
- **프론트** `skywatch/frontend/src`: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand 5, React Router v7. API 호출은 `services/api/*` → `hooks/*` 경유.
- **검색**: 키워드(ILIKE + 동의어) + 벡터(KURE-v1, pgvector)를 RRF로 합침. 평가: `backend/scripts/eval_search.py` (메모리 8GB PC는 백엔드를 끄고 실행).
- **화면 두 벌 (같은 주소, 바깥 틀만 다름)**
  - 기존 화면(classic) / 새 화면(v2). 상단 바 버튼으로 전환, PC별 `localStorage['skywatch-ui']`, 기본은 기존 화면.
  - 틀: `components/layout/AppLayout.tsx` 가 선택, 새 틀은 `components/layout/v2/`, 메뉴 정의·새 창 동작은 `layout/navMenu.ts` 공용.
  - 페이지별 새 디자인은 Tailwind 변형 `v2:` (index.css `@custom-variant v2`, `.ui-v2` 안에서만) + 색 변수 `--v2-*` + 공용 묶음 `components/common/v2Styles.ts`. 기존 클래스 뒤에 덧붙이므로 기존 화면은 그대로다. 적용 완료: 근무일지 작성(/shift). 다음 후보: 홈 → 문의 → PR → 문서 → 검색 → 업무일지.
  - 새 화면 아이콘 줄(`layout/v2/RailNav.tsx`)은 스크롤 없이 한 화면에 들어간다: 버튼이 화면 높이에 맞춰 줄어들고(34~52px), 620px보다 낮으면 글자를 숨기고 아이콘만 둔다. 한 줄 이름은 `navMenu.ts` 의 `rail`, 전체 이름은 마우스 올림 말풍선. 이 프로젝트는 Tailwind 간격 단위가 커서(`min-h-9` = 40.5px) 높이는 px 로 적고, `[@media(...)]:` 같은 클래스는 문자열로 조합하지 말고 통째로 적어야 만들어진다.
  - 색 통일(2026-11-11): 새 화면이면 `<html>` 에도 `ui-v2` 가 붙고(main.tsx·uiStore), index.css 가 그 안에서 Tailwind slate·gray·sky·blue 색 변수를 v2 색으로 바꾼다 → SkyNet·관리·팝업까지 컴포넌트 수정 없이 같은 색. 근무 구분색은 `.v2-shift[data-shift]`·`tr[data-shift]`.
  - 보기 창(일지·PR·문의)은 새 화면에서 화면 반쪽 크기로 왼쪽/오른쪽 번갈아 열린다(`readerFeatures`), 창 제목은 날짜·제목(`setWindowTitle`). 적용 전 백업: `backups/ui-redesign-20261111/`.
  - 목업: `skywatch/mockup/layout-redesign.html`
  - 일지 보기 팝업(`/logs/view-popup`)의 참고일지(2026-11-12): 어두운 막을 없애고 팝업 안 오른쪽에 붙는 도킹 패널(`logs/LogRefDock.tsx`, `role="separator"` 손잡이·폭은 `localStorage['sw-log-reference-dock-width']`). 메인 앱·작성 창은 떠 있는 창(`LogReferencePanelPopup`) 유지(막만 제거). 머리 막대 버튼 묶음은 `logs/LogHeaderActions.tsx`, 참고 목록 줄·카드 미리보기는 `LogRefRow.tsx`·`LogRefCardModal.tsx`. 이 파일들은 모두 `logs/` 라 새 클래스는 index.css `@source inline(...)` 에 등록한다. **index.css 주석 안에 별표+슬래시를 쓰면 주석이 끊겨 그 아래 규칙이 사라진다**(라이트 `--v2-*` 변수가 정의되지 않던 원인).
- **사용 안내(도움말)**: `frontend/public/help/index.html` (+ `help/img/*.png` 화면 사진, 외부 리소스 없음). 상단 바(기존·새 화면)와 관제문서 창의 "? 도움말" 버튼(`layout/HelpButton.tsx`)이 현재 메뉴 절(`#shift`·`#logs`·`#inquiry`·`#techdocs`·`#pr`, `utils/help.ts`)로 연다. 버튼·흐름이 바뀌면 이 파일도 고친다.
- **본문 편집기**: TipTap(`components/logs/CardEditor.tsx`) — 표·이미지 붙여넣기, 이미지 크기 조절, `#검색어` 카드 링크. 업무일지·근무일지·PR·관제시스템 문서가 같이 씀.
- **본문 링크**: 카드 링크(`#card-번호`), `#TD:번호`(관제시스템 문서), `#LOG:번호`(일지). 보기 화면 클릭 처리 `hooks/useContentLinks.tsx`.

## 7. DB
- 스키마 변경은 **Alembic 추가 마이그레이션만** (기존 테이블 파괴·교체 금지). 현재 head: **046 `g2h3i4j5k6l7`** (pg_trgm 확장 + GIN 트라이그램 인덱스).
- 마이그레이션을 추가하면 내부망용 SQL 도 같이 만든다 (8장 db_patch).
- 전체 백업: `pg_dump -Fc` → `patch/db/skywatch_YYYYMMDD_HHmm.backup` (pgAdmin4 "복원"으로 되돌림). 비밀번호는 `PGPASSWORD` 환경변수로만 넘긴다.
- 특정 테이블만 내부망으로 옮길 때는 9장(INSERT SQL) 방식.

## 8. 내부망 배포 (patch 폴더)
반입 묶음 구성:
| 경로 | 내용 |
|---|---|
| `patch/skywatch/` | 이번에 바뀐 소스만, `skywatch/` 와 같은 상대 경로 |
| `patch/skywatch/db_patch/NN_이름.sql` | DB 스키마 SQL (배포 전용, 소스 트리에는 없음) |
| `patch/wheels/` | 새 Python 패키지 wheel (Python 3.13 win_amd64, 의존성 포함). npm 패키지는 추가하지 않는다 |
| `patch/2026-11-files.txt` | `patch/skywatch` 파일 목록 — UTF-8 BOM, 역슬래시 경로, CRLF. 실제 파일과 항상 일치 |
| `patch/db/*.backup` | DB 전체 백업 (필요할 때) |
| `patch/ui-redesign-20261111/` | 화면 개선분만 따로: `new/`(새 디자인) 37개·`old/`(개선 전) 31개 파일(스케줄 달력·일지 보기 창 참고일지 도킹 포함, 신규 6개는 old 없음) + `적용방법.txt`. 사용자가 골라 적용·롤백하도록 기본 묶음 `patch/skywatch` 에는 넣지 않음. 이 파일들을 다시 고치면 `new/` 와 `files.txt` 에 반영 |

수정 시 규칙:
1. `skywatch/` 아래를 고치면 **고친 파일만** `patch/skywatch/` 같은 경로에 덮어쓴다 (날짜 폴더 금지). 안 고친 파일은 넣지 않는다.
2. 남아 있는 이전 배포분 정리는 담당자 확인 후.
3. DB 변경 시 `db_patch` SQL: 마이그레이션 단계마다 DO 블록, `alembic_version` 이 직전 버전일 때만 실행·버전 갱신, 아니면 "건너뜀" (재실행 안전). 개발 DB에서 트랜잭션 안에 두 번 실행 → 롤백으로 검증.
4. `.bat` 은 CRLF, 한글 echo 금지(CP949 문제).

내부망 적용 절차:
1. 덮어쓸 파일을 목록(`2026-11-files.txt`) 기준으로 백업 (DB 변경이 있으면 DB 백업도)
2. `patch\skywatch`·`patch\wheels` 를 서비스 루트에 폴더째 덮어쓰기
3. `skywatch\stop.bat` → `skywatch\start.bat` (wheel 설치·db_patch 실행은 자동, 적용된 SQL 은 `.sql.applied` 로 이름 변경)
4. 사용자 PC `Ctrl+F5`. 문제 시 1의 백업으로 되돌리고 재시작.

## 9. 내부망 테이블 이전 (pgAdmin4 전용)
내부망에서는 pg_dump/COPY/CSV Import 가 오류 → **INSERT SQL 파일**로 옮긴다.
```python
# skywatch/backend 에서 실행 (루트 .venv). 접속정보는 .env 에서 읽힘
from sqlalchemy import text
from app.db.session import SessionLocal

def sql_val(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'TRUE' if v else 'FALSE'
    return "'" + str(v).replace("'", "''") + "'"

db = SessionLocal()
lines = ['BEGIN;', 'TRUNCATE TABLE 테이블명 RESTART IDENTITY CASCADE;']
for r in db.execute(text('SELECT col1, col2 FROM 테이블명 ORDER BY id')).fetchall():
    lines.append(f"INSERT INTO 테이블명 (col1, col2) VALUES ({', '.join(sql_val(v) for v in r)});")
lines.append('COMMIT;')
with open('patch/output.sql', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines))
db.close()
```
- 인코딩 UTF-8(BOM 없음), 줄바꿈 LF, FK 참조 대상 테이블 먼저, 저장 위치 `patch/` 루트.
- 실행: pgAdmin4 → skywatch DB → Tools → Query Tool → 파일 열기 → F5.

## 10. 주요 업무 흐름 (코드 위치)
- **근무일지 `/shift`**: 기존 업무일지 테이블 공유, 과제(이어지는 일·장기 과제)로 카드 연결. `pages/shiftlog/`, `components/shiftlog/`.
  - 탭: 일지 쓰기 / 일지 보기(`/shift/read`, 왼쪽 근무 목록 + 오른쪽 카드) / 카드 검색 / 이어지는 업무. 일지 보기의 찾기는 화면 안 거르기만 한다 — 목록은 불러온 근무를 근무자·조·날짜로, 날짜 칸은 그 날로 이동, 오른쪽 "이 근무에서 찾기"는 선택한 근무의 카드. 전체 기간 본문 검색은 카드 검색 탭.
  - 일지 보기(`hooks/useReadShift.ts`): 오른쪽 머리의 "이전/다음 근무"로 시간 순 이동(미래 근무 불가, `utils/shiftNav.ts`), 주소 없이 열었는데 지금 근무가 비어 있으면 직전에 쓴 근무를 대신 열고 안내 띠("지금 근무 보기"), 날짜 칸은 그날 있는 근무 종류(주야 등)로 열림. 두 칸 배치는 컨테이너 쿼리(640·1100px)라 반쪽 창에서도 유지(기존·새 화면 공용). 카드 검색 결과의 "일지 보기 ›"는 `/shift/read?date=&shift=&card=` 로 열려 그 카드로 이동·강조하고, 카드 검색 조건은 `sessionStorage['skywatch-shift-explore']` 로 뒤로 와도 유지.
  - "이어서 쓰기"로 저장한 카드는 `skywatch_work_thread_cards` 로 같은 과제에 묶이고(카드 하나는 과제 하나), 과제 상세(`ThreadDrawer`)에 근무별 타임라인으로 모인다. 본문 `#card-번호` 링크가 생기는 것은 아니다.
  - 카드 수동 묶기: 카드 탐색(`CardExplorePage`)의 "🔗 카드 묶기"로 **완료된** 카드(기존 업무일지 카드 포함)를 여러 장 골라 새 묶음(종료 상태) 또는 기존 이어지는 일에 연결한다(`work_thread_link_service`, `POST /api/work-threads/link-cards`, origin=`manual`). 다른 묶음의 카드는 이동되고, 장기 과제(project)의 카드는 옮기거나 빼거나 대상으로 삼을 수 없다. 과제 상세의 "묶음에서 빼기"로 되돌린다.
  - 묶음 상태 ↔ 카드 상태 동기화(이어지는 일 `kind=thread` 만, 장기 과제 제외): 일 open→카드 `in_progress`(진행중), hold→hold, done→done. 새 이어짐 카드·이어서 쓰기는 진행중으로 저장되고 묶음 전체가 따라온다. 카드 하나를 완료하면 묶음 전체 종료, 보류/진행중으로 바꾸면 전체가 따라간다(`services/work_thread_card_status.py`, 진입점 `work_thread_sync.on_card_status`). 수동 묶기는 일 상태를 따르고 "묶음에서 빼기"는 완료로 되돌린다. 기존 업무일지 화면은 묶음 카드가 2장 이상이면 완료 전 확인창(`LogCardList`).
  - 종료(`done`)한 이어지는 일도 다시 이어 쓸 수 있다: 작성 화면 "종료된 일 찾기"(`ThreadResumeDialog`) 또는 과제 상세 "다시 열고 이어서 쓰기". 카드를 저장하면 서버(`shift_log_service.add_card`)가 과제를 `open` 으로 되돌린다. 종료한 장기 과제(project)는 카드로 다시 열리지 않고 상세의 "다시 진행"으로만 연다.
  - 쓰기 화면 카드 수정·삭제·이어짐 전환: "이 근무의 카드"(`ShiftCardsPanel`)에서 최근 7일 근무의 카드를 제자리에서 고치고(`CardEditForm`) 지운다. 로그인한 누구나(남의 카드는 저장 전 확인. 수정 알림은 카드 작성자가 아니라 **그 근무 일지를 처음 만든 사람**에게 가고, 수정자가 그 사람이면 없다 — `card_edit_service.notify_card_edit`, classic 동일), 7일 넘은 근무는 안내만 하고 막지 않는다. 신규 API `PATCH /api/shift-logs/cards/{id}`(`title·content·category_id·thread_mode keep|single|thread·expected_updated_at·base_title·base_content·base_category_id`, 충돌 409(`updated_at` 이 달라도 base 와 비교해 제목·본문·분류가 실제로 바뀐 경우만), 없는/비활성 분류로 바꾸면 400, 장기 과제 카드는 이어짐 변경 400)·`DELETE /api/shift-logs/cards/{id}` — 서비스 `shift_card_edit_service.py` 가 기존 `card_edit_service.apply_card_edit/notify_card_edit`·`card_service.soft_delete_card`·`work_thread_link_service.detach_card` 를 재사용한다(classic `PATCH/DELETE /api/cards/{id}` 는 그대로). `single` = 이 카드만 묶음에서 빼 완료(묶음에 하나뿐이면 일 종료), `thread` = 일회성 카드로 새 이어지는 일 + 진행중. 삭제는 묶음에서 카드를 빼고 남은 카드가 없으면 일을 종료(목록에서 숨김). 수정 중 이탈 경고는 `hooks/useEditGuard.ts` — 메뉴 버튼의 `navigate` 는 `AppLayout` 의 `NavGuardProvider`(`NavigationContext` 의 push·replace 를 감쌈, `utils/navGuard.ts` 에 훅이 등록)가 한 곳에서 가로채고, 브라우저 뒤로가기만 못 막는다. 수정 중 카드의 폼은 목록을 못 불러와도 같은 자리에 남는다. **삭제 복원**: 화면에서는 되살릴 수 없다. 관리자가 pgAdmin4 에서 `skywatch_log_cards` 의 `is_deleted=FALSE, deleted_by=NULL, deleted_at=NULL` 로 되돌려야 하고(`WHERE id=카드번호`, 접속정보는 쓰지 않는다), 이어지는 일에서 빠진 연결(`skywatch_work_thread_cards`)·일 상태는 자동 복구되지 않는다. 재조회 중 이전 근무 데이터 유지는 `ShiftWritePage`.
- **PR 버전 검증 `/pr-batches`**
  - 누구나(관리자 제한 없음): "신규 버전" (버전·수정일자 + 보고서 기본값: Skyline/Adaptation 버전, 시험 세그먼트). 제작사 PR 목록 엑셀을 함께 고르면 버전을 만든 뒤 PR 목록·개별 PR 이 자동으로 만들어진다. 배치번호는 서버 자동(`YYYYMMDD-n`). 단계(합의중→완료) 관리는 화면에서 쓰지 않음. 버전 삭제·PR 항목·문서 첨부·근무자 엑셀 원본 다운로드도 모두 누구나. 검증 기록 삭제만 본인(과 관리자).
  - PR 항목 삭제: 다른 근무자의 검증 기록이 남아 있으면 일반 사용자는 삭제할 수 없다(관리자 제외) — 남의 검증 결과가 함께 사라지는 것을 막는다. 입력 길이는 스키마가 컬럼 길이대로 제한한다.
  - `/uploads` 정적 파일(`core/safe_static.py`): 스크립트가 실행될 수 있는 형식(html·svg 등)은 내려받기로만 열리고 `nosniff` 를 붙인다. PR 첨부 저장 이름의 확장자는 영문·숫자만 남긴다.
  - 화면 흐름은 3단계(1 PR 목록 → 2 검증하기 → 3 원본 문서). 문서는 PDF·이미지·txt 만 "보기"(브라우저에서 바로 열기), 나머지는 내려받기.
  - 기준 엑셀(.xlsx/.xlsm) 첫 시트의 PR 번호·제목 → `skywatch_pr_batch_items`, 원본은 버전 첨부.
  - 근무자(누구나): 화면 입력 또는 엑셀 업로드(확정된 PR 목록에만 결과 연결, 목록에 없는 PR 시트는 경고 후 건너뜀) → `skywatch_pr_verifications`(근무자·PR당 최신 1건, 다른 근무자 기록은 덮지 않음), 원본 엑셀 → `skywatch_pr_workbook_imports`. PR 번호는 `SL-8670`, `D-2024-004` 형식 모두 인식하며, 첫 시트가 시험확인서인 단일 시트 파일도 처리한다.
  - 보고서 PDF: `services/pr_report_pdf.py` — "시험 확인서" 2장 양식(1장 정보표·결과, 2장 시험항목/방법/결과 표). 공통값은 버전 기본값 → 입력창 기본값/엑셀 빈 칸 보충.
- **문의 카드 → 문의사항 자동 등록**: 분류 이름에 "문의"가 들어간 카드(현재 "문의사항/요청사항")가 완료되면 `services/inquiry_auto_service.on_cards_done` 이 문의사항 한 건을 만든다(업무일지·근무일지·일 종료·묶음에서 빼기 등 카드가 완료되는 사용자 경로마다 호출, 가져오기·과제 후보 일괄 정리는 제외). 기본값: 일지 날짜·카드 작성 시각·작성자·제목·본문·완료·완료일, 발생버전 = 가장 최근 입력 버전(`latest_sw_version`, 손 입력 창도 `useLatestSwVersion` 으로 미리 채움). 자동 등록은 카드당 한 번(`card_id`), 수동 [문의등록] 중복은 근무자가 메뉴에서 지운다. 실패해도 카드 저장은 성공(SAVEPOINT). 작업 기록 `harness/tasks/008-inquiry-from-done-card.md`.
- **통근비 계산 (새 창 `frontend/public/commute-calc.html`)**: 설정·고친 칸은 `skywatch_configs` 의 `commute_calc` 행(`commute_calc_service`), 올린 ERP 근태 자료는 달별로 `skywatch_commute_months`(한 달 한 줄, 계산에 쓰는 칸만 — 사번·소속 없음, `commute_month_service`, API `/api/commute-calc/months`). 파일을 올리면 그 파일에 든 달만 덮어쓰고 다른 달은 그대로 둔다. 창을 열면 저장된 달 목록을 받고 가장 최근 달을 파일 없이 보여 준다. "저장된 달 · 기간 합계" 창: 달 목록(보기·삭제, 삭제해도 고친 칸은 남음)·기간 합계(달마다 `buildModel` 의 총근무). 원본 보기와 거기서 고친 값은 저장 안 됨. 작업 기록 `harness/tasks/007-commute-monthly-store.md`.

## 11. 작업 시 주의 (경험)
- 소스 수정 후 **2회 리뷰**, 화면 변경은 라이트/다크 둘 다 브라우저로 확인.
- 이 저장소에서 Claude Code 의 Grep 도구가 일부 파일을 빠뜨린 적이 있다. "없다"고 결론 내기 전 `Select-String` 이나 실제 화면으로 재확인.
- PowerShell 큰따옴표 안의 `$`·`${}` 는 변수로 바뀐다. JS/JSX 템플릿 문자열 편집은 편집 도구로.
- 메모리 8GB PC: 모델을 올리는 프로세스를 두 개 띄우면 죽는다 (검색 평가는 백엔드를 끄고).
- 기존 lint 오류(사용 안 하는 변수, effect 안 setState 등)가 남아 있다. 고친 줄에서 새 오류만 없게 한다.
- `.gitignore` 의 `**/logs/` 때문에 `frontend/src/components/logs/` 는 git 에 없고 Tailwind 도 읽지 않는다. 그 폴더에 새 클래스를 쓰면 index.css 의 `@source inline(...)` 에 같이 적어야 만들어진다 (폴더 전체를 `@source` 하면 기존 화면 모양이 바뀜). `v2:!클래스`·`클래스!` 강제 표기는 inline 에서 안 만들어져 일반 CSS 로 처리했다.

## 12. 작업 방식 — 하네스 (역할 분리, 2026-11-12)
기능 추가·화면 변경은 세 역할을 거친다. 역할 정의는 `.claude/agents/*.md`, 작업 기록은 `harness/tasks/NNN-이름.md`(틀: `harness/TEMPLATE.md`).

| 순서 | 역할 (agent) | 하는 일 | 코드 수정 |
|---|---|---|---|
| 1 | 교대근무자 `shift-worker` | 요청을 근무자 언어로 정리, 사용 시나리오, 수용 기준 | 안 함 |
| 2 | 디자이너 `ui-designer` | **`frontend-design` 스킬** 로 배치·문구·상태·라이트/다크 명세 (목업은 `skywatch/mockup/`) | 안 함 |
| 3 | 코더 `coder` | 명세대로 구현 → tsc·lint → patch 반영 → 도움말 갱신 | 함 |
| 4 | 교대근무자 `shift-worker` | 수용 기준으로 검사, 남은 불편은 다음 작업으로 | 안 함 |

- **사용자 = 교대근무자.** 관리자 업무(사용자·코드 관리, PR 버전 등록 등)도 근무자가 대행한다. 관리자 전용 흐름을 따로 설계하지 않고, 근무자 화면 안에서 끝나게 한다.
- **판단 우선순위: 근무자 사용 편의 > 기존 습관 유지 > 디자인 개성 > 구현 편의.** 역할 간 의견이 부딪히면 이 순서로 정하고, 정하기 어려우면 사용자에게 묻고 작업 문서 "5. 결정 기록"에 남긴다.
- 디자인 개성(스킬의 과감한 시도)은 한 화면에 한 곳만. 기존 v2 디자인 언어와 classic 화면 불변 원칙이 우선.
- 작은 수정(문구·버그 한 줄)은 1·4단계를 짧게 하거나 생략해도 되지만, 작업 문서에는 한 줄이라도 남긴다.
- 메인 대화(Claude)는 조율만 한다: 역할 결과를 작업 문서에 모으고, 단계 사이에 사용자 확인이 필요한 결정을 묻는다.
