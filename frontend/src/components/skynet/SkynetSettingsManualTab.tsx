import { useSkynetManual } from '../../hooks/skynet/useSkynetManual';
import { LoadingSpinner } from '../common/LoadingSpinner';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-[12px] text-slate-500 dark:text-slate-400 mb-1';

export function ManualTab() {
  const m = useSkynetManual();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
        <div>
          <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 mb-1">배치 수집</div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">지정한 날짜 범위의 문서를 일괄 수집합니다. 원하는 부서만 선택해서 실행할 수 있습니다.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={labelCls}>수집 대상 부서</div>
              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                활성 부서만 표시됩니다. 선택한 부서만 지정 일자 범위로 수집합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={m.selectAllDepts}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={m.clearDepts}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                선택 해제
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3">
            {m.loadingDepts ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={20} />
              </div>
            ) : m.departments.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-slate-400 dark:text-slate-500">
                활성 부서가 없습니다. <span className="font-medium text-slate-500 dark:text-slate-300">부서 관리</span> 탭에서 부서를 추가하고 활성화하세요.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {m.departments.map(dept => {
                  const checked = m.selectedDeptNames.includes(dept.name);
                  const isFixed = dept.name === '인천항공교통시설단' || dept.name === '항로시설본부';
                  return (
                    <label
                      key={dept.name}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition cursor-pointer ${
                        checked
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => m.toggleDept(dept.name)}
                        disabled={isFixed}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-70"
                      />
                      <span className="truncate">{dept.name}</span>
                      {isFixed && (
                        <span className="ml-auto shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          고정
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className={labelCls}>시작일</label>
            <input type="date" value={m.startDate} onChange={e => m.setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>종료일</label>
            <input type="date" value={m.endDate} onChange={e => m.setEndDate(e.target.value)} className={inputCls} />
          </div>
          <div className="w-36">
            <label className={labelCls}>사전 조회 수 (5~50)</label>
            <input
              type="number"
              value={m.warmupCount}
              min={5}
              max={50}
              step={1}
              onChange={e => m.setWarmupCount(Math.min(50, Math.max(5, Number(e.target.value))))}
              className={inputCls}
            />
          </div>
          <div className="w-36">
            <label className={labelCls}>API 인터벌 (초, 20~300)</label>
            <input
              type="number"
              value={m.intervalSeconds}
              min={20}
              max={300}
              step={1}
              onChange={e => m.setIntervalSeconds(Math.min(300, Math.max(20, Number(e.target.value))))}
              className={inputCls}
            />
          </div>
          <button
            onClick={m.startBatch}
            disabled={m.running || !m.startDate || !m.endDate || m.selectedDeptNames.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50"
          >
            {m.running ? <LoadingSpinner size={14} /> : null}
            배치 시작
          </button>
        </div>

        {m.running && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-blue-700 dark:text-blue-300">
                {m.statusMsg || '수집 중...'}
              </span>
              <span className="text-[12px] text-blue-600 dark:text-blue-400">{m.percent}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-full transition-all" style={{ width: `${m.percent}%` }} />
            </div>
            {m.count > 0 && (
              <p className="mt-2 text-[12px] text-blue-600 dark:text-blue-400">
                수집됨: {m.count}건
              </p>
            )}
          </div>
        )}

        <p className="text-[12px] text-slate-400 dark:text-slate-500">
          사전 조회: 크롤러가 본 수집 전 진행 확인용으로 미리 가져오는 건수입니다.
        </p>
      </div>
    </div>
  );
}
