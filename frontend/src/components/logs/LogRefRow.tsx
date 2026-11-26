// 참고 일지 목록의 일지 한 줄 + (펼친/검색 일치) 카드 미리보기 줄
import type { CSSProperties } from 'react';
import DOMPurify from 'dompurify';
import type { Log, LogCard, LogDetail } from '../../types/log';
import { V2_ROW, V2_SHIFT_BAND } from '../common/v2Styles';
import { STATUS_CLS, STATUS_LABEL } from './LogRefShared';

interface Props {
  log: Log;
  detail: LogDetail | null;
  cards: LogCard[];
  keyword: string;
  onSelect: (log: Log) => void;
  onOpenCard: (log: LogDetail | null, card: LogCard, keyword: string) => void;
}

export function LogRefRow({ log, detail, cards, keyword, onSelect, onOpenCard }: Props) {
  const edge = { '--edge': V2_SHIFT_BAND[log.shift_type] } as CSSProperties;

  return (
    <div
      style={edge}
      className={`w-full rounded-xl border border-emerald-300/75 bg-white px-3 py-2 transition hover:bg-slate-50 dark:border-emerald-300/35 dark:bg-slate-950 dark:hover:bg-slate-800 ${V2_ROW} v2:rounded-md v2:bg-[var(--v2-panel)]`}
    >
      <button type="button" onClick={() => onSelect(log)} className="w-full text-left">
        <div className="flex items-center gap-2">
          <span className="v2-ref-date shrink-0 text-[15px] text-slate-400 dark:text-slate-500 w-[86px]">{log.date}</span>
          <span data-shift={log.shift_type} className="v2-shift hidden v2:inline-block shrink-0 rounded px-1.5 text-[12px] font-semibold">
            {log.shift_type}
          </span>
          <span className="flex-1 min-w-0 text-[17px] font-semibold text-slate-700 truncate dark:text-slate-100 v2:text-[14px]">
            {log.title || `[${log.date}] ${log.shift_type} 일지`}
          </span>
          <span className="v2-ref-author shrink-0 text-[15px] text-slate-500 dark:text-slate-400 max-w-[64px] truncate text-right">{log.primary_worker_name ?? ''}</span>
        </div>
      </button>

      {cards.length > 0 && (
        <div className="mt-3 space-y-2">
          {cards.map(card => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenCard(detail, card, keyword)}
              className="block w-full rounded-xl border border-cyan-300/75 bg-slate-50 px-3 py-2 text-left transition hover:border-cyan-400 hover:bg-white dark:border-cyan-300/35 dark:bg-slate-900 dark:hover:bg-slate-800 v2:rounded-md v2:border-[var(--v2-line-soft)] v2:bg-[var(--v2-sub)] v2:hover:border-[var(--v2-line)] v2:hover:bg-[var(--v2-hover)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold v2:text-[12px] ${STATUS_CLS[card.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[card.status] ?? card.status}
                </span>
                {card.category_name && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full v2:text-[12px]"
                    style={{ background: `${card.category_color ?? '#64748b'}22`, color: card.category_color ?? '#64748b' }}
                  >
                    {card.category_name}
                  </span>
                )}
              </div>
              <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-100">{card.title}</div>
              {card.content && (
                <div className="mt-1 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400 v2:text-[12px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.content) }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
