import { useState } from 'react';
import { formatDateTimeISO } from '../../utils/dateUtils';
import type { RecurringTemplate, RecurringTemplateCreate } from '../../types/task';

const REPEAT_LABELS: Record<string, string> = {
  daily: '매일', weekly: '매주', monthly: '매월', quarterly: '분기별',
};
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const SHIFT_TYPES = ['주간', '야간', '주야', '비번', '휴가'];

type TemplateMode = 'detail' | 'new' | 'edit';

interface Props {
  template: RecurringTemplate | null;
  mode: TemplateMode;
  onSave: (data: RecurringTemplateCreate) => Promise<void>;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: () => void;
  onCancel: () => void;
}

export function TemplatePanel({ template, mode, onSave, onToggle, onDelete, onEdit, onCancel }: Props) {
  const initDraft = (): Partial<RecurringTemplateCreate> =>
    mode === 'edit' && template
      ? { name: template.name, repeat_type: template.repeat_type, repeat_days: template.repeat_days ?? [], template_title: template.template_title ?? '', template_body: template.template_body ?? '', template_importance: template.template_importance, target_teams: template.target_teams, target_shift_types: template.target_shift_types ?? [] }
      : { name: '', repeat_type: 'daily', template_importance: 'normal', target_teams: [], target_shift_types: [] };

  const [draft, setDraft] = useState<Partial<RecurringTemplateCreate>>(initDraft);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const set = (k: keyof RecurringTemplateCreate, v: unknown) => setDraft(prev => ({ ...prev, [k]: v }));

  if (mode === 'detail' && template) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          {!template.is_active && <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full shrink-0">일시 중지</span>}
          <h3 className="text-[18px] font-bold text-slate-800 flex-1">{template.name}</h3>
          <button onClick={onToggle}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition ${template.is_active ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'}`}>
            {template.is_active ? '일시 중지' : '활성화'}
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition">수정</button>
          {!deleteConfirm && (
            <button onClick={() => setDeleteConfirm(true)} className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition">삭제</button>
          )}
          {deleteConfirm && (
            <>
              <button onClick={onDelete} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition">정말 삭제</button>
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg text-[12px] border border-slate-200 text-slate-500 hover:bg-slate-50 transition">취소</button>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-[13px] mb-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 mb-1">반복 주기</div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {REPEAT_LABELS[template.repeat_type] ?? template.repeat_type}
              {template.repeat_days?.length ? ' · ' + template.repeat_days.join(', ') : ''}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 mb-1">적용 조</div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{template.target_teams.length ? template.target_teams.join(', ') : '전체'}</div>
          </div>
          {template.target_shift_types && template.target_shift_types.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="text-slate-400 mb-1">적용 근무</div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">{template.target_shift_types.join(', ')}</div>
            </div>
          )}
          {template.next_run_at && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 col-span-2">
              <div className="text-slate-400 mb-1">다음 실행 예정</div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">{formatDateTimeISO(template.next_run_at)}</div>
            </div>
          )}
        </div>
        <p className="text-[12px] text-slate-400">마지막 실행: {template.last_executed_at ? formatDateTimeISO(template.last_executed_at) : '없음'}</p>
      </div>
    );
  }

  const cls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400';
  const handleSave = async () => {
    if (!draft.name) return;
    setSaving(true);
    try { await onSave(draft as RecurringTemplateCreate); } finally { setSaving(false); }
  };
  const toggleDay = (d: string) => {
    const cur = draft.repeat_days ?? [];
    set('repeat_days', cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };
  const toggleShiftType = (st: string) => {
    const cur = draft.target_shift_types ?? [];
    set('target_shift_types', cur.includes(st) ? cur.filter(x => x !== st) : [...cur, st]);
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-[18px] font-bold text-slate-800">{mode === 'new' ? '새 정기 템플릿' : '정기 템플릿 수정'}</h3>
        <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600 text-[13px] border border-slate-200 px-3 py-1 rounded-lg transition">취소</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">이름 *</label>
          <input className={cls} value={draft.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="템플릿 이름" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">태스크 제목</label>
          <input className={cls} value={draft.template_title ?? ''} onChange={e => set('template_title', e.target.value)} placeholder="생성될 Task 제목 (비우면 이름 사용)" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">태스크 본문</label>
          <textarea className={`${cls} resize-none`} rows={3} value={draft.template_body ?? ''} onChange={e => set('template_body', e.target.value)} placeholder="수신자에게 전달할 내용 (선택)" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1">반복 주기</label>
          <div className="flex items-start gap-3 flex-wrap">
            <select className={`${cls} w-auto`} value={draft.repeat_type ?? 'daily'} onChange={e => set('repeat_type', e.target.value)}>
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="quarterly">분기별</option>
            </select>
            {draft.repeat_type === 'weekly' && (
              <div className="flex gap-1">
                {WEEKDAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`w-8 h-8 rounded-lg border text-[12px] font-semibold transition ${(draft.repeat_days ?? []).includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            {draft.repeat_type === 'monthly' && (
              <div className="grid grid-cols-8 gap-1 flex-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(String(day))}
                    className={`w-8 h-8 rounded-lg border text-[11px] font-semibold transition ${(draft.repeat_days ?? []).includes(String(day)) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}>
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-2">적용 근무 (비우면 모든 근무유형)</label>
          <div className="flex flex-wrap gap-2">
            {SHIFT_TYPES.map(st => (
              <button key={st} type="button" onClick={() => toggleShiftType(st)}
                className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition ${(draft.target_shift_types ?? []).includes(st) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-blue-400'}`}>
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !draft.name}
        className="w-full mt-6 py-2.5 bg-blue-700 hover:bg-blue-900 text-white rounded-lg text-[14px] font-semibold transition disabled:opacity-50">
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
