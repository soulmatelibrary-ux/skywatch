import type { PrBatchListItem } from '../../types/prBatch';

interface Props {
  batch: PrBatchListItem;
  selected: boolean;
  onClick: () => void;
}

export function PrBatchCard({ batch, selected, onClick }: Props) {
  // 진행률 = 보고서가 있는 PR / 등록 PR (근무자 수와 무관)
  const pct = batch.item_count > 0
    ? Math.round((batch.verified_item_count / batch.item_count) * 100)
    : 0;

  // 왼쪽 색 띠: 검증 끝 초록 / 검증 중 파랑 / 시작 전 회색
  const edge = batch.verified_date || (batch.item_count > 0 && pct === 100)
    ? 'border-l-emerald-500 dark:border-l-emerald-500' : pct > 0 ? 'border-l-sky-500 dark:border-l-sky-500' : 'border-l-slate-300 dark:border-l-slate-600';

  return (
    <div
      onClick={onClick}
      role="button" tabIndex={0} aria-pressed={selected}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`cursor-pointer rounded-xl border border-l-4 p-4 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
        selected
          ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-300'
      } ${edge}`}
    >
      {/* 헤더: 버전 + 수정일자 */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 truncate">
          {batch.sw_version}
        </span>
        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">수정일 {batch.agreed_date}</span>
      </div>

      {/* 요약 */}
      {batch.summary && (
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
          {batch.summary}
        </p>
      )}

      {/* 검증 진행률 */}
      <div className="mb-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
          <span>PR {batch.item_count}건 중 {batch.verified_item_count}건 검증</span>
          <span className="ml-auto">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${batch.verified_date || pct === 100 ? 'bg-green-500' : 'bg-sky-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 이전 버전 + 첨부 */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span className="truncate">
          {batch.verified_date
            ? <b className="font-medium text-green-600 dark:text-green-400">검증완료 {batch.verified_date}</b>
            : '검증 중'}
          {batch.previous_version && <span className="ml-2">이전 {batch.previous_version}</span>}
        </span>
        {batch.attachment_count > 0 && (
          <span className="flex items-center gap-0.5" title="원본 문서">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {batch.attachment_count}
          </span>
        )}
      </div>
    </div>
  );
}
