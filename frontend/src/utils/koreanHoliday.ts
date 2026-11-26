const START_YEAR = 2025;
const END_YEAR = 2035;

const lunarFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
  month: 'numeric',
  day: 'numeric',
});

function fmtKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLunar(d: Date) {
  const parts = lunarFormatter.formatToParts(d);
  const month = Number(parts.find(x => x.type === 'month')?.value ?? 0);
  const day = Number(parts.find(x => x.type === 'day')?.value ?? 0);
  return { month, day };
}

function addHoliday(map: Map<string, string[]>, key: string, label: string) {
  if (!map.has(key)) map.set(key, []);
  const labels = map.get(key)!;
  if (!labels.includes(label)) labels.push(label);
}

function nextWeekday(d: Date, map: Map<string, string[]>) {
  const cur = new Date(d);
  while (true) {
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() !== 0 && cur.getDay() !== 6 && !map.has(fmtKey(cur))) {
      return new Date(cur);
    }
  }
}

function buildHolidaySet(startYear: number, endYear: number) {
  const map = new Map<string, string[]>();

  for (let y = startYear; y <= endYear; y += 1) {
    addHoliday(map, `${y}-01-01`, '신정');
    addHoliday(map, `${y}-03-01`, '삼일절');
    addHoliday(map, `${y}-05-05`, '어린이날');
    addHoliday(map, `${y}-06-06`, '현충일');
    addHoliday(map, `${y}-08-15`, '광복절');
    addHoliday(map, `${y}-10-03`, '개천절');
    addHoliday(map, `${y}-10-09`, '한글날');
    addHoliday(map, `${y}-12-25`, '성탄절');
  }

  for (let y = startYear; y <= endYear; y += 1) {
    for (let month = 0; month < 12; month += 1) {
      const lastDay = new Date(y, month + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day += 1) {
        const cur = new Date(y, month, day);
        const key = fmtKey(cur);
        const { month: lunarMonth, day: lunarDay } = parseLunar(cur);

        if ((lunarMonth === 12 && lunarDay >= 29) || (lunarMonth === 1 && (lunarDay === 1 || lunarDay === 2))) {
          addHoliday(map, key, '설날');
        }
        if (lunarMonth === 4 && lunarDay === 8) {
          addHoliday(map, key, '부처님오신날');
        }
        if (lunarMonth === 8 && lunarDay >= 14 && lunarDay <= 16) {
          addHoliday(map, key, '추석');
        }
      }
    }
  }

  for (let y = startYear; y <= endYear; y += 1) {
    const keys = [...map.entries()]
      .filter(([key, labels]) => key.startsWith(`${y}-`) && labels.length > 0)
      .map(([key]) => key);

    for (const key of keys) {
      const labels = map.get(key) ?? [];
      const date = new Date(`${key}T00:00:00`);
      const dow = date.getDay();
      const singleLabel = labels[0];
      if (dow !== 0 && dow !== 6 && labels.length === 1) continue;
      addHoliday(map, fmtKey(nextWeekday(date, map)), `${singleLabel} 대체공휴일`);
    }
  }

  for (let y = startYear; y <= endYear; y += 1) {
    ['설날', '추석'].forEach(label => {
      const holidayKeys = [...map.entries()]
        .filter(([key, labels]) => key.startsWith(`${y}-`) && labels.includes(label))
        .map(([key]) => key)
        .sort();
      if (!holidayKeys.length) return;

      const needsSubstitute = holidayKeys.some(key => {
        const date = new Date(`${key}T00:00:00`);
        const dow = date.getDay();
        const labels = map.get(key) ?? [];
        return dow === 0 || labels.some(item => item !== label);
      });
      if (!needsSubstitute) return;

      addHoliday(map, fmtKey(nextWeekday(new Date(`${holidayKeys[holidayKeys.length - 1]}T00:00:00`), map)), `${label} 대체공휴일`);
    });
  }

  return new Set(map.keys());
}

const HOLIDAYS = buildHolidaySet(START_YEAR, END_YEAR);

export function isWeekendOrHoliday(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return HOLIDAYS.has(dateStr);
}
