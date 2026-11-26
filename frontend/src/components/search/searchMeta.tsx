// 통합검색 공통 — 탭·자료 유형 색상·기간 계산·검색어 강조
import type { ReactNode } from 'react';
import type { TabResults } from '../../hooks/useTabSearch';

export type Tab = keyof TabResults;
export type DatePreset = 'all' | '오늘' | '이번주' | '이번달' | 'custom';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'work', label: '업무일지' },
  { id: 'issue', label: 'PR' },
  { id: 'inquiry', label: '문의사항' },
  { id: 'techDoc', label: '관제시스템 문서' },
];

// 결과 줄 왼쪽 띠 색 = 자료 종류 (업무일지는 하나의 색으로 묶음)
export const TYPE_META: Record<string, { label: string; edge: string; text: string }> = {
  card: { label: '일지 카드', edge: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  log: { label: '업무일지', edge: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  comment: { label: '일지 댓글', edge: 'bg-sky-300 dark:bg-sky-700', text: 'text-sky-700 dark:text-sky-300' },
  issue: { label: 'PR', edge: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  inquiry: { label: '문의사항', edge: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
  tech_doc: { label: '관제시스템 문서', edge: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
};

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: '전체 기간' },
  { id: '오늘', label: '오늘' },
  { id: '이번주', label: '이번 주' },
  { id: '이번달', label: '이번 달' },
  { id: 'custom', label: '직접 입력' },
];

function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function computeDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const today = new Date();
  if (preset === '오늘') { const s = toDateStr(today); return { dateFrom: s, dateTo: s }; }
  if (preset === '이번주') {
    const mon = new Date(today);
    mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    return { dateFrom: toDateStr(mon), dateTo: toDateStr(today) };
  }
  if (preset === '이번달') {
    return { dateFrom: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: toDateStr(today) };
  }
  if (preset === 'custom') return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
  return { dateFrom: undefined, dateTo: undefined };
}

export function highlight(text: string, q: string): ReactNode {
  if (!q.trim()) return text;
  // !+ 이후는 제외어 — 강조 대상에서 제외
  const includePart = q.trim().split(/!+/)[0];
  const phrases = [...includePart.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  const rest = includePart.replace(/"[^"]*"/g, '').trim();
  const tokens = [...phrases, ...rest.split(/[\s&|]+/)].map(t => t.trim()).filter(t => t.length > 0);
  if (!tokens.length) return text;
  const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`^(${pattern})$`, 'i');
  return text.split(new RegExp(`(${pattern})`, 'gi')).map((part, i) =>
    re.test(part)
      ? <mark key={i} className="rounded-[3px] bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/25 dark:text-amber-100">{part}</mark>
      : part,
  );
}
