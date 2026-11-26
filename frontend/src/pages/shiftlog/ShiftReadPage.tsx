import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShiftHistoryList } from '../../components/shiftlog/ShiftHistoryList';
import { ShiftReader } from '../../components/shiftlog/ShiftReader';
import { ThreadDrawer } from '../../components/shiftlog/ThreadDrawer';
import { useLogChannel } from '../../hooks/useLogChannel';
import { useReadShift } from '../../hooks/useReadShift';
import { useActiveUsers } from '../../hooks/useShiftWriteData';
import { openLogPopup } from '../../utils/openLogPopup';

const BOX = 'rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:bg-[#1e293b]';

/** 근무 일지 보기 — 왼쪽 근무 목록, 오른쪽 선택한 근무의 일지 전체. 기존 일지 목록을 대신한다. */
export function ShiftReadPage() {
  const navigate = useNavigate();
  const r = useReadShift();
  const { history, view, date, shift } = r;
  const users = useActiveUsers();
  const [drawerId, setDrawerId] = useState<number | null>(null);
  useLogChannel(() => { view.reload(); history.reload(); });   // 기존 화면에서 고친 내용 바로 반영

  const write = () => navigate(`/shift/write?date=${date}&shift=${encodeURIComponent(shift)}`);
  const nav = { prev: r.prev, next: r.next, canNext: r.canNext, onStep: r.step, autoFrom: r.autoFrom, onGoNow: r.goNow };

  return (
    <>
    <div className="@container h-full overflow-auto px-6 pb-10 pt-4 v2:px-5">
      <div className="grid grid-cols-1 items-start gap-4 @min-[640px]:grid-cols-[240px_minmax(0,1fr)] @min-[1100px]:grid-cols-[300px_minmax(0,1fr)]">
        <ShiftHistoryList items={history.items} selected={{ date, shift }} mine={history.mine} isLoading={history.isLoading}
          canMore={history.days < 120} onMine={history.setMine} onMore={history.more} onPick={r.pick} onPickDate={r.pickDate} />
        {view.error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            근무일지를 불러오지 못했습니다.
            <button type="button" onClick={view.reload} className="rounded-md border border-red-300 px-2 py-0.5 text-[12px] font-semibold dark:border-red-700">다시 불러오기</button>
          </div>
        ) : view.data && !r.waiting ? (
          <ShiftReader view={view.data} totalUsers={users.data.length} onOpenThread={setDrawerId} onOpenLegacy={openLogPopup}
            onWrite={write} nav={nav} focusCardId={r.focusCard} onFocusDone={r.clearCard} onReload={view.reload} />
        ) : (
          <div className={BOX}>불러오는 중...</div>
        )}
      </div>
    </div>
      {/* 서랍은 @container 밖에 둔다 — 컨테이너 쿼리 요소가 fixed 자식의 기준이 되어 갇히는 것을 막는다 */}
      {drawerId !== null && (
        <ThreadDrawer threadId={drawerId} onClose={() => setDrawerId(null)} onChanged={view.reload}
          onWrite={t => navigate(`/shift/write?thread=${t.id}`)} />
      )}
    </>
  );
}
