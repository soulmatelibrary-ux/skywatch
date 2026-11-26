export interface Schedule {
  id: number;
  team: string;
  date: string;
  shift_type: string;
  capacity: number;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  date_from: string;
  date_to: string;
  status: string;
}

export interface ShiftOverride {
  id: number;
  date: string;
  original_user_id: number;
  actual_user_id: number;
  type: string;
}

export interface ShiftWorker {
  shift: '주간' | '야간' | '일근';
  code: string;
  user_id: number;
  name: string;
  is_changed: boolean;
}
