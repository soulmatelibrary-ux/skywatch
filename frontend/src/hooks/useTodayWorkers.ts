import { useCallback, useEffect, useMemo, useState } from 'react';
import { scheduleApi } from '../services/api/scheduleApi';
import { usersApi } from '../services/api/usersApi';
import type { UserSimple } from '../services/api/usersApi';
import type { HomeAdjustment } from '../services/api/scheduleApi';
import type { LeaveRequest, Schedule, ShiftOverride, ShiftWorker } from '../types/schedule';

export interface ShiftWorkers {
  shift: '주간' | '야간' | '일근';
  userIds: number[];
  leaveIds: number[];
  tempNames: string[];
}

export interface DayShiftInfo {
  shiftWorkers: ShiftWorker[];
  isChanged: boolean;
}

function normalizeTeam(team: string | null | undefined) {
  if (!team) return '';
  const t = team.trim();
  if (t.toLowerCase() === 'day') return 'day';
  return t.toUpperCase();
}

export function useTodayWorkers(today: string) {
  const [users, setUsers] = useState<UserSimple[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [overrides, setOverrides] = useState<ShiftOverride[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, HomeAdjustment | null>>({});
  const [tomorrowAdjustments, setTomorrowAdjustments] = useState<Record<string, HomeAdjustment | null>>({});
  const [todayShiftWorkers, setTodayShiftWorkers] = useState<ShiftWorker[]>([]);
  const [tomorrowShiftWorkers, setTomorrowShiftWorkers] = useState<ShiftWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const [year, month] = today.split('-').map(Number);
    setIsLoading(true);
    setError(null);

    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    Promise.all([
      usersApi.list(),
      scheduleApi.getSchedules(year, month),
      scheduleApi.getLeaveRequests(year, month),
      scheduleApi.getOverrides(year, month),
      scheduleApi.getHomeWorkers(today),
      scheduleApi.getHomeWorkers(tomorrow),
      scheduleApi.getShiftWorkers(today).catch(() => ({ data: { data: [] } })),
      scheduleApi.getShiftWorkers(tomorrow).catch(() => ({ data: { data: [] } })),
    ])
      .then(([u, s, l, o, hw, hwTomorrow, sw, swTomorrow]) => {
        if (cancelled) return;
        setUsers(u.data.data ?? []);
        setSchedules(s.data.data ?? []);
        setLeaves(l.data.data ?? []);
        setOverrides(o.data.data ?? []);
        setAdjustments(hw.data.data ?? {});
        setTomorrowAdjustments(hwTomorrow.data.data ?? {});
        setTodayShiftWorkers(sw.data.data ?? []);
        setTomorrowShiftWorkers(swTomorrow.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('근무 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [today]);

  const leaveSet = useMemo(
    () =>
      new Set(
        leaves
          .filter(l => l.status === 'approved' && l.date_from <= today && l.date_to >= today)
          .map(l => l.user_id),
      ),
    [leaves, today],
  );

  const overrideMap = useMemo(() => {
    const m = new Map<number, number>();
    overrides.filter(o => o.date === today).forEach(o => m.set(o.original_user_id, o.actual_user_id));
    return m;
  }, [overrides, today]);

  const getShiftGroups = (
    date: string,
    adjustmentsMap: Record<string, HomeAdjustment | null>,
    shiftWorkers: ShiftWorker[],
  ): ShiftWorkers[] => {
    const active = users.filter(u => u.is_active);
    const resolveId = (id: number) => overrideMap.get(id) ?? id;
    const targetDate = new Date(`${date}T00:00:00`);
    const hideDayWorkers = date !== today && (targetDate.getDay() === 0 || targetDate.getDay() === 6);

    const dateShiftMap = new Map<string, string>();
    schedules.filter(s => s.date === date).forEach(s => dateShiftMap.set(s.team, s.shift_type));

    return (['주간', '야간', '일근'] as const).map(shift => {
      if (shift === '일근' && hideDayWorkers) {
        return { shift, userIds: [], leaveIds: [], tempNames: [] };
      }

      const adj = adjustmentsMap[shift];
      if (adj) {
        return { shift, userIds: adj.user_ids, leaveIds: adj.leave_ids, tempNames: adj.temp_names };
      }

      const shiftWorker = shiftWorkers.find(w => w.shift === shift);
      if (shiftWorker) {
        const resolvedId = resolveId(shiftWorker.user_id);
        return {
          shift,
          userIds: [resolvedId],
          leaveIds: leaveSet.has(resolvedId) ? [resolvedId] : [],
          tempNames: [],
        };
      }

      let matched = [] as typeof active;
      if (shift === '일근') {
        if (!hideDayWorkers) {
          matched = active.filter(u => normalizeTeam(u.team) === 'day' && u.role !== 'admin');
        }
      } else {
        matched = active.filter(u => {
          const team = normalizeTeam(u.team);
          return team !== 'day' && dateShiftMap.get(team) === shift;
        });
      }

      const resolvedIds = matched.map(u => resolveId(u.id));
      return {
        shift,
        userIds: resolvedIds,
        leaveIds: resolvedIds.filter(id => leaveSet.has(id)),
        tempNames: [],
      };
    });
  };

  const shiftGroups = useMemo(
    () => getShiftGroups(today, adjustments, todayShiftWorkers),
    [users, today, schedules, leaveSet, overrideMap, adjustments, todayShiftWorkers],
  );

  const tomorrowShiftGroups = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    return getShiftGroups(tomorrowStr, tomorrowAdjustments, tomorrowShiftWorkers);
  }, [users, today, schedules, leaveSet, overrideMap, tomorrowAdjustments, tomorrowShiftWorkers]);

  const saveAdjustment = useCallback(
    async (shift: string, userIds: number[], leaveIds: number[], tempNames: string[]) => {
      await scheduleApi.saveHomeWorkers({
        date: today,
        shift_type: shift,
        user_ids: userIds,
        leave_ids: leaveIds,
        temp_names: tempNames,
      });
      setAdjustments(prev => ({ ...prev, [shift]: { user_ids: userIds, leave_ids: leaveIds, temp_names: tempNames } }));
    },
    [today],
  );

  const isBasicShiftCode = (workers: ShiftWorker[]): boolean => {
    if (workers.length === 0) return false;
    const isChanged = workers.some(w => w.is_changed);
    return !isChanged;
  };

  const todayShiftInfo: DayShiftInfo = useMemo(
    () => ({
      shiftWorkers: todayShiftWorkers,
      isChanged: !isBasicShiftCode(todayShiftWorkers),
    }),
    [todayShiftWorkers],
  );

  const tomorrowShiftInfo: DayShiftInfo = useMemo(
    () => ({
      shiftWorkers: tomorrowShiftWorkers,
      isChanged: !isBasicShiftCode(tomorrowShiftWorkers),
    }),
    [tomorrowShiftWorkers],
  );

  return {
    users: users.filter(u => u.is_active),
    shiftGroups,
    tomorrowShiftGroups,
    todayShiftInfo,
    tomorrowShiftInfo,
    isLoading,
    error,
    saveAdjustment,
  };
}
