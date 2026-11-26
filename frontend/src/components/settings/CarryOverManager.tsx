import { useState } from 'react';
import type { useCarryOverManager } from '../../hooks/useCarryOverManager';

type Manager = ReturnType<typeof useCarryOverManager>;

const TEAM_LABEL: Record<string, string> = { A: 'A조', B: 'B조', C: 'C조', D: 'D조', day: '일근' };

export function CarryOverManager({ manager }: { manager: Manager }) {
  const { year, setYear, rows, edited, setHours, loading, saving, error, save, currentYear } = manager;
  const [confirmModal, setConfirmModal] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const changedCount = rows.filter(r => edited[r.user_id] !== r.hours).length;

  const handleSaveClick = () => { if (changedCount === 0) return; setConfirmModal(true); };
  const handleConfirmSave = async () => { await save(); setConfirmModal(false); };

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-slate-600 dark:text-slate-300 font-semibold">연도</span>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <button onClick={handleSaveClick} disabled={saving || changedCount === 0} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? '저장 중...' : changedCount > 0 ? `저장 (${changedCount}개 변경)` : '저장'}
        </button>
        {error && <span className="text-[13px] text-red-500 dark:text-red-400">{error}</span>}
      </div>

      <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-3">
        {year}년도 시작 시 각 직원의 전년도 미소진 대휴 이월 시간을 입력하세요.
      </p>

      {loading ? (
        <div className="text-[14px] text-slate-400 dark:text-slate-500 py-4">불러오는 중...</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                <th className="px-4 py-2 text-[12px] font-semibold">이름</th>
                <th className="px-4 py-2 text-[12px] font-semibold w-20 text-center">근무조</th>
                <th className="px-4 py-2 text-[12px] font-semibold w-36 text-center">이월 시간 (h)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isChanged = edited[row.user_id] !== row.hours;
                return (
                  <tr key={row.user_id} className={`border-b border-slate-100 dark:border-slate-700 transition-colors ${isChanged ? 'bg-amber-50/60 dark:bg-amber-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/40'}`}>
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">
                      {row.user_name}
                      {isChanged && <span className="ml-1.5 text-amber-500 text-[12px] font-bold">●</span>}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-500 dark:text-slate-400">{TEAM_LABEL[row.team] ?? row.team}</td>
                    <td className="px-4 py-2 text-center">
                      <input type="number" min={0} step={0.5} value={edited[row.user_id] ?? 0}
                        onChange={e => setHours(row.user_id, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-[13px] text-center bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-xl w-80 p-5">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">{year}년도 이월시간 저장</p>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-4"><strong>{changedCount}개 항목</strong>을 저장하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmModal(false)} className="text-xs border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700">취소</button>
              <button onClick={handleConfirmSave} disabled={saving} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-blue-700">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
