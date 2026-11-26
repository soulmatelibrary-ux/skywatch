import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardLinkDialog } from '../../components/shiftlog/CardLinkDialog';
import { ExploreFacets } from '../../components/shiftlog/ExploreFacets';
import { ShiftChip, ThreadStatusChip } from '../../components/shiftlog/ShiftBadges';
import { ShiftCardRow, ShiftCardTile } from '../../components/shiftlog/ShiftCardViews';
import { ThreadDrawer } from '../../components/shiftlog/ThreadDrawer';
import { useCardExplore, useSavedViews } from '../../hooks/useCardExplore';
import type { ExploreFilter } from '../../hooks/useCardExplore';
import { useActiveUsers } from '../../hooks/useShiftWriteData';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { ShiftCard, WorkThreadDetail } from '../../types/shiftLog';
import { loadExploreMemory, saveExploreMemory } from '../../utils/exploreMemory';
import { readLink } from '../../utils/shiftNav';
import { dayLabel } from '../../utils/shiftText';

const LINKABLE = new Set(['done', 'cancelled']);  // 서버(work_thread_sync.DONE_STATUSES)와 같은 기준
type GroupBy = 'category' | 'thread' | 'shift';
const GROUPS: [GroupBy, string][] = [['category', '분류'], ['thread', '과제'], ['shift', '근무']];
const SEG = (on: boolean) => `px-3 py-1 text-[12px] font-bold ${on ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`;

function groupKey(c: ShiftCard, by: GroupBy): string {
  if (by === 'category') return c.category_name ?? '미분류';
  if (by === 'thread') return c.thread_id ? `t${c.thread_id}` : c.kind === 'memo' ? 'memo' : 'single';
  return `${c.date} ${c.shift_type}`;
}

/** 카드 탐색 — 기존·신규 카드를 카드 단위로 찾고 분류·과제·근무별로 묶어 본다. */
export function CardExplorePage() {
  const navigate = useNavigate();
  const meId = useAuthStore(s => s.currentUser?.id ?? null);
  // 일지 보기에 갔다가 뒤로 와도 조건·묶기·보기·쪽이 남도록 sessionStorage 에서 복원한다
  const [saved0] = useState(loadExploreMemory);
  const [filter, setFilter] = useState<ExploreFilter>(saved0.filter);
  const [groupBy, setGroupBy] = useState<GroupBy>(saved0.groupBy);
  const [mode, setMode] = useState<'grid' | 'row'>(saved0.mode);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const { data, isLoading, page, setPage, totalPages, reload } = useCardExplore(filter, saved0.page);
  useEffect(() => { saveExploreMemory({ filter, groupBy, mode, page }); }, [filter, groupBy, mode, page]);
  const users = useActiveUsers();
  const saved = useSavedViews();
  const addToast = useUIStore(s => s.addToast);
  // 카드 묶기: 선택 모드에서 완료된 카드를 여러 장(페이지를 넘겨도 유지) 골라 한 묶음으로 연결한다
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Map<number, ShiftCard>>(new Map());
  const [showLink, setShowLink] = useState(false);
  const [linkCard, setLinkCard] = useState<ShiftCard | null>(null); // 단일 카드 과제 연결용
  const toggle = (c: ShiftCard) => setPicked(prev => { const n = new Map(prev); if (n.has(c.id)) n.delete(c.id); else n.set(c.id, c); return n; });
  // 완료된 카드만 묶을 수 있다 (진행 중 카드·전달 메모는 체크박스를 보이지 않는다)
  const pick = (c: ShiftCard) => (picking && c.kind !== 'memo' && LINKABLE.has(c.status) ? { selected: picked.has(c.id), onToggle: () => toggle(c) } : {});
  const endPicking = () => { setPicking(false); setPicked(new Map()); };
  const linked = (thread: WorkThreadDetail) => {
    addToast(`'${thread.title}' 묶음에 카드 ${picked.size}장을 연결했습니다.`, 'success');
    setShowLink(false); endPicking(); reload(); setDrawerId(thread.id);
  };

  const groups = new Map<string, ShiftCard[]>();
  data.items.forEach(c => { const k = groupKey(c, groupBy); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); });
  const head = (k: string, items: ShiftCard[]) => {
    const c = items[0];
    if (groupBy === 'category') return <><span className="h-2 w-2 rounded-full" style={{ background: c.category_color ?? '#94a3b8' }} />{k}</>;
    if (groupBy === 'thread') return k === 'memo' ? '📨 전달·메모' : k === 'single' ? '당일 종료 카드'
      : <>{c.kind === 'project' ? '📌' : '🔗'} {c.thread_title} {c.thread_status && <ThreadStatusChip status={c.thread_status} />}</>;
    return <>{dayLabel(c.date)} <ShiftChip shift={c.shift_type} /></>;
  };
  const presets: [string, ExploreFilter][] = [['내가 근무한 카드', { worker_id: meId }], ['장애 처리', { category_ids: data.category_facets.filter(f => f.label.includes('장애')).map(f => Number(f.key)) }], ['지연 작성', { late_only: true }]];

  return (
    <div className="h-full overflow-auto px-6 pb-10 pt-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ExploreFacets filter={filter} categoryFacets={data.category_facets} kindFacets={data.kind_facets} users={users.data} onChange={setFilter} />
        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <input value={filter.q ?? ''} onChange={e => setFilter({ ...filter, q: e.target.value })} placeholder="🔍 제목·내용 검색 (띄어쓰기로 여러 단어)"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            <span className="text-[12px] text-slate-500">묶기</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">{GROUPS.map(([g, l]) => <button key={g} type="button" className={SEG(groupBy === g)} onClick={() => setGroupBy(g)}>{l}</button>)}</div>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
              <button type="button" className={SEG(mode === 'grid')} onClick={() => setMode('grid')}>카드</button>
              <button type="button" className={SEG(mode === 'row')} onClick={() => setMode('row')}>한 줄</button>
            </div>
            <button type="button" onClick={() => (picking ? endPicking() : setPicking(true))}
              title="완료된 카드를 여러 장 골라 한 묶음으로 연결합니다. 묶어 두면 이력을 한 번에 볼 수 있습니다."
              className={`rounded-lg border px-3 py-1 text-[12px] font-bold ${picking ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
              {picking ? '묶기 끝내기' : '🔗 카드 묶기'}
            </button>
          </div>
          {picking && (
            <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-[13px] dark:border-blue-700 dark:bg-slate-800">
              <span className="font-bold text-blue-800 dark:text-blue-300">묶을 카드를 고르세요 (완료된 카드만)</span>
              <span className="text-slate-600 dark:text-slate-300">{picked.size}장 선택{picked.size < 2 ? ' · 새 묶음은 두 장 이상 필요' : ''}</span>
              <span className="flex-1" />
              {picked.size > 0 && <button type="button" onClick={() => setPicked(new Map())} className="text-[12px] text-slate-500 underline">선택 해제</button>}
              <button type="button" disabled={picked.size === 0} onClick={() => setShowLink(true)}
                className="rounded-lg bg-blue-600 px-3 py-1 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-40">선택한 카드 묶기</button>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="text-slate-500">보기</span>
            {[...presets, ...saved.views.map(v => [v.name, v.filter] as [string, ExploreFilter])].map(([name, f]) => (
              <button key={name} type="button" onClick={() => setFilter(f)} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-bold text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">{name}</button>
            ))}
            <button type="button" onClick={() => setFilter({})} className="px-1 text-slate-500 underline">초기화</button>
            <button type="button" onClick={() => { const n = window.prompt('보기 이름'); if (n?.trim()) saved.save(n.trim(), filter); }} className="px-1 text-blue-600">＋ 지금 조건 저장</button>
            <span className="flex-1" />
            <span className="text-slate-500">{isLoading ? '불러오는 중...' : `결과 ${data.total.toLocaleString()}장`}</span>
          </div>
          {[...groups.entries()].map(([k, items]) => (
            <div key={k} className="mb-3.5">
              <button type="button" onClick={() => setClosed(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                className="flex w-full items-center gap-2 px-1 py-1.5 text-left text-[14px] font-extrabold text-slate-800 dark:text-slate-100">
                <span className="w-3.5 text-slate-400">{closed.has(k) ? '▸' : '▾'}</span>{head(k, items)}<span className="text-[12px] font-semibold text-slate-400">{items.length}장</span>
              </button>
              {!closed.has(k) && (mode === 'grid'
                ? <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-stretch gap-3">{items.map(c => <ShiftCardTile key={c.id} card={c} onOpenThread={setDrawerId} onLinkToThread={setLinkCard} shiftLink={readLink(c)} {...pick(c)} />)}</div>
                : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1e293b]">{items.map(c => <ShiftCardRow key={c.id} card={c} showWhen onOpenThread={setDrawerId} onLinkToThread={setLinkCard} shiftLink={readLink(c)} {...pick(c)} />)}</div>)}
            </div>
          ))}
          {!isLoading && data.items.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:bg-[#1e293b]">조건에 맞는 카드가 없습니다.</div>}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-[13px] text-slate-600 dark:text-slate-300">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded px-2 py-1 disabled:opacity-30">‹ 이전</button>
              <span>{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded px-2 py-1 disabled:opacity-30">다음 ›</button>
            </div>
          )}
        </div>
      </div>
      {showLink && <CardLinkDialog cards={[...picked.values()]} onClose={() => setShowLink(false)} onLinked={linked} />}
      {linkCard && <CardLinkDialog cards={[linkCard]} onClose={() => setLinkCard(null)}
        onLinked={thread => { addToast(`'${thread.title}' 묶음에 연결했습니다.`, 'success'); setLinkCard(null); reload(); }} />}
      {drawerId !== null && <ThreadDrawer threadId={drawerId} onClose={() => setDrawerId(null)} onChanged={reload} onWrite={t => navigate(`/shift/write?thread=${t.id}`)} />}
    </div>
  );
}
