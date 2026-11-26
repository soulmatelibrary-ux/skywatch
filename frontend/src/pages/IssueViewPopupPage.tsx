import { useEffect, useState } from 'react';
import { useAuthInit } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { IssueDetailPanel } from '../components/issues/IssueDetailPanel';
import { IssueForm } from '../components/issues/IssueForm';
import { useIssueDetail } from '../hooks/useIssueDetail';
import { issueApi } from '../services/api/issueApi';
import { useUIStore } from '../store/uiStore';
import { usePopupGeometrySave } from '../hooks/usePopupGeometrySave';
import { setWindowTitle } from '../utils/popupGeometry';
import type { IssueCreate } from '../types/issue';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
type Mode = 'detail' | 'edit';

export function IssueViewPopupPage() {
  useAuthInit();
  usePopupGeometrySave('popup_issue_view');
  const { currentUser, isLoading: authLoading } = useAuthStore();
  const addToast = useUIStore(s => s.addToast);
  const issueId = Number(new URLSearchParams(window.location.search).get('id')) || null;
  const [mode, setMode] = useState<Mode>('detail');
  const { issue, loading: issueLoading, error: issueError, refresh } = useIssueDetail(issueId);

  useEffect(() => {
    if (!authLoading && (!currentUser || !issueId)) window.close();
  }, [authLoading, currentUser, issueId]);

  // 창 제목 "PR SL-8675 · 제목" — 여러 창을 띄웠을 때 작업표시줄에서 구분
  useEffect(() => {
    if (issue) setWindowTitle(`PR ${issue.lm_pr_no || issue.kac_pr_no || ''} · ${issue.title}`);
  }, [issue]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!currentUser || !issueId) return null;

  function broadcast(type: string) {
    const ch = new BroadcastChannel('skywatch-issue');
    ch.postMessage({ type, id: issueId });
    ch.close();
  }

  async function handleUpdate(data: IssueCreate) {
    if (!issueId) return;
    try {
      await issueApi.patch(issueId, data);
      addToast('수정되었습니다.', 'success');
      broadcast('issue-updated');
      await refresh();
      setMode('detail');
    } catch {
      addToast('수정에 실패했습니다.', 'error');
    }
  }

  async function handleDelete() {
    if (!issueId || !confirm('삭제하시겠습니까?')) return;
    try {
      await issueApi.remove(issueId);
      broadcast('issue-deleted');
      window.close();
    } catch {
      addToast('삭제에 실패했습니다.', 'error');
    }
  }

  async function handleAddComment(content: string) {
    if (!issueId) return;
    try {
      await issueApi.addComment(issueId, content);
      await refresh();
    } catch {
      addToast('코멘트 등록에 실패했습니다.', 'error');
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await issueApi.deleteComment(commentId);
      await refresh();
    } catch {
      addToast('코멘트 삭제에 실패했습니다.', 'error');
    }
  }

  async function handleUploadFile(file: File) {
    if (!issueId) return;
    if (file.size > MAX_FILE_SIZE) {
      addToast('파일 크기는 20MB를 초과할 수 없습니다.', 'error');
      return;
    }
    try {
      await issueApi.uploadAttachment(issueId, file);
      await refresh();
    } catch {
      addToast('파일 업로드에 실패했습니다.', 'error');
    }
  }

  async function handleDeleteAttachment(attId: number) {
    try {
      await issueApi.deleteAttachment(attId);
      await refresh();
    } catch {
      addToast('파일 삭제에 실패했습니다.', 'error');
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-900">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
        <h1 className="text-[14px] font-bold text-slate-700 dark:text-slate-200">PR관리 상세</h1>
        <button
          type="button"
          onClick={() => window.close()}
          className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          닫기
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {issueLoading && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size={28} />
          </div>
        )}
        {!issueLoading && issueError && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-slate-500 dark:text-slate-400 text-[14px]">데이터를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => window.close()}
              className="text-[13px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              닫기
            </button>
          </div>
        )}
        {issue && mode === 'detail' && (
          <IssueDetailPanel
            issue={issue}
            onEdit={() => setMode('edit')}
            onDelete={handleDelete}
            onRefresh={refresh}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onUploadFile={handleUploadFile}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}
        {issue && mode === 'edit' && (
          <IssueForm
            key={issue.id}
            initial={issue}
            onSubmit={handleUpdate}
            onCancel={() => setMode('detail')}
          />
        )}
      </div>
    </div>
  );
}
