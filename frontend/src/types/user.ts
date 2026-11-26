export interface User {
  id: number;
  name: string;
  login_id: string;
  role: 'shift_worker' | 'day_worker' | 'admin';
  team: 'A' | 'B' | 'C' | 'D' | 'day';
  grade: string | null;
  is_active: boolean;
  sort_order: number;
  joined_at: string | null;
  no_excel: boolean;
  created_at: string;
  today_shift_type: string | null;
}

export interface LoginRequest {
  login_id: string;
  password: string;
}
