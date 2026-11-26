import type { PrBatchItem } from '../../types/prBatch';
import { RichContentView } from '../common/RichContentView';

// PR 등록 탭 펼침: PR 의 구체적인 내용만 보여 준다. 시험확인서(시험방법·결과)는 '검증·결과' 탭에서 본다.
export function PrBatchItemDetail({ item }: { item: PrBatchItem }) {
  const blocks = [
    ['합의된 수정 내용', item.agreed_content],
    ['실제 수정 내용', item.actual_fix],
    // 엑셀로 등록한 PR 은 개별 PR 내용과 수정 내용이 같아서 한 번만 보여 준다.
    ['PR 상세 내용', item.issue_content && ![item.actual_fix, item.agreed_content].some(v => (v ?? '').trim() === item.issue_content!.trim()) ? item.issue_content : null],
  ].filter((block): block is [string, string] => Boolean(block[1]?.trim()));

  if (!blocks.length) {
    return <p className="px-3 pb-3 pt-2 text-[12px] text-slate-400 border-t border-slate-100 dark:border-slate-700">
      입력된 PR 내용이 없습니다. 개별 PR 을 연결하면 상세 내용이 여기에 표시됩니다.
    </p>;
  }
  return <div className="px-3 pb-3 grid gap-3 border-t border-slate-100 dark:border-slate-700 pt-2 @2xl:grid-cols-2">
    {blocks.map(([label, text]) => <div key={label} className="min-w-0">
      <p className="text-[10px] font-medium text-slate-400 mb-1">{label}</p>
      <RichContentView content={text} className="text-[12px] text-slate-600 dark:text-slate-300 break-words" />
    </div>)}
  </div>;
}
