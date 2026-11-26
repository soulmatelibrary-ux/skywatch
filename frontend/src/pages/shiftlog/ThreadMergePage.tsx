import { Panel } from '../../components/shiftlog/Panel';
import { useThreadCandidates } from '../../hooks/useThreadCandidates';

const REC: Record<string, [string, string]> = {
  project: ['장기 과제', 'text-blue-600'],
  thread: ['이어지는 일', 'text-green-600'],
};
const BTN = 'rounded-md border px-2 py-0.5 text-[12px] font-bold disabled:opacity-40';

/** 과제 묶기 — 기존 카드의 같은 제목을 과제로 묶는다. 기존 카드는 바뀌지 않고 연결만 추가된다. */
export function ThreadMergePage() {
  const { items, isLoading, apply, busyNorm } = useThreadCandidates();
  return (
    <div className="h-full overflow-auto px-6 pb-10 pt-4">
      <Panel title={<>기존 카드에서 찾은 과제 후보 <span className="text-[12px] font-semibold text-slate-400">괄호 표기·공백을 걷어낸 같은 제목 · 아직 과제에 연결되지 않은 카드만</span></>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-left text-[12px] text-slate-500 dark:bg-slate-900">
              <tr><th className="px-4 py-2.5">대표 제목</th><th className="px-4 py-2.5 text-right">카드 수</th><th className="px-4 py-2.5">기간</th><th className="px-4 py-2.5">원래 제목 예시</th><th className="px-4 py-2.5">추천</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody>
              {items.map(c => {
                const [label, tone] = REC[c.recommend] ?? REC.thread;
                const busy = busyNorm === c.norm;
                return (
                  <tr key={c.norm} className="border-t border-slate-100 align-top dark:border-slate-700/60 dark:text-slate-200">
                    <td className="px-4 py-2.5 font-bold">{c.examples[0] ?? c.norm}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.count.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-slate-500">{c.first_date} ~ {c.last_date}</td>
                    <td className="px-4 py-2.5 text-[12px] text-slate-500">{c.examples.map(e => <div key={e}>{e}</div>)}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 text-[12px] font-extrabold ${tone}`}>{label}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="flex gap-1">
                        <button type="button" disabled={busy} onClick={() => apply(c.norm, 'project')} className={`${BTN} border-blue-600 bg-blue-600 text-white`}>장기 과제</button>
                        <button type="button" disabled={busy} onClick={() => apply(c.norm, 'thread')} className={`${BTN} border-slate-200 dark:border-slate-600`} title="3일 넘게 비는 구간에서 끊어 각각 이어지는 일로">이어지는 일</button>
                        <button type="button" disabled={busy} onClick={() => apply(c.norm, 'skip')} className={`${BTN} border-transparent text-slate-500`}>제외</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">묶을 후보가 없습니다.</td></tr>}
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-4 rounded-xl border border-dashed border-blue-400 bg-white px-4 py-3 text-[13px] text-slate-600 dark:bg-[#1e293b] dark:text-slate-300">
        <b className="text-blue-600">안내</b> 장기 과제는 같은 제목 카드 전체를 하나로 묶습니다. 이어지는 일은 3일 넘게 비는 구간에서 끊어 2장 이상인 묶음마다 과제를 만듭니다.
        제외한 후보는 다시 나오지 않습니다. 기존 카드 내용과 상태는 바뀌지 않습니다.
      </div>
    </div>
  );
}
