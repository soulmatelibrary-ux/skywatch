import { useMemo, useState } from 'react';
import type { ParticipantIn, User } from '../../types/log';

interface Props {
  date: string;
  shiftType: string;
  participants: ParticipantIn[];
  onChange: (participants: ParticipantIn[]) => void;
  users: User[];
  dutyUserIds: Set<number>;
  isLoading: boolean;
}

function formatTeam(team: string) {
  return team === 'day' ? '주간' : `${team}조`;
}

export function AdditionalWorkerSelectorCompact({ participants, onChange, users, dutyUserIds, isLoading }: Props) {
  const [candidateAdditionalId, setCandidateAdditionalId] = useState('');

  const primaryParticipant = participants.find(participant => participant.role === 'primary') ?? null;
  const additionalParticipants = participants.filter(participant => participant.role !== 'primary');

  const sortedUsers = useMemo(() => {
    const dutyUsers = users.filter(user => dutyUserIds.has(user.id));
    const otherUsers = users.filter(user => !dutyUserIds.has(user.id));
    return [...dutyUsers, ...otherUsers];
  }, [users, dutyUserIds]);

  const additionalOptions = sortedUsers.filter(user => user.id !== primaryParticipant?.user_id && !additionalParticipants.some(participant => participant.user_id === user.id));

  function addAdditionalWorker() {
    const userId = Number(candidateAdditionalId);
    if (!userId || participants.some(participant => participant.user_id === userId)) return;
    onChange([...participants, { user_id: userId, role: 'sub' }]);
    setCandidateAdditionalId('');
  }

  function removeParticipant(userId: number) {
    const next = participants.filter(participant => participant.user_id !== userId);

    if (primaryParticipant?.user_id === userId) {
      const fallbackPrimary = next[0];
      if (!fallbackPrimary) {
        onChange([]);
        return;
      }
      onChange([
        { ...fallbackPrimary, role: 'primary' },
        ...next.filter(participant => participant.user_id !== fallbackPrimary.user_id).map(participant => ({ ...participant, role: 'sub' })),
      ]);
      return;
    }

    onChange(next);
  }

  return (
    <>
      <select
        value={candidateAdditionalId}
        onChange={event => setCandidateAdditionalId(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-cyan-400"
        style={{ minWidth: '150px' }}
        disabled={isLoading || additionalOptions.length === 0}
      >
        <option value="">{additionalOptions.length > 0 ? '추가 선택' : '추가 불가'}</option>
        {additionalOptions.map(user => (
          <option key={user.id} value={user.id}>
            {user.name} ({formatTeam(user.team)}){dutyUserIds.has(user.id) ? ' · 배정' : ''}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={addAdditionalWorker}
        disabled={!candidateAdditionalId}
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        추가
      </button>

      {primaryParticipant && (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] text-blue-700 shrink-0 dark:border-cyan-400/30 dark:bg-cyan-500/15 dark:text-cyan-200">
          <span>{users.find(user => user.id === primaryParticipant.user_id)?.name ?? '미선택'}</span>
          <button type="button" onClick={() => removeParticipant(primaryParticipant.user_id)} className="text-blue-400 hover:text-blue-700 dark:text-cyan-200 dark:hover:text-white">×</button>
        </div>
      )}

      {additionalParticipants.map(participant => {
        const user = users.find(item => item.id === participant.user_id);
        return (
          <div key={participant.user_id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600 shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span>{user ? `${user.name} (${formatTeam(user.team)})` : participant.user_id}</span>
            <button type="button" onClick={() => removeParticipant(participant.user_id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100">×</button>
          </div>
        );
      })}
    </>
  );
}
