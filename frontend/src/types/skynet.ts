// SkyNet 연동 타입 정의
export interface SkynetDocument {
  id: number;
  dept_name: string | null;
  doc_type: string | null;
  title: string | null;
  reg_date: string | null;
  reg_number: string | null;
  doc_number: string | null;
  detail_url: string | null;
  crawled_at: string | null;
  charger_nm: string | null;
  matched_keyword: string | null;
  aprv_nm: string | null;
  is_locked: number;
  recv_name: string | null;
  flow_type: string | null;
  memo: string | null;
}

export interface SkynetSourceDept {
  name: string;
  count: number;
}

export interface SkynetDocStats {
  total: number;
  total_all: number;
  today: number;
  today_board: number;
  week: number;
  last_crawled: string | null;
  last_run_at: string | null;
  last_run_fetched: number | null;
  last_run_saved: number | null;
}

export interface SkynetBoardPost {
  id: number;
  atcl_id: string;
  brd_name: string | null;
  title: string | null;
  body_text: string | null;
  reg_dt: string | null;
  author: string | null;
  view_cnt: number;
  matched_keyword: string | null;
}

export interface SkynetDepartment {
  id: number;
  name: string;
}

export interface SkynetDashboard {
  doc_total: number;
  doc_today: number;
  board_total: number;
  board_today: number;
  crawl_status: string;
  last_crawled_at: string | null;
}

export interface SkynetCrawlLog {
  id: number;
  target: string | null;
  status: string;
  new_count: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface SkynetPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface SkynetSearchItem {
  kind: 'document' | 'board';
  title: string | null;
  reg_date: string | null;
  source_dept: string | null;
  charger_nm: string | null;
  aprv_nm: string | null;
  matched_keyword: string | null;
  detail_url: string | null;
  is_locked: number;
  doc_number: string | null;
  reg_number: string | null;
  flow_type: string | null;
  badge: string;
  badge_kind: 'board' | 'crawl' | 'all';
}

export interface SkynetBoardStats {
  total: number;
  today_count: number;
  keyword_count: number;
  last_crawl_at: string | null;
  board_direct_url: string;
}

export interface SkynetSearchResult {
  items: SkynetSearchItem[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface CrawlStatusResponse {
  state?: 'idle' | 'running' | 'done';
  percent?: number;
  message?: string;
  count?: number;
}
