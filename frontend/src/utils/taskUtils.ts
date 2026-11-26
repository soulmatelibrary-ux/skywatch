// Task 관련 공통 유틸리티 함수
import type { Task } from '../types/task';

export function fmtDue(s: string | null) {
  return (s ?? '').replace(/^\d{4}-/, '');
}

export function isOverdue(t: Task) {
  if (!t.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(t.due_date) < today;
}

export const IMPORTANCE: Record<string, { label: string; cls: string }> = {
  high:   { label: '긴급', cls: 'bg-red-100 text-red-700'    },
  normal: { label: '높음', cls: 'bg-amber-100 text-amber-700' },
  low:    { label: '보통', cls: 'bg-green-100 text-green-700' },
};
