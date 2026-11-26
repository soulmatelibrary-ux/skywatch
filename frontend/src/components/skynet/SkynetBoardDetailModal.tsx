// 게시판 게시글 상세 모달 — body_text 미리보기 + 원문 보기
import type { SkynetBoardPost } from '../../types/skynet';
import { formatDateTimeISO } from '../../utils/dateUtils';

interface Props {
  post: SkynetBoardPost;
  directUrl: string | null;
  onClose: () => void;
}

function openExternal(url: string) {
  const w = 1100, h = 750;
  window.open(url, 'board_article', `width=${w},height=${h},left=${Math.round((screen.width - w) / 2)},top=${Math.round((screen.height - h) / 2)},resizable=yes,scrollbars=yes`);
}

export function SkynetBoardDetailModal({ post, directUrl, onClose }: Props) {
  const isNew = post.reg_dt?.slice(0, 10) === new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isNew && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                  NEW
                </span>
              )}
              {post.matched_keyword && (
                <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  {post.matched_keyword}
                </span>
              )}
            </div>
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {post.title || '(제목 없음)'}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-slate-400 dark:text-slate-500">
              {post.brd_name && <span>{post.brd_name}</span>}
              {post.author && <span>{post.author}</span>}
              {post.reg_dt && <span>{formatDateTimeISO(post.reg_dt)}</span>}
              {typeof post.view_cnt === 'number' && post.view_cnt > 0 && <span>조회 {post.view_cnt}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {directUrl && (
              <button
                type="button"
                onClick={() => openExternal(directUrl)}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[12px] font-semibold transition"
              >
                원문 보기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              닫기
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {post.body_text ? (
            <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {post.body_text}
            </p>
          ) : (
            <p className="text-[13px] text-slate-400 dark:text-slate-500 italic">본문 내용이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
