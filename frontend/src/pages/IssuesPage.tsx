import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssueList } from '../hooks/useIssueList';
import { useIssueDetail } from '../hooks/useIssueDetail';
import { issueApi } from '../services/api/issueApi';
import { useUIStore } from '../store/uiStore';
import { IssueFilterBar } from '../components/issues/IssueFilterBar';
import { IssueTable } from '../components/issues/IssueTable';
import { IssueDetailPanel } from '../components/issues/IssueDetailPanel';
import { IssueForm } from '../components/issues/IssueForm';
import { readerFeatures } from '../utils/popupGeometry';
import type { IssueCreate, IssueListParams, IssueStatus } from '../types/issue';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PAGE_SIZE = 50;
type PanelMode = 'detail' | 'new' | 'edit';

export function IssuesPage() {
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);
  const [page, setPage] = useState(1);
  const [baseParams, setBaseParams] = useState<Omit<IssueListParams, 'skip' | 'limit'>>({});
  const params: IssueListParams = { ...baseParams, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<PanelMode | null>(null);

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const { items, total, loading, refresh } = useIssueList(params);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const { issue, refresh: refreshDetail } = useIssueDetail(
    mode === 'detail' || mode === 'edit' ? selectedId : null
  );

  useEffect(() => {
    const ch = new BroadcastChannel('skywatch-issue');
    ch.onmessage = (e) => {
      if (e.data?.type === 'issue-updated') void refresh();
      if (e.data?.type === 'issue-deleted') { setSelectedId(null); setMode(null); void refresh(); }
    };
    return () => ch.close();
  }, [refresh]);

  function handleOpenPopup(id: number) {
    const features = readerFeatures('popup_issue_view', {
      width: 1000, height: 760,
      left: Math.round((screen.width - 1000) / 2),
      top: Math.round((screen.height - 760) / 2),
    });
    window.open(`/issues/view-popup?id=${id}`, `issue_view_${id}`, features);
  }

  function changeParams(patch: Partial<IssueListParams>) {
    setBaseParams(prev => ({ ...prev, ...patch }));
    setPage(1);
    setCheckedIds(new Set());
  }

  function handlePageChange(p: number) { setPage(p); setCheckedIds(new Set()); }
  function handleCheck(id: number, checked: boolean) {
    setCheckedIds(prev => { const s = new Set(prev); checked ? s.add(id) : s.delete(id); return s; });
  }
  function handleCheckAll(checked: boolean) {
    setCheckedIds(checked ? new Set(items.map(i => i.id)) : new Set());
  }
  async function handleBulkStatusChange(status: IssueStatus) {
    try {
      await Promise.all([...checkedIds].map(id => issueApi.patch(id, { status })));
      setCheckedIds(new Set());
      await refresh();
    } catch { addToast('일괄 변경에 실패했습니다.', 'error'); }
  }

  function handleSelect(id: number) {
    setSelectedId(id);
    setMode('detail');
  }

  async function handleCreate(data: IssueCreate) {
    try {
      await issueApi.create(data);
      addToast('장애가 등록되었습니다.', 'success');
      await refresh();
      setMode(null);
    } catch {
      addToast('등록에 실패했습니다.', 'error');
    }
  }

  async function handleUpdate(data: IssueCreate) {
    if (!selectedId) return;
    try {
      await issueApi.patch(selectedId, data);
      addToast('수정되었습니다.', 'success');
      await refresh();
      await refreshDetail();
      setMode('detail');
    } catch {
      addToast('수정에 실패했습니다.', 'error');
    }
  }

  async function handleDelete() {
    if (!selectedId || !confirm('삭제하시겠습니까?')) return;
    try {
      await issueApi.remove(selectedId);
      addToast('삭제되었습니다.', 'success');
      setSelectedId(null);
      setMode(null);
      await refresh();
    } catch {
      addToast('삭제에 실패했습니다.', 'error');
    }
  }

  async function handleAddComment(content: string) {
    if (!selectedId) return;
    try {
      await issueApi.addComment(selectedId, content);
      await refreshDetail();
    } catch {
      addToast('코멘트 등록에 실패했습니다.', 'error');
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await issueApi.deleteComment(commentId);
      await refreshDetail();
    } catch {
      addToast('코멘트 삭제에 실패했습니다.', 'error');
    }
  }

  async function handleUploadFile(file: File) {
    if (!selectedId) return;
    if (file.size > MAX_FILE_SIZE) {
      addToast('파일 크기는 20MB를 초과할 수 없습니다.', 'error');
      return;
    }
    try {
      await issueApi.uploadAttachment(selectedId, file);
      await refreshDetail();
    } catch {
      addToast('파일 업로드에 실패했습니다.', 'error');
    }
  }

  async function handleStatusChange(id: number, status: IssueStatus) {
    try {
      await issueApi.patch(id, { status });
      await refresh();
      if (id === selectedId) await refreshDetail();
    } catch {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  }

  async function handleDeleteAttachment(attId: number) {
    try {
      await issueApi.deleteAttachment(attId);
      await refreshDetail();
    } catch {
      addToast('파일 삭제에 실패했습니다.', 'error');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="mr-3 text-[16px] font-bold text-slate-800 dark:text-slate-100">PR관리</h1>
          <button className="rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] text-white">개별 PR 목록</button>
          <button onClick={() => navigate('/pr-batches')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-300">버전별 검증·보고</button>
        </div>
      </div>

      <IssueFilterBar params={params} onChange={changeParams} />

      <div className="flex flex-1 min-h-0">
        <div className="w-[620px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
          <IssueTable
            items={items}
            total={total}
            loading={loading}
            selectedId={selectedId}
            checkedIds={checkedIds}
            page={page}
            totalPages={totalPages}
            onSelect={handleSelect}
            onNew={() => { setSelectedId(null); setMode('new'); }}
            onCheck={handleCheck}
            onCheckAll={handleCheckAll}
            onPageChange={handlePageChange}
            onBulkStatusChange={handleBulkStatusChange}
            onOpenPopup={handleOpenPopup}
            onStatusChange={handleStatusChange}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          {mode === 'new' && (
            <IssueForm
              onSubmit={handleCreate}
              onCancel={() => setMode(null)}
            />
          )}
          {mode === 'edit' && issue && (
            <IssueForm
              key={issue.id}
              initial={issue}
              onSubmit={handleUpdate}
              onCancel={() => setMode('detail')}
            />
          )}
          {mode === 'detail' && issue && (
            <IssueDetailPanel
              issue={issue}
              onEdit={() => setMode('edit')}
              onDelete={handleDelete}
              onRefresh={refreshDetail}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onUploadFile={handleUploadFile}
              onDeleteAttachment={handleDeleteAttachment}
            />
          )}
          {!mode && (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-[14px]">
              목록에서 항목을 선택하거나 신규 등록하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
