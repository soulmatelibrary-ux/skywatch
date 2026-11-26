import { shiftLogApi } from '../services/api/shiftLogApi';
import { workThreadApi } from '../services/api/workThreadApi';
import { scheduleApi } from '../services/api/scheduleApi';
import { usersApi } from '../services/api/usersApi';
import type { UserSimple } from '../services/api/usersApi';
import type { MissingShift, ShiftCard, ShiftHistoryItem, ShiftType, ShiftView, WorkThread } from '../types/shiftLog';
import type { ShiftWorker } from '../types/schedule';
import { useAsyncData } from './useAsyncData';

/** 근무 하나의 일지 화면 데이터 */
export function useShiftView(date: string, shift: ShiftType) {
  return useAsyncData<ShiftView | null>(
    async () => (await shiftLogApi.view(date, shift)).data.data ?? null, [date, shift], null,
  );
}

/** 내가 일한 최근 7일 근무 (근무 이동 목록용). 카드 수는 일지를 쓰면 바뀌므로 reload 로 다시 불러온다 */
export function useRecentShifts() {
  return useAsyncData<ShiftHistoryItem[]>(
    async () => (await shiftLogApi.history(7, true)).data.data ?? [], [], [],
  );
}

/** 받은 전달사항 */
export function useShiftInbox(date: string, shift: ShiftType) {
  return useAsyncData<ShiftCard[]>(
    async () => (await shiftLogApi.inbox(date, shift)).data.data ?? [], [date, shift], [],
  );
}

/** 근무표에는 있는데 일지가 없는 최근 근무 */
export function useMissingShifts(days = 7) {
  return useAsyncData<MissingShift[]>(
    async () => (await shiftLogApi.missing(days)).data.data ?? [], [days], [],
  );
}

/** 작성 중인 근무 시점에 열려 있는 이어지는 일·장기 과제 */
export function useOpenThreads(asOf: string) {
  return useAsyncData<WorkThread[]>(
    async () => (await workThreadApi.list({ status: ['open', 'hold'], as_of: asOf })).data.data ?? [],
    [asOf], [],
  );
}

/** 오늘 근무표 (주간·야간 근무자) */
export function useRoster(date: string) {
  return useAsyncData<ShiftWorker[]>(
    async () => (await scheduleApi.getShiftWorkers(date)).data.data ?? [], [date], [],
  );
}

/** 활성 사용자 목록 (근무자 추가·받는 사람 선택) */
export function useActiveUsers() {
  return useAsyncData<UserSimple[]>(
    async () => ((await usersApi.list()).data.data ?? []).filter(u => u.is_active && u.role !== 'admin'),
    [], [],
  );
}
