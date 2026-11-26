// 신규 근무일지(일지 쓰기·보기·카드 탐색·과제) 타입
export type ShiftType = '주간' | '야간' | '주야';
export type CardKind = 'single' | 'thread' | 'project' | 'memo';
export type ThreadStatus = 'open' | 'hold' | 'done';

export interface Worker {
  user_id: number;
  name: string;
  team: string | null;
  role: string;
}

export interface MemoInfo {
  target_type: 'next' | 'all' | 'user';
  target_user_id: number | null;
  target_user_name: string | null;
  keep: 'checked' | 'shift' | 'days';
  keep_until: string | null;
  checked_user_ids: number[];
  checked_names: string[];
}

export interface ShiftCard {
  id: number;
  log_id: number;
  date: string;
  shift_type: string;
  title: string;
  body_text: string;
  content: string | null;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  status: string;
  author_id: number | null;
  author_name: string | null;
  created_at: string;
  kind: CardKind;
  thread_id: number | null;
  thread_title: string | null;
  thread_status: ThreadStatus | null;
  memo: MemoInfo | null;
  is_late: boolean;
  is_proxy: boolean;
  attachments: AttachmentBrief[];
  // 카드 수정 화면용 (서버가 항상 채워 주지만 다른 화면은 쓰지 않는다)
  updated_at?: string | null;          // 수정 충돌 검사에 되돌려 보낸다
  edited_by_name?: string | null;
  edited_at?: string | null;
  thread_card_count?: number | null;   // 이어지는 일 묶음의 카드 수
  inquiry_nos?: string[];              // 카드 추가 응답만 — 문의 카드가 완료로 저장돼 문의사항에 자동 등록된 번호
}

export interface AttachmentBrief {
  id: number;
  original_name: string;
  file_size: number;
}

export interface ShiftView {
  date: string;
  shift_type: ShiftType;
  log_id: number | null;
  team: string;
  workers: Worker[];
  is_past: boolean;
  conflict: string | null;
  cards: ShiftCard[];
  handover: { date: string; shift_type: string; team: string; cards: ShiftCard[] } | null;
  routines: { title: string; body: string; done: boolean }[];
}

export interface MissingShift {
  date: string;
  shift_type: ShiftType;
  team: string;
  workers: Worker[];
}

export interface ShiftHistoryItem {
  date: string;
  shift_type: string;
  log_id: number | null;
  team: string;
  worker_names: string[];
  card_count: number;
  memo_count: number;
  has_late: boolean;
  has_proxy: boolean;
  missing: boolean;
}

export interface Phase {
  seq?: number;
  name: string;
  start_month: string;
  end_month: string;
}

export interface WorkThread {
  id: number;
  kind: 'thread' | 'project';
  title: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  status: ThreadStatus;
  owner_id: number | null;
  owner_name: string | null;
  started_on: string;
  closed_on: string | null;
  current_phase: number;
  recur_month: number | null;
  phases: Phase[];
  card_count: number;
  author_count: number;
  last_card: { date: string; shift_type: string; title: string; next_step: string | null; summary: string } | null;
  recent_shifts: string[];
}

export interface WorkThreadDetail extends WorkThread {
  cards: ShiftCard[];
}

export interface ExploreFacet {
  key: string;
  label: string;
  color: string | null;
  count: number;
}

export interface ExploreResult {
  items: ShiftCard[];
  total: number;
  category_facets: ExploreFacet[];
  kind_facets: ExploreFacet[];
}

export interface ThreadCandidate {
  norm: string;
  count: number;
  first_date: string;
  last_date: string;
  examples: string[];
  recommend: 'thread' | 'project';
}

export interface ShiftCardInput {
  date: string;
  shift_type: ShiftType;
  title: string;
  body: string;
  content?: string;   // 편집기 HTML (표·이미지 포함)
  category_id: number | null;
  thread_id: number | null;
  new_thread: boolean;
}

/** 카드 수정. thread_mode: keep 유지 / single 이 카드만 당일 종료 / thread 이어지는 일로 */
export interface ShiftCardUpdateInput {
  title: string;
  content?: string;   // 안 보내면 본문은 그대로
  category_id: number | null;
  thread_mode: 'keep' | 'single' | 'thread';
  expected_updated_at?: string | null;
  /** 수정을 시작할 때의 값 — 서버가 updated_at 이 달라도 이 값이 그대로면 충돌로 보지 않는다 */
  base_title?: string;
  base_content?: string | null;
  base_category_id?: number | null;
}

export interface MemoInput {
  date: string;
  shift_type: ShiftType;
  text: string;
  category_id: number | null;
  target_type: MemoInfo['target_type'];
  target_user_id: number | null;
  keep: MemoInfo['keep'];
}

export interface ExploreQuery {
  q?: string;
  category_ids?: number[];
  kinds?: CardKind[];
  worker_id?: number | null;
  date_from?: string;
  date_to?: string;
  late_only?: boolean;
  page: number;
  per_page: number;
}
