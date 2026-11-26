import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/shiftlog/Panel';
import { ProjectCreateModal } from '../../components/shiftlog/ProjectCreateModal';
import { ProjectTimeline } from '../../components/shiftlog/ProjectTimeline';
import { ThreadColumns } from '../../components/shiftlog/ThreadColumns';
import { ThreadDrawer } from '../../components/shiftlog/ThreadDrawer';
import { useCategories } from '../../hooks/useCategories';
import { useWorkThreadBoard } from '../../hooks/useWorkThreadBoard';
import type { WorkThread } from '../../types/shiftLog';

/** 과제 보드 — 장기 과제 단계 일정과 이어지는 일의 진행 현황. */
export function ThreadBoardPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const board = useWorkThreadBoard();
  const [catId, setCatId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const byCat = (t: WorkThread) => catId === null || t.category_id === catId;

  return (
    <div className="h-full overflow-auto px-6 pb-10 pt-4">
      <div className="mb-3 flex items-center gap-2.5">
        <select value={catId ?? ''} onChange={e => setCatId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
          <option value="">전체 분류</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-[12px] text-slate-500">항목을 누르면 근무별 진행 기록이 열립니다.</span>
      </div>
      <Panel className="mb-5" title={<>📌 장기 과제 <span className="text-[12px] font-semibold text-slate-400">단계별 일정 · 근무자 전원 참여</span></>}
        extra={<button type="button" onClick={() => setCreating(true)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-bold dark:border-slate-600 dark:text-slate-200">＋ 장기 과제 만들기</button>}>
        <ProjectTimeline projects={board.projects.filter(byCat)} onOpen={setDrawerId} />
      </Panel>
      <div className="mb-2.5 text-[14px] font-extrabold text-slate-800 dark:text-slate-100">
        🔗 이어지는 일 <span className="text-[12px] font-semibold text-slate-400">대부분 2~3일 안에 끝나는 일 · 일지 쓰기에서 "다음 근무로 이어짐"으로 만들어집니다</span>
      </div>
      <ThreadColumns threads={board.threads.filter(byCat)} onOpen={setDrawerId} />
      {drawerId !== null && (
        <ThreadDrawer threadId={drawerId} onClose={() => setDrawerId(null)} onChanged={board.reload}
          onWrite={t => navigate(`/shift/write?thread=${t.id}`)} />
      )}
      {creating && <ProjectCreateModal categories={categories} busy={board.busy} onClose={() => setCreating(false)} onSubmit={board.createProject} />}
    </div>
  );
}
