import { useState } from 'react';
import { CommentItem } from './CommentItem';
import { formatDateTimeISO } from '../../utils/dateUtils';
import type { CommentWithReplies } from '../../types/log';

interface Props {
  comments: CommentWithReplies[];
  focusedCommentId?: number | null;
  currentUserId: number;
  isAdmin: boolean;
  replyToId: number | null;
  replyToName: string;
  isSubmitting: boolean;
  onSubmit: (body: string) => void;
  onDelete: (id: number) => void;
  onToggleReaction: (id: number, emoji: string) => void;
  onStartReply: (id: number, name: string) => void;
  onCancelReply: () => void;
}

export function CommentSection({
  comments,
  focusedCommentId,
  currentUserId,
  isAdmin,
  replyToId,
  replyToName,
  isSubmitting,
  onSubmit,
  onDelete,
  onToggleReaction,
  onStartReply,
  onCancelReply,
}: Props) {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const visibleComments = comments
    .filter(comment => !comment.is_deleted)
    .map(comment => ({
      ...comment,
      replies: comment.replies.filter(reply => !reply.is_deleted),
    }));

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  }

  const initial = String.fromCharCode(65 + (currentUserId % 26));

  return (
    <div className="border-t border-slate-200 pt-1.5 dark:border-slate-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:text-slate-900 transition mb-1 dark:text-slate-200 dark:hover:text-slate-100"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>댓글 ({visibleComments.length})</span>
      </button>

      {isExpanded && (
        <>
          <div className="space-y-0.5 mb-1">
            {visibleComments.map(comment => (
              <div id={`log-comment-${comment.id}`} key={comment.id} className={`scroll-mt-6 rounded-lg transition ${focusedCommentId === comment.id ? 'bg-amber-100 ring-2 ring-amber-300 dark:bg-amber-500/15' : ''}`}>
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onReply={onStartReply}
                  onDelete={onDelete}
                  onToggleReaction={onToggleReaction}
                />
                {comment.replies.length > 0 && (
                  <div className="ml-9 mt-0.5 space-y-0.5">
                    {comment.replies.map(reply => (
                      <div id={`log-comment-${reply.id}`} key={reply.id} className={`flex scroll-mt-6 items-start gap-2 rounded-lg transition ${focusedCommentId === reply.id ? 'bg-amber-100 ring-2 ring-amber-300 dark:bg-amber-500/15' : ''}`}>
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 mt-0.5 dark:bg-slate-800 dark:text-slate-300">
                          {(reply.author_name ?? '?').slice(0, 1)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-100">{reply.author_name ?? '-'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDateTimeISO(reply.created_at)}</span>
                          </div>
                          <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-[1.15] dark:text-slate-200">{reply.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {visibleComments.length === 0 && <p className="text-[12px] text-slate-400 dark:text-slate-500">아직 댓글이 없습니다.</p>}
          </div>

          <div className="flex items-start gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
              {initial}
            </div>
            <div className="flex-1">
              {replyToId !== null && (
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg dark:bg-cyan-500/15 dark:text-cyan-200">
                  <span>{replyToName}에게 답글</span>
                  <button onClick={onCancelReply} className="ml-auto text-slate-400 hover:text-slate-600 text-[12px] dark:text-slate-300 dark:hover:text-slate-100">×</button>
                </div>
              )}
              <div className="flex items-stretch gap-2">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={1}
                  placeholder="댓글을 입력하세요. (@사용자명으로 멘션 가능)"
                  onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !text.trim()}
                  className="shrink-0 min-w-[68px] px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[12px] font-medium transition dark:bg-cyan-600 dark:hover:bg-cyan-500"
                >
                  등록
                </button>
              </div>
              <div className="flex items-center justify-end mt-1">
                <button onClick={() => { setText(''); onCancelReply(); }} className="px-2 py-1 text-[12px] text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-200">
                  취소
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
