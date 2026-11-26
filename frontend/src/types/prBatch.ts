export type PrBatchStatus = '합의중' | '수정중' | '납품대기' | '검증중' | '완료' | '취소';
export type PrBatchItemStatus = '대기' | '수정완료' | '반환' | '보류';
export type PrBatchDocType = '기준 엑셀' | 'PR목록' | '제작사 절차서' | '테스트절차' | '수정문서' | '합의서' | '납품문서' | '검증결과' | '기타';
export type PrBatchItemKind = '기본기능' | '수정사항 연동' | '개별 PR';
export type PrJudgment = '미판정' | 'PASS' | 'REJECT' | '보류' | '제외';
export type PrVerificationResult = PrJudgment | '미제출' | '검증중';
export const PR_JUDGMENTS: PrJudgment[] = ['미판정', 'PASS', 'REJECT', '보류', '제외'];

/** 버전에 한 번 적어 두는 검증 보고서 공통값 — 보고서 입력창·엑셀 업로드의 기본값 */
export interface PrReportDefaults {
  skyline_version: string | null;
  adaptation_version: string | null;
  test_segment: string | null;
}

export interface PrBatchListItem extends PrReportDefaults {
  id: number;
  batch_no: string;
  sw_version: string;
  previous_version: string | null;
  agreed_date: string;
  target_date: string | null;
  delivery_date: string | null;
  verified_date: string | null;
  status: PrBatchStatus;
  summary: string | null;
  item_count: number;
  done_count: number;
  attachment_count: number;
  verification_count: number;
  verified_item_count: number;
  reject_count: number;
}

export interface PrBatchItem {
  id: number;
  batch_id: number;
  issue_id: number | null;
  item_kind: PrBatchItemKind;
  kac_pr_no: string | null;
  lm_pr_no: string | null;
  title: string;
  agreed_content: string | null;
  actual_fix: string | null;
  verify_method: string | null;
  issue_content?: string | null;  // 연결된 개별 PR 의 상세 내용 (조회 전용)
  item_status: PrBatchItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PrBatchAttachment {
  id: number;
  batch_id: number;
  doc_type: PrBatchDocType;
  original_name: string;
  stored_name: string;
  file_size: number | null;
  uploaded_by: number | null;
  uploaded_at: string;
}

export interface PrWorkbookImport {
  id: number;
  user_id: number;
  user_name: string;
  original_name: string;
  file_size: number;
  file_hash: string;
  imported_items: number;
  uploaded_at: string;
}

export interface PrVerification {
  id: number;
  item_id: number;
  user_id: number;
  user_name: string | null;
  user_team: string | null;
  round_no: number;
  result: PrVerificationResult;
  test_case_code: string | null;
  skyline_version: string | null;
  adaptation_version: string | null;
  test_segment: string | null;
  attendees: string | null;
  tested_on: string | null;
  started_at: string | null;
  ended_at: string | null;
  report_original_name: string | null;
  report_file_size: number | null;
  report_uploaded_at: string | null;
  submitted_at: string | null;
  source_import_id: number | null;
  created_by: number | null;
  created_at: string;
}

export interface PrBatch extends PrReportDefaults {
  id: number;
  batch_no: string;
  sw_version: string;
  previous_version: string | null;
  agreed_date: string;
  target_date: string | null;
  delivery_date: string | null;
  verified_date: string | null;
  status: PrBatchStatus;
  summary: string | null;
  notes: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  items: PrBatchItem[];
  attachments: PrBatchAttachment[];
  verifications: PrVerification[];
  workbook_imports: PrWorkbookImport[];
}

export interface PrVerificationDetail extends PrVerificationSave {
  id: number;
  item_id: number;
  user_id: number;
}

export interface PrVerificationSave {
  result: PrJudgment;
  skyline_version: string | null;
  adaptation_version: string | null;
  test_segment: string | null;
  attendees: string | null;
  tested_on: string | null;
  started_at: string | null;
  ended_at: string | null;
  verify_method: string | null;
  result_summary: string | null;
  notes: string | null;
}

export interface PrBatchCreate extends Partial<PrReportDefaults> {
  batch_no?: string;  // 비우면 서버가 수정일자 기준으로 자동 부여
  sw_version: string;
  previous_version?: string | null;
  agreed_date: string;
  target_date?: string | null;
  delivery_date?: string | null;
  verified_date?: string | null;
  status?: PrBatchStatus;
  summary?: string | null;
  notes?: string | null;
}

export type PrBatchUpdate = Partial<PrBatchCreate>;

export interface PrBatchItemCreate {
  item_kind?: PrBatchItemKind;
  kac_pr_no?: string | null;
  lm_pr_no?: string | null;
  title: string;
  agreed_content?: string | null;
  actual_fix?: string | null;
  verify_method?: string | null;
  item_status?: PrBatchItemStatus;
  sort_order?: number;
  issue_id?: number | null;
}

export type PrBatchItemUpdate = Partial<PrBatchItemCreate>;

export interface PrBatchListResponse {
  items: PrBatchListItem[];
  total: number;
}

export interface PrBatchListParams {
  status?: string;
  year?: number;
  skip?: number;
  limit?: number;
  query?: string;
}
