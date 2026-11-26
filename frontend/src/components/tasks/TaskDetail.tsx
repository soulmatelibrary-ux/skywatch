import { useState } from 'react';
import { formatDateTimeISO } from '../../utils/dateUtils';
import type { Task } from '../../types/task';
import type { UserSimple } from '../../services/api/usersApi';
import { formatDueDateDisplay, isDueOverdue } from '../../utils/taskDate';

const IMP_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700', normal: 'bg-amber-100 text-amber-700', low: 'bg-green-100 text-green-700',
};
const IMP_LABEL: Record<string, string> = { high: '긴급', normal: '보통', low: '낮음' };

interface Props {
  task: Task;
  users: UserSimple[];
  currentUserId: number;
  isAdmin: boolean;
  onComplete?: () => Promise<void>;
  onEdit?: () => void;
  onDelete: () => Promise<void>;
}

export function TaskDetail({ task, users, currentUserId, isAdmin, onComplete, onEdit, onDelete }: Props) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const getUser = (id: number) => users.find(u => u.id === id);
  const isOverdue = isDueOverdue(task.due_date);
  const rate = task.recipients.length === 0 ? 0 : Math.round(task.completed_by.length / task.recipients.length * 100);
  const myDone = task.completed_by.includes(currentUserId);
  const amRecipient = task.recipients.includes(currentUserId);
  const canDelete = task.sender_id === currentUserId || isAdmin;
  const canEdit = task.sender_id === currentUserId || isAdmin;

  return (
    <div className="p-8 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${IMP_BADGE[task.importance]}`}>
              {IMP_LABEL[task.importance]}
            </span>
            {isOverdue && !myDone && (
              <span className="text-[11px] bg-red-100 text-red-600 font-bold px-2.5 py-0.5 rounded-full">⚠ 마감 초과</span>
            )}
            {rate === 100 && (
              <span className="text-[11px] bg-green-100 text-green-700 font-bold px-2.5 py-0.5 rounded-full">✓ 전원 완료</span>
            )}
          </div>
          <h3 className="text-[20px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{task.title}</h3>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">발송: {getUser(task.sender_id)?.name ?? '?'} · {formatDateTimeISO(task.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {amRecipient && onComplete && (
            <button
              onClick={onComplete}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition ${myDone ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}>
              {myDone ? '✓ 완료됨 (취소)' : '완료 처리'}
            </button>
          )}
          {canEdit && onEdit && (
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">수정</button>
          )}
          {canDelete && !deleteConfirm && (
            <button onClick={() => setDeleteConfirm(true)} className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">삭제</button>
          )}
          {canDelete && deleteConfirm && (
            <>
              <button onClick={onDelete} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white transition">정말 삭제</button>
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg text-[13px] border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">취소</button>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 mb-6 text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {task.body || '(내용 없음)'}
      </div>

      {/* 마감일 */}
      <div className="flex items-center gap-2 mb-6 text-[14px]">
        <span className="text-slate-500 dark:text-slate-400">마감</span>
        <span className={`font-semibold ${isOverdue && !myDone ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
          {formatDueDateDisplay(task.due_date)}
        </span>
      </div>

      {/* 완료 현황 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">수신자 완료 현황</h4>
          <span className="text-[13px] text-slate-400 dark:text-slate-500">{task.completed_by.length}/{task.recipients.length}명 완료</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${rate === 100 ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-blue-500'}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={`text-[13px] font-bold ${rate === 100 ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}`}>{rate}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {task.recipients.map(uid => {
            const u = getUser(uid);
            const done = task.completed_by.includes(uid);
            return (
              <div key={uid} className={`flex items-center gap-2 p-3 rounded-xl border text-[13px] transition ${done ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                  {done && <span className="text-white text-[10px] font-bold">✓</span>}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{u?.name ?? uid}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">{u?.team === 'day' ? '일근' : u?.team ? u.team + '조' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
