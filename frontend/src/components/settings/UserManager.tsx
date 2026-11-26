import { useState } from 'react';
import type { useUserManager } from '../../hooks/useUserManager';
import type { UserAdmin } from '../../services/api/usersApi';
import { useUIStore } from '../../store/uiStore';
import { UserManagerForm } from './UserManagerForm';

type Manager = ReturnType<typeof useUserManager>;

const ROLE_LABEL: Record<string, string> = { shift_worker: '교대', day_worker: '주간', admin: '관리자' };

function PwResetModal({ user, onClose, onReset }: { user: UserAdmin; onClose: () => void; onReset: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!pw || pw.length < 4) return;
    setSaving(true);
    try { await onReset(pw); onClose(); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 mb-4">{user.name} 비밀번호 초기화</p>
        <input
          type="password"
          className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
          placeholder="새 비밀번호 (4자 이상)"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && pw.length >= 4) submit(); }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[13px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">취소</button>
          <button onClick={submit} disabled={saving || pw.length < 4} className="text-[13px] bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">초기화</button>
        </div>
      </div>
    </div>
  );
}

export function UserManager({ manager }: { manager: Manager }) {
  const { items, loading, error, create, update, deactivate, resetPassword } = manager;
  const [formTarget, setFormTarget] = useState<UserAdmin | null | 'new'>(null);
  const [pwTarget, setPwTarget] = useState<UserAdmin | null>(null);
  const { addToast } = useUIStore();
  const [sortBy, setSortBy] = useState<'sort_order' | 'name' | 'login_id' | 'role' | 'team'>('sort_order');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: 'sort_order' | 'name' | 'login_id' | 'role' | 'team') => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortBy], bVal: any = b[sortBy];
    if (typeof aVal === 'string') { const cmp = aVal.localeCompare(bVal); return sortAsc ? cmp : -cmp; }
    const cmp = (aVal ?? 0) - (bVal ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  if (loading) return <p className="text-sm text-gray-400 p-4">불러오는 중…</p>;
  if (error) return <p className="text-sm text-red-500 p-4">{error}</p>;

  const th = 'px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">사용자 목록 <span className="text-[13px] font-normal text-slate-400">({items.length}명)</span></h2>
        <button onClick={() => setFormTarget('new')} className="text-[13px] font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ 추가</button>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700">
              <th className={th} onClick={() => toggleSort('sort_order')}>순서 {sortBy === 'sort_order' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className={th} onClick={() => toggleSort('name')}>이름 {sortBy === 'name' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className={th} onClick={() => toggleSort('login_id')}>사번 {sortBy === 'login_id' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className={th} onClick={() => toggleSort('role')}>역할 {sortBy === 'role' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className={th} onClick={() => toggleSort('team')}>조 {sortBy === 'team' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">직급</th>
              <th className="px-4 py-2 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">상태</th>
              <th className="px-4 py-2 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">엑셀제외</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(u => (
              <tr key={u.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2 text-slate-400 dark:text-slate-500">{u.sort_order}</td>
                <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{u.name}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono text-[12px]">{u.login_id}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{u.team}</td>
                <td className="px-4 py-2 text-slate-400 dark:text-slate-500">{u.grade ?? '—'}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${u.is_active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600'}`}>
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-slate-400 dark:text-slate-500">{u.no_excel ? '●' : '—'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFormTarget(u)} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">수정</button>
                    <button onClick={() => setPwTarget(u)} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">비밀번호</button>
                    {u.is_active && (
                      <button onClick={() => deactivate(u.id)} className="text-[12px] border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">비활성화</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">사용자가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {formTarget !== null && (
        <UserManagerForm editTarget={formTarget === 'new' ? null : formTarget} onClose={() => setFormTarget(null)} onCreate={create} onUpdate={update} />
      )}
      {pwTarget && (
        <PwResetModal user={pwTarget} onClose={() => setPwTarget(null)} onReset={async (pw) => {
          await resetPassword(pwTarget.id, pw);
          addToast(`${pwTarget.name} 사용자의 비밀번호가 초기화되었습니다.`, 'success');
          setPwTarget(null);
        }} />
      )}
    </div>
  );
}
