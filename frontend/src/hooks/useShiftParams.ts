import { useLocation, useSearchParams } from 'react-router-dom';
import type { ShiftType } from '../types/shiftLog';
import { currentShift, stepShift } from '../utils/shiftText';

const SHIFTS: ShiftType[] = ['주간', '야간', '주야'];

/** 주소(?date=&shift=&card=)에 담긴 근무. 없으면 현재 시각의 근무. */
export function useShiftParams() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const fallback = currentShift();
  const rawDate = params.get('date');
  const rawShift = params.get('shift') as ShiftType | null;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : fallback.date;
  const shift = rawShift && SHIFTS.includes(rawShift) ? rawShift : fallback.shift;
  const rawCard = Number(params.get('card'));
  const focusCard = Number.isInteger(rawCard) && rawCard > 0 ? rawCard : null;

  /** state 는 주소 이동 기록에 붙는 값(직전 근무 자동 표시 안내용). replace 에서 state 를 따로 주지 않으면 이전 값을 유지하고, 일반 이동에는 붙지 않아 안내가 사라진다 */
  function setShift(d: string, s: ShiftType, opts?: { replace?: boolean; state?: unknown }) {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (prev.get('date') !== d || prev.get('shift') !== s) next.delete('card');   // 다른 근무로 가면 카드 강조는 끝
      next.set('date', d);
      next.set('shift', s);
      return next;
    }, opts?.replace ? { replace: true, state: 'state' in opts ? opts.state : location.state } : undefined);
  }

  /** 카드 강조가 끝나면 주소에서 card 를 지운다 (뒤로 가기 기록은 늘리지 않음) */
  function clearCard() {
    setParams(prev => {
      if (!prev.has('card')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('card');
      return next;
    }, { replace: true, state: location.state });
  }

  function step(dir: 1 | -1) {
    const n = stepShift(date, shift, dir);
    setShift(n.date, n.shift);
  }

  return { date, shift, setShift, step, clearCard, focusCard, state: location.state as { autoFrom?: { date: string; shift: ShiftType } } | null, hasParams: params.has('date') || params.has('shift') };
}
