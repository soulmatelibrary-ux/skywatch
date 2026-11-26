import { useState } from 'react';
import type { LogDetail, ParticipantIn } from '../../types/log';
import type { UserSimple } from '../../services/api/usersApi';

const SHIFT_OPTIONS = ['주간', '야간', '주야', '비번', '휴가'] as const;
const ROLE_LABELS: Record<string, string> = { primary: '주근무', sub: '부근무', support: '지원', overtime: '초과' };

interface SaveData {
  date: string;
  shift_type: string;
  title: string;
  participants: ParticipantIn[];
}

interface Props {
  detail: LogDetail;
  users: UserSimple[];
  isSaving: boolean;
  onSave: (data: SaveData) => void;
  onCancel: () => void;
}

export function LogMetaEditForm({ detail, users, isSaving, onSave, onCancel }: Props) {
  const [date, setDate] = useState(detail.date);
  const [shiftType, setShiftType] = useState<string>(detail.shift_type);
  const [title, setTitle] = useState(detail.title ?? '');
  const [participants, setParticipants] = useState<ParticipantIn[]>(
    detail.participants.map(p => ({
      user_id: p.user_id,
      role: p.role,
      sub_for: p.sub_for ?? null,
      note: p.note ?? null,
    }))
  );
  const [addUserId, setAddUserId] = useState('');

  function addParticipant() {
    const uid = Number(addUserId);
    if (!uid || participants.some(p => p.user_id === uid)) return;
    const role = participants.length === 0 ? 'primary' : 'sub';
    setParticipants(prev => [...prev, { user_id: uid, role, sub_for: null, note: null }]);
    setAddUserId('');
  }

  function removeParticipant(userId: number) {
    setParticipants(prev => prev.filter(p => p.user_id !== userId));
  }

  function changeRole(userId: number, role: string) {
    setParticipants(prev => prev.map(p => p.user_id === userId ? { ...p, role } : p));
  }

  const unusedUsers = users.filter(u => !participants.some(p => p.user_id === u.id));

  const inputCls = 'text-[13px] border border-slate-200 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="bg-slate-50 rounded-xl border border-blue-200 p-3 space-y-3 dark:bg-slate-800/60 dark:border-blue-500/30">
      {/* 날짜 / 주야 / 제목 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-slate-400 dark:text-slate-500">날짜</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-slate-400 dark:text-slate-500">주야</span>
          <select value={shiftType} onChange={e => setShiftType(e.target.value)} className={inputCls}>
            {SHIFT_OPTIONS.map(s => <option key={s} value={s} style={{ color: '#1e293b', background: '#fff' }}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-1 items-center gap-1.5 min-w-[180px]">
          <span className="text-[12px] text-slate-400 dark:text-slate-500 whitespace-nowrap">제목</span>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (선택)"
            className={`${inputCls} flex-1`} />
        </div>
      </div>

      {/* 작성자 (읽기 전용 + 안내) */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-slate-400 dark:text-slate-500">작성자</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{detail.author_name ?? '작성자 없음'}</span>
        <span className="text-amber-600 dark:text-amber-400">※ 작성자 변경은 일지를 삭제 후 재작성하세요.</span>
      </div>

      {/* 참여자 */}
      <div className="space-y-2">
        <span className="text-[12px] text-slate-400 dark:text-slate-500">참여자</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {participants.map(p => {
            const name = users.find(u => u.id === p.user_id)?.name
              ?? detail.participants.find(dp => dp.user_id === p.user_id)?.name
              ?? `#${p.user_id}`;
            return (
              <div key={p.user_id} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1">
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{name}</span>
                <select value={p.role} onChange={e => changeRole(p.user_id, e.target.value)}
                  className="text-[11px] bg-transparent border-none text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => removeParticipant(p.user_id)}
                  className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 ml-0.5 leading-none text-[14px]">×</button>
              </div>
            );
          })}
          {unusedUsers.length > 0 && (
            <div className="flex items-center gap-1">
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                className={`${inputCls} max-w-[150px]`}>
                <option value="">참여자 추가...</option>
                {unusedUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.team}조)</option>)}
              </select>
              <button onClick={addParticipant} disabled={!addUserId}
                className="text-[12px] px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg disabled:opacity-40 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-900/30 transition">
                추가
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 저장 / 취소 */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-2">
        <button onClick={onCancel}
          className="text-[13px] px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 transition">
          취소
        </button>
        <button onClick={() => onSave({ date, shift_type: shiftType, title, participants })}
          disabled={isSaving || !date}
          className="text-[13px] px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
