import { useState } from 'react';
import type { UserAdmin, UserCreateBody, UserUpdateBody } from '../../services/api/usersApi';

const ROLES = [{ v: 'shift_worker', l: '교대근무자' }, { v: 'day_worker', l: '주간근무자' }, { v: 'admin', l: '관리자' }];
const TEAMS = ['A', 'B', 'C', 'D', 'day'];

interface Props {
  editTarget: UserAdmin | null;
  onClose: () => void;
  onCreate: (body: UserCreateBody) => Promise<void>;
  onUpdate: (id: number, body: UserUpdateBody) => Promise<void>;
}

export function UserManagerForm({ editTarget, onClose, onCreate, onUpdate }: Props) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState({
    name: editTarget?.name ?? '',
    login_id: editTarget?.login_id ?? '',
    role: editTarget?.role ?? 'shift_worker',
    team: editTarget?.team ?? 'A',
    grade: editTarget?.grade ?? '',
    sort_order: editTarget?.sort_order ?? 0,
    joined_at: editTarget?.joined_at ?? '',
    note: editTarget?.note ?? '',
    no_excel: editTarget?.no_excel ?? false,
    password: '',
    is_active: editTarget?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const f = (field: string, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));

  const submit = async () => {
    if (!form.name.trim()) { setErr('이름을 입력하세요.'); return; }
    if (!form.login_id.trim()) { setErr('사번을 입력하세요.'); return; }
    if (!isEdit && !form.password) { setErr('비밀번호를 입력하세요.'); return; }
    setSaving(true); setErr(null);
    try {
      if (isEdit) {
        await onUpdate(editTarget!.id, {
          name: form.name.trim(), login_id: form.login_id.trim(),
          role: form.role, team: form.team,
          grade: form.grade || null, sort_order: form.sort_order,
          joined_at: form.joined_at || null, note: form.note || null,
          no_excel: form.no_excel, is_active: form.is_active,
        });
      } else {
        await onCreate({
          name: form.name.trim(), login_id: form.login_id.trim(),
          role: form.role, team: form.team, grade: form.grade || null,
          password: form.password, sort_order: form.sort_order,
          joined_at: form.joined_at || null, note: form.note || null,
          no_excel: form.no_excel,
        });
      }
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErr(msg ?? '저장 실패');
    } finally { setSaving(false); }
  };

  const inputCls = 'border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';
  const labelCls = 'text-xs text-slate-500 dark:text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-xl w-[480px] p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-4">{isEdit ? '사용자 수정' : '사용자 추가'}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>이름 *</span>
            <input className={inputCls} value={form.name} onChange={e => f('name', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>사번 *</span>
            <input className={inputCls} value={form.login_id} onChange={e => f('login_id', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>역할</span>
            <select className={inputCls} value={form.role} onChange={e => f('role', e.target.value)}>
              {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>조</span>
            <select className={inputCls} value={form.team} onChange={e => f('team', e.target.value)}>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>직급</span>
            <input className={inputCls} value={form.grade} onChange={e => f('grade', e.target.value)} placeholder="예: 3급" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>표시 순서</span>
            <input type="number" className={inputCls} value={form.sort_order} onChange={e => f('sort_order', +e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>입사일</span>
            <input type="date" className={inputCls} value={form.joined_at} onChange={e => f('joined_at', e.target.value)} />
          </label>
          {!isEdit && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>비밀번호 *</span>
              <input type="password" className={inputCls} value={form.password} onChange={e => f('password', e.target.value)} />
            </label>
          )}
          {isEdit && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>상태</span>
              <select className={inputCls} value={form.is_active ? 'active' : 'inactive'} onChange={e => f('is_active', e.target.value === 'active')}>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </label>
          )}
          <label className="col-span-2 flex flex-col gap-1">
            <span className={labelCls}>비고</span>
            <input className={inputCls} value={form.note} onChange={e => f('note', e.target.value)} />
          </label>
          <label className="col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.no_excel} onChange={e => f('no_excel', e.target.checked)} />
            <span className="text-xs text-slate-600 dark:text-slate-400">엑셀 출력 제외</span>
          </label>
        </div>
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700">취소</button>
          <button onClick={submit} disabled={saving} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
