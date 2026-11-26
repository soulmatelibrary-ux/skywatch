import { useState } from 'react';
import type { IssueComment } from '../../types/issue';

interface Props {
  comments: IssueComment[];
  onAdd: (content: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

function fmtDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export function IssueCommentSection({ comments, onAdd, onDelete }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setText('');
    } catch {
      // 댓글 추가 실패는 상위 토스트에서 처리한다.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
      <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">
        코멘트 내역
      </div>

      <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
        {comments.length === 0 && (
          <div className="text-[12px] text-slate-400 dark:text-slate-500 px-1">
            등록된 코멘트가 없습니다.
          </div>
        )}

        {comments.map(comment => (
          <div key={comment.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {comment.created_by_name ?? '작성자 없음'}
              </span>
              {comment.is_certified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  인증됨
                </span>
              )}
              <span className="ml-auto text-[11px] text-slate-400">{fmtDate(comment.created_at)}</span>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('코멘트를 삭제하시겠습니까?')) onDelete(comment.id);
                  }}
                  className="text-red-400 hover:text-red-600 text-[13px] leading-none"
                >
                  ×
                </button>
              )}
            </div>
            <div className="text-[12px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {comment.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="코멘트를 입력하세요"
          rows={2}
          className="flex-1 text-[12px] border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 resize-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-500 disabled:opacity-50 transition shrink-0 self-end"
        >
          등록
        </button>
      </div>
    </div>
  );
}
