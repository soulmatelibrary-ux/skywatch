import { useState } from 'react';
import { shiftLogApi } from '../services/api/shiftLogApi';
import type { ShiftHistoryItem } from '../types/shiftLog';
import { addDays, kstToday } from '../utils/shiftText';
import { useAsyncData } from './useAsyncData';

/** 근무 일지 보기의 근무 목록 — 최근 14일부터, 더 보기로 14일씩 늘린다.
 *  선택한 근무가 범위 밖의 오래된 날이면 그 날 주변을 보여준다. */
export function useShiftHistory(selectedDate: string) {
  const [days, setDays] = useState(14);
  const [mine, setMine] = useState(false);
  const today = kstToday();
  const dateTo = selectedDate < addDays(today, -days)
    ? [addDays(selectedDate, 7), today].sort()[0]
    : undefined;
  // null = 아직 한 번도 불러오지 않음 (빈 목록과 구분)
  const { data, isLoading, error, reload } = useAsyncData<ShiftHistoryItem[] | null>(
    async () => (await shiftLogApi.history(days, mine, dateTo)).data.data ?? [], [days, mine, dateTo], null,
  );
  return { items: data ?? [], loaded: data !== null, isLoading, error, reload, mine, setMine, more: () => setDays(d => Math.min(120, d + 14)), days };
}
