import { useEffect, useState } from 'react';
import { techDocsApi } from '../../services/api/techDocsApi';
import type { Category } from '../../types/techDoc';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface EditRow extends Category {
  _dirty?: boolean;
  _new?: boolean;
}

export function TechDocCategoryManager({ onClose, onSaved }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    techDocsApi.fetchCategoriesForManage().then(r => setRows(r.data.data ?? []));
  }, []);

  const update = (id: number, field: keyof Category, value: unknown) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, _dirty: true } : r));
  };

  const addRow = () => {
    const tempId = -(Date.now());
    setRows(prev => [...prev, {
      id: tempId, project_code: '', category_code: '', name: '', sort_order: 0, is_active: true, _new: true, _dirty: true,
    }]);
  };

  const deactivate = async (id: number) => {
    if (id < 0) { setRows(prev => prev.filter(r => r.id !== id)); return; }
    await techDocsApi.deleteCategory(id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, is_active: false, _dirty: false } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    const errors: string[] = [];
    try {
      for (const row of rows) {
        if (!row._dirty) continue;
        try {
          if (row._new) {
            if (!row.project_code || !row.category_code || !row.name) {
              errors.push(`새 카테고리: 프로젝트/코드/이름 필수`);
              continue;
            }
            await techDocsApi.createCategory({ project_code: row.project_code, category_code: row.category_code, name: row.name, sort_order: row.sort_order });
          } else {
            await techDocsApi.updateCategory(row.id, { name: row.name, sort_order: row.sort_order, is_active: row.is_active });
          }
        } catch {
          errors.push(`"${row.name || row.category_code}" 저장 실패`);
        }
      }
      if (errors.length > 0) {
        alert(`일부 항목 저장 실패:\n${errors.join('\n')}`);
      }
      onSaved();
      if (errors.length === 0) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto max-h-72 border border-slate-200 rounded">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-2 py-1 text-left">프로젝트</th>
              <th className="px-2 py-1 text-left">코드</th>
              <th className="px-2 py-1 text-left">이름</th>
              <th className="px-2 py-1 text-center w-14">순서</th>
              <th className="px-2 py-1 text-center w-10">활성</th>
              <th className="px-2 py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`border-t border-slate-100 ${!row.is_active ? 'opacity-50' : ''}`}>
                <td className="px-2 py-0.5">
                  {row._new
                    ? <input className="w-full border rounded px-1 text-xs" value={row.project_code} onChange={e => update(row.id, 'project_code', e.target.value)} />
                    : <span className="text-slate-600">{row.project_code}</span>}
                </td>
                <td className="px-2 py-0.5">
                  {row._new
                    ? <input className="w-full border rounded px-1 text-xs" value={row.category_code} onChange={e => update(row.id, 'category_code', e.target.value)} />
                    : <span className="text-slate-600">{row.category_code}</span>}
                </td>
                <td className="px-2 py-0.5">
                  <input className="w-full border border-slate-200 rounded px-1 text-xs bg-white" value={row.name} onChange={e => update(row.id, 'name', e.target.value)} />
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="number" className="w-12 border border-slate-200 rounded px-1 text-xs text-center bg-white" value={row.sort_order} onChange={e => update(row.id, 'sort_order', Number(e.target.value))} />
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={row.is_active} onChange={e => update(row.id, 'is_active', e.target.checked)} />
                </td>
                <td className="px-2 py-0.5 text-center">
                  <button onClick={() => deactivate(row.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        <button onClick={addRow} className="px-3 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200">+ 추가</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">닫기</button>
          <button onClick={saveAll} disabled={saving} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
