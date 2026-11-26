import { useState } from 'react';
import type { ThreadCreateBody } from '../../services/api/workThreadApi';
import type { CardCategory } from '../../types/log';
import type { Phase } from '../../types/shiftLog';
import { kstToday } from '../../utils/shiftText';

interface Props {
  categories: CardCategory[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: ThreadCreateBody) => Promise<boolean>;
}

const INPUT = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const thisMonth = () => kstToday().slice(0, 7);

/** 장기 과제 만들기 — 제목, 분류, 매년 반복 월, 단계(이름·시작 월·끝 월). */
export function ProjectCreateModal({ categories, busy, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [recur, setRecur] = useState<number | null>(null);
  const [phases, setPhases] = useState<Phase[]>([{ name: '준비', start_month: thisMonth(), end_month: thisMonth() }]);
  const valid = title.trim() && phases.every(p => p.name.trim() && p.start_month && p.end_month >= p.start_month);

  const setPhase = (i: number, patch: Partial<Phase>) => setPhases(ps => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function submit() {
    if (!valid) return;
    const ok = await onSubmit({ kind: 'project', title: title.trim(), category_id: categoryId, recur_month: recur, phases });
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40" onClick={onClose}>
      <div className="w-[min(560px,94vw)] rounded-xl bg-white p-5 dark:bg-[#1e293b]" onClick={e => e.stopPropagation()}>
        <h2 className="mb-3 text-[16px] font-extrabold text-slate-800 dark:text-slate-100">📌 장기 과제 만들기</h2>
        <div className="space-y-2.5 text-[13px] text-slate-600 dark:text-slate-300">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예) 2027 정보시스템 취약점 점검" className={`${INPUT} w-full`} />
          <div className="flex flex-wrap items-center gap-2">
            분류
            <select value={categoryId ?? ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)} className={INPUT}>
              <option value="">선택 안 함</option>
              {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            매년 반복
            <select value={recur ?? ''} onChange={e => setRecur(e.target.value ? Number(e.target.value) : null)} className={INPUT}>
              <option value="">안 함</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}월</option>)}
            </select>
          </div>
          <div className="font-bold">단계</div>
          {phases.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <input value={p.name} onChange={e => setPhase(i, { name: e.target.value })} placeholder="단계 이름" className={`${INPUT} w-32`} />
              <input type="month" value={p.start_month} onChange={e => setPhase(i, { start_month: e.target.value })} className={INPUT} />
              ~
              <input type="month" value={p.end_month} onChange={e => setPhase(i, { end_month: e.target.value })} className={INPUT} />
              <button type="button" disabled={phases.length < 2} onClick={() => setPhases(ps => ps.filter((_, j) => j !== i))} className="px-1 text-slate-400 hover:text-red-500 disabled:opacity-30">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setPhases(ps => [...ps, { name: '', start_month: ps[ps.length - 1].end_month, end_month: ps[ps.length - 1].end_month }])}
            className="text-[12px] font-bold text-blue-600">＋ 단계 추가</button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] dark:border-slate-600 dark:text-slate-200">취소</button>
          <button type="button" onClick={submit} disabled={!valid || busy} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-bold text-white disabled:opacity-50">만들기</button>
        </div>
      </div>
    </div>
  );
}
