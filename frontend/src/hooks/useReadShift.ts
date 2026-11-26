import { useEffect, useRef } from 'react';
import type { ShiftType } from '../types/shiftLog';
import { isFutureShift, resolveShift, stepReadShift } from '../utils/shiftNav';
import { currentShift } from '../utils/shiftText';
import { useShiftHistory } from './useShiftHistory';
import { useShiftParams } from './useShiftParams';
import { useShiftView } from './useShiftWriteData';

/** 근무 일지 보기의 선택 상태 — 직전 근무 자동 표시, 이전/다음 이동, 날짜 이동 보정 */
export function useReadShift() {
  const p = useShiftParams();
  const { date, shift } = p;
  const history = useShiftHistory(date);
  const view = useShiftView(date, shift);
  const autoFrom = p.hasParams ? p.state?.autoFrom ?? null : null;
  const fixedKey = useRef('');
  const items = history.items;

  // 주소 없이 열었는데 지금 근무가 비어 있으면 직전에 쓴 근무를 보여 줄 대상 (목록이 다 온 뒤에만 정해진다)
  const cur = currentShift();
  const now = items.find(i => i.date === cur.date && i.shift_type === cur.shift);
  const autoTarget = !p.hasParams && history.loaded && !history.isLoading && !(now && now.card_count + now.memo_count > 0)
    ? items.find(i => i.log_id && i.card_count + i.memo_count > 0 && !isFutureShift(i.date, i.shift_type)) ?? null
    : null;
  useEffect(() => {
    if (autoTarget) p.setShift(autoTarget.date, autoTarget.shift_type as ShiftType, { replace: true, state: { autoFrom: currentShift() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTarget?.date, autoTarget?.shift_type]);

  // 고른 날에 그 근무가 없고 다른 종류(주야·주간)만 있으면 맞는 것으로 바꾼다
  useEffect(() => {
    if (!p.hasParams || !history.loaded || history.isLoading) return;
    if (items.some(i => i.date === date)) {
      const r = resolveShift(date, shift, items);
      if (r !== shift) p.setShift(date, r, { replace: true });
      return;
    }
    // 목록에 그날이 없을 때(내 근무만 등)는 일지 응답의 근무 충돌 안내로 판단
    const v = view.data;
    const key = `${date}|${shift}`;
    if (!v || v.date !== date || v.shift_type !== shift || fixedKey.current === key) return;
    if (v.cards.length === 0 && v.conflict) {
      fixedKey.current = key;
      p.setShift(date, shift === '주야' ? '주간' : '주야', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.loaded, history.isLoading, items, date, shift, view.data]);

  // 이전/다음 — 그날 실제로 있는 근무 종류로 맞춘다 (주야 날, 주간만 있는 날)
  const fit = (n: { date: string; shift: ShiftType }) => ({ date: n.date, shift: resolveShift(n.date, n.shift, items) });
  const prev = fit(stepReadShift(date, shift, -1));
  const rawNext = stepReadShift(date, shift, 1);
  const next = fit(rawNext);
  const go = (d: string, s: ShiftType) => p.setShift(d, s);
  const matched = !!view.data && view.data.date === date && view.data.shift_type === shift;

  return {
    date, shift, history, view, prev, next,
    autoFrom,
    // 주소 없이 열었을 때 이동 대상이 정해지기 전, 직전 근무로 이동한 직후 새 일지가 오기 전에는 기다린다
    waiting: (!p.hasParams && (!history.loaded || history.isLoading || !!autoTarget) && !history.error) || (!!autoFrom && !matched),
    canNext: !isFutureShift(rawNext.date, rawNext.shift),
    focusCard: matched ? p.focusCard : null,
    clearCard: p.clearCard,
    pick: (d: string, s: string) => go(d, s as ShiftType),
    pickDate: (d: string) => {
      if (!d || d > currentShift().date) return;
      const s = resolveShift(d, shift, items);
      if (!isFutureShift(d, s)) go(d, s);
      else { const c = currentShift(); go(c.date, c.shift); }
    },
    // 이전/다음은 뒤로 가기 기록을 늘리지 않고(replace), 직전 근무 안내는 끝낸다
    step: (dir: 1 | -1) => { const n = dir === 1 ? next : prev; p.setShift(n.date, n.shift, { replace: true, state: undefined }); },
    goNow: () => { if (autoFrom) go(autoFrom.date, autoFrom.shift); },
  };
}
