// 근무자 편집 패널 (저장 시 API 호출)
import { useState } from 'react';
import type { UserSimple } from '../../services/api/usersApi';

interface Props {
  shift: string;
  allUsers: UserSimple[];
  initUserIds: number[];
  initLeaveIds: number[];
  initTempNames: string[];
  saving: boolean;
  onSave: (userIds: number[], leaveIds: number[], tempNames: string[]) => void;
  onClose: () => void;
}

export function WorkerEditPanel({
  shift, allUsers, initUserIds, initLeaveIds, initTempNames, saving, onSave, onClose,
}: Props) {
  const [editUsers, setEditUsers] = useState<number[]>(initUserIds);
  const [editLeave, setEditLeave] = useState<number[]>(initLeaveIds);
  const [tempNames, setTempNames] = useState<string[]>(initTempNames);
  const [tempInput, setTempInput] = useState('');

  const toggleUser = (id: number) =>
    setEditUsers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleLeave = (id: number) =>
    setEditLeave(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addTemp = () => {
    const name = tempInput.trim();
    if (!name) return;
    setTempNames(p => [...p, name]);
    setTempInput('');
  };
  const removeTemp = (i: number) => setTempNames(p => p.filter((_, idx) => idx !== i));

  return (
    <div className="mt-3 border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-5 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[15px] text-blue-800 dark:text-blue-300">{shift} 근무자 편집</span>
        <button onClick={onClose} className="ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-[13px]">닫기</button>
      </div>

      <div>
        <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
          정규 근무자 <span className="font-normal text-slate-400 dark:text-slate-500">(클릭으로 추가/제거)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allUsers.map(u => (
            <button key={u.id} onClick={() => toggleUser(u.id)}
              className={[
                'px-3 py-1.5 border rounded-lg text-[13px] transition flex items-center gap-1.5',
                editUsers.includes(u.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300',
              ].join(' ')}>
              <span>{u.name}</span>
              <span className="text-[10px] opacity-70">{u.team === 'day' ? '일근' : u.team + '조'}</span>
            </button>
          ))}
        </div>
        {editUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800/30 items-center">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">휴가 처리:</span>
            {editUsers.map(uid => {
              const name = allUsers.find(u => u.id === uid)?.name ?? String(uid);
              return (
                <button key={uid} onClick={() => toggleLeave(uid)}
                  className={[
                    'px-2 py-0.5 border rounded text-[12px] transition',
                    editLeave.includes(uid)
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-white text-slate-400 border-slate-200',
                  ].join(' ')}>
                  {name}{editLeave.includes(uid) ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-blue-100 dark:border-blue-800/30 pt-3">
        <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-2">임시 근무자</div>
        <div className="space-y-1.5 mb-2">
          {tempNames.length === 0 && <div className="text-[12px] text-slate-300 dark:text-slate-600 py-1">등록된 임시 근무자 없음</div>}
          {tempNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2 bg-white dark:bg-[#1e293b] border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
              <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">{name}</span>
              <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 rounded">임시</span>
              <button onClick={() => removeTemp(i)}
                className="ml-auto text-red-400 hover:text-red-600 text-[12px] px-2 py-0.5 rounded border border-transparent hover:border-red-200 hover:bg-red-50 transition">
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={tempInput} onChange={e => setTempInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTemp()}
            placeholder="이름 입력 후 Enter"
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0f172a] dark:text-slate-200 dark:placeholder-slate-500" />
          <button onClick={addTemp}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[13px] font-medium transition whitespace-nowrap">
            + 추가
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-blue-100 dark:border-blue-800/30">
        <button
          onClick={() => onSave(editUsers, editLeave, tempNames)}
          disabled={saving}
          className="px-4 py-1.5 bg-[#1e40af] hover:bg-[#1e3a8a] disabled:opacity-60 text-white rounded-lg text-[14px] font-medium transition">
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onClose}
          className="px-4 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition">
          취소
        </button>
      </div>
    </div>
  );
}
