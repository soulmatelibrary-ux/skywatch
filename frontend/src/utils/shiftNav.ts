// 근무 일지 보기 — 이전/다음 근무 이동, 근무 종류 보정
import type { ShiftType } from '../types/shiftLog';
import { addDays, currentShift, stepShift } from './shiftText';

/** 아직 시작하지 않은 근무인지 (지금 주간이면 오늘 야간도 미래) */
export function isFutureShift(date: string, shift: string): boolean {
  const cur = currentShift();
  return date > cur.date || (date === cur.date && cur.shift === '주간' && shift === '야간');
}

/** 일지 보기용 이동 — 주야는 하루 전체로 보고 다음은 다음 날 주간, 이전은 전날 야간 */
export function stepReadShift(date: string, shift: ShiftType, dir: 1 | -1): { date: string; shift: ShiftType } {
  if (shift === '주야') return dir === 1 ? { date: addDays(date, 1), shift: '주간' } : { date: addDays(date, -1), shift: '야간' };
  return stepShift(date, shift, dir);
}

/** 근무 종류 보정 — 고른 종류가 그날 없으면 일지가 있는 다른 종류(주야 → 카드 있는 근무)로 연다 */
export function resolveShift(
  date: string, wanted: ShiftType,
  items: { date: string; shift_type: string; card_count?: number; memo_count?: number }[],
): ShiftType {
  const day = items.filter(i => i.date === date);
  if (day.some(i => i.shift_type === wanted)) return wanted;
  if (day.some(i => i.shift_type === '주야')) return '주야';
  const filled = ['주간', '야간'].find(t => day.some(i => i.shift_type === t && (i.card_count ?? 0) + (i.memo_count ?? 0) > 0));
  if (filled) return filled as ShiftType;
  return wanted === '주야' ? '주간' : wanted;
}

/** 카드 검색 결과 → 그 근무 일지 보기(해당 카드로 이동) 주소 */
export function readLink(c: { date: string; shift_type: string; id: number }): string {
  return `/shift/read?date=${c.date}&shift=${encodeURIComponent(c.shift_type)}&card=${c.id}`;
}
