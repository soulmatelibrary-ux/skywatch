import type { CardLinkResult } from '../../types/log';

interface Props {
  query: string;
  results: CardLinkResult[];
  isLoading: boolean;
  onSelect: (logId: number, cardId: number, cardTitle: string, logTitle: string) => void;
}

export function LinkSearchPanel({ query, results, isLoading, onSelect }: Props) {
  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
      {isLoading ? (
        <div className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">검색 중...</div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3 text-[13px] text-slate-400 dark:text-slate-500">
          {query ? '검색 결과가 없습니다.' : '# 입력 후 검색하세요'}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {results.map(result => (
            <button
              key={`${result.log_id}-${result.card_id}`}
              onClick={() => onSelect(result.log_id, result.card_id, result.card_title, result.log_date)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex flex-col gap-1 group dark:hover:bg-slate-800"
            >
              <div className="text-[12px] text-slate-500 dark:text-slate-400">{result.log_date}</div>
              <div className="text-[13px] font-medium text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-cyan-200">
                {result.log_title}
              </div>
              <div className="text-[12px] text-slate-600 group-hover:text-blue-600 truncate dark:text-slate-400 dark:group-hover:text-cyan-200">
                {result.card_title}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
