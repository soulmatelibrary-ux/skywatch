export type PrBatchTab = 'items' | 'verifications' | 'docs';

interface Props {
  value: PrBatchTab;
  onChange: (tab: PrBatchTab) => void;
  itemCount: number;
  verifiedCount: number;
  documentCount: number;
}

type Tone = 'done' | 'doing' | 'todo';
// 왼쪽 색 띠 = 그 단계의 진행 상태 (완료 초록, 진행 파랑, 시작 전 회색)
const EDGE: Record<Tone, string> = {
  done: 'border-l-emerald-500 dark:border-l-emerald-500', doing: 'border-l-sky-500 dark:border-l-sky-500',
  todo: 'border-l-slate-300 dark:border-l-slate-600',
};

// 작업에는 순서가 있다: ① 검증할 PR 목록을 만들고 → ② 각자 검증하고 → ③ 원본 문서를 모아 둔다.
// 화면 위쪽을 적게 차지하도록 이름과 현황을 한 줄에 둔다.
export function PrBatchTabs({ value, onChange, itemCount, verifiedCount, documentCount }: Props) {
  const steps: { id: PrBatchTab; label: string; note: string; tone: Tone }[] = [
    { id: 'items', label: '1. PR 목록', note: itemCount ? `${itemCount}건 등록됨` : '아직 없음 · 여기서 시작', tone: itemCount ? 'done' : 'todo' },
    { id: 'verifications', label: '2. 검증하기', note: itemCount ? `${verifiedCount}/${itemCount}건 검증됨` : '목록을 만든 뒤 시작',
      tone: itemCount && verifiedCount >= itemCount ? 'done' : verifiedCount ? 'doing' : 'todo' },
    { id: 'docs', label: '3. 원본 문서', note: documentCount ? `${documentCount}개 올라 있음` : '아직 없음', tone: documentCount ? 'done' : 'todo' },
  ];
  // 탭 패턴(방향키·tabpanel)을 다 갖추지 않았으므로 '현재 단계를 표시하는 버튼 묶음'으로 알린다
  return <div role="group" aria-label="검증 진행 단계"
    className="grid shrink-0 gap-2 border-b border-slate-200 bg-[#F3F6F9] px-4 py-1 @xl:grid-cols-3 dark:border-slate-700 dark:bg-[#0B1524]">
    {steps.map(step => {
      const active = value === step.id;
      return <button key={step.id} aria-current={active ? 'step' : undefined} onClick={() => onChange(step.id)}
        className={`flex min-w-0 items-baseline gap-2 rounded-lg border border-l-4 px-3 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${EDGE[step.tone]} ${active
          ? 'border-sky-400 bg-white shadow-sm dark:border-sky-500 dark:bg-slate-900'
          : 'border-slate-200 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900'}`}>
        <span className={`shrink-0 text-[14px] font-semibold ${active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'}`}>{step.label}</span>
        <span className="min-w-0 truncate text-[12px] text-slate-500 dark:text-slate-400">{step.note}</span>
      </button>;
    })}
  </div>;
}
