import { useState } from 'react';
import { useSkynetSearch } from '../../hooks/skynet/useSkynetSearch';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SearchIcon } from '../../components/icons';
import type { SkynetSearchItem } from '../../types/skynet';

const fallbackCopy = (text: string) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(el);
};

function openDoc(url: string) {
  const w = 1100, h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_doc', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

const BADGE_CLS: Record<string, string> = {
  board: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700',
  crawl: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700',
  all:   'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600',
};

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[11px] h-[11px] opacity-50 shrink-0">
    <rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10"/>
  </svg>
);

function ResultItem({ item, no }: { item: SkynetSearchItem; no: number }) {
  const [copied, setCopied] = useState(false);
  const copy = (t: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
    } else {
      fallbackCopy(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 500);
  };

  const docRef = item.kind === 'document' ? (item.doc_number || item.reg_number) : null;
  const dateShort = item.reg_date ? item.reg_date.slice(5, 10) : '';
  const docRefText = docRef ? (dateShort ? `${docRef}(${dateShort})` : docRef) : null;
  const showRegNum = item.kind === 'document'
    && item.reg_number && item.doc_number
    && item.reg_number !== item.doc_number;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
      <div className="flex gap-2.5 text-[12px] text-slate-400 dark:text-slate-500 mb-1.5">
        <span>{no}</span>
        {item.source_dept && <span>{item.source_dept}</span>}
        {item.reg_date && <span>{item.reg_date.slice(0, 10)}</span>}
      </div>
      <div className="text-[15px] mb-1.5">
        <span className={`inline-block text-[11px] font-bold px-1.5 py-0.5 rounded mr-2 ${BADGE_CLS[item.badge_kind] ?? BADGE_CLS.all}`}>
          {item.badge}
        </span>
        {!!item.is_locked && (
          <span className="inline-block text-[11px] font-bold px-1.5 py-0.5 rounded mr-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700">
            잠금
          </span>
        )}
        {item.detail_url ? (
          <button
            type="button"
            onClick={() => openDoc(item.detail_url!)}
            className="text-blue-700 dark:text-blue-400 hover:underline font-medium text-left"
          >
            {item.title || '(제목 없음)'}
          </button>
        ) : (
          <span className="text-slate-800 dark:text-slate-100">{item.title || '(제목 없음)'}</span>
        )}
      </div>
      <div className="flex gap-3 flex-wrap text-[12px] text-slate-400 dark:text-slate-500 items-center">
        {item.flow_type && <span>{item.flow_type}</span>}
        {docRefText && (
          <button onClick={() => copy(docRefText)} title="클릭하면 복사됩니다."
                  className={`flex items-center gap-1 cursor-copy rounded px-1 py-0.5 transition ${copied ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'}`}>
            {docRefText}
            <CopyIcon />
          </button>
        )}
        {item.charger_nm && <span>담당: {item.charger_nm}</span>}
        {item.aprv_nm && <span>결재: {item.aprv_nm}</span>}
        {showRegNum && <span>{item.reg_number}</span>}
      </div>
    </div>
  );
}

export function SkynetSearchPage() {
  const { q, setQ, submittedQ, results, total, totalPages, page, pageSize, setPageSize, loading, submit, goToPage, semantic, toggleSemantic } = useSkynetSearch();
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') submit(q); };

  if (!submittedQ) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 pb-[20%]">
        <h1 className="text-[2.2rem] font-black tracking-[-0.05em] text-slate-800 dark:text-white">SkyNet</h1>
        <div className="w-full max-w-[600px]">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-3 shadow-sm focus-within:border-blue-500 transition">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
                   placeholder={semantic ? '예: 방재설비 점검 절차는 어떻게 되나요' : '예: 홍길동&2026&!제외어'} autoFocus
                   className="flex-1 bg-transparent outline-none text-[15px] text-slate-800 dark:text-white placeholder-slate-400" />
            <button onClick={() => submit(q)} className="text-slate-400 hover:text-blue-600 transition">
              <SearchIcon size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            {semantic ? (
              <p className="text-[12px] text-violet-500">자연어로 의미 기반 검색합니다.</p>
            ) : (
              <p className="text-[12px] text-slate-400">
                <code>&amp;</code> AND 조건 &nbsp;·&nbsp; <code>!</code> 제외 조건
              </p>
            )}
            <button onClick={toggleSemantic}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${semantic ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600 hover:border-violet-400 hover:text-violet-600'}`}>
              {semantic ? '자연어' : '키워드'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <span className="font-black tracking-[-0.04em] text-slate-800 dark:text-white">SkyNet</span>
        <span className="text-[11px] font-black tracking-widest uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">통합 검색</span>
        <div className="flex items-center gap-2 flex-1 max-w-[560px] ml-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-2xl px-3 py-2 focus-within:border-blue-500 transition">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
                 className="flex-1 bg-transparent outline-none text-[14px] text-slate-800 dark:text-white" />
          <button onClick={() => submit(q)} className="text-slate-400 hover:text-blue-600 transition">
            <SearchIcon size={14} />
          </button>
        </div>
        <button onClick={toggleSemantic}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${semantic ? 'bg-violet-600 text-white border-violet-600' : 'text-slate-500 border-slate-300 dark:border-slate-600 hover:border-violet-400 hover:text-violet-600'}`}>
          {semantic ? '자연어' : '키워드'}
        </button>
        {!semantic && <p className="text-[11px] text-slate-400 hidden xl:block"><code>&amp;</code> AND &nbsp;·&nbsp; <code>!</code> 제외</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-[860px]">
        <p className="text-[13px] text-slate-400 dark:text-slate-500 mb-5">
          <strong className="text-slate-700 dark:text-slate-200">{submittedQ}</strong>
          {semantic && <span className="ml-1.5 text-[11px] text-violet-500 font-medium">자연어</span>}
          {' '}검색 결과 — 총{' '}
          <strong className="text-slate-700 dark:text-slate-200">{total.toLocaleString()}</strong>건
          {totalPages > 1 && <span className="ml-1">({page}/{totalPages} 페이지)</span>}
        </p>

        {loading && <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>}

        {!loading && results.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
            <SearchIcon size={40} className="mb-3 opacity-40" />
            <p className="text-[15px]">검색 결과가 없습니다.</p>
            <p className="text-[13px] mt-1">다른 키워드로 검색하거나 <code>&amp;</code> 조건을 줄여보세요.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-4">
            {results.map((item, idx) => (
              <ResultItem key={`${item.kind}-${idx}`} item={item} no={total - (page - 1) * pageSize - idx} />
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between mt-8 gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={page <= 1}
                      className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">«</button>
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                      className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">‹</button>
              {Array.from({ length: Math.min(9, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 4, totalPages - 8)) + i;
                return (
                  <button key={p} onClick={() => goToPage(p)}
                          className={`px-3 py-1 rounded text-[13px] transition ${p === page ? 'bg-blue-700 text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                      className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">›</button>
              <button onClick={() => goToPage(totalPages)} disabled={page >= totalPages}
                      className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">»</button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
              <span>페이지당</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] focus:outline-none">
                {[10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}건</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
