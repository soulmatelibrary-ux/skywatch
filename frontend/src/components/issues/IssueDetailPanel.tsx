import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Issue, IssueStatus } from '../../types/issue';
import { issueApi } from '../../services/api/issueApi';
import { IssueCommentSection } from './IssueCommentSection';
import { openAttachment } from '../../services/attachmentOpen';
import { RichContentView } from '../common/RichContentView';

const STATUS_BADGE: Record<IssueStatus, string> = {
  진행중: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  수정완료: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  경고: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  반환: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

interface Props {
  issue: Issue;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (id: number) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onDeleteAttachment: (id: number) => Promise<void>;
}

export function IssueDetailPanel({
  issue,
  onEdit,
  onDelete,
  onRefresh: _onRefresh,
  onAddComment,
  onDeleteComment,
  onUploadFile,
  onDeleteAttachment,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await onUploadFile(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${STATUS_BADGE[issue.status]}`}>
              {issue.status}
            </span>
            {issue.kac_pr_no && (
              <span className="text-[12px] font-mono font-bold text-slate-600 dark:text-slate-300">
                {issue.kac_pr_no}
              </span>
            )}
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{issue.title}</h2>
        </div>

        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => {
            const params = new URLSearchParams({ issueId: String(issue.id) });
            if (issue.kac_pr_no) params.set('kacPrNo', issue.kac_pr_no);
            if (issue.lm_pr_no) params.set('lmPrNo', issue.lm_pr_no);
            navigate(`/pr-batches?${params.toString()}`);
          }}
            className="text-[12px] px-2.5 py-1 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition">
            검증 보고서
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-[12px] px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-400/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex flex-wrap gap-x-5 gap-y-1">
        {[
          ['등록일', issue.reg_date],
          ['조치일', issue.action_date],
          ['제작사(LM) PR번호', issue.lm_pr_no],
          ['키워드', issue.keyword],
          ['발생버전', issue.version],
          ['수정버전', issue.mod_version],
          ['담당자', issue.assigned_to_name],
          ['작성자', issue.created_by_name],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <span key={label as string} className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1">{label}</span>
              {value}
            </span>
          ))}
      </div>

      {issue.content && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 mb-1">내용</div>
          <RichContentView content={issue.content} className="text-[13px] text-slate-700 dark:text-slate-200" />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
            첨부파일 {issue.attachments.length}개
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[12px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            파일 추가
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {issue.attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => void openAttachment({
                attachmentId: att.id,
                filename: att.original_name,
                viewUrl: issueApi.viewUrl(att.id),
                downloadUrl: issueApi.downloadUrl(att.id, true),
              })}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-[12px] text-blue-600 dark:text-cyan-300 hover:underline truncate"
            >
              {att.original_name}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('첨부파일을 삭제하시겠습니까?')) onDeleteAttachment(att.id);
              }}
              className="shrink-0 text-[13px] text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 leading-none px-1"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <IssueCommentSection
        comments={issue.comments}
        onAdd={onAddComment}
        onDelete={onDeleteComment}
      />
    </div>
  );
}
