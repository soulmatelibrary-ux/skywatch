import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PrBatchCard } from '../components/pr_batches/PrBatchCard';
import { PrBatchDetailPanel } from '../components/pr_batches/PrBatchDetailPanel';
import { PrBatchForm } from '../components/pr_batches/PrBatchForm';
import { usePrBatchDetail } from '../hooks/usePrBatchDetail';
import { usePrBatchList } from '../hooks/usePrBatchList';
import { prBatchApi } from '../services/api/prBatchApi';
import { PrBatchListHeader } from '../components/pr_batches/PrBatchListHeader';
import { PrBatchPagination } from '../components/pr_batches/PrBatchPagination';

export function PrBatchesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const issueId = Number(searchParams.get('issueId')) || null;
  const kacPrNo = searchParams.get('kacPrNo') || '';
  const lmPrNo = searchParams.get('lmPrNo') || '';
  const autoOpened = useRef<number | null>(null);
  const batchId = Number(searchParams.get('batchId')) || null;
  const autoOpenedBatch = useRef<number | null>(null);
  const list = usePrBatchList();
  const detail = usePrBatchDetail();
  const { batch: selectedBatch, load: loadDetail, reload: reloadDetail, clear: clearDetail } = detail;
  const [showForm, setShowForm] = useState(false);
  const [focusItemId, setFocusItemId] = useState<number | null>(null);

  useEffect(() => {
    if (!issueId || autoOpened.current === issueId) return;
    autoOpened.current = issueId;
    void (async () => {
      try {
        const found = (await prBatchApi.lookup({
          issue_id: issueId, kac_pr_no: kacPrNo || undefined, lm_pr_no: lmPrNo || undefined,
        })).data.data;
        if (found) {
          setFocusItemId(found.item_id);
          loadDetail(found.batch_id);
          return;
        }
      } catch { /* 연결된 버전이 없으면 URL 조건을 정리한다. */ }
      setSearchParams({}, { replace: true });
    })();
  }, [issueId, kacPrNo, lmPrNo, loadDetail, setSearchParams]);

  useEffect(() => {
    if (!batchId || selectedBatch?.id === batchId || autoOpenedBatch.current === batchId) return;
    autoOpenedBatch.current = batchId;
    loadDetail(batchId);
  }, [batchId, selectedBatch?.id, loadDetail]);

  const handleSelect = (id: number) => {
    setFocusItemId(null);  // 개별 PR에서 넘어온 포커스는 처음 연 배치에만 적용
    if (selectedBatch?.id === id) { clearDetail(); return; }
    loadDetail(id);
  };

  const handleChanged = () => {
    list.refresh();
    if (selectedBatch?.id) reloadDetail();
  };

  const handleDeleted = () => {
    setFocusItemId(null);
    clearDetail();
    list.refresh();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* 개별 PR 목록 화면과 같은 상단 바 */}
      <div className="px-4 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          {/* 새 화면은 상단 바에 같은 제목이 있어 숨긴다 */}
          <h1 className="mr-3 text-[16px] font-bold text-slate-800 dark:text-slate-100 v2:hidden">PR관리</h1>
          <button onClick={() => navigate('/issues')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-300">개별 PR 목록</button>
          <button className="rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] text-white">버전별 검증·보고</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
      {/* 좌측: 목록 */}
      <div className={`flex flex-col shrink-0 ${selectedBatch ? 'w-72 xl:w-96' : 'flex-1'} border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900`}>
        {/* 필터 헤더 */}
        <PrBatchListHeader
          total={list.total} query={list.query} year={list.year}
          onQueryChange={list.filterQuery} onYearChange={list.filterYear}
          onCreate={() => setShowForm(true)}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {list.isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-slate-400">
              <svg className="h-4 w-4 animate-spin text-sky-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              불러오는 중…
            </div>
          )}
          {!list.isLoading && list.items.length === 0 && !list.query && (
            <div className="py-10 text-center">
              <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">아직 만든 버전이 없습니다</p>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">버전을 만들고 검증할 PR 목록을 올리면 시작할 수 있습니다.</p>
              <button onClick={() => setShowForm(true)}
                className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                + 신규 버전 만들기
              </button>
            </div>
          )}
          {!list.isLoading && list.items.length === 0 && !!list.query && (
            <div className="text-center py-8 text-[13px] text-slate-400">검색어와 맞는 버전이 없습니다.</div>
          )}
          {list.items.map(batch => (
            <PrBatchCard
              key={batch.id}
              batch={batch}
              selected={selectedBatch?.id === batch.id}
              onClick={() => handleSelect(batch.id)}
            />
          ))}
          <PrBatchPagination total={list.total} limit={list.limit} skip={list.skip} onChange={list.setSkip} />
        </div>
      </div>

      {/* 우측: 상세 패널 */}
      {selectedBatch && (
        <div className="@container min-w-0 flex-1 overflow-hidden">
          <PrBatchDetailPanel
            key={selectedBatch.id}
            batch={selectedBatch}
            focusItemId={focusItemId}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
          />
        </div>
      )}
      </div>

      {/* 신규 버전 폼 모달 */}
      {showForm && (
        // 배경을 눌러도 닫지 않는다: 입력창에서 글을 끌어 선택하다 밖에서 놓았을 때 작성 중인 내용이 사라지지 않게
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <PrBatchForm
              onSaved={createdId => { setShowForm(false); list.refresh(); if (createdId) { setFocusItemId(null); loadDetail(createdId); } }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
