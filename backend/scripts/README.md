# 📚 Backend Scripts 가이드

## 📁 폴더 구조

```
scripts/
├── imports/             # 데이터 import 스크립트
├── maintenance/         # 유지보수 스크립트
├── seeding/             # DB 초기 데이터 생성
├── patches/             # 버그 수정/패치
├── download_model.py    # ML 모델 다운로드
├── migrate_inquiries.py # 문의사항 마이그레이션
└── README.md           # 이 파일
```

---

## 🔍 각 폴더 설명

### 📥 `imports/` — 데이터 import

대량 데이터 파일(CSV 등)을 데이터베이스로 가져오는 스크립트

| 스크립트 | 용도 |
|---------|------|
| `import_daily_csv.py` | 일일 운영 데이터 import |
| `import_inquiry_csv.py` | 문의사항 CSV import |
| `reimport_csv_replace.py` | 기존 데이터 덮어쓰기 import |
| `reset_and_import.py` | DB 초기화 후 import |

**사용법**:
```bash
cd scripts/imports
python import_daily_csv.py
```

---

### 🔧 `maintenance/` — 유지보수

운영 중 데이터 확인, 진단, 일괄 처리 스크립트

| 스크립트 | 용도 |
|---------|------|
| `check_api.py` | API 엔드포인트 상태 확인 |
| `check_team_logs.py` | 팀별 로그 검사 |
| `diagnose.py` | 시스템 종합 진단 |
| `diagnose_recent.py` | 최근 데이터 진단 |
| `diagnose_today.py` | 오늘 데이터 진단 |
| `find_data_range.py` | 데이터 범위 조회 |
| `list_all_teams.py` | 등록된 모든 팀 목록 |
| `run_backfill.py` | 누락된 데이터 채우기 |
| `sync_card_links.py` | 카드 링크 동기화 |

**사용법**:
```bash
cd scripts/maintenance
python diagnose.py
```

---

### 🌱 `seeding/` — 초기 데이터

개발/테스트 환경을 위한 초기 데이터 생성 스크립트

| 스크립트 | 용도 |
|---------|------|
| `seed_dev.py` | 개발 환경 초기 데이터 생성 |
| `seed_inquiries.py` | 샘플 문의사항 생성 |

**사용법**:
```bash
cd scripts/seeding
python seed_dev.py
```

---

### 🔨 `patches/` — 패치

특정 버그 수정이나 마이그레이션 패치

| 스크립트 | 용도 |
|---------|------|
| `backup_service.py` | 백업 서비스 패치 |

---

### 🤖 `download_model.py`

ML 모델 (KLUE-Sbert) 다운로드

**사용법**:
```bash
python download_model.py
```

---

### 📝 `migrate_inquiries.py`

문의사항 데이터 마이그레이션

**사용법**:
```bash
python migrate_inquiries.py
```

---

## 🚀 일반적인 사용 패턴

### 1. 개발 환경 초기 설정

```bash
# 1단계: 모델 다운로드
python download_model.py

# 2단계: 샘플 데이터 생성
python seeding/seed_dev.py

# 3단계: 시스템 진단
python maintenance/diagnose.py
```

### 2. 프로덕션 데이터 import

```bash
# 1단계: CSV 파일 준비 (backups/에 저장)
# 2단계: import 실행
python imports/import_daily_csv.py

# 3단계: 동기화 및 검증
python maintenance/sync_card_links.py
python maintenance/diagnose.py
```

### 3. 운영 중 유지보수

```bash
# 일일 진단
python maintenance/diagnose_today.py

# 팀 로그 확인
python maintenance/check_team_logs.py

# API 상태 확인
python maintenance/check_api.py
```

---

## 📋 스크립트 실행 권한

모든 스크립트는 **Python 가상환경** 내에서 실행:

```bash
# 가상환경 활성화
cd ../
.venv\Scripts\activate

# 스크립트 실행
cd scripts
python <script_name>.py
```

---

## ⚠️ 주의사항

1. **백업 필수**
   - `imports/` 스크립트 실행 전 데이터베이스 백업
   - `reset_and_import.py`는 기존 데이터를 삭제합니다

2. **실행 순서 중요**
   - Import → Sync → Diagnose 순서 준수

3. **로그 확인**
   - 각 스크립트 실행 후 로그 확인
   - 오류 발생 시 즉시 보고

4. **테스트 환경에서 먼저 실행**
   - 프로덕션 실행 전 개발 환경에서 테스트

---

## 🔗 관련 문서

- `docs/5.기술스택_및_DB스키마.md` — 데이터베이스 구조
- `docs/6.개발환경_및_배포가이드.md` — 배포 방법

---

**작성일**: 2026-06-10  
**버전**: 1.0
