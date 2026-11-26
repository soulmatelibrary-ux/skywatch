export type TaskImportance = 'high' | 'normal' | 'low';
export type RecipientsMode = 'all' | 'teams' | 'individual';

export interface Task {
  id: number;
  sender_id: number;
  title: string;
  body: string | null;
  importance: TaskImportance;
  due_date: string | null;
  recipients_mode: RecipientsMode;
  recipients: number[];
  target_teams: string[];
  completed_by: number[];
  linked_card_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  body?: string;
  importance?: TaskImportance;
  due_date?: string;
  recipients_mode?: RecipientsMode;
  recipients?: number[];
  target_teams?: string[];
  linked_card_id?: number;
}

export interface TaskUpdate {
  title?: string;
  body?: string;
  importance?: TaskImportance;
  due_date?: string;
  recipients_mode?: RecipientsMode;
  recipients?: number[];
  target_teams?: string[];
}

export interface RecurringTemplate {
  id: number;
  name: string;
  repeat_type: string;
  repeat_days: string[] | null;
  repeat_time: string | null;
  template_title: string | null;
  template_body: string | null;
  template_importance: string;
  target_teams: string[];
  target_shift_types: string[];
  is_active: boolean;
  next_run_at: string | null;
  last_executed_at: string | null;
}

export interface RecurringTemplateCreate {
  name: string;
  repeat_type?: string;
  repeat_days?: string[];
  repeat_time?: string;
  template_title?: string;
  template_body?: string;
  template_importance?: string;
  target_teams?: string[];
  target_shift_types?: string[];
}
