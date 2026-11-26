import { useEffect, useState } from 'react';
import { useInquiryList } from '../hooks/useInquiryList';
import { useInquiryEdit } from '../hooks/useInquiryEdit';
import { useActiveUsers } from '../hooks/useShiftWriteData';
import type { Inquiry } from '../types/inquiry';
import { inquiryApi } from '../services/api/inquiryApi';
import { useUIStore } from '../store/uiStore';
import { InquiryFilterBar } from '../components/inquiry/InquiryFilterBar';
import { InquiryTable } from '../components/inquiry/InquiryTable';
import { InquiryNewRow } from '../components/inquiry/InquiryNewRow';
import { InquiryDetailPanel } from '../components/inquiry/InquiryDetailPanel';
import { readerFeatures } from '../utils/popupGeometry';
import { PageNav } from '../components/common/PageNav';
import { useInquiryExcel } from '../hooks/useInquiryExcel';

export function InquiryPage() {
  const addToast = useUIStore((s) => s.addToast);
  const {
    inquiries,
    total,
    page,
    perPage,
    isLoading,
    year,
    month,
    dateFrom,
    dateTo,
    category,
    status,
    searchQuery,
    sort,
    order,
    setPage,
    setPerPage,
    handleFilterChange,
    toggleSort,
    replaceItem,
    refresh,
    fetchList,
  } = useInquiryList();
  const { data: users } = useActiveUsers();

  const {
    editingCell,
    editValue,
    isSaving,
    startEdit,
    cancelEdit,
    setEditValue,
    saveEdit,
  } = useInquiryEdit(replaceItem);

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
  const { excelLabel, exportExcel, importFile, isImporting, fileInputRef } = useInquiryExcel({ year, month, dateFrom, dateTo, category, status, searchQuery }, () => void refresh());

  useEffect(() => {
    inquiryApi.categories()
      .then(resp => setCategories(resp.data.data || []))
      .catch(error => console.error('Failed to fetch categories', error));
  }, []);

  // fetchList 는 필터·페이지·정렬 변경 시 새로 생성됨
  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    const ch = new BroadcastChannel('skywatch-inquiry');
    ch.onmessage = (e) => {
      if (e.data?.type === 'inquiry-saved') void refresh();
    };
    return () => ch.close();
  }, [refresh]);

  function handleOpenPopup(id: number) {
    const features = readerFeatures('popup_inquiry_view', {
      width: 920, height: 720,
      left: Math.round((screen.width - 920) / 2),
      top: Math.round((screen.height - 720) / 2),
    });
    window.open(`/inquiries/view-popup?id=${id}`, `inquiry_view_${id}`, features);
  }

  const handleDeleteInquiry = async (inquiry: Inquiry) => {
    const label = [inquiry.inquiry_no, inquiry.keyword].filter(Boolean).join(' · ');
    if (!window.confirm(`[${label}] 문의사항을 삭제하시겠습니까?`)) return;
    try {
      await inquiryApi.remove(inquiry.id);
      addToast('삭제했습니다.', 'success');
      void refresh();
    } catch {
      addToast('삭제하지 못했습니다.', 'error');
    }
  };

  const selectedInquiry = selectedDetailId
    ? inquiries.find(i => i.id === selectedDetailId)
    : null;

  const today = new Date().toISOString().substring(0, 10);

  const handleViewAll = () => {
    handleFilterChange({
      year: null,
      month: null,
      date_from: null,
      date_to: null,
      category: null,
      status: null,
      query: '',
    });
  };

  const GHOST = 'rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 transition hover:border-sky-500 hover:text-sky-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300';

  return (
    <div className="min-h-full bg-[#F3F6F9] dark:bg-[#0B1524]">
      <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">문의사항</h1>
          <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">{total.toLocaleString()}건</span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={handleViewAll} className={GHOST}>전체 보기</button>
            <button type="button" onClick={() => void exportExcel()} className={GHOST}>{excelLabel}</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className={GHOST}>
              {isImporting ? '엑셀 올리는 중…' : '엑셀 올리기'}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => void importFile(e)} className="hidden" />
          </div>
        </div>

        <InquiryFilterBar
          year={year}
          month={month}
          dateFrom={dateFrom}
          dateTo={dateTo}
          category={category}
          status={status}
          searchQuery={searchQuery}
          categories={categories}
          onFilterChange={handleFilterChange}
        />

        <div className="flex flex-wrap items-center gap-3">
          <InquiryNewRow onSuccess={() => void refresh()} currentDate={today} />
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            번호·내용을 누르면 상세, 칸을 두 번 누르면 바로 고칠 수 있습니다. 머리글을 누르면 정렬됩니다.
          </span>
          <select
            aria-label="한 쪽에 보일 개수"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            {[30, 50, 100, 150].map(n => <option key={n} value={n}>{n}개씩</option>)}
          </select>
        </div>

        {/* 최초 로딩에만 안내, 재조회 중에는 기존 목록 유지 (깜빡임 방지) */}
        {isLoading && inquiries.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-slate-500">불러오는 중…</div>
        ) : (
          <div className={`transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
            <InquiryTable
              inquiries={inquiries}
              editingCell={editingCell}
              editValue={editValue}
              isSaving={isSaving}
              users={users}
              sort={sort}
              order={order}
              onSort={toggleSort}
              onStartEdit={startEdit}
              onEditValueChange={setEditValue}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onDeleteInquiry={handleDeleteInquiry}
              onClickContent={setSelectedDetailId}
              onOpenPopup={handleOpenPopup}
            />
          </div>
        )}

        <PageNav page={page} total={total} pageSize={perPage} onPageChange={setPage} bordered={false} />
      </div>

      {selectedDetailId && (
        <InquiryDetailPanel
          inquiry={selectedInquiry || null}
          isOpen={!!selectedDetailId}
          onClose={() => setSelectedDetailId(null)}
          onSave={replaceItem}
        />
      )}
    </div>
  );
}
