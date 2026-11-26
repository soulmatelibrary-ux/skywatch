import { useState } from 'react';
import type { Task, TaskCreate } from '../../types/task';
import type { UserSimple } from '../../services/api/usersApi';
import { useUIStore } from '../../store/uiStore';
import { formatDueDateInput } from '../../utils/taskDate';

type Mode = 'all' | 'team' | 'individual';
const TEAMS = ['A', 'B', 'C', 'D', 'day'];

interface Props {
  task?: Task;
  users: UserSimple[];
  onSave: (data: TaskCreate) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ task, users, onSave, onCancel }: Props) {
  const { addToast } = useUIStore();
  const toMode = (m: string): Mode => m === 'teams' ? 'team' : m === 'individual' ? 'individual' : 'all';
  const [title, setTitle] = useState(task?.title ?? '');
  const [body, setBody] = useState(task?.body ?? '');
  const [importance, setImportance] = useState<'high' | 'normal' | 'low'>(
    (task?.importance as 'high' | 'normal' | 'low') ?? 'normal'
  );
  const [dueDate, setDueDate] = useState(formatDueDateInput(task?.due_date ?? ''));
  const [mode, setMode] = useState<Mode>(toMode(task?.recipients_mode ?? 'all'));
  const [teams, setTeams] = useState<string[]>(task?.target_teams ?? []);
  const [recipients, setRecipients] = useState<number[]>(task?.recipients ?? []);
  const [saving, setSaving] = useState(false);

  const activeUsers = users.filter(u => u.is_active);
  const toggleTeam = (t: string) => setTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleUser = (id: number) => setRecipients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (mode === 'team' && teams.length === 0) { addToast('조를 선택하세요.', 'warning'); return; }
    if (mode === 'individual' && recipients.length === 0) { addToast('수신자를 선택하세요.', 'warning'); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        body: body || undefined,
        importance: importance as any,
        due_date: task ? (dueDate || '') : (dueDate || undefined),  // 수정 시 빈 문자열 = 마감일 삭제
        recipients_mode: mode === 'team' ? 'teams' : mode,
        target_teams: mode === 'team' ? teams : [],
        recipients: mode === 'individual' ? recipients : [],
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
        ?? (err as { message?: string })?.message
        ?? '저장에 실패했습니다.';
      addToast(msg, 'error');
      console.error('[TaskForm] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const cls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-[14px] bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-[18px] font-bold text-slate-800">{task ? '업무 수정' : '새 업무 작성'}</h3>
        <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600 text-[13px] border border-slate-200 px-3 py-1 rounded-lg transition">취소</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">제목 <span className="text-red-500">*</span></label>
          <input className={cls} value={title} onChange={e => setTitle(e.target.value)} placeholder="업무 제목을 입력하세요" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">내용</label>
          <textarea className={`${cls} resize-none`} rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="상세 내용 (선택)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-600 mb-1">중요도</label>
            <select className={cls} value={importance} onChange={e => setImportance(e.target.value as 'high' | 'normal' | 'low')}>
              <option value="high">긴급</option>
              <option value="normal">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-600 mb-1">마감일</label>
            <input type="datetime-local" className={cls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-2">수신 대상 <span className="text-red-500">*</span></label>
          <div className="flex gap-2 mb-3">
            {(['all', 'team', 'individual'] as Mode[]).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`px-3 py-1.5 border rounded-lg text-[13px] font-medium transition ${mode === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>
                {m === 'all' ? '전체' : m === 'team' ? '조 선택' : '개별 선택'}
              </button>
            ))}
          </div>
          {mode === 'team' && (
            <div className="flex flex-wrap gap-2">
              {TEAMS.map(t => (
                <button key={t} type="button" onClick={() => toggleTeam(t)}
                  className={`px-3 py-1.5 border rounded-lg text-[13px] transition ${teams.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>
                  {t === 'day' ? '일근' : `${t}조`}
                </button>
              ))}
            </div>
          )}
          {mode === 'individual' && (
            <div className="flex flex-wrap gap-2">
              {activeUsers.map(u => (
                <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                  className={`px-3 py-1.5 border rounded-lg text-[13px] transition flex items-center gap-1.5 ${recipients.includes(u.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>
                  <span>{u.name}</span>
                  <span className="text-[10px] opacity-70">{u.team === 'day' ? '일근' : `${u.team}조`}</span>
                </button>
              ))}
            </div>
          )}
          {mode === 'all' && (
            <p className="text-[13px] text-slate-400">전체 활성 사용자 <span className="font-semibold text-slate-600">{activeUsers.length}명</span>에게 발송됩니다.</p>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || !title.trim()}
        className="w-full mt-6 py-2.5 bg-blue-700 hover:bg-blue-900 text-white rounded-lg text-[15px] font-semibold transition disabled:opacity-50">
        {saving ? '저장 중...' : task ? '저장' : '업무 등록'}
      </button>
    </div>
  );
}
