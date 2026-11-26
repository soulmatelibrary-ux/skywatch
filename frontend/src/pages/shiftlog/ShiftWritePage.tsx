import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardComposer } from '../../components/shiftlog/CardComposer';
import type { ComposerPrefill } from '../../components/shiftlog/CardComposer';
import { EditGuardBar } from '../../components/shiftlog/EditGuardBar';
import { MemoComposer } from '../../components/shiftlog/MemoComposer';
import { Panel } from '../../components/shiftlog/Panel';
import { ShiftCardsPanel } from '../../components/shiftlog/ShiftCardsPanel';
import { ShiftHeader } from '../../components/shiftlog/ShiftHeader';
import { ThreadDrawer } from '../../components/shiftlog/ThreadDrawer';
import { ThreadResumeDialog } from '../../components/shiftlog/ThreadResumeDialog';
import { MissingPanel, OpenThreadsPanel } from '../../components/shiftlog/WriteLeftPanels';
import { HandoverPanel, InboxPanel, RoutinePanel } from '../../components/shiftlog/WriteRightPanels';
import { useCategories } from '../../hooks/useCategories';
import { useEditGuard } from '../../hooks/useEditGuard';
import { useLogChannel } from '../../hooks/useLogChannel';
import { useResumedThreads } from '../../hooks/useResumedThreads';
import { useShiftActions } from '../../hooks/useShiftActions';
import { useShiftParams } from '../../hooks/useShiftParams';
import {
  useActiveUsers, useMissingShifts, useOpenThreads, useRecentShifts, useRoster, useShiftInbox, useShiftView,
} from '../../hooks/useShiftWriteData';
import { useAuthStore } from '../../store/authStore';
import { V2_OUTLINE } from '../../components/common/v2Styles';
import type { ShiftType, WorkThread } from '../../types/shiftLog';
import { kstToday } from '../../utils/shiftText';

/** 일지 쓰기 — 오늘 근무와 지난 근무를 같은 화면에서. 새 카드는 기본 당일 종료(일회성)로 저장되고, 이어짐으로 쓴 카드는 진행중이다.
 *  오늘·최근 7일 카드는 ‘이 근무의 카드’에서 고치거나 지울 수 있다. */
export function ShiftWritePage() {
  const navigate = useNavigate();
  const meId = useAuthStore(s => s.currentUser?.id ?? 0);
  const { date, shift, setShift, step } = useShiftParams();
  const { categories } = useCategories();
  const view = useShiftView(date, shift);
  const inbox = useShiftInbox(date, shift);
  const missing = useMissingShifts(7);
  const recent = useRecentShifts();
  const threads = useOpenThreads(date);
  const roster = useRoster(kstToday());
  const users = useActiveUsers();
  // 과제 보드의 "이 근무에 기록"으로 들어오면 ?thread= 과제를 입력창에 미리 연결한다
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(() => {
    const id = Number(new URLSearchParams(window.location.search).get('thread'));
    return id > 0 ? { threadId: id, title: '', body: '' } : null;
  });
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const resumed = useResumedThreads(prefill, threads.data, threads.isLoading);  // 입력창에서 고를 수 있는 과제 (종료된 일 포함)
  const scrollRef = useRef<HTMLDivElement>(null);
  const edit = useEditGuard();   // 수정 중인 카드가 있으면 이동 전에 확인
  const go = (d: string, s: ShiftType) => edit.guard(() => setShift(d, s));

  const reloadAll = () => { view.reload(); inbox.reload(); missing.reload(); threads.reload(); recent.reload(); };
  const actions = useShiftActions(reloadAll);
  useLogChannel(reloadAll);   // 기존 작성 팝업에서 저장해도 바로 반영
  // 날짜/근무조가 바뀌면 이전 근무의 카드·근무자는 비우고, 같은 근무를 다시 불러오는 동안(저장 후·다른 창 알림)은 이전 데이터를 유지한다.
  const sameShift = view.data?.date === date && view.data.shift_type === shift;
  const v = view.error || !sameShift ? null : view.data;
  const blocked = !v || !!view.error || !!v.conflict;
  const memos = (v?.cards ?? []).filter(c => c.kind === 'memo');

  function writeThread(t: WorkThread) {
    if (t.status === 'done') resumed.add(t);   // 종료된 일: 카드를 저장하면 서버가 '진행'으로 되돌린다
    setShowClosed(false);
    setDrawerId(null);
    setPrefill({ threadId: t.id, title: '', body: '' });
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const openRead = (d: string, s: string) => edit.guard(() => navigate(`/shift/read?date=${d}&shift=${encodeURIComponent(s)}`));

  return (
    <div ref={scrollRef} className="h-full overflow-auto px-6 pb-10 pt-4 v2:px-5">
      <ShiftHeader date={date} shift={shift} view={v} recent={recent.data} loading={view.isLoading && !v} roster={roster.data} users={users.data} meId={meId}
        busy={actions.busy} onChange={go} onStep={dir => edit.guard(() => step(dir))}
        onSaveWorkers={ids => actions.saveWorkers(date, shift, ids)} />
      {edit.pending && <EditGuardBar onStay={edit.stay} onLeave={edit.leave} />}
      {view.error && (
        <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          근무일지를 불러오지 못했습니다. <button type="button" onClick={view.reload} className="font-bold underline underline-offset-2">다시 불러오기</button>
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[290px_minmax(0,1fr)_290px] v2:gap-3 v2:2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="order-2 xl:order-1">
          <div className="mb-4 v2:mb-3"><MissingPanel items={missing.data} meId={meId} onPick={go} /></div>
          <OpenThreadsPanel threads={threads.data} cards={v?.cards ?? []} busy={actions.busy}
            onWrite={writeThread} onOpen={setDrawerId} onClose={actions.closeThread} onFindClosed={() => setShowClosed(true)} />
        </div>
        {/* 새 화면: 이 화면의 주 작업인 "새 카드 작성"을 맨 위로, 전달·메모는 그 아래 */}
        <main className="order-1 min-w-0 space-y-4 xl:order-2 v2:flex v2:flex-col v2:gap-3 v2:space-y-0" aria-label="근무일지 작성 영역">
          <div className="v2:order-2">
            <Panel title="📨 전달·메모" extra={<span className="text-[12px] font-semibold text-slate-400">카드 없이 한 줄로 · Enter로 저장</span>}>
              <MemoComposer categories={categories} users={users.data} meId={meId} memos={memos} busy={actions.busy} disabled={blocked}
                onSubmit={(body, files) => actions.addMemo({ ...body, date, shift_type: shift }, files)} />
            </Panel>
          </div>
          <div className="v2:order-1">
            <Panel title="새 카드 작성" extra={<span className="text-[12px] font-semibold text-slate-400">저장 대상 · {date} {shift}</span>}>
              <CardComposer categories={categories} threads={resumed.threads} prefill={prefill} busy={actions.busy} disabled={blocked}
                onSubmit={(body, files) => actions.addCard({ ...body, date, shift_type: shift }, !!v?.is_past, files)} />
            </Panel>
          </div>
          <div className="v2:order-3">
          <ShiftCardsPanel key={`${date}-${shift}`} cards={v?.cards ?? []} onOpenThread={setDrawerId} meId={meId} categories={categories}
            onChanged={reloadAll} onEditingDirty={edit.setDirty} loadFailed={!!view.error} pastLabel={v?.is_past ? { date, shift } : null}
            extra={<button type="button" onClick={() => openRead(date, shift)} className={`rounded-md border border-slate-200 px-2 py-0.5 text-[12px] font-bold dark:border-slate-600 dark:text-slate-200 ${V2_OUTLINE}`}>읽기 화면 ›</button>} />
          </div>
        </main>
        <div className="order-3">
          <InboxPanel items={inbox.data} meId={meId} totalUsers={users.data.length} busy={actions.busy} onCheck={actions.checkMemo} />
          <HandoverPanel handover={v?.handover ?? null} onOpenRead={openRead} />
          <RoutinePanel routines={v?.routines ?? []} onWrite={(title, body) => setPrefill({ threadId: null, title, body })} />
        </div>
      </div>
      {showClosed && <ThreadResumeDialog onResume={writeThread} onOpen={setDrawerId} onClose={() => setShowClosed(false)} escDisabled={drawerId !== null} />}
      {drawerId !== null && (
        <ThreadDrawer threadId={drawerId} onClose={() => setDrawerId(null)} onChanged={() => { threads.reload(); view.reload(); }} onWrite={writeThread} />
      )}
    </div>
  );
}
