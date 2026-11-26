// 일지 작성/수정 모달의 편집 가능한 메타 섹션 — 작성자·참여자 선택 + 타임스탬프
import type { LogDetail, ParticipantIn, User } from '../../types/log';
import { AdditionalWorkerSelectorCompact } from './AdditionalWorkerSelectorCompact';

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

function formatTeam(team: string) {
  return team === 'day' ? '주간' : `${team}조`;
}

interface Props {
  date: string;
  shiftType: string;
  participants: ParticipantIn[];
  selectableUsers: User[];
  dutyUserIds: Set<number>;
  isLoadingWorkers: boolean;
  inputsDisabled: boolean;
  isNewLogWriteMode: boolean;
  editTarget?: LogDetail | null;
  onUpdatePrimaryWorker: (userId: number) => void;
  onChangeParticipants: (p: ParticipantIn[]) => void;
}

export function LogWriteMeta({
  date, shiftType, participants, selectableUsers, dutyUserIds, isLoadingWorkers,
  inputsDisabled, isNewLogWriteMode, editTarget,
  onUpdatePrimaryWorker, onChangeParticipants,
}: Props) {
  const primaryParticipant = participants.find(p => p.role === 'primary');
  const isModified = editTarget && editTarget.updated_at !== editTarget.created_at;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] dark:bg-slate-900 dark:border-slate-700">
      {/* 기본 작성자 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-slate-400 dark:text-slate-500">작성자</span>
        <select
          value={primaryParticipant?.user_id ? String(primaryParticipant.user_id) : ''}
          onChange={e => onUpdatePrimaryWorker(Number(e.target.value))}
          disabled={inputsDisabled || isLoadingWorkers || selectableUsers.length === 0}
          className={`border rounded-lg px-2 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-slate-950 dark:text-white transition disabled:opacity-60 disabled:cursor-not-allowed ${
            dutyUserIds.size === 0 && isNewLogWriteMode
              ? 'border-amber-300 dark:border-amber-700'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <option value="">{selectableUsers.length > 0 ? '선택' : '선택 불가'}</option>
          {selectableUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} ({formatTeam(user.team)}){dutyUserIds.has(user.id) ? ' · 당일' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 공동 근무자 */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-slate-400 dark:text-slate-500 shrink-0">공동근무</span>
        <div className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 min-h-[26px] flex items-center bg-white dark:bg-slate-950 overflow-hidden">
          <AdditionalWorkerSelectorCompact
            date={date} shiftType={shiftType}
            participants={participants} onChange={onChangeParticipants}
            users={selectableUsers} dutyUserIds={dutyUserIds} isLoading={isLoadingWorkers}
          />
        </div>
      </div>

      {/* 근무자 미배정 경고 */}
      {isNewLogWriteMode && dutyUserIds.size === 0 && !isLoadingWorkers && !inputsDisabled && (
        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 rounded-lg border border-amber-200/50 shrink-0">
          ⚠ 근무자 수동 배정 필요
        </span>
      )}

      {/* 기존 일지: 타임스탬프 */}
      {editTarget && (
        <span className="text-slate-400 dark:text-slate-500 shrink-0 ml-auto">
          작성 <span className="text-slate-600 dark:text-slate-300">{fmtDatetime(editTarget.created_at as unknown as string)}</span>
          {isModified && (
            <span className="ml-3">
              수정 <span className="text-slate-600 dark:text-slate-300">{fmtDatetime(editTarget.updated_at as unknown as string)}</span>
            </span>
          )}
        </span>
      )}
    </div>
  );
}
