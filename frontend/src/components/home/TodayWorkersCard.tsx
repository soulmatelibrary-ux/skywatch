// 오늘/내일 근무자 현황 카드 (좌우 나란히 표시)
import { useState, useMemo } from 'react';
import type { UserSimple } from '../../services/api/usersApi';
import type { ShiftWorkers, DayShiftInfo } from '../../hooks/useTodayWorkers';
import { WorkerEditPanel } from './WorkerEditPanel';
import { useUIStore } from '../../store/uiStore';

interface Props {
  allUsers: UserSimple[];
  shiftGroups: ShiftWorkers[];
  tomorrowShiftGroups: ShiftWorkers[];
  todayShiftInfo: DayShiftInfo;
  tomorrowShiftInfo: DayShiftInfo;
  today: string;
  error?: string | null;
  onSave: (shift: string, userIds: number[], leaveIds: number[], tempNames: string[]) => Promise<void>;
}

type EditTarget = { shift: string; day: 'today' | 'tomorrow' } | null;

interface ShiftRowsProps {
  day: 'today' | 'tomorrow';
  groups: ShiftWorkers[];
  editTarget: EditTarget;
  onEditTarget: (target: EditTarget) => void;
  getName: (id: number) => string;
}

function ShiftRows({ day, groups, editTarget, onEditTarget, getName }: ShiftRowsProps) {
  const getGroup = (shift: string): ShiftWorkers =>
    groups.find(g => g.shift === shift) ?? { shift: shift as never, userIds: [], leaveIds: [], tempNames: [] };

  const getFirstWorker = (group: ShiftWorkers) => {
    if (group.userIds.length > 0) {
      const firstId = group.userIds[0];
      return { id: firstId, name: getName(firstId), isLeave: group.leaveIds.includes(firstId) };
    }
    if (group.tempNames.length > 0) return { id: -1, name: group.tempNames[0], isLeave: false };
    return null;
  };

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden text-[13px]">
      {(['주간', '야간', '일근'] as const).map(shift => {
        const group = getGroup(shift);
        const worker = getFirstWorker(group);
        const isEditing = editTarget?.shift === shift && editTarget?.day === day;
        return (
          <div key={shift} className="grid grid-cols-[44px_1fr] border-b border-slate-100 dark:border-slate-700 last:border-b-0">
            <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400 flex items-center text-[12px]">{shift}</div>
            <div
              onClick={() => onEditTarget(isEditing ? null : { shift, day })}
              className={`px-2 py-1.5 cursor-pointer transition ${isEditing ? 'bg-blue-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              {worker ? (
                <span className="inline-flex items-center gap-0.5">
                  <span className={worker.isLeave ? 'line-through text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}>
                    {worker.name}
                  </span>
                  {worker.isLeave && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded">휴</span>}
                </span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600">
                  — <span className="text-blue-300 dark:text-blue-500 text-[11px]">+ 배정</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TodayWorkersCard({ allUsers, shiftGroups, tomorrowShiftGroups, todayShiftInfo, tomorrowShiftInfo, today, error, onSave }: Props) {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();

  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const nameMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.name])), [allUsers]);
  const getName = (id: number) => nameMap.get(id) ?? `#${id}`;

  const getGroup = (shift: string, day: 'today' | 'tomorrow'): ShiftWorkers =>
    (day === 'today' ? shiftGroups : tomorrowShiftGroups).find(g => g.shift === shift)
    ?? { shift: shift as never, userIds: [], leaveIds: [], tempNames: [] };

  const handleSave = async (shift: string, userIds: number[], leaveIds: number[], tempNames: string[]) => {
    setSaving(true);
    try {
      await onSave(shift, userIds, leaveIds, tempNames);
      setEditTarget(null);
      addToast(`${shift} 근무자 저장됨`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addToast(`저장에 실패했습니다. ${errMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <h3 className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2">
        <UsersIcon />
        근무자 현황
        {(todayShiftInfo.isChanged || tomorrowShiftInfo.isChanged) && (
          <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[11px] font-semibold">
            ⚠️ 변경됨
          </span>
        )}
      </h3>

      {error && (
        <div className="mb-2 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">오늘 <span className="font-medium">{today}</span></div>
          <ShiftRows day="today" groups={shiftGroups} editTarget={editTarget} onEditTarget={setEditTarget} getName={getName} />
        </div>
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">내일 <span className="font-medium">{tomorrowStr}</span></div>
          <ShiftRows day="tomorrow" groups={tomorrowShiftGroups} editTarget={editTarget} onEditTarget={setEditTarget} getName={getName} />
        </div>
      </div>

      {editTarget && (
        <WorkerEditPanel
          shift={editTarget.shift}
          allUsers={allUsers}
          initUserIds={getGroup(editTarget.shift, editTarget.day).userIds}
          initLeaveIds={getGroup(editTarget.shift, editTarget.day).leaveIds}
          initTempNames={getGroup(editTarget.shift, editTarget.day).tempNames}
          saving={saving}
          onSave={(userIds, leaveIds, tempNames) => handleSave(editTarget.shift, userIds, leaveIds, tempNames)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
