import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { attachmentApi } from '../../services/api/attachmentApi';
import { openAttachment } from '../../services/attachmentOpen';
import type { AttachmentSearchResult } from '../../types/attachment';

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

const RECT_KEY = 'skywatch_attach_search_rect';
type Rect = { x: number; y: number; w: number; h: number };

function loadRect(): Rect {
  try { const s = localStorage.getItem(RECT_KEY); if (s) return JSON.parse(s) as Rect; } catch {}
  const w = 960, h = 560;
  return {
    x: Math.max(0, (window.innerWidth - w) / 2 | 0),
    y: Math.max(0, (window.innerHeight - h) / 2 | 0),
    w, h,
  };
}

interface Props {
  onClose: () => void;
  onSelectLog: (logId: number) => void;
}

export function AttachSearchModal({ onClose, onSelectLog }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AttachmentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<Rect>(loadRect);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resRef = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const { sx, sy, ox, oy } = dragRef.current;
        setRect(r => ({ ...r, x: ox + e.clientX - sx, y: oy + e.clientY - sy }));
      }
      if (resRef.current) {
        const { sx, sy, ow, oh } = resRef.current;
        setRect(r => ({ ...r, w: Math.max(480, ow + e.clientX - sx), h: Math.max(300, oh + e.clientY - sy) }));
      }
    };
    const onUp = () => { dragRef.current = null; resRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(RECT_KEY, JSON.stringify(rect)); } catch {}
  }, [rect]);

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 2) { setError('2글자 이상 입력하세요.'); return; }
    setLoading(true); setError(''); setSearched(false);
    try {
      const data = await attachmentApi.searchByName(q);
      setResults(data); setSearched(true);
    } catch {
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[349] bg-black/50" onClick={onClose} />
      <div
        className="fixed z-[350] bg-white dark:bg-slate-800 rounded-lg shadow-2xl flex flex-col"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        {/* 헤더 — 드래그 영역 */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 cursor-move select-none shrink-0"
          onMouseDown={e => {
            if (e.button !== 0) return;
            dragRef.current = { sx: e.clientX, sy: e.clientY, ox: rect.x, oy: rect.y };
          }}
        >
          <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>📎</span> 첨부파일명 검색
          </span>
          <button
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none"
          >×</button>
        </div>

        {/* 검색 입력 */}
        <div className="px-5 py-4 flex gap-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="파일명 일부를 입력하세요 (2글자 이상)"
            className="flex-1 border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>

        {/* 결과 영역 */}
        <div className="overflow-y-auto flex-1">
          {error && <p className="px-5 py-4 text-red-500 text-sm">{error}</p>}
          {!error && searched && results.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">검색 결과가 없습니다.</p>
          )}
          {results.length > 0 && (
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium w-[55%]">파일명</th>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium w-[100px]">크기</th>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium w-[100px]">일지일자</th>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">카드</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr
                    key={r.attachment_id}
                    className="border-t border-slate-100 dark:border-slate-700"
                  >
                    <td
                      className="px-4 py-2 truncate max-w-0 cursor-pointer text-blue-600 hover:underline dark:text-cyan-300"
                      onClick={() => void openAttachment({
                        attachmentId: r.attachment_id,
                        filename: r.original_name,
                        viewUrl: attachmentApi.viewUrl(r.attachment_id),
                        downloadUrl: attachmentApi.downloadUrl(r.attachment_id, true),
                      })}
                      title={`${r.original_name} — 클릭하여 열기`}
                    >
                      {r.original_name}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtSize(r.file_size)}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.log_date ?? '-'}</td>
                    <td
                      className="px-4 py-2 truncate max-w-0 cursor-pointer text-slate-600 hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-cyan-300"
                      onClick={() => onSelectLog(r.log_id)}
                      title={`${r.card_title ?? ''} — 클릭하여 일지 열기`}
                    >
                      {r.card_title ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!searched && !loading && !error && (
            <p className="px-5 py-8 text-center text-slate-300 dark:text-slate-600 text-sm">파일명을 입력하고 검색하세요.</p>
          )}
        </div>

        {/* 푸터 */}
        {results.length > 0 && (
          <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 text-right shrink-0">
            {results.length}건 · 행 클릭 시 해당 일지를 엽니다
          </div>
        )}

        {/* 리사이즈 핸들 (우하단) */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize select-none flex items-end justify-end pb-1 pr-1"
          onMouseDown={e => {
            e.stopPropagation();
            if (e.button !== 0) return;
            resRef.current = { sx: e.clientX, sy: e.clientY, ow: rect.w, oh: rect.h };
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-400 dark:text-slate-500">
            <path d="M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </>,
    document.body,
  );
}
