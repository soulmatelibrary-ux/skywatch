import type { LogParticipant, ReadStatus } from '../../types/log';

interface ActiveUser { id: number; name: string; }

interface Props {
  readStatus: ReadStatus;
  participants: LogParticipant[];
  activeNonAdminUsers?: ActiveUser[];
}

export function ReadStatusPanel({ readStatus, participants, activeNonAdminUsers }: Props) {
  const { reads, acks } = readStatus;
  const readIds = new Set(reads.map(r => r.user_id));

  const nonAdminReads = activeNonAdminUsers
    ? reads.filter(r => activeNonAdminUsers.some(u => u.id === r.user_id))
    : reads.filter(r => participants.some(p => p.user_id === r.user_id));

  const unread = activeNonAdminUsers
    ? activeNonAdminUsers.filter(u => !readIds.has(u.id))
    : participants.filter(p => !readIds.has(p.user_id));

  const total = activeNonAdminUsers?.length;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-[12px] mb-4 dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold text-slate-700 mb-0.5 dark:text-slate-200">
            읽음 ({total ? `${nonAdminReads.length}/${total}` : nonAdminReads.length})
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {nonAdminReads.length > 0
              ? nonAdminReads.map(r => r.name).join(', ')
              : <span className="text-slate-400">아직 없음</span>}
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-700 mb-0.5 dark:text-slate-200">미확인 ({unread.length})</p>
          <p className="text-amber-700 dark:text-amber-300">
            {unread.length > 0
              ? unread.map(p => p.name ?? `#${(p as LogParticipant).user_id}`).join(', ')
              : <span className="text-slate-400">모두 읽음</span>}
          </p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-700 mb-0.5 dark:text-slate-200">확인 ({acks.length})</p>
          <p className="text-green-700 dark:text-green-300">
            {acks.length > 0 ? acks.map(a => a.name).join(', ') : <span className="text-slate-400">아직 없음</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
