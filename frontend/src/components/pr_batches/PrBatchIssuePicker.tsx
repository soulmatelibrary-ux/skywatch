import { useEffect, useState } from 'react';
import { issueApi } from '../../services/api/issueApi';
import type { IssueListItem } from '../../types/issue';

const normVersion = (v: string | null | undefined) => (v ?? '').toLowerCase().replace(/skyline|\s/g, '');

interface Props {
  version: string;
  excludeIssueIds: number[];
  onAdd: (issues: IssueListItem[]) => void;
  onClose: () => void;
}

export function PrBatchIssuePicker({ version, excludeIssueIds, onAdd, onClose }: Props) {
  const [keyword, setKeyword] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [items, setItems] = useState<IssueListItem[]>([]);
  // 검색어를 바꿔도 앞서 고른 PR이 유지되도록 선택한 PR 자체를 보관한다.
  const [selected, setSelected] = useState<Map<number, IssueListItem>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      issueApi.list({ keyword: keyword || undefined, status: openOnly ? '진행중' : undefined, limit: 500 })
        .then(r => setItems(r.data.data?.items ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, openOnly]);

  const available = items.filter(i => !excludeIssueIds.includes(i.id));
  const versionMatches = available.filter(i => normVersion(i.mod_version) === normVersion(version));
  const toggle = (issue: IssueListItem) => setSelected(s => {
    const next = new Map(s);
    if (next.has(issue.id)) next.delete(issue.id); else next.set(issue.id, issue);
    return next;
  });
  const selectAll = (list: IssueListItem[]) => setSelected(s => new Map([...s, ...list.map(i => [i.id, i] as const)]));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        <div className="space-y-2 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">개별 PR 목록에서 이번 버전({version}) PR 선택</h3>
          <input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="PR번호·제목·키워드 검색"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <label className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} />진행중(미수정) PR만
            </label>
            {versionMatches.length > 0 && <button onClick={() => selectAll(versionMatches)}
              className="rounded-lg border border-sky-300 px-2 py-0.5 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/30">수정버전이 {version}인 PR {versionMatches.length}건 모두 선택</button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading && <p className="py-6 text-center text-[12px] text-slate-400">검색 중…</p>}
          {!loading && !available.length && <p className="py-6 text-center text-[12px] text-slate-400">검색 결과가 없습니다.</p>}
          {!loading && available.map(issue => (
            <label key={issue.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
              <input type="checkbox" className="mt-1" checked={selected.has(issue.id)} onChange={() => toggle(issue)} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{issue.kac_pr_no || issue.lm_pr_no || `#${issue.id}`}</span>
                  <span className="rounded bg-slate-100 px-1.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300">{issue.status}</span>
                  {(issue.version || issue.mod_version) && <span className="text-slate-400">{issue.version ?? '-'} → {issue.mod_version ?? '-'}</span>}
                </span>
                <span className="block truncate text-[13px] text-slate-700 dark:text-slate-200">{issue.title}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <span className="text-[12px] text-slate-400">{selected.size}건 선택됨</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-[12px] text-slate-500 dark:border-slate-600">취소</button>
            <button onClick={() => onAdd([...selected.values()])} disabled={!selected.size}
              className="rounded-lg bg-sky-600 px-4 py-2 text-[12px] text-white disabled:opacity-50">선택 PR 등록</button>
          </div>
        </div>
      </div>
    </div>
  );
}
