import { useSkynetTodayBoard } from '../../hooks/skynet/useSkynetTodayBoard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { SkynetBoardPost } from '../../types/skynet';

function openPost(boardDirectUrl: string | null, atclId: string) {
  if (!boardDirectUrl) return;
  const url = `${boardDirectUrl}&atclId=${atclId}`;
  const w = 1100;
  const h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_board_view', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

function BoardRow({ post, boardDirectUrl }: { post: SkynetBoardPost; boardDirectUrl: string | null }) {
  const canOpen = !!(boardDirectUrl && post.atcl_id);
  const isNew = post.reg_dt?.slice(0, 10) === new Date().toISOString().slice(0, 10);

  return (
    <button
      type="button"
      onClick={() => canOpen && openPost(boardDirectUrl, post.atcl_id)}
      className={`w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 transition ${
        canOpen ? 'hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer' : 'opacity-75 cursor-default'
      }`}
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
        {typeof post.view_cnt === 'number' && <span>조회 {post.view_cnt}</span>}
      </div>
      {post.body_text && (
        <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">
          {post.body_text}
        </p>
      )}
    </button>
  );
}

export function SkynetTodayBoardPopupPage() {
  const { posts, boardDirectUrl, loading } = useSkynetTodayBoard();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">오늘 수집 게시글</h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">항목을 누르면 게시글 원문을 새 창으로 엽니다.</p>
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center text-[13px] text-slate-400 dark:text-slate-500">
              오늘 수집된 게시글이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => <BoardRow key={post.id} post={post} boardDirectUrl={boardDirectUrl} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
