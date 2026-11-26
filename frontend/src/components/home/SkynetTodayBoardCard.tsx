// 홈 카드 — 오늘 수집된 SkyNet 키워드 게시글 목록
import { useState } from 'react';
import { useSkynetTodayBoard } from '../../hooks/skynet/useSkynetTodayBoard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { SkynetBoardDetailModal } from '../skynet/SkynetBoardDetailModal';
import type { SkynetBoardPost } from '../../types/skynet';

interface Props {
  onOpen?: () => void;
}

export function SkynetTodayBoardCard({ onOpen }: Props) {
  const { posts, boardDirectUrl, loading } = useSkynetTodayBoard();
  const [selectedPost, setSelectedPost] = useState<SkynetBoardPost | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        오늘 수집 게시글
        {posts.length > 0 && (
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
            {posts.length}건
          </span>
        )}
        {onOpen && (
          <button
            onClick={onOpen}
            className="ml-auto text-[11px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            전체 보기 →
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-6"><LoadingSpinner size={24} /></div>}

      {!loading && posts.length === 0 && (
        <p className="text-[13px] text-slate-400 dark:text-slate-500 py-4 text-center">
          오늘 수집된 키워드 게시글이 없습니다.
        </p>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-1.5">
          {posts.map(post => {
            const isNew = post.reg_dt?.slice(0, 10) === today;
            return (
              <div
                key={post.id}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 text-[13px] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                onClick={() => setSelectedPost(post)}
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
                  <span className="text-slate-800 dark:text-slate-100 line-clamp-1 flex-1">
                    {post.title || '(제목 없음)'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {post.reg_dt && <span>{post.reg_dt.slice(0, 10)}</span>}
                  {post.brd_name && <span>{post.brd_name}</span>}
                  {post.author && <span>{post.author}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
