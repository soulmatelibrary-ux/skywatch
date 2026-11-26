interface Props {
  onExcel: () => void;
  onPick: () => void;
  onAdd: () => void;
}

const PRIMARY = 'rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400';
const OUTLINE = 'rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

// 목록을 만드는 세 가지 방법. 가장 자주 쓰는 '엑셀로 한 번에 등록'을 주 버튼으로 둔다.
export function PrBatchItemActions({ onExcel, onPick, onAdd }: Props) {
  return <div className="flex flex-wrap gap-1.5">
    <button onClick={onExcel} className={PRIMARY}>엑셀로 한 번에 등록</button>
    <button onClick={onPick} className={OUTLINE}>개별 PR에서 가져오기</button>
    <button onClick={onAdd} className={OUTLINE}>직접 추가</button>
  </div>;
}

const WAYS = [
  { key: 'excel', title: '엑셀로 한 번에 등록', text: '제작사가 준 PR 목록 엑셀을 올리면 목록이 만들어집니다. 개별 PR에 없는 PR은 함께 등록됩니다.', main: true },
  { key: 'pick', title: '개별 PR에서 가져오기', text: '우리가 등록해 둔 개별 PR 중에서 이번 버전에 들어간 것을 골라 담습니다.', main: false },
  { key: 'add', title: '직접 추가', text: 'PR 번호와 제목을 하나씩 입력합니다. 한두 건만 더할 때 편합니다.', main: false },
] as const;

// 목록이 비어 있을 때: 무엇을 어떻게 시작할지 선택지를 카드로 보여 준다.
export function PrBatchItemEmpty(props: Props) {
  const run = { excel: props.onExcel, pick: props.onPick, add: props.onAdd };
  return <div className="space-y-3 py-4">
    <p className="text-center text-[13px] text-slate-600 dark:text-slate-300">
      아직 검증할 PR이 없습니다. 아래 방법 중 하나로 목록을 만들어 주세요.
    </p>
    <div className="grid gap-2 @2xl:grid-cols-3">
      {WAYS.map(way => <button key={way.key} onClick={run[way.key]}
        className={`rounded-lg border border-l-4 bg-white p-3 text-left hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${way.main
          ? 'border-slate-200 border-l-sky-500 dark:border-slate-700 dark:border-l-sky-400'
          : 'border-slate-200 border-l-slate-300 dark:border-slate-700 dark:border-l-slate-600'}`}>
        <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">{way.title}</span>
        <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">{way.text}</span>
      </button>)}
    </div>
  </div>;
}
