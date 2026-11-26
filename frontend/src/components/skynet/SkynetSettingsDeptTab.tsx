// SkyNet 크롤링 설정 — 부서 관리 탭
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PlusIcon, XIcon } from '../icons';
import type { useSkynetSettings } from '../../hooks/skynet/useSkynetSettings';

const DOC_TYPES = ['기록문서등록', '기록문서결재등록', '전자보고기록문서'];

export function DeptTab({ s }: { s: ReturnType<typeof useSkynetSettings> }) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 mb-3">부서 추가</div>
        <div className="flex gap-2 flex-wrap">
          <input value={s.newDept.name} onChange={e => s.setNewDept(p => ({...p, name: e.target.value}))}
            placeholder="부서명" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          <input value={s.newDept.dept_id} onChange={e => s.setNewDept(p => ({...p, dept_id: e.target.value}))}
            placeholder="부서 ID (Dxxxxxxxx)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
          <select value={s.newDept.doc_type} onChange={e => s.setNewDept(p => ({...p, doc_type: e.target.value}))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none">
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={s.addDept} disabled={s.saving || !s.newDept.name.trim() || !s.newDept.dept_id.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50">
            {s.saving ? <LoadingSpinner size={14} /> : <PlusIcon size={14} />} 추가
          </button>
        </div>
        <p className="text-[12px] text-slate-400 mt-2">부서 ID는 F12 Network 요청에서 payload 값을 확인해 입력하세요.</p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left text-[12px] text-slate-500 dark:text-slate-400">
              <th className="px-4 py-2.5 font-semibold">부서명</th>
              <th className="px-4 py-2.5 font-semibold">부서 ID</th>
              <th className="px-4 py-2.5 font-semibold">유형</th>
              <th className="px-4 py-2.5 font-semibold w-[80px]">상태</th>
              <th className="px-4 py-2.5 font-semibold w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {s.departments.map(d => (
              <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium">{d.name}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[12px]">{d.dept_id}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[12px]">{d.doc_type}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => s.toggleDept(d.id, d.enabled !== 1)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${d.enabled === 1 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${d.enabled === 1 ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => s.deleteDept(d.id, d.name)} className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition">
                    <XIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
