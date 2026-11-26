-- =====================================================================
-- SkyWatch 샘플 데이터 (가상 자료)
--   * 실제 운영 자료가 아니다. 코드표(카드 분류·상태, 관제문서 분류)만 실제 값.
--   * 사람 이름·문의 내용·PR 은 형식을 보여 주기 위한 가상 예시.
--   * 로그인: admin / skywatch1!  (user_a, user_b, user_c, user_d, user_day 도 같은 비밀번호)
--   * 벡터(임베딩) 표는 비워 둔다. 모델(kure-v1)을 둔 뒤 관리 화면의 재색인으로 만든다.
-- 넣는 순서: schema.sql → sample_data.sql (빈 DB 에서)
-- =====================================================================
SET client_encoding = 'UTF8';
BEGIN;

-- alembic: 스키마가 최신(head)임을 표시 → 백엔드가 켜질 때 마이그레이션을 다시 돌리지 않는다
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('g2h3i4j5k6l7');

-- skywatch_users — 가상 사용자 6명, 비밀번호는 모두 'skywatch1!'
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (1, '관리자', 'admin', 'admin', 'day', '4급', '$2b$12$g.3Q87k2yExAcV3oF0WTdeh/0cO170em0mDNh3Lyvi4bbe2AmmLbW', '$2b$12$g.3Q87k2yExAcV3oF0WTde', TRUE, 1, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (2, '김하늘', 'user_a', 'shift_worker', 'A', NULL, '$2b$12$NKiSq3FwwdQhHlKwtXpCEOvBRX9SwQPthQ0WE7DiHA/bpPKTehhvK', '$2b$12$NKiSq3FwwdQhHlKwtXpCEO', TRUE, 2, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (3, '박서준', 'user_b', 'shift_worker', 'B', NULL, '$2b$12$T9gfDTr2y0utTxsBiHvAduCJbDBzIbeE7nfSZ8WGorkmCzwyKvCTe', '$2b$12$T9gfDTr2y0utTxsBiHvAdu', TRUE, 3, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (4, '이도윤', 'user_c', 'shift_worker', 'C', NULL, '$2b$12$m3EVnPIZaJ4B/DAtfAXp2uNRmfdwSJTBHJla7tK6L4qqBIggvGkhK', '$2b$12$m3EVnPIZaJ4B/DAtfAXp2u', TRUE, 4, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (5, '최유나', 'user_d', 'shift_worker', 'D', NULL, '$2b$12$5LAF4YM6h5V1qKMZSVhnO.az3nMnHc7BIjI6ln38Z.bnvK25rip52', '$2b$12$5LAF4YM6h5V1qKMZSVhnO.', TRUE, 5, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');
INSERT INTO skywatch_users (id, name, login_id, role, team, grade, password_hash, salt, is_active, sort_order, joined_at, resigned_at, note, no_excel, created_by, created_at, updated_at) VALUES (6, '정민호', 'user_day', 'day_worker', 'day', '5급', '$2b$12$qxBJXf63p6XVNMAZGyyK5.86qSIAeL3slL6WuKpYv943ByY0hg3I.', '$2b$12$qxBJXf63p6XVNMAZGyyK5.', TRUE, 6, '2024-03-01', NULL, '샘플 계정', FALSE, 1, '2026-01-02 09:00:00+09', '2026-01-02 09:00:00+09');

-- skywatch_card_categories — 개발 DB 코드표 그대로
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (1, '관제시스템 설치/적용', '#7a7ac7', 7, TRUE, 1, '2026-04-30T16:12:31.333906+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (2, '관제시스템 검증/시험', 'green', 5, TRUE, 1, '2026-04-30T16:12:31.333906+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (3, '관제지원 개발/개선', 'purple', 2, TRUE, 1, '2026-04-30T16:12:31.333906+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (4, '시스템 장애/이상처리', 'red', 3, FALSE, 1, '2026-04-30T16:12:31.333906+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (5, '행정/문서 관리', 'orange', 4, TRUE, 1, '2026-04-30T16:12:31.333906+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (6, '기타', 'gray', 6, TRUE, 1, '2026-05-06T16:20:11.742485+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (7, '제작사분석결과', '#6b7280', 6, FALSE, 1, '2026-05-07T17:38:16.771884+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (8, '문의사항/요청사항', '#6b7280', 1, TRUE, 1, '2026-05-12T10:30:49.264787+09:00');
INSERT INTO skywatch_card_categories (id, name, color, sort_order, is_active, created_by, created_at) VALUES (9, '전달사항', '#0891b2', 8, TRUE, 1, '2026-10-24T07:36:03.354075+09:00');

-- skywatch_card_statuses — 개발 DB 코드표 그대로
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (1, 'open', '신규', '#6b7280', 0, TRUE, FALSE, TRUE, NULL, '2026-06-26T14:18:05.941800+09:00', 1, '2026-05-06T10:31:30.182839+09:00');
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (2, 'hold', '보류', '#94a3b8', 4, TRUE, TRUE, FALSE, NULL, NULL, 1, '2026-05-06T10:31:30.182839+09:00');
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (3, 'done', '완료', '#22c55e', 3, TRUE, TRUE, FALSE, NULL, NULL, 1, '2026-05-06T10:31:30.182839+09:00');
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (4, 'in_progress', '진행중', '#3b82f6', 1, TRUE, TRUE, FALSE, NULL, NULL, 1, '2026-05-06T16:06:32.108465+09:00');
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (5, 'pending', '확인대기', '#f59e0b', 2, TRUE, FALSE, TRUE, NULL, '2026-06-26T14:18:05.941800+09:00', 1, '2026-05-06T16:06:32.108465+09:00');
INSERT INTO skywatch_card_statuses (id, key, label, color, sort_order, is_system, is_active, is_deleted, deleted_by, deleted_at, created_by, created_at) VALUES (6, 'cancelled', '취소', '#ef4444', 5, TRUE, TRUE, FALSE, NULL, NULL, 1, '2026-05-06T16:06:32.108465+09:00');

-- skywatch_tech_doc_categories — 개발 DB 코드표 그대로
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (1, 'GEN', 'GEN01', '사무실', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (2, 'GEN', 'SKY07', 'SKY07', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (3, 'SECURITY', 'SEC', '보안점검', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (4, 'SECURITY', 'SKY11', 'SKY11', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (5, 'SECURITY', 'TST05', 'TST05', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (6, 'SKYLINE', 'GEN01', 'GEN01', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (7, 'SKYLINE', 'SEC', 'SEC', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (8, 'SKYLINE', 'SKY04', 'SKY04', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (9, 'SKYLINE', 'SKY06', '분석결과', 2, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (10, 'SKYLINE', 'SKY07', 'SKYLINE 매뉴얼', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (11, 'SKYLINE', 'SKY08', '교육훈련실', 7, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (12, 'SKYLINE', 'SKY09', '업무일지', 5, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (13, 'SKYLINE', 'SKY10', '알림장', 3, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (14, 'SKYLINE', 'SKY14', '분석 보고서', 4, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (15, 'SKYLINE', 'SKY15', '유지보수용역', 6, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (16, 'SKYLINE', 'SKY16', '제작사QNA', 8, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (17, 'SKYLINE', 'SKY17', '적용자료', 9, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (18, 'SKYLINE', 'SKY99', '운영일지', 10, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (19, 'SKYLINE', 'SPT08', 'SPT08', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (20, 'SKYLINE', 'TST02', 'TST02', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (21, 'SKYLINE', 'TST03', 'TST03', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (22, 'SKYLINE', 'TST05', 'TST05', 0, FALSE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (23, 'SKYLINE-1', 'SKY03', '운영이슈관리', 0, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (24, 'SKYLINE-1', 'SKY04', '외부인터페이스', 3, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (25, 'SKYLINE-1', 'SKY05', 'FDT', 4, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (26, 'SKYLINE-1', 'SKY13', '기타', 5, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (27, 'SUPPORT', 'SPT03', '항공기상정보', 6, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (28, 'SUPPORT', 'SPT04', '데이터베이스', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (29, 'SUPPORT', 'SPT06', '통계시스템', 4, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (30, 'SUPPORT', 'SPT08', '사이트 매뉴얼', 7, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (31, 'SUPPORT', 'SPT09', '프로그램 TIP', 5, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (32, 'SUPPORT', 'SPT11', '일반업무', 8, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (33, 'SUPPORT', 'SPT13', '정보 노하우', 2, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (34, 'SUPPORT', 'SPT14', '쿼리 & 매크로', 3, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (35, 'TOPEN', 'TST01', 'A조(SKYLINE)', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (36, 'TOPEN', 'TST02', 'B조(AIDC)', 2, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (37, 'TOPEN', 'TST03', 'C조(EFW)', 3, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (38, 'TOPEN', 'TST04', 'D조(CSAT)', 4, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (39, 'TOPEN', 'TST05', '자료보관', 5, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (40, 'TOPEN', 'TST06', '외부교육', 6, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (41, 'GEN', 'GEN02', '참고자료', 2, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (42, 'SKYLINE-1', 'SKY11', '전산개발심의', 1, TRUE);
INSERT INTO skywatch_tech_doc_categories (id, project_code, category_code, name, sort_order, is_active) VALUES (43, 'SKYLINE-1', 'SKY12', 'SKYLINE 수정본', 2, TRUE);

-- skywatch_configs
INSERT INTO skywatch_configs (id, setting_key, setting_value, updated_at) VALUES (1, 'vector_model', 'kure-v1', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_configs (id, setting_key, setting_value, updated_at) VALUES (2, 'work_thread_candidates_decided', '{"관제사문의사항": "thread", "관제실문의사항": "thread"}', '2026-11-01 09:00:00+09');

-- skywatch_logs
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (1, 2, 2, 2, '2026-11-20', '주간', 'CPDLC 로그온 지연 문의 처리', '2026-11-20 08:40:00+09', '2026-11-20 17:30:00+09', FALSE, NULL, NULL, NULL, '{}');
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (2, 3, 3, 3, '2026-11-20', '야간', '레이더 데이터 처리기 이중화 점검', '2026-11-20 18:40:00+09', '2026-11-20 23:50:00+09', FALSE, NULL, NULL, NULL, '{}');
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (3, 4, 4, 4, '2026-11-21', '주간', 'Skyline 6.6i 시험 버전 설치', '2026-11-21 08:40:00+09', '2026-11-21 17:30:00+09', FALSE, NULL, NULL, NULL, '{}');
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (4, 5, 5, 5, '2026-11-21', '야간', 'AIDC 연동 메시지 지연 확인', '2026-11-21 18:40:00+09', '2026-11-21 23:50:00+09', FALSE, NULL, NULL, NULL, '{}');
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (5, 2, 2, 2, '2026-11-22', '주야', '주말 근무 — 특이사항 없음', '2026-11-22 08:40:00+09', '2026-11-22 17:30:00+09', FALSE, NULL, NULL, NULL, '{}');
INSERT INTO skywatch_logs (id, author_id, created_by, last_edited_by, date, shift_type, title, created_at, updated_at, is_deleted, deleted_by, deleted_at, source_seq, tags) VALUES (6, 1, 1, 1, '2026-11-24', '공지', '[공지] 12월 정기 안전점검 일정 안내', '2026-11-24 08:40:00+09', '2026-11-24 17:30:00+09', FALSE, NULL, NULL, NULL, '{}');

-- skywatch_log_cards
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (1, 1, 8, 0, 'CPDLC 로그온 지연 문의 (제주섹터 CWP#12)', '<p>(문의내용) 제주섹터에서 CPDLC 로그온 후 DL 표시가 1분 이상 늦게 나타남</p><p>(분석결과) 해당 시간대 데이터링크 서버 응답 지연 기록 확인, 항공기 측 재로그온 후 정상</p><p>(조치) 관제사에게 결과 안내, 같은 현상 반복 시 #card-3 참고</p>', 'done', 2, '2026-11-20 16:00:00+09', 2, '2026-11-20 16:00:00+09', 2, 2, '2026-11-20 10:00:00+09', '2026-11-20 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (2, 1, 9, 1, '전달사항 — 시험평가시스템 사용 예약', '<p>11/21(금) 09~12시 시험평가시스템 사용 예약됨. 다른 시험은 오후로 조정 바람.</p>', 'done', 2, '2026-11-20 16:00:00+09', 2, '2026-11-20 16:00:00+09', 2, 2, '2026-11-20 10:00:00+09', '2026-11-20 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (3, 2, 2, 0, '레이더 데이터 처리기(RDP) 이중화 절체 시험', '<p>야간 트래픽 적은 시간(02:10~02:25) 절체 시험 수행</p><table><tr><th>항목</th><th>결과</th></tr><tr><td>주→예비 절체</td><td>정상(3초)</td></tr><tr><td>예비→주 복귀</td><td>정상(4초)</td></tr></table>', 'done', 3, '2026-11-20 16:00:00+09', 3, '2026-11-20 16:00:00+09', 3, 3, '2026-11-20 10:00:00+09', '2026-11-20 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (4, 3, 1, 0, 'Skyline 6.6i 시험 버전 설치 (시험평가시스템)', '<p>시험평가시스템에 6.6i 시험 버전 설치 완료. PR 검증은 PR 메뉴 6.6i 버전에서 진행.</p><p>관련 문서 #TD:3</p>', 'in_progress', NULL, NULL, 4, '2026-11-21 16:00:00+09', 4, 4, '2026-11-21 10:00:00+09', '2026-11-21 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (5, 3, 5, 1, '월간 보안점검 결과 보고 상신', '<p>11월 보안점검 결과 보고서 상신 완료(전자결재).</p>', 'done', 4, '2026-11-21 16:00:00+09', 4, '2026-11-21 16:00:00+09', 4, 4, '2026-11-21 10:00:00+09', '2026-11-21 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (6, 4, 8, 0, 'AIDC 연동 메시지 지연 (후쿠오카 ACC)', '<p>(문의내용) 후쿠오카 ACC 로 보낸 CPL 메시지에 LAM 수신이 늦음</p><p>(분석결과) 상대 시스템 점검 시간과 겹침. 점검 종료 후 정상 확인</p>', 'done', 5, '2026-11-21 16:00:00+09', 5, '2026-11-21 16:00:00+09', 5, 5, '2026-11-21 10:00:00+09', '2026-11-21 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (7, 5, 6, 0, '주말 근무 특이사항 없음', '<p>시스템 상태 정상, 특이사항 없음.</p>', 'done', 2, '2026-11-22 16:00:00+09', 2, '2026-11-22 16:00:00+09', 2, 2, '2026-11-22 10:00:00+09', '2026-11-22 16:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_log_cards (id, log_id, category_id, position, title, content, status, completed_by, completed_at, status_changed_by, status_changed_at, created_by, last_edited_by, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (8, 6, 9, 0, '12월 정기 안전점검 일정', '<p>12/24(목) 주간 정기 안전점검 예정. 담당: 주간 근무조.</p>', 'done', 1, '2026-11-24 16:00:00+09', 1, '2026-11-24 16:00:00+09', 1, 1, '2026-11-24 10:00:00+09', '2026-11-24 16:00:00+09', FALSE, NULL, NULL);

-- skywatch_log_participants
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (1, 1, 2, 'primary', NULL, NULL);
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (2, 2, 3, 'primary', NULL, NULL);
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (3, 3, 4, 'primary', NULL, NULL);
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (4, 4, 5, 'primary', NULL, NULL);
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (5, 5, 2, 'primary', NULL, NULL);
INSERT INTO skywatch_log_participants (id, log_id, user_id, role, sub_for, note) VALUES (6, 6, 1, 'primary', NULL, NULL);

-- skywatch_log_reads
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (1, 3, '2026-11-24 09:10:00+09');
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (1, 4, '2026-11-24 09:10:00+09');
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (2, 2, '2026-11-24 09:10:00+09');
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (3, 5, '2026-11-24 09:10:00+09');
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (6, 2, '2026-11-24 09:10:00+09');
INSERT INTO skywatch_log_reads (log_id, user_id, read_at) VALUES (6, 3, '2026-11-24 09:10:00+09');

-- skywatch_log_acknowledgments
INSERT INTO skywatch_log_acknowledgments (log_id, user_id, acked_at) VALUES (6, 2, '2026-11-24 09:30:00+09');
INSERT INTO skywatch_log_acknowledgments (log_id, user_id, acked_at) VALUES (6, 3, '2026-11-24 09:30:00+09');
INSERT INTO skywatch_log_acknowledgments (log_id, user_id, acked_at) VALUES (6, 4, '2026-11-24 09:30:00+09');
INSERT INTO skywatch_log_acknowledgments (log_id, user_id, acked_at) VALUES (6, 5, '2026-11-24 09:30:00+09');
INSERT INTO skywatch_log_acknowledgments (log_id, user_id, acked_at) VALUES (6, 6, '2026-11-24 09:30:00+09');

-- skywatch_log_versions
INSERT INTO skywatch_log_versions (id, log_id, editor_id, snapshot_json, edited_at) VALUES (1, 1, 2, '{"title": "CPDLC 로그온 지연 문의", "cards": [1]}'::jsonb, '2026-11-20 11:00:00+09');
INSERT INTO skywatch_log_versions (id, log_id, editor_id, snapshot_json, edited_at) VALUES (2, 3, 4, '{"title": "Skyline 6.6i 설치", "cards": [4]}'::jsonb, '2026-11-21 13:00:00+09');

-- skywatch_comments
INSERT INTO skywatch_comments (id, log_id, author_id, parent_id, body, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (1, 1, 3, NULL, '같은 현상이 야간에도 한 번 있었습니다.', '2026-11-20 19:00:00+09', '2026-11-20 19:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_comments (id, log_id, author_id, parent_id, body, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (2, 1, 2, 1, '확인했습니다. 반복되면 제작사 문의하겠습니다.', '2026-11-21 08:50:00+09', '2026-11-21 08:50:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_comments (id, log_id, author_id, parent_id, body, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (3, 3, 6, NULL, '@이도윤 설치 결과 보고서 공유 부탁드립니다.', '2026-11-21 14:00:00+09', '2026-11-21 14:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_comments (id, log_id, author_id, parent_id, body, created_at, updated_at, is_deleted, deleted_by, deleted_at) VALUES (4, 6, 5, NULL, '일정 확인했습니다.', '2026-11-24 10:00:00+09', '2026-11-24 10:00:00+09', FALSE, NULL, NULL);

-- skywatch_comment_reactions
INSERT INTO skywatch_comment_reactions (comment_id, user_id, emoji, created_at) VALUES (1, 2, '👍', '2026-11-24 10:30:00+09');
INSERT INTO skywatch_comment_reactions (comment_id, user_id, emoji, created_at) VALUES (2, 3, '👍', '2026-11-24 10:30:00+09');
INSERT INTO skywatch_comment_reactions (comment_id, user_id, emoji, created_at) VALUES (3, 4, '✅', '2026-11-24 10:30:00+09');
INSERT INTO skywatch_comment_reactions (comment_id, user_id, emoji, created_at) VALUES (4, 1, '👍', '2026-11-24 10:30:00+09');

-- skywatch_card_links
INSERT INTO skywatch_card_links (id, source_card_id, target_card_id, created_by, created_at) VALUES (1, 1, 6, 2, '2026-11-21 20:00:00+09');
INSERT INTO skywatch_card_links (id, source_card_id, target_card_id, created_by, created_at) VALUES (2, 4, 3, 4, '2026-11-21 10:30:00+09');

-- skywatch_card_memos
INSERT INTO skywatch_card_memos (card_id, target_type, target_user_id, keep, keep_until, created_at) VALUES (2, 'next', NULL, 'shift', NULL, '2026-11-20 16:00:00+09');
INSERT INTO skywatch_card_memos (card_id, target_type, target_user_id, keep, keep_until, created_at) VALUES (4, 'user', 3, 'days', '2026-11-28', '2026-11-21 16:00:00+09');
INSERT INTO skywatch_card_memos (card_id, target_type, target_user_id, keep, keep_until, created_at) VALUES (8, 'card', NULL, 'checked', NULL, '2026-11-24 09:00:00+09');

-- skywatch_card_memo_checks
INSERT INTO skywatch_card_memo_checks (card_id, user_id, checked_at) VALUES (8, 2, '2026-11-24 09:40:00+09');
INSERT INTO skywatch_card_memo_checks (card_id, user_id, checked_at) VALUES (8, 3, '2026-11-24 09:40:00+09');

-- skywatch_attachments
INSERT INTO skywatch_attachments (id, owner_type, owner_id, original_name, file_path, file_name, file_size, mime_type, uploaded_by, created_at, is_deleted, content_text) VALUES (1, 'card', 3, 'RDP_절체시험_결과.txt', './uploads/sample_rdp_switch.txt', 'sample_rdp_switch.txt', 120, 'text/plain', 3, '2026-11-20 23:00:00+09', FALSE, 'RDP 절체 시험 결과 주→예비 3초 예비→주 4초 정상');
INSERT INTO skywatch_attachments (id, owner_type, owner_id, original_name, file_path, file_name, file_size, mime_type, uploaded_by, created_at, is_deleted, content_text) VALUES (2, 'card', 5, '11월_보안점검_결과.txt', './uploads/sample_security_check.txt', 'sample_security_check.txt', 116, 'text/plain', 4, '2026-11-21 15:00:00+09', FALSE, '11월 보안점검 결과 취약점 없음');

-- skywatch_work_threads
INSERT INTO skywatch_work_threads (id, kind, title, category_id, status, owner_id, started_on, closed_on, current_phase, recur_month, source_thread_id, created_by, created_at, updated_at, is_deleted) VALUES (1, 'thread', 'CPDLC 로그온 지연 문의', 8, 'done', 2, '2026-11-20', '2026-11-21', 0, NULL, NULL, 2, '2026-11-20 10:00:00+09', '2026-11-21 20:00:00+09', FALSE);
INSERT INTO skywatch_work_threads (id, kind, title, category_id, status, owner_id, started_on, closed_on, current_phase, recur_month, source_thread_id, created_by, created_at, updated_at, is_deleted) VALUES (2, 'thread', 'Skyline 6.6i 시험 버전 설치·검증', 1, 'open', 4, '2026-11-21', NULL, 0, NULL, NULL, 4, '2026-11-21 10:00:00+09', '2026-11-21 10:00:00+09', FALSE);
INSERT INTO skywatch_work_threads (id, kind, title, category_id, status, owner_id, started_on, closed_on, current_phase, recur_month, source_thread_id, created_by, created_at, updated_at, is_deleted) VALUES (3, 'project', '관제상황분석시스템 기능 추가', 3, 'open', 6, '2026-09-01', NULL, 1, NULL, NULL, 6, '2026-09-01 09:00:00+09', '2026-11-20 09:00:00+09', FALSE);
INSERT INTO skywatch_work_threads (id, kind, title, category_id, status, owner_id, started_on, closed_on, current_phase, recur_month, source_thread_id, created_by, created_at, updated_at, is_deleted) VALUES (4, 'thread', '월간 보안점검', 5, 'done', 4, '2026-11-21', '2026-11-21', 0, 11, NULL, 4, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', FALSE);
INSERT INTO skywatch_work_threads (id, kind, title, category_id, status, owner_id, started_on, closed_on, current_phase, recur_month, source_thread_id, created_by, created_at, updated_at, is_deleted) VALUES (5, 'thread', 'AIDC 연동 메시지 지연', 8, 'hold', 5, '2026-11-21', NULL, 0, NULL, NULL, 5, '2026-11-21 20:00:00+09', '2026-11-21 20:00:00+09', FALSE);

-- skywatch_work_thread_cards
INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin, linked_by, linked_at) VALUES (1, 1, 'new', 2, '2026-11-21 20:00:00+09');
INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin, linked_by, linked_at) VALUES (6, 1, 'manual', 2, '2026-11-21 20:00:00+09');
INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin, linked_by, linked_at) VALUES (4, 2, 'new', 4, '2026-11-21 20:00:00+09');
INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin, linked_by, linked_at) VALUES (5, 4, 'new', 4, '2026-11-21 20:00:00+09');
INSERT INTO skywatch_work_thread_cards (card_id, thread_id, origin, linked_by, linked_at) VALUES (3, 3, 'manual', 6, '2026-11-21 20:00:00+09');

-- skywatch_work_thread_phases
INSERT INTO skywatch_work_thread_phases (id, thread_id, seq, name, start_month, end_month) VALUES (1, 3, 0, '요구사항 정리', '2026-09', '2026-10');
INSERT INTO skywatch_work_thread_phases (id, thread_id, seq, name, start_month, end_month) VALUES (2, 3, 1, '개발·시험', '2026-11', '2026-12');

-- skywatch_inquiries — 가상 문의 (관제사·근무자 이름 가상)
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (1, 'H00001', '2026-11-20', '1012', '관제실(제주섹터)', 'skyline6.6h', 2, '김하늘', 'CPDLC', '로그온', '<p>(문의내용) CPDLC 로그온 후 DL 표시 지연</p><p>(분석결과) 데이터링크 서버 응답 지연, 재로그온 후 정상</p>', 'completed', '2026-11-20', NULL, NULL, 1, 1, '2026-11-20 17:00:00+09', '2026-11-20 17:00:00+09', 1, FALSE, NULL, NULL);
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (2, 'H00002', '2026-11-20', '2230', '관제실(팀장석)', 'skyline6.6h', 3, '박서준', 'Alert', 'STCA', '<p>(문의내용) 안전경보가 일부 감독관석에서만 울림</p><p>(답변) 감독관석은 섹터별로 경보 동작 범위가 나뉘어 있음을 안내</p>', 'completed', '2026-11-20', NULL, NULL, NULL, 1, '2026-11-20 17:00:00+09', '2026-11-20 17:00:00+09', 1, FALSE, NULL, NULL);
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (3, 'H00003', '2026-11-21', '0315', '관제실', 'skyline6.6h', 5, '최유나', 'AIDC', 'LAM', '<p>(문의내용) 후쿠오카 ACC 로 보낸 CPL 에 LAM 수신 지연</p><p>(분석결과) 상대 시스템 점검 시간과 겹침</p>', 'tracking', NULL, NULL, NULL, 6, 1, '2026-11-21 17:00:00+09', '2026-11-21 17:00:00+09', 1, FALSE, NULL, NULL);
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (4, 'H00004', '2026-11-22', '1405', '관제실(군산섹터)', 'skyline6.6h', 2, '김하늘', 'CWP', 'Warm Start', '<p>(문의내용) 미사용 CWP 에서 Warm Start 발생</p><p>(분석결과) 디스크 경고 로그 확인, 장비 점검 요청</p>', 'in_progress', NULL, NULL, NULL, NULL, 1, '2026-11-22 17:00:00+09', '2026-11-22 17:00:00+09', 1, FALSE, NULL, NULL);
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (5, 'H00005', '2026-11-23', '0920', '관제실(동해섹터)', 'skyline6.6h', 4, '이도윤', 'ADS-B', '코드 불일치', '<p>(문의내용) ADS-B 주소와 비행계획 코드가 달라 자동 연결 안 됨</p><p>(답변) 비행계획 수정 후 수동 연결 안내</p>', 'completed', '2026-11-23', NULL, NULL, NULL, 1, '2026-11-23 17:00:00+09', '2026-11-23 17:00:00+09', 1, FALSE, NULL, NULL);
INSERT INTO skywatch_inquiries (id, inquiry_no, occurred_date, occurred_time, controller_sector, sw_version, received_by, received_by_raw, category, keyword, content, status, completed_date, pr_no, note, card_id, created_by, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (6, 'H00006', '2026-11-24', '1630', '관제실', 'skyline6.6h', 6, '정민호', 'FDP', 'XFL', '<p>(문의내용) XFL 입력 후 데이터블럭에 반영되지 않음</p>', 'in_progress', NULL, NULL, NULL, NULL, 1, '2026-11-24 17:00:00+09', '2026-11-24 17:00:00+09', 1, FALSE, NULL, NULL);

-- skywatch_issues
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (1, 9001, 'I-2026-001', NULL, 'CPDLC Clearance 창에서 INS→DEL→SND 순서로 누르면 HCI Warm Start', '- I-2026-001: CPDLC Clearance 창에서 INS→DEL→SND 순서로 누르면 HCI Warm Start
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '진행중', 'I', 'CPDLC', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', NULL, NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (2, 9002, 'I-2026-002', NULL, '지연 수신 레이더의 Coast 방지를 위한 Sector Hold 최대값 변경', '- I-2026-002: 지연 수신 레이더의 Coast 방지를 위한 Sector Hold 최대값 변경
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '진행중', 'I', 'Sector Hold', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', NULL, NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (3, 9003, 'I-2026-003', 'LM-1203', 'AIDC CPL 재전송 시 LAM 타이머가 초기화되지 않음', '- I-2026-003: AIDC CPL 재전송 시 LAM 타이머가 초기화되지 않음
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '수정완료', 'I', 'AIDC', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', '2026-11-20', NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (4, 9004, 'I-2026-004', NULL, 'INSET 창 단축키로 Big DB 설정 시 Small DB 로 되돌아감', '- I-2026-004: INSET 창 단축키로 Big DB 설정 시 Small DB 로 되돌아감
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '반환', 'I', 'INSET', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', NULL, NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (5, 9005, 'I-2026-005', 'LM-1207', 'ADS-B 코드 불일치 항적의 자동 연결 규칙 개선', '- I-2026-005: ADS-B 코드 불일치 항적의 자동 연결 규칙 개선
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '진행중', 'I', 'ADS-B', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', NULL, NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);
INSERT INTO skywatch_issues (id, source_seq, kac_pr_no, lm_pr_no, title, content, status, acc_type, keyword, version, mod_version, reg_date, action_date, acc_pr, created_by, assigned_to, created_at, updated_at, last_edited_by, is_deleted, deleted_by, deleted_at) VALUES (6, 9006, 'D-2026-001', NULL, 'STCA 경보 이력 통계 화면 추가', '- D-2026-001: STCA 경보 이력 통계 화면 추가
. 문제 상황
 A. 재현 절차와 로그는 첨부 참고 (샘플)', '경고', 'D', 'STCA', 'skyline 6.6h', 'skyline 6.6i', '2026-11-01', NULL, NULL, 6, NULL, '2026-11-01 09:00:00+09', '2026-11-20 09:00:00+09', 6, FALSE, NULL, NULL);

-- skywatch_issue_comments
INSERT INTO skywatch_issue_comments (id, issue_id, content, is_certified, created_by, created_at, is_deleted) VALUES (1, 1, '제작사 수정방향 - 메시지 목록이 비었을 때 SND 버튼 비활성화', TRUE, 6, '2026-11-10 09:00:00+09', FALSE);
INSERT INTO skywatch_issue_comments (id, issue_id, content, is_certified, created_by, created_at, is_deleted) VALUES (2, 3, '6.6i 에서 수정 확인 (시험평가시스템)', TRUE, 4, '2026-11-21 09:00:00+09', FALSE);
INSERT INTO skywatch_issue_comments (id, issue_id, content, is_certified, created_by, created_at, is_deleted) VALUES (3, 4, 'PR 검토회의 결과 성능 이슈로 수정하지 않기로 함', FALSE, 1, '2026-11-12 09:00:00+09', FALSE);

-- skywatch_pr_batches
INSERT INTO skywatch_pr_batches (id, batch_no, sw_version, agreed_date, target_date, delivery_date, verified_date, status, summary, notes, created_by, created_at, updated_at, is_deleted, deleted_by, deleted_at, previous_version, skyline_version, adaptation_version, test_segment) VALUES (1, '20261121-1', '6.6i', '2026-11-21', NULL, NULL, NULL, '검증중', '6.6i PR 검증', NULL, 4, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', FALSE, NULL, NULL, '6.6h', '6.6i', 'ADP 6.6i-1', '시험평가시스템');
INSERT INTO skywatch_pr_batches (id, batch_no, sw_version, agreed_date, target_date, delivery_date, verified_date, status, summary, notes, created_by, created_at, updated_at, is_deleted, deleted_by, deleted_at, previous_version, skyline_version, adaptation_version, test_segment) VALUES (2, '20261001-1', '6.6h', '2026-10-01', NULL, NULL, '2026-10-20', '완료', '6.6h PR 검증', NULL, 6, '2026-10-01 09:00:00+09', '2026-10-20 09:00:00+09', FALSE, NULL, NULL, '6.6g', '6.6h', 'ADP 6.6h-2', '시험평가시스템');

-- skywatch_pr_batch_items
INSERT INTO skywatch_pr_batch_items (id, batch_id, issue_id, kac_pr_no, lm_pr_no, title, agreed_content, actual_fix, verify_method, item_status, sort_order, created_at, updated_at, item_kind) VALUES (1, 1, 1, 'I-2026-001', NULL, 'CPDLC Clearance 창에서 INS→DEL→SND 순서로 누르면 HCI Warm Start', '제작사 수정 방향대로 반영', NULL, '시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인', '대기', 1, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', '개별 PR');
INSERT INTO skywatch_pr_batch_items (id, batch_id, issue_id, kac_pr_no, lm_pr_no, title, agreed_content, actual_fix, verify_method, item_status, sort_order, created_at, updated_at, item_kind) VALUES (2, 1, 2, 'I-2026-002', NULL, '지연 수신 레이더의 Coast 방지를 위한 Sector Hold 최대값 변경', '제작사 수정 방향대로 반영', NULL, '시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인', '대기', 2, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', '개별 PR');
INSERT INTO skywatch_pr_batch_items (id, batch_id, issue_id, kac_pr_no, lm_pr_no, title, agreed_content, actual_fix, verify_method, item_status, sort_order, created_at, updated_at, item_kind) VALUES (3, 1, 3, 'I-2026-003', 'LM-1203', 'AIDC CPL 재전송 시 LAM 타이머가 초기화되지 않음', '제작사 수정 방향대로 반영', NULL, '시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인', '대기', 3, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', '개별 PR');
INSERT INTO skywatch_pr_batch_items (id, batch_id, issue_id, kac_pr_no, lm_pr_no, title, agreed_content, actual_fix, verify_method, item_status, sort_order, created_at, updated_at, item_kind) VALUES (4, 1, 5, 'I-2026-005', 'LM-1207', 'ADS-B 코드 불일치 항적의 자동 연결 규칙 개선', '제작사 수정 방향대로 반영', NULL, '시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인', '대기', 4, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', '개별 PR');
INSERT INTO skywatch_pr_batch_items (id, batch_id, issue_id, kac_pr_no, lm_pr_no, title, agreed_content, actual_fix, verify_method, item_status, sort_order, created_at, updated_at, item_kind) VALUES (5, 2, 4, 'I-2026-004', NULL, 'INSET 창 단축키로 Big DB 설정 시 Small DB 로 되돌아감', '제작사 수정 방향대로 반영', NULL, '시험평가시스템에서 재현 절차 수행 후 현상 미발생 확인', '대기', 5, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', '개별 PR');

-- skywatch_pr_verifications
INSERT INTO skywatch_pr_verifications (id, item_id, user_id, round_no, result, test_case_code, skyline_version, adaptation_version, tested_on, started_at, ended_at, verify_method, result_summary, notes, report_original_name, report_stored_name, report_file_size, report_uploaded_at, submitted_by, submitted_at, created_by, created_at, updated_at, is_deleted, approval_status, approved_by, approved_at, approval_note, source_import_id, test_segment, attendees) VALUES (1, 1, 2, 1, 'PASS', 'I-2026-001', '6.6i', 'ADP 6.6i-1', '2026-11-22', '2026-11-22 10:00:00+09', '2026-11-22 11:00:00+09', '재현 절차 수행', '<p>SND 버튼 비활성화 확인, Warm Start 미발생</p>', NULL, NULL, NULL, NULL, NULL, 2, '2026-11-22 11:30:00+09', 2, '2026-11-22 11:30:00+09', '2026-11-22 11:30:00+09', FALSE, '결재대기', NULL, NULL, NULL, NULL, '시험평가시스템', '김하늘, 박서준');
INSERT INTO skywatch_pr_verifications (id, item_id, user_id, round_no, result, test_case_code, skyline_version, adaptation_version, tested_on, started_at, ended_at, verify_method, result_summary, notes, report_original_name, report_stored_name, report_file_size, report_uploaded_at, submitted_by, submitted_at, created_by, created_at, updated_at, is_deleted, approval_status, approved_by, approved_at, approval_note, source_import_id, test_segment, attendees) VALUES (2, 2, 3, 1, 'PASS', 'I-2026-002', '6.6i', 'ADP 6.6i-1', '2026-11-22', '2026-11-22 10:00:00+09', '2026-11-22 11:00:00+09', '재현 절차 수행', '<p>Sector Hold 최대값 변경 확인</p>', NULL, NULL, NULL, NULL, NULL, 3, '2026-11-22 11:30:00+09', 3, '2026-11-22 11:30:00+09', '2026-11-22 11:30:00+09', FALSE, '결재대기', NULL, NULL, NULL, NULL, '시험평가시스템', '박서준');
INSERT INTO skywatch_pr_verifications (id, item_id, user_id, round_no, result, test_case_code, skyline_version, adaptation_version, tested_on, started_at, ended_at, verify_method, result_summary, notes, report_original_name, report_stored_name, report_file_size, report_uploaded_at, submitted_by, submitted_at, created_by, created_at, updated_at, is_deleted, approval_status, approved_by, approved_at, approval_note, source_import_id, test_segment, attendees) VALUES (3, 3, 4, 1, '보류', 'I-2026-003', '6.6i', 'ADP 6.6i-1', '2026-11-22', '2026-11-22 10:00:00+09', '2026-11-22 11:00:00+09', '재현 절차 수행', '<p>상대 시스템 연동 시험 필요</p>', NULL, NULL, NULL, NULL, NULL, 4, '2026-11-22 11:30:00+09', 4, '2026-11-22 11:30:00+09', '2026-11-22 11:30:00+09', FALSE, '결재대기', NULL, NULL, NULL, NULL, '시험평가시스템', '이도윤');
INSERT INTO skywatch_pr_verifications (id, item_id, user_id, round_no, result, test_case_code, skyline_version, adaptation_version, tested_on, started_at, ended_at, verify_method, result_summary, notes, report_original_name, report_stored_name, report_file_size, report_uploaded_at, submitted_by, submitted_at, created_by, created_at, updated_at, is_deleted, approval_status, approved_by, approved_at, approval_note, source_import_id, test_segment, attendees) VALUES (4, 4, 5, 1, '미제출', 'I-2026-005', '6.6i', 'ADP 6.6i-1', '2026-11-22', '2026-11-22 10:00:00+09', '2026-11-22 11:00:00+09', '재현 절차 수행', '<p></p>', NULL, NULL, NULL, NULL, NULL, 5, '2026-11-22 11:30:00+09', 5, '2026-11-22 11:30:00+09', '2026-11-22 11:30:00+09', FALSE, '결재대기', NULL, NULL, NULL, NULL, '시험평가시스템', NULL);

-- skywatch_pr_batch_attachments — 파일 본체는 없음 (목록 표시용)
INSERT INTO skywatch_pr_batch_attachments (id, batch_id, doc_type, original_name, stored_name, file_size, uploaded_by, uploaded_at, is_deleted) VALUES (1, 1, '기준 엑셀', 'PR목록_Skyline_6_6i.xlsx', 'sample_pr_list.xlsx', 0, 4, '2026-11-21 09:00:00+09', FALSE);
INSERT INTO skywatch_pr_batch_attachments (id, batch_id, doc_type, original_name, stored_name, file_size, uploaded_by, uploaded_at, is_deleted) VALUES (2, 1, '기타', '시험 결과.txt', 'sample_pr_result.txt', 0, 4, '2026-11-22 09:00:00+09', FALSE);

-- skywatch_pr_workbook_imports
INSERT INTO skywatch_pr_workbook_imports (id, batch_id, user_id, original_name, stored_name, file_size, file_hash, imported_items, uploaded_at, updated_at) VALUES (1, 1, 3, '시험확인서_Skyline_6_6i_B조.xlsm', 'sample_workbook.xlsm', 0, 'sample', 1, '2026-11-22 09:00:00+09', '2026-11-22 09:00:00+09');

-- skywatch_tech_docs
INSERT INTO skywatch_tech_docs (id, legacy_seq, record_date, project_code, category_code, title, content, summary, detail_summary, doc_type, adapt_version, service_date, reference, orig_user_id, author_id, created_at, updated_at, created_by, last_edited_by, is_deleted) VALUES (1, NULL, '2026-11-21', 'GEN', 'GEN01', '2026년 11월 4주차 주간회의자료', '<p>① CPDLC 통계 프로그램 운영<br> - 로그인 성공·실패, 고도/항로 변경 건수</p><p>② 12월 정기 안전점검 계획</p>', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, '2026-11-21 09:00:00+09', '2026-11-21 09:00:00+09', 6, 6, FALSE);
INSERT INTO skywatch_tech_docs (id, legacy_seq, record_date, project_code, category_code, title, content, summary, detail_summary, doc_type, adapt_version, service_date, reference, orig_user_id, author_id, created_at, updated_at, created_by, last_edited_by, is_deleted) VALUES (2, NULL, '2026-11-22', 'SKYLINE', 'SKY04', 'DVS (Display Volume Suppression) 설정 방법', '<p>설정 위치: CWP - Sup - System Settings - Display Volume Suppression</p><p>최근 관련 문의 #LOG:1</p>', NULL, NULL, '항적', NULL, NULL, NULL, NULL, 6, '2026-11-22 09:00:00+09', '2026-11-22 09:00:00+09', 6, 6, FALSE);
INSERT INTO skywatch_tech_docs (id, legacy_seq, record_date, project_code, category_code, title, content, summary, detail_summary, doc_type, adapt_version, service_date, reference, orig_user_id, author_id, created_at, updated_at, created_by, last_edited_by, is_deleted) VALUES (3, NULL, '2026-11-23', 'SKYLINE', 'SKY04', 'Skyline 6.6i 설치 절차서', '<ol><li>설치 전 백업</li><li>패키지 반입·무결성 확인</li><li>시험평가시스템 설치 후 기능 점검</li></ol>', NULL, NULL, '절차서', '6.6i', NULL, NULL, NULL, 6, '2026-11-23 09:00:00+09', '2026-11-23 09:00:00+09', 6, 6, FALSE);
INSERT INTO skywatch_tech_docs (id, legacy_seq, record_date, project_code, category_code, title, content, summary, detail_summary, doc_type, adapt_version, service_date, reference, orig_user_id, author_id, created_at, updated_at, created_by, last_edited_by, is_deleted) VALUES (4, NULL, '2026-11-24', 'SECURITY', 'SEC', '2026년 11월 보안점검 결과', '<p>주요정보통신기반시설 점검 항목 기준, 취약점 없음.</p>', NULL, NULL, '보안취약점', NULL, NULL, NULL, NULL, 6, '2026-11-24 09:00:00+09', '2026-11-24 09:00:00+09', 6, 6, FALSE);
INSERT INTO skywatch_tech_docs (id, legacy_seq, record_date, project_code, category_code, title, content, summary, detail_summary, doc_type, adapt_version, service_date, reference, orig_user_id, author_id, created_at, updated_at, created_by, last_edited_by, is_deleted) VALUES (5, NULL, '2026-11-25', 'SUPPORT', 'SPT03', 'AIDC 메시지 흐름 정리', '<p>CPL → LAM, 미수신 시 재전송 타이머 동작 설명</p>', NULL, NULL, 'AIDC', NULL, NULL, NULL, NULL, 6, '2026-11-25 09:00:00+09', '2026-11-25 09:00:00+09', 6, 6, FALSE);

-- skywatch_tech_doc_attachments — 파일 본체는 없음 (목록 표시용)
INSERT INTO skywatch_tech_doc_attachments (id, tech_doc_id, legacy_doc_seq, original_name, stored_name, file_extension, content_text, reg_date, uploaded_by, created_at, is_deleted) VALUES (1, 3, NULL, '설치절차서_6.6i.hwp', 'sample_install.hwp', 'hwp', NULL, '2026-11-23', 6, '2026-11-23 09:00:00+09', FALSE);
INSERT INTO skywatch_tech_doc_attachments (id, tech_doc_id, legacy_doc_seq, original_name, stored_name, file_extension, content_text, reg_date, uploaded_by, created_at, is_deleted) VALUES (2, 4, NULL, '보안점검_결과.pdf', 'sample_security.pdf', 'pdf', NULL, '2026-11-24', 6, '2026-11-24 09:00:00+09', FALSE);

-- skywatch_notifications
INSERT INTO skywatch_notifications (id, user_id, type, ref_type, ref_id, body, read_at, created_at) VALUES (1, 3, 'new_log', 'log', 1, '[새 일지] 김하늘님이 2026-11-20 주간 일지를 작성했습니다.', NULL, '2026-11-20 17:00:00+09');
INSERT INTO skywatch_notifications (id, user_id, type, ref_type, ref_id, body, read_at, created_at) VALUES (2, 2, 'comment', 'log', 1, '박서준님이 댓글을 남겼습니다.', '2026-11-21 08:45:00+09', '2026-11-20 19:00:00+09');
INSERT INTO skywatch_notifications (id, user_id, type, ref_type, ref_id, body, read_at, created_at) VALUES (3, 4, 'mention', 'log', 3, '정민호님이 회원님을 언급했습니다.', NULL, '2026-11-21 14:00:00+09');
INSERT INTO skywatch_notifications (id, user_id, type, ref_type, ref_id, body, read_at, created_at) VALUES (4, 2, 'card', 'card', 4, '이도윤님이 카드를 수정했습니다.', NULL, '2026-11-21 16:00:00+09');
INSERT INTO skywatch_notifications (id, user_id, type, ref_type, ref_id, body, read_at, created_at) VALUES (5, 5, 'task', 'task', 1, '[업무] 12월 정기 안전점검', NULL, '2026-11-24 09:00:00+09');

-- skywatch_tasks
INSERT INTO skywatch_tasks (id, title, body, due_date, importance, sender_id, recipients, recipients_mode, target_teams, completed_by, linked_card_id, created_at, updated_at, is_deleted, deleted_by, deleted_at, is_archived, archived_at) VALUES (1, '12월 정기 안전점검', '정기 안전점검 수행 후 결과 문서 상신', '2026-12-24 18:00:00+09', 'high', 1, '[1, 2, 3, 4, 5, 6]'::jsonb, 'all', '[]'::jsonb, '[]'::jsonb, 8, '2026-11-24 09:00:00+09', '2026-11-24 09:00:00+09', FALSE, NULL, NULL, FALSE, NULL);
INSERT INTO skywatch_tasks (id, title, body, due_date, importance, sender_id, recipients, recipients_mode, target_teams, completed_by, linked_card_id, created_at, updated_at, is_deleted, deleted_by, deleted_at, is_archived, archived_at) VALUES (2, '6.6i PR 검증 결과 입력', '담당 PR 검증 결과를 PR 메뉴에 입력', '2026-11-28 18:00:00+09', 'normal', 6, '[2, 3, 4, 5]'::jsonb, 'teams', '["A", "B", "C", "D"]'::jsonb, '[2, 3]'::jsonb, NULL, '2026-11-21 09:00:00+09', '2026-11-22 09:00:00+09', FALSE, NULL, NULL, FALSE, NULL);
INSERT INTO skywatch_tasks (id, title, body, due_date, importance, sender_id, recipients, recipients_mode, target_teams, completed_by, linked_card_id, created_at, updated_at, is_deleted, deleted_by, deleted_at, is_archived, archived_at) VALUES (3, '근무편성표 확인', '12월 근무편성 확인 바랍니다.', NULL, 'low', 1, '[6]'::jsonb, 'individual', '[]'::jsonb, '[6]'::jsonb, NULL, '2026-11-25 09:00:00+09', '2026-11-25 09:00:00+09', FALSE, NULL, NULL, FALSE, NULL);

-- skywatch_recurring_task_templates
INSERT INTO skywatch_recurring_task_templates (id, name, frequency, run_at_time, days_of_week, day_of_month, run_once_date, template_content, target_teams, target_shift_types, next_run_at, last_run_at, is_active, created_by, created_at) VALUES (1, '정기 안전점검', 'monthly', NULL, '[]'::jsonb, 24, NULL, '{"title": "정기 안전점검", "body": "정기 안전점검 수행\n- 문서 상신"}'::jsonb, '[]'::jsonb, '["주간"]'::jsonb, '2026-12-24 08:00:00+09', '2026-11-24 08:00:00+09', TRUE, 1, '2026-01-02 09:00:00+09');
INSERT INTO skywatch_recurring_task_templates (id, name, frequency, run_at_time, days_of_week, day_of_month, run_once_date, template_content, target_teams, target_shift_types, next_run_at, last_run_at, is_active, created_by, created_at) VALUES (2, '주간 백업 확인', 'weekly', '09:00', '["월"]'::jsonb, NULL, NULL, '{"title": "주간 백업 확인", "body": "DB 백업 파일 생성 여부 확인"}'::jsonb, '[]'::jsonb, '["주간"]'::jsonb, '2026-11-30 09:00:00+09', NULL, TRUE, 1, '2026-01-02 09:00:00+09');

-- skywatch_shift_data — shift_code 'AB' = 주간 A조, 야간 B조
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-20', '[]'::jsonb, 'AB', NULL, '2026-11-20');
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-21', '[]'::jsonb, 'CD', NULL, '2026-11-21');
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-22', '["주말"]'::jsonb, 'AB', NULL, '2026-11-22');
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-23', '[]'::jsonb, 'CD', NULL, '2026-11-23');
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-24', '["안전점검"]'::jsonb, 'AB', NULL, '2026-11-24');
INSERT INTO skywatch_shift_data (date, memo, shift_code, repeat_type, data_date) VALUES ('2026-11-25', '[]'::jsonb, 'CD', NULL, '2026-11-25');

-- skywatch_shift_staff_master
INSERT INTO skywatch_shift_staff_master (id, name, emp_no, grade, shift, from_date, to_date, no_excel) VALUES (2, '김하늘', 1002, '6급', 'A', '2024-03-01', NULL, FALSE);
INSERT INTO skywatch_shift_staff_master (id, name, emp_no, grade, shift, from_date, to_date, no_excel) VALUES (3, '박서준', 1003, '6급', 'B', '2024-03-01', NULL, FALSE);
INSERT INTO skywatch_shift_staff_master (id, name, emp_no, grade, shift, from_date, to_date, no_excel) VALUES (4, '이도윤', 1004, '6급', 'C', '2024-03-01', NULL, FALSE);
INSERT INTO skywatch_shift_staff_master (id, name, emp_no, grade, shift, from_date, to_date, no_excel) VALUES (5, '최유나', 1005, '6급', 'D', '2024-03-01', NULL, FALSE);
INSERT INTO skywatch_shift_staff_master (id, name, emp_no, grade, shift, from_date, to_date, no_excel) VALUES (6, '정민호', 1006, '5급', 'day', '2024-03-01', NULL, FALSE);

-- skywatch_shift_staff_memos
INSERT INTO skywatch_shift_staff_memos (id, date, user_id, memo_type, memo_text, created_at, updated_at) VALUES (1, '2026-11-24', 1, 'M0000', '안전점검', '2026-11-01 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_shift_staff_memos (id, date, user_id, memo_type, memo_text, created_at, updated_at) VALUES (2, '2026-11-25', 3, '연차', '개인 사유', '2026-11-10 09:00:00+09', '2026-11-10 09:00:00+09');
INSERT INTO skywatch_shift_staff_memos (id, date, user_id, memo_type, memo_text, created_at, updated_at) VALUES (3, '2026-11-26', 4, '교육', '관제시스템 보수교육', '2026-11-10 09:00:00+09', '2026-11-10 09:00:00+09');
INSERT INTO skywatch_shift_staff_memos (id, date, user_id, memo_type, memo_text, created_at, updated_at) VALUES (4, '2026-11-27', 5, '대체', '박서준 대신 근무', '2026-11-12 09:00:00+09', '2026-11-12 09:00:00+09');
INSERT INTO skywatch_shift_staff_memos (id, date, user_id, memo_type, memo_text, created_at, updated_at) VALUES (5, '2026-11-25', 6, 'home_일근', '{"user_ids": [6], "leave_ids": [], "temp_names": []}', '2026-11-12 09:00:00+09', '2026-11-12 09:00:00+09');

-- skywatch_shift_notices
INSERT INTO skywatch_shift_notices (id, text, start_date, end_date, created_by, created_at, deleted_at) VALUES (1, '12/24 정기 안전점검 — 주간조 참석', '2026-11-24', '2026-12-24', 1, '2026-11-24 09:00:00+09', NULL);
INSERT INTO skywatch_shift_notices (id, text, start_date, end_date, created_by, created_at, deleted_at) VALUES (2, '시험평가시스템 사용 시 PR 메뉴에 예약 기록', '2026-11-20', '2026-11-30', 6, '2026-11-20 09:00:00+09', NULL);

-- skywatch_shift_overrides
INSERT INTO skywatch_shift_overrides (id, date, original_user_id, actual_user_id, type, swap_group_id, approved_by, note, created_at) VALUES (1, '2026-11-27', 3, 5, 'substitution', NULL, 1, '교육 참석', '2026-11-12 09:00:00+09');
INSERT INTO skywatch_shift_overrides (id, date, original_user_id, actual_user_id, type, swap_group_id, approved_by, note, created_at) VALUES (2, '2026-11-28', 2, 4, 'swap', '7d3f6a1e-0b1c-4c55-9a8e-2f1b3c4d5e6f', 1, '근무 교환', '2026-11-12 09:00:00+09');

-- skywatch_shift_carry_over
INSERT INTO skywatch_shift_carry_over (id, user_id, entry_type, entry_date, shift_type, hours, note, created_at) VALUES (1, 2, 'earned', '2026-11-22', '주야', 8, '주말 근무', '2026-11-22 09:00:00+09');
INSERT INTO skywatch_shift_carry_over (id, user_id, entry_type, entry_date, shift_type, hours, note, created_at) VALUES (2, 2, 'used', '2026-11-26', '주간', 8, '대휴', '2026-11-23 09:00:00+09');
INSERT INTO skywatch_shift_carry_over (id, user_id, entry_type, entry_date, shift_type, hours, note, created_at) VALUES (3, 3, 'earned', '2026-11-20', '야간', 4, '연장 근무', '2026-11-21 09:00:00+09');

-- skywatch_shift_carry_raw
INSERT INTO skywatch_shift_carry_raw (id, year, name, hours) VALUES (1, '2026', '김하늘', 16);
INSERT INTO skywatch_shift_carry_raw (id, year, name, hours) VALUES (2, '2026', '박서준', 4);
INSERT INTO skywatch_shift_carry_raw (id, year, name, hours) VALUES (3, '2026', '이도윤', 0);
INSERT INTO skywatch_shift_carry_raw (id, year, name, hours) VALUES (4, '2026', '최유나', 8);

-- skywatch_leave_requests
INSERT INTO skywatch_leave_requests (id, user_id, date_from, date_to, reason, status, approved_by, created_at) VALUES (1, 3, '2026-11-25', '2026-11-25', '개인 사유', 'approved', 1, '2026-11-10 09:00:00+09');
INSERT INTO skywatch_leave_requests (id, user_id, date_from, date_to, reason, status, approved_by, created_at) VALUES (2, 5, '2026-12-10', '2026-12-11', '가족 행사', 'pending', NULL, '2026-11-25 09:00:00+09');

-- skywatch_schedules
INSERT INTO skywatch_schedules (id, team, date, shift_type, capacity, created_by, created_at) VALUES (1, 'A', '2026-11-21', '주간', 3, 1, '2026-11-01 09:00:00+09');
INSERT INTO skywatch_schedules (id, team, date, shift_type, capacity, created_by, created_at) VALUES (2, 'B', '2026-11-22', '야간', 3, 1, '2026-11-01 09:00:00+09');
INSERT INTO skywatch_schedules (id, team, date, shift_type, capacity, created_by, created_at) VALUES (3, 'C', '2026-11-23', '주간', 3, 1, '2026-11-01 09:00:00+09');
INSERT INTO skywatch_schedules (id, team, date, shift_type, capacity, created_by, created_at) VALUES (4, 'D', '2026-11-24', '야간', 3, 1, '2026-11-01 09:00:00+09');
INSERT INTO skywatch_schedules (id, team, date, shift_type, capacity, created_by, created_at) VALUES (5, 'day', '2026-11-25', '주간', 3, 1, '2026-11-01 09:00:00+09');

-- skywatch_commute_months
INSERT INTO skywatch_commute_months (id, ym, file_name, row_count, rows, uploaded_by, uploaded_at) VALUES (1, '2026-10', 'sample_근태_2026-10.xlsx', 3, '[{"name": "김하늘", "d": 1, "sched": "주간", "daily": "", "holi": "", "duty": "", "attend": "출근"}, {"name": "김하늘", "d": 2, "sched": "야간", "daily": "", "holi": "", "duty": "", "attend": "출근"}, {"name": "박서준", "d": 1, "sched": "비번", "daily": "", "holi": "", "duty": "", "attend": ""}]'::jsonb, 1, '2026-11-02 09:00:00+09');

-- skywatch_search_suggestions
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (1, 'cpdlc 로그온', 7, 120, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (2, '데이터블럭', 3, 466, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (3, 'aidc lam', 5, 88, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (4, 'warm start', 4, 64, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (5, 'ads-b 코드 불일치', 2, 31, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');
INSERT INTO skywatch_search_suggestions (id, query_text, search_count, result_count, last_searched_at, created_at) VALUES (6, '안전점검', 6, 52, '2026-11-24 09:00:00+09', '2026-11-01 09:00:00+09');

-- skywatch_reindex_jobs
INSERT INTO skywatch_reindex_jobs (id, job_id, model_name, status, total_logs, processed_logs, progress_percent, error_message, started_at, completed_at, created_at) VALUES (1, '00000000-0000-4000-8000-000000000001', 'kure-v1', 'completed', 6, 6, 100, NULL, '2026-11-25 02:00:00+09', '2026-11-25 02:01:00+09', '2026-11-25 02:00:00+09');

-- skywatch_backup_logs
INSERT INTO skywatch_backup_logs (id, action, status, filename, file_size_bytes, error_message, performed_by, created_at, is_deleted, deleted_at, deleted_by) VALUES (1, 'backup', 'success', 'skywatch_20261120_0300.backup', 1048576, NULL, 1, '2026-11-20 03:00:00+09', FALSE, NULL, NULL);
INSERT INTO skywatch_backup_logs (id, action, status, filename, file_size_bytes, error_message, performed_by, created_at, is_deleted, deleted_at, deleted_by) VALUES (2, 'backup', 'failure', NULL, NULL, 'pg_dump 경로를 찾을 수 없습니다 (.env 의 PG_DUMP_PATH 확인)', 1, '2026-11-21 03:00:00+09', FALSE, NULL, NULL);

-- 시퀀스
SELECT setval(pg_get_serial_sequence('skywatch_users', 'id'), (SELECT MAX(id) FROM skywatch_users));
SELECT setval(pg_get_serial_sequence('skywatch_card_categories', 'id'), (SELECT MAX(id) FROM skywatch_card_categories));
SELECT setval(pg_get_serial_sequence('skywatch_card_statuses', 'id'), (SELECT MAX(id) FROM skywatch_card_statuses));
SELECT setval(pg_get_serial_sequence('skywatch_tech_doc_categories', 'id'), (SELECT MAX(id) FROM skywatch_tech_doc_categories));
SELECT setval(pg_get_serial_sequence('skywatch_configs', 'id'), (SELECT MAX(id) FROM skywatch_configs));
SELECT setval(pg_get_serial_sequence('skywatch_logs', 'id'), (SELECT MAX(id) FROM skywatch_logs));
SELECT setval(pg_get_serial_sequence('skywatch_log_cards', 'id'), (SELECT MAX(id) FROM skywatch_log_cards));
SELECT setval(pg_get_serial_sequence('skywatch_log_participants', 'id'), (SELECT MAX(id) FROM skywatch_log_participants));
SELECT setval(pg_get_serial_sequence('skywatch_log_versions', 'id'), (SELECT MAX(id) FROM skywatch_log_versions));
SELECT setval(pg_get_serial_sequence('skywatch_comments', 'id'), (SELECT MAX(id) FROM skywatch_comments));
SELECT setval(pg_get_serial_sequence('skywatch_card_links', 'id'), (SELECT MAX(id) FROM skywatch_card_links));
SELECT setval(pg_get_serial_sequence('skywatch_attachments', 'id'), (SELECT MAX(id) FROM skywatch_attachments));
SELECT setval(pg_get_serial_sequence('skywatch_work_threads', 'id'), (SELECT MAX(id) FROM skywatch_work_threads));
SELECT setval(pg_get_serial_sequence('skywatch_work_thread_phases', 'id'), (SELECT MAX(id) FROM skywatch_work_thread_phases));
SELECT setval(pg_get_serial_sequence('skywatch_inquiries', 'id'), (SELECT MAX(id) FROM skywatch_inquiries));
SELECT setval(pg_get_serial_sequence('skywatch_issues', 'id'), (SELECT MAX(id) FROM skywatch_issues));
SELECT setval(pg_get_serial_sequence('skywatch_issue_comments', 'id'), (SELECT MAX(id) FROM skywatch_issue_comments));
SELECT setval(pg_get_serial_sequence('skywatch_pr_batches', 'id'), (SELECT MAX(id) FROM skywatch_pr_batches));
SELECT setval(pg_get_serial_sequence('skywatch_pr_batch_items', 'id'), (SELECT MAX(id) FROM skywatch_pr_batch_items));
SELECT setval(pg_get_serial_sequence('skywatch_pr_verifications', 'id'), (SELECT MAX(id) FROM skywatch_pr_verifications));
SELECT setval(pg_get_serial_sequence('skywatch_pr_batch_attachments', 'id'), (SELECT MAX(id) FROM skywatch_pr_batch_attachments));
SELECT setval(pg_get_serial_sequence('skywatch_pr_workbook_imports', 'id'), (SELECT MAX(id) FROM skywatch_pr_workbook_imports));
SELECT setval(pg_get_serial_sequence('skywatch_tech_docs', 'id'), (SELECT MAX(id) FROM skywatch_tech_docs));
SELECT setval(pg_get_serial_sequence('skywatch_tech_doc_attachments', 'id'), (SELECT MAX(id) FROM skywatch_tech_doc_attachments));
SELECT setval(pg_get_serial_sequence('skywatch_notifications', 'id'), (SELECT MAX(id) FROM skywatch_notifications));
SELECT setval(pg_get_serial_sequence('skywatch_tasks', 'id'), (SELECT MAX(id) FROM skywatch_tasks));
SELECT setval(pg_get_serial_sequence('skywatch_recurring_task_templates', 'id'), (SELECT MAX(id) FROM skywatch_recurring_task_templates));
SELECT setval(pg_get_serial_sequence('skywatch_shift_staff_master', 'id'), (SELECT MAX(id) FROM skywatch_shift_staff_master));
SELECT setval(pg_get_serial_sequence('skywatch_shift_staff_memos', 'id'), (SELECT MAX(id) FROM skywatch_shift_staff_memos));
SELECT setval(pg_get_serial_sequence('skywatch_shift_notices', 'id'), (SELECT MAX(id) FROM skywatch_shift_notices));
SELECT setval(pg_get_serial_sequence('skywatch_shift_overrides', 'id'), (SELECT MAX(id) FROM skywatch_shift_overrides));
SELECT setval(pg_get_serial_sequence('skywatch_shift_carry_over', 'id'), (SELECT MAX(id) FROM skywatch_shift_carry_over));
SELECT setval(pg_get_serial_sequence('skywatch_shift_carry_raw', 'id'), (SELECT MAX(id) FROM skywatch_shift_carry_raw));
SELECT setval(pg_get_serial_sequence('skywatch_leave_requests', 'id'), (SELECT MAX(id) FROM skywatch_leave_requests));
SELECT setval(pg_get_serial_sequence('skywatch_schedules', 'id'), (SELECT MAX(id) FROM skywatch_schedules));
SELECT setval(pg_get_serial_sequence('skywatch_commute_months', 'id'), (SELECT MAX(id) FROM skywatch_commute_months));
SELECT setval(pg_get_serial_sequence('skywatch_search_suggestions', 'id'), (SELECT MAX(id) FROM skywatch_search_suggestions));
SELECT setval(pg_get_serial_sequence('skywatch_reindex_jobs', 'id'), (SELECT MAX(id) FROM skywatch_reindex_jobs));
SELECT setval(pg_get_serial_sequence('skywatch_backup_logs', 'id'), (SELECT MAX(id) FROM skywatch_backup_logs));

COMMIT;
