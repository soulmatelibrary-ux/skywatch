export type IssueStatus = '진행중' | '수정완료' | '경고' | '반환';

export interface IssueComment {
  id: number;
  issue_id: number;
  content: string;
  is_certified: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface IssueAttachment {
  id: number;
  original_name: string;
  file_name: string;
  file_size: number;
}

export interface Issue {
  id: number;
  source_seq: number | null;
  kac_pr_no: string | null;
  lm_pr_no: string | null;
  title: string;
  content: string | null;
  status: IssueStatus;
  acc_type: string | null;
  keyword: string | null;
  version: string | null;
  mod_version: string | null;
  reg_date: string;
  action_date: string | null;
  acc_pr: string | null;
  created_by: number | null;
  created_by_name: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  comments: IssueComment[];
  attachments: IssueAttachment[];
}

export interface IssueListItem {
  id: number;
  kac_pr_no: string | null;
  lm_pr_no: string | null;
  title: string;
  status: IssueStatus;
  acc_type: string | null;
  version: string | null;
  mod_version: string | null;
  reg_date: string;
  action_date: string | null;
  created_by_name: string | null;
  assigned_to_name: string | null;
  comment_count: number;
  attachment_count: number;
}

export interface IssueListResponse {
  items: IssueListItem[];
  total: number;
}

export interface IssueCreate {
  kac_pr_no?: string;
  lm_pr_no?: string;
  title: string;
  content?: string;
  status?: IssueStatus;
  acc_type?: string;
  keyword?: string;
  version?: string;
  mod_version?: string;
  reg_date: string;
  action_date?: string;
  acc_pr?: string;
  assigned_to?: number;
}

export type IssueUpdate = Partial<IssueCreate>;

export interface IssueListParams {
  status?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  sort?: IssueSortKey;  // 없으면 서버 기본 정렬 (KAC 번호 있는 PR 먼저, 등록일 최신순)
  order?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export type IssueSortKey = 'reg_date' | 'kac_pr_no' | 'lm_pr_no' | 'title' | 'status' | 'updated_at';
