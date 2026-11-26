import { useState } from 'react';
import type { CardCategory } from '../../types/log';
import type { useCategoryManager } from '../../hooks/useCategoryManager';
import { ColorPicker } from '../common/ColorPicker';

type Manager = ReturnType<typeof useCategoryManager>;

interface EditState { name: string; color: string; sort_order: number; }

function Row({ cat, onSave, onDelete }: {
  cat: CardCategory;
  onSave: (id: number, b: { name?: string; color?: string | null; sort_order?: number; is_active?: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>({ name: cat.name, color: cat.color ?? '', sort_order: cat.sort_order });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form.name.trim()) { setError('이름을 입력하세요.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(cat.id, { name: form.name, color: form.color || undefined, sort_order: form.sort_order });
      setEditing(false);
    } catch {
      setError('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (editing) return (
    <>
      <tr className="bg-blue-50/60 dark:bg-blue-900/20">
        <td className="px-4 py-2"><input className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 w-full text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={saving} /></td>
        <td className="px-4 py-2"><ColorPicker value={form.color || '#6b7280'} onChange={c => setForm(f => ({ ...f, color: c }))} disabled={saving} /></td>
        <td className="px-4 py-2"><input type="number" className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 w-16 text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} disabled={saving} /></td>
        <td className="px-4 py-2 text-center text-slate-400 dark:text-slate-500">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1.5">
            <button onClick={save} disabled={saving} className="text-[12px] bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">저장</button>
            <button onClick={() => { setEditing(false); setForm({ name: cat.name, color: cat.color ?? '', sort_order: cat.sort_order }); setError(null); }} disabled={saving} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">취소</button>
          </div>
        </td>
      </tr>
      {error && <tr><td colSpan={5} className="px-4 py-1.5 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800"><span className="text-[12px] text-red-600 dark:text-red-400">{error}</span></td></tr>}
    </>
  );

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
      <td className="px-4 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">{cat.name}</td>
      <td className="px-4 py-2"><span className="inline-block w-5 h-5 rounded-full border border-white dark:border-slate-600 shadow-sm" style={{ background: cat.color ?? '#e5e7eb' }} /></td>
      <td className="px-4 py-2 text-[13px] text-slate-400 dark:text-slate-400">{cat.sort_order}</td>
      <td className="px-4 py-2 text-center">
        <button onClick={() => onSave(cat.id, { is_active: !cat.is_active })} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${cat.is_active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
          {cat.is_active ? '활성' : '비활성'}
        </button>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1.5">
          <button onClick={() => setEditing(true)} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">수정</button>
          <button onClick={() => onDelete(cat.id)} className="text-[12px] border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">비활성화</button>
        </div>
      </td>
    </tr>
  );
}

export function CategoryManager({ manager }: { manager: Manager }) {
  const { items, loading, error, create, update, remove } = manager;
  const [form, setForm] = useState({ name: '', color: '#6b7280', sort_order: 0 });
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'sort_order' | 'is_active'>('sort_order');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: 'name' | 'sort_order' | 'is_active') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortBy];
    let bVal: any = b[sortBy];

    if (typeof aVal === 'string') {
      const cmp = aVal.localeCompare(bVal);
      return sortAsc ? cmp : -cmp;
    }
    const cmp = (aVal ?? 0) - (bVal ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  const [addError, setAddError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.name.trim()) { setAddError('이름을 입력하세요.'); return; }
    try {
      await create({ name: form.name.trim(), color: form.color, sort_order: form.sort_order });
      setForm({ name: '', color: '#6b7280', sort_order: 0 });
      setAdding(false);
      setAddError(null);
    } catch {
      setAddError('저장에 실패했습니다.');
    }
  };

  if (loading) return <p className="text-sm text-gray-400 p-4">불러오는 중…</p>;
  if (error) return <p className="text-sm text-red-500 p-4">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">카테고리 목록</h2>
        <button onClick={() => setAdding(v => !v)} className="text-[13px] font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ 추가</button>
      </div>
      {adding && (
        <>
          <div className="flex gap-3 items-end mb-2 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <div className="flex-1"><label className="text-[12px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">이름</label><input className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 w-full text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-[12px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">색상</label><ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} /></div>
            <div><label className="text-[12px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">순서</label><input type="number" className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 w-16 text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} /></div>
            <button onClick={submit} className="text-[13px] font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">저장</button>
            <button onClick={() => { setAdding(false); setAddError(null); }} className="text-[13px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">취소</button>
          </div>
          {addError && <p className="mb-3 text-[12px] text-red-500 dark:text-red-400">{addError}</p>}
        </>
      )}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('name')}>
                이름 {sortBy === 'name' && <span className="text-slate-400">{sortAsc ? '▲' : '▼'}</span>}
              </th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">색상</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('sort_order')}>
                순서 {sortBy === 'sort_order' && <span className="text-slate-400">{sortAsc ? '▲' : '▼'}</span>}
              </th>
              <th className="px-4 py-2 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('is_active')}>
                상태 {sortBy === 'is_active' && <span className="text-slate-400">{sortAsc ? '▲' : '▼'}</span>}
              </th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(cat => <Row key={cat.id} cat={cat} onSave={update} onDelete={remove} />)}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-[13px]">카테고리가 없습니다</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
