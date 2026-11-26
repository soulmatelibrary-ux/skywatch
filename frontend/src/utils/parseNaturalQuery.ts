/** 자연어 검색 텍스트를 API 필터 파라미터로 변환 */
export interface NaturalQueryResult {
  team?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
}

export function parseNaturalQuery(raw: string): NaturalQueryResult {
  const text = raw.trim();
  if (!text) return {};

  const lower = text.toLowerCase();
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const result: NaturalQueryResult = {};
  let remaining = text;

  // 날짜 키워드 추출 (키워드를 제거하고 나머지는 q로)
  if (lower.includes('오늘')) {
    result.date_from = fmt(today); result.date_to = fmt(today);
    remaining = remaining.replace(/오늘/g, '').trim();
  } else if (lower.includes('어제')) {
    const d = new Date(today); d.setDate(d.getDate() - 1);
    result.date_from = fmt(d); result.date_to = fmt(d);
    remaining = remaining.replace(/어제/g, '').trim();
  } else if (lower.includes('이번주')) {
    const mon = new Date(today);
    mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    result.date_from = fmt(mon); result.date_to = fmt(sun);
    remaining = remaining.replace(/이번주/g, '').trim();
  } else if (lower.includes('이번달')) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    result.date_from = fmt(from); result.date_to = fmt(to);
    remaining = remaining.replace(/이번달/g, '').trim();
  }

  // 팀 키워드 추출
  const teamMatch = remaining.toLowerCase().match(/([abcd])조/);
  if (teamMatch) {
    result.team = teamMatch[1].toUpperCase();
    remaining = remaining.replace(new RegExp(`${teamMatch[1]}조`, 'gi'), '').trim();
  } else if (remaining.toLowerCase().includes('일근')) {
    result.team = 'day';
    remaining = remaining.replace(/일근/gi, '').trim();
  }

  // 날짜 단축 형식 "4/25" — 다른 키워드 없이 단독 입력된 경우만
  if (!result.date_from) {
    const shortDate = remaining.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (shortDate) {
      const d = `${today.getFullYear()}-${shortDate[1].padStart(2, '0')}-${shortDate[2].padStart(2, '0')}`;
      result.date_from = d; result.date_to = d;
      remaining = '';
    }
  }

  if (remaining) result.q = remaining;
  return result;
}
