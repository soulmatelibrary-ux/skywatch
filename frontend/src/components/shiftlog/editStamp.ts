/** 수정 시각 — 오늘이면 HH:MM, 아니면 MM-DD HH:MM */
export function stamp(iso: string): string {
  const d = new Date(iso);
  const hm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === new Date().toDateString()) return hm;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`;
}
