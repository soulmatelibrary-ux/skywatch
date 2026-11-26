import { useMemo, useState } from 'react';
import { usePrVerification } from '../../hooks/usePrVerification';
import { useAuthStore } from '../../store/authStore';
import type { PrBatch, PrBatchItem, PrJudgment, PrVerification } from '../../types/prBatch';
import { PrVerificationItem } from './PrVerificationItem';
import { PrVerificationSubmitDialog } from './PrVerificationSubmitDialog';
import { PrVerificationToolbar } from './PrVerificationToolbar';

type Filter = 'all' | 'unverified' | PrJudgment;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체 PR' }, { id: 'unverified', label: '검증 안 한 PR' },
  { id: 'PASS', label: 'PASS' }, { id: 'REJECT', label: 'REJECT' },
  { id: '미판정', label: '미판정' }, { id: '보류', label: '보류' }, { id: '제외', label: '제외' },
];

interface Props { batch: PrBatch; onChanged: () => void; focusItemId?: number | null; }

export function PrBatchVerificationPanel({ batch, onChanged, focusItemId = null }: Props) {
  const me = useAuthStore(s => s.currentUser);
  const { working, save, remove, uploadWorkbook, loadDetail } = usePrVerification(batch.id, onChanged);
  // 개별 PR 화면에서 넘어온 PR은 패널이 처음 열릴 때 입력창을 바로 띄운다.
  const [editing, setEditing] = useState<PrBatchItem | null>(() => batch.items.find(row => row.id === focusItemId) ?? null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [workerId, setWorkerId] = useState<number | null>(null);

  const rowsByItem = useMemo(() => {
    const latest = new Map<string, PrVerification>();
    for (const v of batch.verifications) {
      if (!v.report_original_name) continue;
      const key = `${v.item_id}:${v.user_id}`;
      const prev = latest.get(key);
      if (!prev || v.round_no >= prev.round_no) latest.set(key, v);
    }
    const map = new Map<number, PrVerification[]>();
    for (const v of latest.values()) map.set(v.item_id, [...(map.get(v.item_id) ?? []), v]);
    return map;
  }, [batch.verifications]);

  const all = [...rowsByItem.values()].flat();
  const lastMine = all.filter(v => v.user_id === me?.id).sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))[0];
  const workers = [...new Map(all.map(v => [v.user_id, { id: v.user_id, name: v.user_name ?? '' }])).values()];
  // 고른 근무자의 마지막 보고서가 지워져 목록에서 사라졌으면 '전체 근무자'로 본다
  const activeWorker = workers.some(w => w.id === workerId) ? workerId : null;
  const verified = batch.items.filter(i => rowsByItem.has(i.id)).length;

  const visible = batch.items.filter(item => {
    const rows = rowsByItem.get(item.id) ?? [];
    const text = `${item.kac_pr_no ?? ''} ${item.lm_pr_no ?? ''} ${item.title}`.toLowerCase();
    if (!text.includes(query.trim().toLowerCase())) return false;
    if (filter === 'unverified') return rows.length === 0;
    return filter === 'all' || rows.some(v => v.result === filter);
  });
  const reportCount = all.filter(v => (!activeWorker || v.user_id === activeWorker) && (!selected.length || selected.includes(v.item_id))).length;

  const toggle = (id: number) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const allVisibleChecked = visible.length > 0 && visible.every(i => selected.includes(i.id));

  return <div className="space-y-3">
    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
      검증한 PR {verified}/{batch.items.length}건, 보고서 {all.length}건
      <span className="ml-2 text-[11px] font-normal text-slate-400">검증 결과와 보고서는 모든 근무자가 볼 수 있습니다.</span>
    </p>
    <PrVerificationToolbar batch={batch} working={working} onUpload={f => void uploadWorkbook(f)}
      workers={workers} workerId={activeWorker} onWorker={setWorkerId} selectedIds={selected} reportCount={reportCount} />
    <div className="flex flex-wrap items-center gap-2">
      <input type="checkbox" checked={allVisibleChecked} aria-label="보이는 PR 전체 선택" title="보이는 PR 전체 선택"
        onChange={() => setSelected(allVisibleChecked ? selected.filter(id => !visible.some(i => i.id === id)) : [...new Set([...selected, ...visible.map(i => i.id)])])} />
      <select value={filter} onChange={e => setFilter(e.target.value as Filter)} aria-label="검증 상태"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[12px] dark:border-slate-600 dark:bg-slate-800">
        {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="PR 번호 또는 제목 검색"
        className="min-w-40 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] dark:border-slate-600 dark:bg-slate-800" />
      <span className="text-[11px] text-slate-500">{visible.length}/{batch.items.length}건 표시</span>
    </div>
    {visible.map(item => <PrVerificationItem key={item.id} item={item} rows={rowsByItem.get(item.id) ?? []}
      meId={me?.id} isAdmin={me?.role === 'admin'} checked={selected.includes(item.id)} onCheck={() => toggle(item.id)}
      onEdit={() => setEditing(item)} onDelete={v => void remove(v.id)} loadDetail={loadDetail} />)}
    {!batch.items.length && <p className="py-8 text-center text-[12px] text-slate-400">"1. PR 목록" 탭에서 이번 버전에 포함된 PR을 먼저 등록해 주세요.</p>}
    {batch.items.length > 0 && !visible.length && <p className="py-8 text-center text-[12px] text-slate-400">조건에 맞는 PR이 없습니다.</p>}
    {editing && me && <PrVerificationSubmitDialog item={editing} authorName={me.name} defaults={batch}
      mineId={(rowsByItem.get(editing.id) ?? []).find(v => v.user_id === me.id)?.id} lastMine={lastMine}
      saving={working} loadDetail={loadDetail} onSave={data => save(editing.id, data)} onClose={() => setEditing(null)} />}
  </div>;
}
