import { useState } from 'react';
import { formatDateTimeISO } from '../../utils/dateUtils';
import type { CommentWithReplies } from '../../types/log';
import { highlightMentions } from '../../utils/mentionHighlight';

const REACTIONS = ['👍', '✅', '❗', '🔁'];

interface Props {
  comments: CommentWithReplies[];
  replyToName: string | null;
  isSubmitting: boolean;
  onSubmit: (body: string) => Promise<void>;
  onDelete: (id: number) => void;
  onToggleReaction: (id: number, emoji: string) => void;
  onReplyStart: (id: number, name: string) => void;
  onReplyCancel: () => void;
}

export function LogDetailComments({ comments, replyToName, isSubmitting, onSubmit, onDelete, onToggleReaction, onReplyStart, onReplyCancel }: Props) {
  const [body, setBody] = useState('');
  const visibleComments = comments
    .filter(c => !c.is_deleted)
    .map(c => ({
      ...c,
      replies: c.replies.filter(r => !r.is_deleted),
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await onSubmit(body);
    setBody('');
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <div className="text-[14px] font-semibold text-slate-700">
        댓글{visibleComments.length > 0 ? ` (${visibleComments.length})` : ''}
      </div>

      {visibleComments.map(c => (
        <div key={c.id} className="space-y-2">
          <div className="flex-1 bg-slate-50 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-medium text-slate-700">{c.author_name}</span>
              <span className="text-[12px] text-slate-400">{formatDateTimeISO(c.created_at)}</span>
            </div>
            <p className="text-[14px] text-slate-700 whitespace-pre-wrap">{highlightMentions(c.body)}</p>
            <div className="flex items-center gap-2 mt-3">
              {REACTIONS.map(emoji => {
                const g = c.reactions.find(r => r.emoji === emoji);
                return (
                  <button key={emoji} onClick={() => onToggleReaction(c.id, emoji)} className="text-[13px] px-1.5 py-0.5 rounded hover:bg-slate-200 transition">
                    {emoji}{g && g.user_ids.length > 0 ? ` ${g.user_ids.length}` : ''}
                  </button>
                );
              })}
              <button onClick={() => onReplyStart(c.id, c.author_name ?? '')} className="text-[12px] text-slate-400 hover:text-blue-600 ml-1">답글</button>
              <button onClick={() => onDelete(c.id)} className="text-[12px] text-slate-300 hover:text-red-400 ml-auto">삭제</button>
            </div>
          </div>

          {c.replies.map(r => (
            <div key={r.id} className="ml-8 bg-blue-50 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-medium text-slate-700">{r.author_name}</span>
                <span className="text-[12px] text-slate-400">{formatDateTimeISO(r.created_at)}</span>
              </div>
              <p className="text-[14px] text-slate-700 whitespace-pre-wrap">{highlightMentions(r.body)}</p>
            </div>
          ))}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        {replyToName && (
          <div className="flex items-center gap-2 text-[13px] text-blue-600 mb-2">
            <span>@{replyToName} 에게 답글</span>
            <button type="button" onClick={onReplyCancel} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-[14px] hover:bg-blue-700 transition disabled:opacity-50"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
