import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePopupBounds, usePopupTheme, useResizableWidth } from '../hooks/usePopupLayout';
import { useTechDocList } from '../hooks/useTechDocList';
import { useTechDocDetail } from '../hooks/useTechDocDetail';
import { useTechDocSelection } from '../hooks/useTechDocSelection';
import { TechDocCategoryTree } from '../components/tech_docs/TechDocCategoryTree';
import { TechDocCategoryManager } from '../components/tech_docs/TechDocCategoryManager';
import { TechDocTable } from '../components/tech_docs/TechDocTable';
import { TechDocDetailPanel } from '../components/tech_docs/TechDocDetailPanel';
import { TechDocForm } from '../components/tech_docs/TechDocForm';
import { TechDocSearchBar } from '../components/tech_docs/TechDocSearchBar';
import { TechDocBulkMoveModal } from '../components/tech_docs/TechDocBulkMoveModal';
import { TechDocPaneHeader, TechDocTopBar } from '../components/tech_docs/TechDocBars';
import { TechDocCsvImport } from '../components/tech_docs/TechDocCsvImport';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { ToastContainer } from '../components/common/Toast';
import type { CreateTechDocInput } from '../types/techDoc';
import { HelpButton } from '../components/layout/HelpButton';
import { setWindowTitle } from '../utils/popupGeometry';

export function TechDocsPopupPage() {
  const [searchParams] = useSearchParams();

  usePopupTheme();
  const { width: listWidth, startDrag } = useResizableWidth('techDocListWidth2', 400, 280, 760);

  const [showManager, setShowManager] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingImageCount, setPendingImageCount] = useState(0);
  const { addToast } = useUIStore();
  const currentUser = useAuthStore(s => s.currentUser);

  const list = useTechDocList();
  const detail = useTechDocDetail(list.refresh);
  const sel = useTechDocSelection(list.refresh);
  const { selectedIds, showBulkMove, setShowBulkMove } = sel;

  useEffect(() => {
    const idStr = searchParams.get('id');
    if (idStr) detail.selectDoc(Number(idStr));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePopupBounds('techDocPopupBounds');

  // 창 제목: 고른 문서가 있으면 "TD 2481 · 제목" — 여러 창을 띄웠을 때 작업표시줄에서 구분
  const docTitle = detail.docDetail ? `TD ${detail.docDetail.id} · ${detail.docDetail.title || '제목 없음'}` : '관제시스템 문서';
  useEffect(() => { setWindowTitle(docTitle); }, [docTitle]);

  const handleSelectDoc = (id: number) => {
    if ((detail.mode === 'create' || detail.mode === 'edit') && !confirm('작성 중인 내용이 있습니다. 이동하시겠습니까?')) return;
    detail.selectDoc(id);
  };

  const handleDelete = async () => {
    if (!detail.docDetail) return;
    if (!confirm(`"${detail.docDetail.title || '제목 없음'}" 문서를 삭제하시겠습니까?`)) return;
    await detail.deleteDoc();
  };

  const handleChangeField = (field: keyof CreateTechDocInput, value: string) => {
    detail.setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectCategory = (pc: string | null, cc: string | null) => {
    if ((detail.mode === 'create' || detail.mode === 'edit')) {
      if (!confirm('작성 중인 내용이 있습니다. 이동하시겠습니까?')) return;
      detail.cancelEdit();
    }
    list.selectCategory(pc, cc);
    sel.clear();
  };

  const handleSearch = (params: Parameters<typeof list.search>[0]) => {
    list.search(params);
    sel.clear();
  };

  const handlePageChange = (p: number) => {
    list.setPage(p);
    sel.clear();
  };

  // 보기 화면으로 돌아오면 저장 대기 첨부 비우기 (렌더 중 상태 보정)
  const [prevMode, setPrevMode] = useState(detail.mode);
  if (prevMode !== detail.mode) {
    setPrevMode(detail.mode);
    if (detail.mode === 'view') setPendingFiles([]);
  }

  const handleSave = async () => {
    const ok = await detail.save(pendingFiles);
    if (ok) addToast('저장완료', 'success');
    else addToast('저장에 실패했습니다.', 'error');
  };

  const handleCancelEdit = () => {
    detail.cancelEdit();
    addToast('취소되었습니다', 'info');
  };

  const isFormMode = detail.mode === 'create' || detail.mode === 'edit';
  const canEditDoc = !detail.docDetail || currentUser?.role === 'admin'
    || detail.docDetail.author_id === currentUser?.id;

  return (
    <div className="flex h-screen flex-col bg-[#F3F6F9] text-sm text-slate-800 dark:bg-[#0B1524] dark:text-slate-100">
      <TechDocTopBar
        search={<TechDocSearchBar onSearch={handleSearch} />}
        selectedCount={selectedIds.size}
        managerOpen={showManager}
        onCreate={() => detail.startCreate(list.selectedProjectCode, list.selectedCategoryCode)}
        onBulkMove={() => setShowBulkMove(true)}
        onToggleManager={() => setShowManager(v => !v)}
        extra={<><TechDocCsvImport onImported={list.refresh} /><HelpButton section="techdocs" className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" /></>}
      />

      {showManager && (
        <div className="shrink-0 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <TechDocCategoryManager
            onClose={() => setShowManager(false)}
            onSaved={() => { setShowManager(false); list.refresh(); }}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-48 shrink-0 border-r border-slate-200 dark:border-slate-800">
          <TechDocCategoryTree
            categories={list.categories}
            selectedProjectCode={list.selectedProjectCode}
            selectedCategoryCode={list.selectedCategoryCode}
            onSelectCategory={handleSelectCategory}
          />
        </aside>

        <section style={{ width: listWidth }} className="flex shrink-0 flex-col bg-white dark:bg-slate-900" aria-label="문서 목록">
          <div className="flex h-9 shrink-0 items-center border-b border-slate-200 px-3 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{list.total.toLocaleString()}</span>건
          </div>
          <div className="min-h-0 flex-1">
            <TechDocTable
              items={list.items}
              total={list.total}
              page={list.page}
              pageSize={list.pageSize}
              selectedId={detail.selectedDocId}
              selectedIds={selectedIds}
              isLoading={list.isLoading}
              categories={list.categories}
              onSelectDoc={handleSelectDoc}
              onToggleSelect={sel.toggle}
              onSelectAll={sel.toggleAll}
              onPageChange={handlePageChange}
            />
          </div>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="목록 너비 조절"
          onMouseDown={startDrag}
          className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-sky-400 dark:bg-slate-800 dark:hover:bg-sky-500"
        />

        <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
          <TechDocPaneHeader
            mode={detail.mode}
            hasDoc={!!detail.docDetail}
            canEdit={canEditDoc}
            saving={detail.isLoading}
            pendingImages={pendingImageCount}
            canSave={!!detail.formData.title.trim()}
            onEdit={detail.startEdit}
            onDelete={() => void handleDelete()}
            onCancel={handleCancelEdit}
            onSave={() => void handleSave()}
          />
          {isFormMode ? (
            <TechDocForm
              key={`form-${detail.selectedDocId ?? 'new'}`}
              formData={detail.formData}
              categories={list.categories}
              isLoading={detail.isLoading}
              docId={detail.docDetail?.id}
              attachments={detail.docDetail?.attachments}
              pendingFiles={pendingFiles}
              onUploadAttachment={detail.uploadAttachment}
              onDeleteAttachment={detail.deleteAttachment}
              onChangeField={handleChangeField}
              onPendingFilesChange={setPendingFiles}
              onPendingImageCountChange={setPendingImageCount}
            />
          ) : (
            <TechDocDetailPanel
              doc={detail.docDetail}
              isLoading={detail.isLoading}
              categories={list.categories}
              onUploadAttachment={detail.uploadAttachment}
              onDeleteAttachment={detail.deleteAttachment}
            />
          )}
        </main>
      </div>

      <ToastContainer />

      {showBulkMove && (
        <TechDocBulkMoveModal
          count={selectedIds.size}
          categories={list.categories}
          onConfirm={sel.moveSelected}
          onClose={() => setShowBulkMove(false)}
        />
      )}
    </div>
  );
}
