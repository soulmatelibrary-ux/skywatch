import { useEffect, useState } from 'react';
import type { IssueListParams, IssueSortKey } from '../../types/issue';

const STATUSES = ['진행중', '수정완료', '경고', '반환'];
const SORTS: { key: IssueSortKey; label: string }[] = [
  { key: 'reg_date', label: '등록일' }, { key: 'kac_pr_no', label: 'KAC PR번호' },
  { key: 'lm_pr_no', label: '제작사(LM) PR번호' }, { key: 'title', label: '제목' },
  { key: 'status', label: '상태' }, { key: 'updated_at', label: '최근 수정' },
];

interface Props {
  params: IssueListParams;
  onChange: (p: Partial<IssueListParams>) => void;
}

export function IssueFilterBar({ params, onChange }: Props) {
  const [kw, setKw] = useState(params.keyword ?? '');

  useEffect(() => {
    setKw(params.keyword ?? '');
  }, [params.keyword]);

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ keyword: kw || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kw]);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
      <select
        value={params.status ?? ''}
        onChange={e => onChange({ status: e.target.value || undefined })}
        className="text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
      >
        <option value="">전체 상태</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <select
          value={params.sort ?? ''}
          onChange={e => onChange({ sort: (e.target.value || undefined) as IssueSortKey | undefined, order: params.order ?? 'desc' })}
          aria-label="정렬 기준"
          className="text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="">기본 정렬</option>
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {params.sort && (
          <button
            type="button"
            onClick={() => onChange({ order: params.order === 'asc' ? 'desc' : 'asc' })}
            title="오름차순/내림차순 전환"
            className="text-[12px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {params.order === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="제목·키워드 검색"
        value={kw}
        onChange={e => setKw(e.target.value)}
        className="text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-48"
      />

      <div className="flex items-center gap-1 text-[13px]">
        <span className="text-slate-500 dark:text-slate-400">기간</span>
        <input
          type="date"
          value={params.date_from ?? ''}
          onChange={e => onChange({ date_from: e.target.value || undefined })}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        />
        <span className="text-slate-400">~</span>
        <input
          type="date"
          value={params.date_to ?? ''}
          onChange={e => onChange({ date_to: e.target.value || undefined })}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        />
      </div>

      <button
        type="button"
        onClick={() => onChange({ status: undefined, keyword: undefined, date_from: undefined, date_to: undefined, sort: undefined, order: undefined })}
        className="ml-auto text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5"
      >
        초기화
      </button>
    </div>
  );
}
