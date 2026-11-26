import { useState } from 'react';
import type { CategoryTree } from '../../types/techDoc';
import { PROJECT_LABELS } from '../../constants/techDocLabels';

interface Props {
  categories: CategoryTree[];
  selectedProjectCode: string | null;
  selectedCategoryCode: string | null;
  onSelectCategory: (projectCode: string | null, categoryCode: string | null) => void;
  /** 분류 편집은 상단 막대로 옮김 — 호환용으로만 남김 */
  onManage?: () => void;
}

const ITEM = 'w-full rounded-md text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';
const ON = 'bg-sky-600 font-semibold text-white dark:bg-sky-500 dark:text-slate-950';
const OFF = 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800';

export function TechDocCategoryTree({ categories, selectedProjectCode, selectedCategoryCode, onSelectCategory }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (pc: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(pc)) next.delete(pc); else next.add(pc);
    return next;
  });
  const isAll = !selectedProjectCode && !selectedCategoryCode;

  return (
    <nav aria-label="문서 분류" className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        <button type="button" onClick={() => onSelectCategory(null, null)} className={`${ITEM} px-2.5 py-1.5 text-[13px] ${isAll ? ON : OFF}`}>
          전체 문서
        </button>
        {categories.map(tree => {
          const open = !collapsed.has(tree.project_code);
          return (
            <div key={tree.project_code}>
              <button type="button" onClick={() => toggle(tree.project_code)} aria-expanded={open}
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                <svg viewBox="0 0 10 10" className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                {PROJECT_LABELS[tree.project_code] ?? tree.project_code}
              </button>
              {open && (
                <div className="mt-0.5 space-y-px">
                  {tree.categories.map(cat => {
                    const active = selectedProjectCode === tree.project_code && selectedCategoryCode === cat.category_code;
                    return (
                      <button key={cat.category_code} type="button" onClick={() => onSelectCategory(tree.project_code, cat.category_code)}
                        className={`${ITEM} py-1 pl-6 pr-2 text-[13px] ${active ? ON : OFF}`}>
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
