export interface Notification {
  id: number;
  user_id: number;
  type: string;          // task | comment | mention | card
  ref_type: string | null;
  ref_id: number | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export type NotifFilter = 'all' | 'unread' | 'mention' | 'card' | 'comment';

export interface NotifSummary {
  total: number;
  unread: number;
  needCheck: number; // 미사용 (보류)
  mentions: number;
  cardChanges: number;
  tasks: number; // 미사용 (보류)
}
