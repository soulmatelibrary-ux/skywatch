// 4조 순환 근무 스케줄 자동 생성 컴포넌트
import { useState, useMemo } from 'react';
import { scheduleApi } from '../../services/api/scheduleApi';
import { useUIStore } from '../../store/uiStore';

const SHIFT_BASE = new Date('2025-06-02T00:00:00');
const SHIFT_CYCLE = ['AB', 'DA', 'CD', 'BC'] as const;

function calcCode(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const diff = Math.floor((monday.getTime() - SHIFT_BASE.getTime()) / 86400000);
  const si = ((diff % 4) + 4) % 4;
  return SHIFT_CYCLE[si];
}

const CODE_LABELS: Record<string, string> = {
  AB: 'AB — A조 주간 / B조 야간',
  DA: 'DA — D조 주간 / A조 야간',
  CD: 'CD — C조 주간 / D조 야간',
  BC: 'BC — B조 주간 / C조 야간',
};

export function RotationManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [baseDate, setBaseDate] = useState(today);
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(false);
  const { addToast } = useUIStore();

  const computedCode = useMemo(() => calcCode(baseDate), [baseDate]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await scheduleApi.generateRotation(baseDate, weeks);
      const { rows } = res.data.data!;
      addToast(`순환 근무 스케줄 ${rows}건 생성 완료 (${weeks}주)`, 'success');
    } catch {
      addToast('스케줄 생성에 실패했습니다.', 'error');
    } finally { setLoading(false); }
  };

  const inputCls = 'border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-[14px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300';
  const labelCls = 'block text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1';

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-[16px] font-semibold text-slate-700 dark:text-slate-200 mb-1">4조 순환 근무 스케줄 생성</h2>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">
        기준 날짜부터 N주간의 일별 교대 코드를 자동으로 생성합니다.
        <br />순환: AB→DA→CD→BC (4일 사이클, 2025-06-02 기준)
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>기준 날짜</label>
          <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)} className={`w-full ${inputCls}`} />
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">이 날짜가 속한 주의 월요일부터 생성됩니다.</p>
        </div>

        <div>
          <label className={labelCls}>해당 주 시작 코드 (자동 계산)</label>
          <div className={`w-full ${inputCls} bg-slate-100 dark:bg-slate-700 cursor-default flex items-center gap-2`}>
            <span className="font-bold text-blue-600 dark:text-blue-400">{computedCode}</span>
            <span className="text-slate-500 dark:text-slate-400">— {CODE_LABELS[computedCode]?.split('— ')[1]}</span>
          </div>
        </div>

        <div>
          <label className={labelCls}>생성 주 수</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))} className={`w-24 ${inputCls}`} />
            <span className="text-[13px] text-slate-500 dark:text-slate-400">주</span>
          </div>
        </div>

        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[13px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <strong>미리보기:</strong> {baseDate} 기준 주 (<strong>{computedCode}</strong>) 부터{' '}
          <strong>{weeks}주</strong>간 생성
          <br />
          <span className="text-slate-400 dark:text-slate-500 text-[12px]">기존 스케줄이 있으면 덮어씁니다.</span>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="mt-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-[14px] font-medium hover:bg-blue-700 disabled:opacity-50 transition w-fit">
          {loading ? '생성 중...' : '스케줄 생성'}
        </button>
      </div>
    </div>
  );
}
