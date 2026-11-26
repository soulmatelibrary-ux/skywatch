# CLAUDE.md — skywatch 개발 규칙

전체 설치·실행·배포 안내는 `docs/HANDOVER.md`(인수인계 문서).

## 코딩 원칙
- 소통 한국어, 코드 영어(주석은 한국어 가능). 문장 끝 마침표(.)
- 3계층 준수: `api/`(라우팅) → `services/`(로직·DB) → `models/`(ORM)
- 파일 최대 길이: pages 200 / components 150 / hooks·services 100 / store 80줄 (기존 초과 파일은 손댈 때 줄이는 방향)
- API 호출: 컴포넌트 직접 금지 → `services/api/*` 를 `hooks/` 에서 호출
- 요청한 것만 수정. 주변 코드 개선 금지
- 카드·본문 HTML 렌더링: `.sw-content` 클래스 + DOMPurify 정화 (`components/common/RichContentView`, `components/shiftlog/RichBody`)
- 새 화면(v2) 디자인은 `v2:` 변형과 `components/common/v2Styles.ts` 를 기존 클래스 뒤에 덧붙인다 — 기존 화면 클래스는 바꾸지 않는다

## 코드 수정 규칙
1. 소스코드 수정 후 **2회 리뷰** 진행 (화면은 라이트/다크 브라우저 확인)
2. 수정한 파일만 `patch/skywatch/` 같은 경로에 복사 (날짜 폴더 금지 — 항상 덮어쓰기), `patch/2026-11-files.txt` 갱신
3. DB 변경: Alembic 추가 마이그레이션 + `patch/skywatch/db_patch/NN_*.sql` (루트 CLAUDE.md 8장)

## 환경
- DB 접속정보: `backend/.env` 의 `DATABASE_URL` (문서·코드에 쓰지 않음)
- Python: 저장소 루트 `.venv` (start.bat 이 사용). `skynet/.venv` 는 크롤러 전용
- 현재 마이그레이션 head: **046 `g2h3i4j5k6l7`**

## 배치파일 규칙
- 한글 echo 금지 (CP949 파싱 오류), 줄바꿈 CRLF
- 작업 디렉토리 지정: `start "Title" /D "%DIR%" cmd /k "command"` 패턴

## PR 버전 검증 데이터 모델
- `PrBatch`(버전): 버전 이름, 수정일자(`agreed_date`), 이전 버전, 검증완료일, 수정 내용(`summary`), 검증 방법(`notes`), 보고서 기본값(`skyline_version`·`adaptation_version`·`test_segment`). `batch_no` 는 서버 자동(`YYYYMMDD-n`), `status` 컬럼은 남아 있으나 화면에서 단계 관리하지 않음.
- 기준 엑셀 업로드는 PR 목록 시트와 기본/연동 점검 시트를 `PrBatchItem` 으로 반영하고, 원본은 버전 첨부에 남긴다.
- 첫 시트가 `이슈 번호 / 문제 내용 / 수정 내용` 표(제작사 PR 번호 `SL-xxxx`)면 수정 내용을 `actual_fix` 에 넣고(번호 칸이 빈 행은 앞 PR 에 이어붙임), 개별 PR(`skywatch_issues`)에 그 번호가 없으면 새로 등록한다. 번호는 제작사(LM) PR번호(`lm_pr_no`)로 저장하고 KAC 번호는 비운다(우리 번호 체계와 다름). 매칭은 번호 기준이라 기존 개별 PR 에 제작사 번호가 비어 있으면 중복 등록되므로, 화면은 먼저 `?dry_run=true` 미리보기로 등록 대상을 보여 주고 확인받는다.
- PR 등록 탭 펼침은 PR 의 구체적인 내용(합의/실제 수정 내용, 연결된 개별 PR 의 상세 내용 `issue_content`)만 보여 준다. 시험 확인서(시험방법·시험결과·비고)는 검증·결과 탭에서 근무자 이름을 눌러 펼쳐 본다(`PrVerificationReportView`). `PrBatchItem.verify_method` 는 검증 입력창 시험방법 기본값으로만 남아 있고 화면에는 표시하지 않는다.
- 개별 PR 목록 기본 정렬: KAC PR번호 있는 PR 먼저 → 등록일 최신순. `sort`/`order` 파라미터로 등록일·번호·제목·상태·최근 수정 정렬 가능.
- 근무자 엑셀은 시트별로 추출한다. `PrWorkbookImport` 에 버전·사용자별 최신 원본을 보관하고 `PrVerification.source_import_id` 로 연결한다. 같은 근무자가 같은 PR 시트를 다시 올리면 그 PR 기록과 PDF를 갱신하고, 파일에 없는 시트·다른 근무자 기록은 유지한다. 확정된 버전 목록에 없는 PR 시트는 새 항목을 만들지 않고 경고 후 건너뛴다. 첫 시트에 `관련 PR번호`가 있으면 첫 시트부터 검증자료로 읽는다.
- 공통 칸(Skyline/Adaptation/세그먼트)이 엑셀에 비어 있으면 버전 보고서 기본값으로 채운다 (`apply_record(defaults=)`, 기존 값은 덮지 않음).
- PR 번호 파싱은 `D-2024-004`, `SL-8670` 형식 모두 인식한다.
- 엑셀 `시험결과`/`Test Result` 라벨 다음 행을 결과 요약으로 저장하고 PDF 본문에 쓴다. 없으면 시트명을 포함한 확인 안내를 저장한다.
- PDF는 `services/pr_report_pdf.py` 의 "시험 확인서" 2장 양식(첨부 원본과 동일 칸)으로 만든다. 뒷장 표는 문단마다 행으로 넣어 길면 다음 페이지로 이어진다.
- `PrVerification` 에 결재 컬럼(`approval_status` 등)이 있으나 현재 화면에서 결재(승인/반려)는 쓰지 않는다.
- 버전 목록·검증 현황에는 번호/제목 검색, 버전 상세 URL은 `?batchId={id}` 로 바로 연다.
