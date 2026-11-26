import type { Comment } from '../../types/log';
import { formatDateTimeISO } from '../../utils/dateUtils';

const REACTION_PRESETS = ['👍', '👎', '😄', '🎉'];

interface Props {
  comment: Comment;
  currentUserId: number;
  isAdmin: boolean;
  onReply: (commentId: number, authorName: string) => void;
  onDelete: (commentId: number) => void;
  onToggleReaction: (commentId: number, emoji: string) => void;
}

export function CommentItem({ comment, currentUserId, isAdmin, onReply, onDelete, onToggleReaction }: Props) {
  if (comment.is_deleted) {
    return <div className="flex items-start gap-2 py-0.5 text-[12px] text-slate-400 italic dark:text-slate-500">(삭제된 댓글)</div>;
  }

  const initial = (comment.author_name ?? '?').slice(0, 1);
  const isOwn = comment.author_id === currentUserId;
  const myReactions = new Set(comment.reactions.filter(r => r.user_ids.includes(currentUserId)).map(r => r.emoji));

  return (
    <div className="flex items-start gap-1 py-0">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0 mt-0.5 dark:bg-blue-500/15 dark:text-blue-200">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0">
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{comment.author_name ?? '-'}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDateTimeISO(comment.created_at)}</span>
        </div>
        <div className="text-[13px] text-slate-700 leading-[1.15] whitespace-pre-wrap mb-0 dark:text-slate-200">{comment.body}</div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {comment.reactions.map(rg => (
            <button
              key={rg.emoji}
              onClick={() => onToggleReaction(comment.id, rg.emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0 rounded-full border text-[11px] hover:scale-105 transition ${
                myReactions.has(rg.emoji)
                  ? 'bg-blue-100 border-blue-300 dark:bg-blue-500/20 dark:border-blue-400'
                  : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <span>{rg.emoji}</span>
              <span>{rg.user_ids.length}</span>
            </button>
          ))}
          {REACTION_PRESETS.map(emoji => (
            <button key={emoji} onClick={() => onToggleReaction(comment.id, emoji)} className="text-[13px] opacity-40 hover:opacity-100 transition hover:scale-110">
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          <button onClick={() => onReply(comment.id, comment.author_name ?? '')} className="hover:text-blue-600 transition dark:hover:text-cyan-300">답글</button>
          {(isOwn || isAdmin) && (
            <button onClick={() => onDelete(comment.id)} className="hover:text-red-500 transition dark:hover:text-red-300">삭제</button>
          )}
        </div>
      </div>
    </div>
  );
}
