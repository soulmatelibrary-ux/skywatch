// 신규 근무일지 공통 유틸 — 본문 항목 해석, 근무 날짜 계산
import type { ShiftType } from '../types/shiftLog';

export type BodyLine =
  | { type: 'kv'; key: '조치' | '원인' | '결과' | '다음'; text: string }
  | { type: 'li'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string };

const KV_RE = /^(조치|원인|결과|다음)\s*[:：]\s*(.*)$/;
const LI_RE = /^[-•]\s*/;
const HR_RE = /^[=\-_~*#─━]{5,}$/;   // 기존 본문의 "=====" 같은 기호만 있는 줄

export function parseBody(text: string): BodyLine[] {
  return text.split('\n').filter(l => l.trim()).map((line): BodyLine => {
    if (HR_RE.test(line.trim())) return { type: 'hr' };
    const m = line.match(KV_RE);
    if (m) return { type: 'kv', key: m[1] as '조치', text: m[2] };
    if (LI_RE.test(line)) return { type: 'li', text: line.replace(LI_RE, '') };
    return { type: 'p', text: line };
  }).filter((l, i, arr) => l.type !== 'hr' || (i > 0 && arr[i - 1].type !== 'hr'));
}

/** 평문 줄을 편집기용 <p> 문단으로 (정기 업무 본문 미리 채우기) */
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split('\n').filter(l => l.trim()).map(l => `<p>${esc(l)}</p>`).join('');
}

/** 서식·표·이미지 등 HTML 태그가 있어 HTML 그대로 보여줘야 하는 본문인지 */
export function isRichHtml(html: string | null): boolean {
  return !!html && /<(table|img|strong|em|u|s|mark|h[1-6]|ol|span\s)\b/i.test(html);
}

export function nextSteps(text: string): string[] {
  return parseBody(text)
    .filter((l): l is Extract<BodyLine, { type: 'kv' }> => l.type === 'kv' && l.key === '다음')
    .map(l => l.text);
}

/** 표시용 제목 — 예전 일지처럼 제목이 "=====" 같은 기호뿐이면 본문 첫 줄을 쓴다. */
export function displayTitle(title: string, body: string): string {
  if (title.trim() && !/^[\s=\-_~*#─━.]+$/.test(title)) return title;
  const line = parseBody(body).find(l => l.type !== 'hr');
  return line && 'text' in line ? line.text : '(제목 없음)';
}

export function firstLine(text: string): string {
  const line = text.split('\n').find(l => l.trim()) ?? '';
  return line.replace(KV_RE, '$2');
}

export function isLongBody(text: string): boolean {
  return text.length > 110 || text.split('\n').filter(l => l.trim()).length > 3;
}

/** KST 기준 YYYY-MM-DD */
export function kstToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function dayLabel(date: string): string {
  return `${date.slice(5)} (${DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]})`;
}

/** 현재 시각의 근무 — 09~18시 주간, 18시 이후 당일 야간, 09시 전은 전날 야간 */
export function currentShift(): { date: string; shift: ShiftType } {
  // 일부 브라우저는 자정을 24로 반환하므로 24로 나눈 나머지를 쓴다
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false })) % 24;
  const today = kstToday();
  if (hour < 9) return { date: addDays(today, -1), shift: '야간' };
  return { date: today, shift: hour < 18 ? '주간' : '야간' };
}

export function stepShift(date: string, shift: ShiftType, dir: 1 | -1): { date: string; shift: ShiftType } {
  const base: ShiftType = shift === '주야' ? '주간' : shift;
  if (dir === 1) return base === '주간' ? { date, shift: '야간' } : { date: addDays(date, 1), shift: '주간' };
  return base === '야간' ? { date, shift: '주간' } : { date: addDays(date, -1), shift: '야간' };
}

export const SHIFT_STYLE: Record<string, string> = {
  주간: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  야간: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  주야: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  공지: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const THREAD_STATUS_LABEL: Record<string, string> = { open: '진행중', hold: '보류', done: '완료' };
