import { useState } from 'react';
import type { useNoticeManager } from '../../hooks/useNoticeManager';

type Manager = ReturnType<typeof useNoticeManager>;

const today = () => new Date().toISOString().slice(0, 10);

export function NoticeManager({ manager }: { manager: Manager }) {
  const { items, loading, error, create, remove } = manager;
  const [text, setText] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'text' | 'start_date' | 'end_date'>('start_date');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (field: 'text' | 'start_date' | 'end_date') => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(field === 'start_date' ? false : true); }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortBy], bVal: any = b[sortBy];
    if (typeof aVal === 'string') { const cmp = aVal.localeCompare(bVal); return sortAsc ? cmp : -cmp; }
    return sortAsc ? (aVal ?? 0) - (bVal ?? 0) : (bVal ?? 0) - (aVal ?? 0);
  });

  const handleAdd = async () => {
    if (!text.trim()) { setFormErr('공지 내용을 입력하세요.'); return; }
    if (endDate < startDate) { setFormErr('종료일은 시작일 이후여야 합니다.'); return; }
    setSaving(true); setFormErr(null);
    try {
      await create({ text: text.trim(), start_date: startDate, end_date: endDate });
      setText(''); setStartDate(today()); setEndDate(today());
    } catch { setFormErr('저장 실패'); } finally { setSaving(false); }
  };

  const isExpired = (end: string) => end < today();

  if (loading) return <div className="text-[14px] text-slate-400 py-4">불러오는 중...</div>;
  if (error) return <div className="text-[14px] text-red-500 py-4">{error}</div>;

  const inputCls = 'px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300';

  return (
    <div>
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <h3 className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 mb-3">공지 추가</h3>
        <div className="flex flex-col gap-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="공지 내용 입력..." className={`w-full ${inputCls}`} />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              시작일
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
            </label>
            <label className="text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              종료일
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[13px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
            </label>
            <button onClick={handleAdd} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중...' : '추가'}
            </button>
          </div>
          {formErr && <p className="text-[12px] text-red-500 dark:text-red-400">{formErr}</p>}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[14px] text-slate-400 dark:text-slate-500">등록된 공지가 없습니다.</p>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                <th className="px-4 py-2 text-[12px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('text')}>
                  내용 {sortBy === 'text' && <span>{sortAsc ? '▲' : '▼'}</span>}
                </th>
                <th className="px-4 py-2 text-[12px] font-semibold w-28 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('start_date')}>
                  시작일 {sortBy === 'start_date' && <span>{sortAsc ? '▲' : '▼'}</span>}
                </th>
                <th className="px-4 py-2 text-[12px] font-semibold w-28 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none transition-colors" onClick={() => toggleSort('end_date')}>
                  종료일 {sortBy === 'end_date' && <span>{sortAsc ? '▲' : '▼'}</span>}
                </th>
                <th className="px-4 py-2 text-[12px] font-semibold w-20 text-center">상태</th>
                <th className="px-4 py-2 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors ${isExpired(item.end_date) ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{item.text}</td>
                  <td className="px-4 py-2 text-center text-slate-500 dark:text-slate-400">{item.start_date}</td>
                  <td className="px-4 py-2 text-center text-slate-500 dark:text-slate-400">{item.end_date}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                      isExpired(item.end_date)
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                    }`}>
                      {isExpired(item.end_date) ? '만료' : '표시중'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => remove(item.id)} className="text-[12px] border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
