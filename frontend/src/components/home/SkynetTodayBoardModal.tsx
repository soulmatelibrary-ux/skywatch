import { useState } from 'react';
import { useSkynetTodayBoard } from '../../hooks/skynet/useSkynetTodayBoard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { SkynetBoardDetailModal } from '../skynet/SkynetBoardDetailModal';
import type { SkynetBoardPost } from '../../types/skynet';

interface Props {
  onClose: () => void;
}

export function SkynetTodayBoardModal({ onClose }: Props) {
  const { posts, boardDirectUrl, loading } = useSkynetTodayBoard();
  const [selectedPost, setSelectedPost] = useState<SkynetBoardPost | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">오늘 수집 게시글</h2>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              닫기
            </button>
          </div>

          <div className="max-h-[calc(80vh-74px)] overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size={28} /></div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-slate-400 dark:text-slate-500">
                오늘 수집된 게시글이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map(post => {
                  const isNew = post.reg_dt?.slice(0, 10) === today;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 transition hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        {isNew && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 mt-0.5">
                            NEW
                          </span>
                        )}
                        {post.matched_keyword && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 mt-0.5">
                            {post.matched_keyword}
                          </span>
                        )}
                        <span className="text-[13px] text-slate-800 dark:text-slate-100 line-clamp-1 flex-1">
                          {post.title || '(제목 없음)'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {post.reg_dt && <span>{post.reg_dt.slice(0, 10)}</span>}
                        {post.brd_name && <span>{post.brd_name}</span>}
                        {post.author && <span>{post.author}</span>}
                        {typeof post.view_cnt === 'number' && post.view_cnt > 0 && <span>조회 {post.view_cnt}</span>}
                      </div>
                      {post.body_text && (
                        <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {post.body_text}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPost && (
        <SkynetBoardDetailModal
          post={selectedPost}
          directUrl={
            boardDirectUrl && selectedPost.atcl_id
              ? `${boardDirectUrl}&atclId=${selectedPost.atcl_id}`
              : null
          }
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
}
