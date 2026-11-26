import type { ReactNode } from 'react';
import type { UserSimple } from '../../services/api/usersApi';
import type { CardKind, ExploreFacet } from '../../types/shiftLog';
import type { ExploreFilter } from '../../hooks/useCardExplore';
import { addDays, kstToday } from '../../utils/shiftText';

interface Props {
  filter: ExploreFilter;
  categoryFacets: ExploreFacet[];
  kindFacets: ExploreFacet[];
  users: UserSimple[];
  onChange: (f: ExploreFilter) => void;
}

const PERIODS: [string, number | null][] = [['전체', null], ['오늘', 0], ['7일', 6], ['30일', 29], ['90일', 89]];

function toggle<T>(list: T[] | undefined, v: T): T[] {
  const cur = list ?? [];
  return cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
}

function Facet({ title, children }: { title: string; children: ReactNode }) {
  return <div className="py-1"><h4 className="mx-4 mb-1 mt-2.5 text-[12px] font-bold text-slate-500">{title}</h4>{children}</div>;
}

const ROW = 'flex cursor-pointer select-none items-center gap-2 px-4 py-1 text-[13px] text-slate-700 hover:bg-blue-50/60 dark:text-slate-200 dark:hover:bg-slate-800';

/** 카드 탐색 왼쪽 필터 — 항목마다 걸었을 때의 건수를 보여준다. */
export function ExploreFacets({ filter, categoryFacets, kindFacets, users, onChange }: Props) {
  const today = kstToday();
  const periodKey = filter.date_from ? PERIODS.find(([, d]) => d !== null && addDays(today, -d) === filter.date_from)?.[0] : '전체';
  return (
    <div className="rounded-xl border border-slate-200 bg-white pb-2 dark:border-slate-700 dark:bg-[#1e293b]">
      <Facet title="기간">
        {PERIODS.map(([label, d]) => (
          <label key={label} className={ROW}>
            <input type="radio" name="period" checked={periodKey === label}
              onChange={() => onChange({ ...filter, date_from: d === null ? undefined : addDays(today, -d), date_to: undefined })} />{label}
          </label>
        ))}
      </Facet>
      <Facet title="분류">
        {categoryFacets.map(f => (
          <label key={f.key} className={ROW}>
            <input type="checkbox" checked={filter.category_ids?.includes(Number(f.key)) ?? false}
              onChange={() => onChange({ ...filter, category_ids: toggle(filter.category_ids, Number(f.key)) })} />
            <span className="h-2 w-2 rounded-full" style={{ background: f.color ?? '#94a3b8' }} />{f.label}
            <span className="ml-auto text-[12px] text-slate-400">{f.count.toLocaleString()}</span>
          </label>
        ))}
      </Facet>
      <Facet title="구분">
        {kindFacets.map(f => (
          <label key={f.key} className={ROW}>
            <input type="checkbox" checked={filter.kinds?.includes(f.key as CardKind) ?? false}
              onChange={() => onChange({ ...filter, kinds: toggle(filter.kinds, f.key as CardKind) })} />
            {f.label}<span className="ml-auto text-[12px] text-slate-400">{f.count.toLocaleString()}</span>
          </label>
        ))}
      </Facet>
      <Facet title="근무자">
        <select value={filter.worker_id ?? ''} onChange={e => onChange({ ...filter, worker_id: e.target.value ? Number(e.target.value) : null })}
          className="mx-4 w-[calc(100%-2rem)] rounded-lg border border-slate-200 px-2 py-1 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
          <option value="">전체</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </Facet>
      <label className={`${ROW} mt-1`}>
        <input type="checkbox" checked={!!filter.late_only} onChange={e => onChange({ ...filter, late_only: e.target.checked })} />지연 작성만
      </label>
    </div>
  );
}
