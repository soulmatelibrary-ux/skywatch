import DOMPurify from 'dompurify';
import { useReferencePanel, getRepresentativeKeyword } from '../../hooks/useReferencePanel';
import type { CardLinkResult } from '../../types/log';

function buildCardLinkLabel(logDate: string, logTitle: string | null | undefined, cardTitle: string, shiftType: string) {
  return `[${logDate}] ${cardTitle || logTitle || `${shiftType} 카드`}`;
}

function buildCardLinkHtml(logDate: string, cardId: number, logTitle: string | null | undefined, cardTitle: string, shiftType: string) {
  const label = buildCardLinkLabel(logDate, logTitle, cardTitle, shiftType)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<a href="#card-${cardId}" class="sw-link" data-card-id="${cardId}">${label}</a>`;
}

interface Props {
  shiftType?: string;
  onInsertLink?: (item: CardLinkResult) => void;
  onInsertContent?: (html: string, source: CardLinkResult) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ReferencePanel({
  onInsertLink,
  onInsertContent,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const {
    query, setQuery, monthFilter, setMonthFilter, tab, setTab,
    logs, listLoading, selectedLogId, cardQ, setCardQ, detailLoading,
    hasQuery, selectedLog, filteredCards,
    selectLog, handleListScroll,
  } = useReferencePanel();

  const tabCls = (t: 'list' | 'detail') =>
    `flex-1 py-1 rounded-lg text-[11px] font-medium transition ${tab === t ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`;

  async function handleCopyLink(cardId: number, cardTitle: string) {
    if (!selectedLog) return;
    const html = buildCardLinkHtml(selectedLog.date, cardId, selectedLog.title, cardTitle, selectedLog.shift_type);
    const plainText = buildCardLinkLabel(selectedLog.date, selectedLog.title, cardTitle, selectedLog.shift_type);

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(html);
      }
    } catch {
      // ignore
    }
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col border-l border-emerald-400/70 bg-gradient-to-b from-slate-50 to-white dark:border-emerald-300/50 dark:from-slate-950 dark:to-slate-900">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-full w-full items-center justify-center border-l-4 border-emerald-400/70 bg-slate-100/70 px-2 py-4 text-[12px] font-semibold text-emerald-700 transition hover:bg-slate-200/70 dark:border-emerald-300/60 dark:bg-slate-800/70 dark:text-emerald-200 dark:hover:bg-slate-700/80"
          title="참고 일지 펼치기"
        >
          <span className="rotate-90 whitespace-nowrap">펼치기</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="shrink-0 space-y-1.5 border-b border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-slate-800">참고 일지</h3>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50"
            title="참고 일지 접기"
          >
            접기
          </button>
        </div>

        <div className="flex items-center gap-1">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="제목/작성자 검색"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setQuery('')}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] hover:bg-slate-100"
          >
            초기화
          </button>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setMonthFilter('')}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] hover:bg-slate-100"
          >
            전체
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          {monthFilter ? `${monthFilter} 기준 ` : '전체 기준 '}
          {hasQuery ? '검색 결과 ' : '최근 '}
          {logs.length}건
        </p>

        <div className="flex items-center gap-1">
          <button className={tabCls('list')} onClick={() => setTab('list')}>목록</button>
          <button className={tabCls('detail')} onClick={() => setTab('detail')}>상세</button>
        </div>
      </div>

      {tab === 'list' && (
        <div className="flex-1 space-y-1 overflow-y-auto p-2" onScroll={handleListScroll}>
          {logs.map(log => (
            <button
              key={log.id}
              onClick={() => selectLog(log.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedLogId === log.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                  <span className="shrink-0 text-[12px] font-semibold text-slate-700">{log.date}</span>
                  <span
                    className={[
                      'shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]',
                      log.shift_type === '주간' ? 'border-blue-100 bg-blue-50 text-blue-700' : '',
                      log.shift_type === '야간' ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : '',
                      log.shift_type === '주야' ? 'border-violet-100 bg-violet-50 text-violet-700' : '',
                      !['주간', '야간', '주야'].includes(log.shift_type) ? 'border-slate-200 bg-slate-100 text-slate-600' : '',
                    ].join(' ')}
                  >
                    {log.shift_type}
                  </span>
                  <span className="truncate text-[11px] text-slate-500">{log.primary_worker_name ?? '근무자 미상'}</span>
                </div>
                <span className="max-w-[110px] shrink-0 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                  {getRepresentativeKeyword(log)}
                </span>
              </div>
            </button>
          ))}
          {listLoading && <p className="py-3 text-center text-[12px] text-slate-400">불러오는 중...</p>}
          {logs.length === 0 && !listLoading && <p className="py-8 text-center text-[12px] text-slate-400">조건에 맞는 참고 일지가 없습니다</p>}
        </div>
      )}

      {tab === 'detail' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!selectedLog
            ? <p className="px-3 py-8 text-center text-[12px] text-slate-400">목록에서 참고 일지를 선택하세요</p>
            : <>
                <div className="shrink-0 border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{selectedLog.title}</p>
                  <p className="text-[11px] text-slate-400">{selectedLog.date} · {selectedLog.shift_type}</p>
                  <input
                    value={cardQ}
                    onChange={e => setCardQ(e.target.value)}
                    placeholder="카드 내용 검색"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">{filteredCards.length}건</p>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {detailLoading && <p className="py-6 text-center text-[12px] text-slate-400">불러오는 중...</p>}
                  {!detailLoading && filteredCards.map(card => (
                    <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                      <p className="text-[13px] font-semibold text-slate-700">{card.title}</p>
                      <div
                        className="sw-content mt-1 line-clamp-2 text-[11px] text-slate-500"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.content ?? '') }}
                      />
                      {(onInsertLink || onInsertContent) && (
                        <div className="mt-2 flex items-center gap-1.5">
                          {onInsertLink && (
                            <button
                              onClick={() => handleCopyLink(card.id, card.title)}
                              className="rounded-lg border border-blue-200 px-2 py-1 text-[11px] text-blue-600 transition hover:bg-blue-50"
                            >
                              링크 복사
                            </button>
                          )}
                          {onInsertContent && (
                            <button
                              onClick={() => onInsertContent(card.content ?? '', {
                                card_id: card.id,
                                card_title: card.title,
                                log_id: selectedLog.id,
                                log_date: selectedLog.date,
                                log_title: selectedLog.title,
                                log_author: selectedLog.author_name,
                              })}
                              className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700 transition hover:bg-emerald-50"
                            >
                              내용 삽입
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!detailLoading && filteredCards.length === 0 && (
                    <p className="py-6 text-center text-[12px] text-slate-400">카드가 없습니다</p>
                  )}
                </div>
              </>
          }
        </div>
      )}
    </div>
  );
}
