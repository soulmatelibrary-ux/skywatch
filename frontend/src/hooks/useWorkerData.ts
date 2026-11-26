import { useEffect, useMemo, useState } from 'react';
import { scheduleApi } from '../services/api/scheduleApi';
import { usersApi } from '../services/api/usersApi';
import type { LeaveRequest, Schedule, ShiftOverride, ShiftWorker } from '../types/schedule';

interface UserOption {
  id: number;
  name: string;
  team: string;
}

function normalizeTeam(team: string | null | undefined) {
  if (!team) return '';
  const t = team.trim();
  if (t.toLowerCase() === 'day') return 'day';
  return t.toUpperCase();
}

function getMonthParts(date: string) {
  const [year, month] = date.split('-').map(Number);
  return { year, month };
}

function isLeaveActive(leave: LeaveRequest, date: string) {
  return leave.status === 'approved' && leave.date_from <= date && leave.date_to >= date;
}

export function useWorkerData(date: string, shiftType: string) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [overrides, setOverrides] = useState<ShiftOverride[]>([]);
  const [shiftWorkers, setShiftWorkers] = useState<ShiftWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isShiftDataMissing, setIsShiftDataMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { year, month } = getMonthParts(date);
    setIsLoading(true);
    setIsShiftDataMissing(false);

    Promise.all([
      usersApi.list(),
      scheduleApi.getSchedules(year, month),
      scheduleApi.getLeaveRequests(year, month),
      scheduleApi.getOverrides(year, month),
      scheduleApi.getShiftWorkers(date).catch(() => ({ data: { data: [] } })),
    ])
      .then(([usersRes, scheduleRes, leaveRes, overrideRes, shiftRes]) => {
        if (cancelled) return;
        const activeUsers = (usersRes.data.data ?? [])
          .filter(user => user.is_active)
          .map(user => ({ id: user.id, name: user.name, team: user.team }))
          .sort((left, right) => left.name.localeCompare(right.name, 'ko'));

        setUsers(activeUsers);
        setSchedules(scheduleRes.data.data ?? []);
        setLeaves(leaveRes.data.data ?? []);
        setOverrides(overrideRes.data.data ?? []);
        setShiftWorkers(shiftRes.data.data ?? []);

        // shift_data가 없으면 플래그 설정
        if (!shiftRes.data.data || shiftRes.data.data.length === 0) {
          setIsShiftDataMissing(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
        setSchedules([]);
        setLeaves([]);
        setOverrides([]);
        setShiftWorkers([]);
        setIsShiftDataMissing(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const dutyUserIds = useMemo(() => {
    // shift_data 기반 (우선)
    if (shiftWorkers.length > 0) {
      const worker = shiftWorkers.find(w => w.shift === shiftType);
      if (worker) {
        return new Set([worker.user_id]);
      }
    }

    // Schedule 테이블 기반 (폴백)
    const todaySchedules = schedules.filter(schedule => schedule.date === date);

    const activeUserIds = new Set(
      users
        .filter(user =>
          todaySchedules.some(
            s => normalizeTeam(s.team) === normalizeTeam(user.team) && s.shift_type === shiftType
          )
        )
        .map(user => user.id)
    );

    const leaveUserIds = new Set(
      leaves
        .filter(leave => isLeaveActive(leave, date))
        .map(leave => leave.user_id)
    );

    leaveUserIds.forEach(userId => activeUserIds.delete(userId));

    overrides
      .filter(override => override.date === date)
      .forEach(override => {
        activeUserIds.delete(override.original_user_id);
        activeUserIds.add(override.actual_user_id);
      });

    return activeUserIds;
  }, [date, shiftType, users, schedules, leaves, overrides, shiftWorkers]);

  const sortedUsers = useMemo(() => {
    const dutyUsers = users.filter(user => dutyUserIds.has(user.id));
    const otherUsers = users.filter(user => !dutyUserIds.has(user.id));
    return [...dutyUsers, ...otherUsers];
  }, [users, dutyUserIds]);

  return { users, dutyUserIds, sortedUsers, isLoading, isShiftDataMissing };
}
