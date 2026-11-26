function normalizeDueDateValue(value: string): string {
  return value.includes('T') ? value : value.replace(' ', 'T');
}

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(normalizeDueDateValue(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDueDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = normalizeDueDateValue(value);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const y = parsed.getFullYear();
  const m = pad(parsed.getMonth() + 1);
  const d = pad(parsed.getDate());
  const hh = pad(parsed.getHours());
  const mm = pad(parsed.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function formatDueDateDisplay(value: string | null | undefined): string {
  const parsed = parseDueDate(value);
  if (!parsed) return '마감일 없음';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function isDueOverdue(value: string | null | undefined): boolean {
  const parsed = parseDueDate(value);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
}

