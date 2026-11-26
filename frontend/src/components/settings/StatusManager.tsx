import { useState } from 'react';
import type { CardStatusItem } from '../../types/log';
import type { useCardStatusManager } from '../../hooks/useCardStatusManager';
import { ColorPicker } from '../common/ColorPicker';

type Manager = ReturnType<typeof useCardStatusManager>;

function Row({ item, onSave, onDelete }: {
  item: CardStatusItem;
  onSave: (id: number, b: { label?: string; color?: string | null; sort_order?: number; is_active?: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: item.label, color: item.color ?? '#6b7280', sort_order: item.sort_order });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form.label.trim()) { setError('이름을 입력하세요.'); return; }
    setSaving(true); setError(null);
    try {
      await onSave(item.id, { label: form.label, color: form.color || null, sort_order: form.sort_order });
      setEditing(false);
    } catch { setError('저장 실패'); } finally { setSaving(false); }
  };

  if (editing) return (
    <>
      <tr className="bg-blue-50/60 dark:bg-blue-900/20">
        <td className="px-4 py-2 text-[12px] font-mono text-slate-400 dark:text-slate-500">{item.key}</td>
        <td className="px-4 py-2"><input className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 w-full text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} disabled={saving} /></td>
        <td className="px-4 py-2"><ColorPicker value={form.color || '#6b7280'} onChange={c => setForm(f => ({ ...f, color: c }))} disabled={saving} /></td>
        <td className="px-4 py-2"><input type="number" className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 w-16 text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} disabled={saving} /></td>
        <td className="px-4 py-2 text-center text-slate-400 dark:text-slate-500">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1.5">
            <button onClick={save} disabled={saving} className="text-[12px] bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">저장</button>
            <button onClick={() => { setEditing(false); setForm({ label: item.label, color: item.color ?? '#6b7280', sort_order: item.sort_order }); setError(null); }} disabled={saving} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">취소</button>
          </div>
        </td>
      </tr>
      {error && <tr><td colSpan={6} className="px-4 py-1.5 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800"><span className="text-[12px] text-red-600 dark:text-red-400">{error}</span></td></tr>}
    </>
  );

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
      <td className="px-4 py-2 text-[12px] font-mono text-slate-400 dark:text-slate-500">{item.key}</td>
      <td className="px-4 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">{item.label}</td>
      <td className="px-4 py-2"><span className="inline-block w-5 h-5 rounded-full border border-white dark:border-slate-600 shadow-sm" style={{ background: item.color ?? '#e5e7eb' }} /></td>
      <td className="px-4 py-2 text-[13px] text-slate-400 dark:text-slate-500">{item.sort_order}</td>
      <td className="px-4 py-2 text-center">
        {item.is_system
          ? <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600">시스템</span>
          : <button onClick={() => onSave(item.id, { is_active: !item.is_active })} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${item.is_active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{item.is_active ? '활성' : '비활성'}</button>
        }
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1.5">
          <button onClick={() => setEditing(true)} className="text-[12px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">수정</button>
          <button
            onClick={() => {
              const msg = item.is_system
                ? `"${item.label}"은(는) 시스템 상태입니다. 삭제하면 이 상태의 카드가 모두 진행중으로 변경됩니다. 계속하시겠습니까?`
                : `"${item.label}" 상태를 삭제하시겠습니까?`;
              if (confirm(msg)) onDelete(item.id);
            }}
            className="text-[12px] border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >삭제</button>
        </div>
      </td>
    </tr>
  );
}

export function StatusManager({ manager }: { manager: Manager }) {
  const { items, loading, error, clearError, create, update, remove } = manager;
  const [form, setForm] = useState({ key: '', label: '', color: '#6b7280', sort_order: 0 });
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<'key' | 'label' | 'sort_order' | 'is_active'>('sort_order');
  const [sortAsc, setSortAsc] = useState(true);
  const [addError, setAddError] = useState<string | null>(null);

  const toggleSort = (field: 'key' | 'label' | 'sort_order' | 'is_active') => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortBy], bVal: any = b[sortBy];
    if (typeof aVal === 'string') { const cmp = aVal.localeCompare(bVal); return sortAsc ? cmp : -cmp; }
    const cmp = (aVal ?? 0) - (bVal ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  const submit = async () => {
    if (!form.key.trim() || !form.label.trim()) { setAddError('키와 이름을 모두 입력하세요.'); return; }
    try {
      await create({ key: form.key.trim(), label: form.label.trim(), color: form.color, sort_order: form.sort_order });
      setForm({ key: '', label: '', color: '#6b7280', sort_order: 0 });
      setAdding(false); setAddError(null);
    } catch { setAddError('저장에 실패했습니다.'); }
  };

  if (loading) return <p className="text-sm text-gray-400 p-4">불러오는 중…</p>;
  if (error) return (
    <div className="flex items-center gap-2 p-4 text-sm text-red-500 dark:text-red-400">
      <span>{error}</span>
      <button onClick={clearError} className="ml-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 text-base leading-none">✕</button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">카드 상태 목록</h2>
        <button onClick={() => setAdding(v => !v)} className="text-[13px] font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ 추가</button>
      </div>
      {adding && (
        <>
          <div className="flex gap-3 items-end mb-2 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex-wrap">
            <div><label className="text-[12px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">키 (영문)</label><input className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 w-28 text-[13px] font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="예: pending" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} /></div>
            <div className="flex-1 min-w-28"><label className="text-[12px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">표시 이름</label><input className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 w-full text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></div>
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
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('key')}>키 {sortBy === 'key' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('label')}>이름 {sortBy === 'label' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">색상</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('sort_order')}>순서 {sortBy === 'sort_order' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className="px-4 py-2 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('is_active')}>상태 {sortBy === 'is_active' && <span>{sortAsc ? '▲' : '▼'}</span>}</th>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 dark:text-slate-400">액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(s => <Row key={s.id} item={s} onSave={update} onDelete={remove} />)}
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-[13px]">상태가 없습니다</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
