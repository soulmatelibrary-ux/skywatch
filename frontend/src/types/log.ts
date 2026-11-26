export type ShiftType = '주간' | '야간' | '주야' | '비번' | '휴가' | '공지';

export interface User {
  id: number;
  name: string;
  team: string;
}

export interface Attachment {
  id: number;
  card_id: number;
  original_name: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number;
  created_at: string;
}
export type CardStatus = string;
export type ParticipantRole = 'primary' | 'sub' | 'support' | 'overtime';

export interface CardCategory {
  id: number;
  name: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LogCard {
  id: number;
  log_id: number;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  position: number;
  title: string;
  content: string | null;
  status: CardStatus;
  status_color: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
  completed_at: string | null;
  last_edited_by: number | null;
  last_edited_by_name: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
  /** 이어지는 일 묶음에 속하면 묶음 카드 수 (없으면 0) */
  thread_card_count?: number;
}

export interface LogParticipant {
  user_id: number;
  name: string | null;
  role: ParticipantRole;
  sub_for: number | null;
  sub_for_name: string | null;
  note: string | null;
}

export interface Log {
  id: number;
  author_id: number;
  author_name: string | null;
  team: string | null;
  primary_worker_name: string | null;
  primary_worker_team: string | null;
  date: string;
  shift_type: ShiftType;
  title: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  card_count: number;
  open_count: number;
  in_progress_count: number;
  comment_count: number;
  attach_count: number;
  link_count: number;
  is_read: boolean;
}

export interface LogDetail extends Log {
  has_acked: boolean;
  cards: LogCard[];
  participants: LogParticipant[];
}

export interface ReactionGroup {
  emoji: string;
  user_ids: number[];
  user_names: string[];
}

export interface Comment {
  id: number;
  log_id: number;
  author_id: number;
  author_name: string | null;
  parent_id: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  reactions: ReactionGroup[];
}

export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

export interface UserName {
  user_id: number;
  name: string;
}

export interface ReadStatus {
  reads: UserName[];
  acks: UserName[];
  participant_ids: number[];
  has_acked: boolean;
}

export interface ParticipantIn {
  user_id: number;
  role: string;
  sub_for?: number | null;
  note?: string | null;
}

export interface CardUpsert {
  id?: number | null;
  category_id?: number | null;
  title: string;
  content?: string | null;
  position: number;
  status?: CardStatus;
  to_delete?: boolean;
}

export interface LogCreatePayload {
  date: string;
  shift_type: string;
  title?: string;
  tags?: string[];
  cards: CardUpsert[];
  participants: ParticipantIn[];
}

export interface LogUpdatePayload {
  date?: string;
  shift_type?: string;
  title?: string;
  tags?: string[];
  cards: CardUpsert[];
  participants?: ParticipantIn[];
}

export interface CardUpdatePayload {
  title?: string;
  content?: string;
  category_id?: number | null;
}

export interface CardLinkResult {
  card_id: number;
  card_title: string;
  log_id: number;
  log_date: string;
  log_title: string | null;
  log_author: string | null;
}

export interface CardChainNode {
  card_id: number;
  card_title: string;
  log_id: number;
  log_date: string;
  log_title: string | null;
  log_author: string | null;
  log_shift_type: string | null;
  status: string;
  children: CardChainNode[];
}

export interface BoardCard {
  id: number;
  log_id: number;
  log_date: string;
  log_shift_type: string;
  title: string;
  status: CardStatus;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  last_edited_by: number | null;
  last_edited_by_name: string | null;
  handover_count: number;
}

export interface BoardCategory {
  id: number;
  name: string;
  color: string | null;
  count: number;
  cards: BoardCard[];
}

export interface CardStatusItem {
  id: number;
  key: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
}

export interface ChainLogInfo {
  log_id: number;
  log_date: string;
  log_title: string | null;
  log_shift_type: string | null;
}

export interface ChainInfo {
  root_card_id: number;
  root_card_title: string;
  logs: ChainLogInfo[];
  total_cards: number;
  completed_cards: number;
  recent_status_key: string;
  recent_status_label: string;
  recent_status_color: string | null;
}

export interface LinkedCardInfo {
  card_id: number;
  card_title: string;
  log_id: number;
  log_date: string;
  log_title: string | null;
}

export interface LogLinkedCard {
  card_id: number;
  card_title: string;
  linked_cards: LinkedCardInfo[];
}
