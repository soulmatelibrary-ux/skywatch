// 검색 문법 안내 (첫 화면 하단 · 결과 화면 '검색 방법' 펼침)
const RULES: [string, string][] = [
  ['FDP COLD', '두 단어가 모두 들어간 자료'],
  ['FDP|SDP', '둘 중 하나라도 들어간 자료'],
  ['FDP!테스트', '"테스트"가 들어간 자료는 빼기'],
  ['"cold start"', '띄어쓰기까지 그대로 일치'],
  ['어제 FDP', '오늘, 어제, 이번주, 이번달로 기간 지정'],
  ['A조 인계', 'A조~D조, 일근으로 근무조 지정'],
];

export function SearchSyntaxHelp() {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
      {RULES.map(([syntax, desc]) => (
        <div key={syntax} className="flex items-baseline gap-2">
          <dt className="shrink-0 rounded bg-slate-200/70 px-1.5 text-[12px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {syntax}
          </dt>
          <dd className="text-slate-500 dark:text-slate-400">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}
