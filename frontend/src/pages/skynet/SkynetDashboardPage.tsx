import { useState } from 'react';
import { useSkynetDashboard } from '../../hooks/skynet/useSkynetDashboard';
import { formatDateTimeISO } from '../../utils/dateUtils';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SearchIcon } from '../../components/icons';
import { SkynetCopyRef } from '../../components/skynet/SkynetCopyRef';
import { SkynetPagination } from '../../components/skynet/SkynetPagination';
import { useUIStore } from '../../store/uiStore';
import type { SkynetDocument } from '../../types/skynet';

function MemoCell({ doc, onSave }: { doc: SkynetDocument; onSave: (id: number, memo: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [memo, setMemo] = useState(doc.memo || '');
  const { addToast } = useUIStore();

  const handleSave = async () => {
    try {
      await onSave(doc.id, memo);
      setIsEditing(false);
      addToast('메모가 저장되었습니다', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '메모 저장에 실패했습니다';
      addToast(message, 'error');
    }
  };

  const handleCancel = () => {
    setMemo(doc.memo || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          type="text"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="메모 입력..."
          className="w-full rounded border border-slate-300 px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
          >
            저장
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700"
    >
      {memo ? (
        <span className="truncate text-[12px] text-slate-700 dark:text-slate-300">{memo}</span>
      ) : (
        <span className="text-[12px] text-slate-300 dark:text-slate-600">메모 추가</span>
      )}
    </div>
  );
}

function openDoc(url: string) {
  const w = 1100;
  const h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_doc', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

export function SkynetDashboardPage() {
  const {
    q,
    setQ,
    activeQ,
    year,
    sourceDept,
    keywordFilter,
    pageSize,
    page,
    docs,
    total,
    totalPages,
    loading,
    docStats,
    sourceDepts,
    years,
    crawling,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    unmatchSelected,
    matchSelected,
    search,
    clearFilters,
    goToPage,
    setPageSize,
    selectDept,
    selectYear,
    changeKeywordFilter,
    crawlNow,
    saveMemo,
  } = useSkynetDashboard();

  const { addToast } = useUIStore();
  const [matchKeyword, setMatchKeyword] = useState('수동추가');
  const isMatchedMode = keywordFilter === 'matched';
  const allSelected = docs.length > 0 && docs.every(d => selectedIds.has(d.id));

  const handleSelectAll = () => {
    allSelected ? clearSelection() : selectAll(docs.map(d => d.id));
  };

  const handleUnmatch = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}건을 매칭문서에서 제외하시겠습니까?\n(원본 문서는 그대로 유지됩니다)`)) return;
    try {
      await unmatchSelected();
      addToast(`${selectedIds.size}건이 매칭문서에서 제외되었습니다`, 'success');
    } catch {
      addToast('매칭 해제에 실패했습니다', 'error');
    }
  };

  const handleMatch = async () => {
    if (selectedIds.size === 0 || !matchKeyword.trim()) return;
    try {
      await matchSelected(matchKeyword);
      addToast(`${selectedIds.size}건이 매칭문서에 추가되었습니다 (키워드: ${matchKeyword})`, 'success');
    } catch {
      addToast('매칭 추가에 실패했습니다', 'error');
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const hasFilter = !!(activeQ || year || sourceDept || keywordFilter === 'all');

  return (
    <div className="min-h-screen bg-slate-100 p-3 dark:bg-slate-950 v2:min-h-full v2:bg-transparent v2:p-4 v2:dark:bg-transparent">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 v2:min-h-[calc(100vh-88px)] v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:shadow-none">
        <header className="shrink-0 border-b border-slate-200 px-6 pb-2 pt-3 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h1 className="text-[19px] font-bold leading-none text-slate-800 dark:text-white v2:sr-only">문서 목록</h1>
            <div className="flex items-center gap-2 v2:ml-auto">
              {isMatchedMode && selectedIds.size > 0 && (
                <button
                  onClick={handleUnmatch}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-[12px] text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-400"
                >
                  {selectedIds.size}건 매칭 해제
                </button>
              )}
              {!isMatchedMode && selectedIds.size > 0 && (
                <>
                  <input
                    type="text"
                    value={matchKeyword}
                    onChange={e => setMatchKeyword(e.target.value)}
                    placeholder="키워드"
                    className="w-[120px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    onKeyDown={e => e.key === 'Enter' && handleMatch()}
                  />
                  <button
                    onClick={handleMatch}
                    disabled={!matchKeyword.trim()}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-[12px] text-blue-600 transition hover:bg-blue-100 disabled:opacity-40 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  >
                    {selectedIds.size}건 매칭 추가
                  </button>
                </>
              )}
              <button
                onClick={crawlNow}
                disabled={crawling}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1 text-[12px] text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {crawling ? <LoadingSpinner size={14} /> : null}
                지금 수집
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {docStats && (
              <>
                <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <span className="whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">전체</span>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-white">{(docStats.total_all ?? docStats.total).toLocaleString()}</span>
                </div>
                <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <span className="whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">오늘</span>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-white">{docStats.today.toLocaleString()}</span>
                </div>
                <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <span className="whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">최근</span>
                  <span className="whitespace-nowrap text-[11px] font-bold text-slate-800 dark:text-white">
                    {docStats.last_run_at ? formatDateTimeISO(docStats.last_run_at) : docStats.last_crawled ? formatDateTimeISO(docStats.last_crawled) : '--'}
                  </span>
                </div>
                <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
              </>
            )}

            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800">
              {(['matched', 'all'] as const).map(v => (
                <label key={v} className="flex cursor-pointer items-center gap-1.5 px-1.5">
                  <input
                    type="radio"
                    name="keywordFilter"
                    value={v}
                    checked={keywordFilter === v}
                    onChange={() => changeKeywordFilter(v)}
                    className="accent-blue-600"
                  />
                  <span className="whitespace-nowrap text-[13px] text-slate-700 dark:text-slate-200">
                    {v === 'matched' ? '매칭문서만' : '전체'}
                  </span>
                </label>
              ))}
            </div>

            <select
              value={year}
              onChange={e => selectYear(e.target.value)}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-[13px] text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">전체 연도</option>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <div className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap text-[12px] text-slate-400">등록부서</span>
              <select
                value={sourceDept}
                onChange={e => selectDept(e.target.value)}
                className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">전체</option>
                {sourceDepts.map(d => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.count})
                  </option>
                ))}
              </select>
            </div>

            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="예: 홍길동&!제외어"
              className="min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={search}
              disabled={loading}
              className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              <SearchIcon size={16} /> 검색
            </button>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                초기화
              </button>
            )}
            <span className="shrink-0 whitespace-nowrap text-[12px] text-slate-400">
              <code>&amp;</code> AND, <code>!</code> 제외
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 text-[14px] text-slate-500 dark:text-slate-400">
            {hasFilter && (
              <>
                <strong className="text-slate-700 dark:text-slate-200">"{activeQ || sourceDept || year}"</strong>{' '}
              </>
            )}
            총 <span className="font-semibold text-slate-700 dark:text-slate-200">{total.toLocaleString()}</span>건
            {totalPages > 1 && <span className="ml-1 text-slate-400">({page}/{totalPages})</span>}
          </div>

          {loading && docs.length === 0 && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={32} />
            </div>
          )}

          {!loading && docs.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-400 dark:text-slate-500">
              <SearchIcon size={40} className="mb-3 opacity-40" />
              <p className="text-[15px]">문서가 없습니다.</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="v2-table w-full border-collapse">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f172a]">
                <tr>
                  <th className="w-[36px] px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="accent-blue-600"
                      title="전체 선택"
                    />
                  </th>
                  <th className="w-[50px] whitespace-nowrap px-4 py-2 text-left text-[13px] font-normal text-slate-600 dark:text-slate-400">번호</th>
                  <th className="w-[100px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">등록일</th>
                  <th className="w-[88px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">등록번호</th>
                  <th className="w-[88px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">문서번호</th>
                  <th className="w-[50px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">구분</th>
                  <th className="w-[628px] min-w-[200px] max-w-[628px] px-4 py-2 text-left text-[13px] font-normal text-slate-600 dark:text-slate-400">제목</th>
                  <th className="w-[60px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">작성자</th>
                  <th className="w-[60px] whitespace-nowrap px-4 py-2 text-left text-[11px] font-normal text-slate-600 dark:text-slate-400">결재자</th>
                  <th className="w-[60px] whitespace-nowrap px-4 py-2 text-left text-[13px] font-normal text-slate-600 dark:text-slate-400">근거번호</th>
                  <th className="w-[60px] whitespace-nowrap px-4 py-2 text-left text-[13px] font-normal text-slate-600 dark:text-slate-400">수신처</th>
                  <th className="w-[120px] px-4 py-2 text-left text-[13px] font-normal text-slate-600 dark:text-slate-400">메모</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, idx) => {
                  const isMatched = !!doc.matched_keyword;
                  const isNew = isMatched && doc.crawled_at && doc.crawled_at.slice(0, 10) === today;
                  const hasMemo = !!doc.memo && doc.memo.trim().length > 0;

                  return (
                    <tr
                      key={doc.id}
                      className={`h-10 cursor-pointer border-b border-slate-100 transition hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-700 ${
                        selectedIds.has(doc.id) ? 'bg-blue-100 dark:bg-blue-900/30' : hasMemo ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : isNew ? 'bg-blue-50/60 dark:bg-blue-950/20' : isMatched ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="accent-blue-600"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-[13px] text-slate-400 dark:text-slate-500">
                        {total - (page - 1) * pageSize - idx}
                      </td>
                      <td className="w-[100px] whitespace-nowrap px-4 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                        {doc.reg_date || '-'}
                      </td>
                      <td className="w-[88px] max-w-[88px] overflow-hidden whitespace-nowrap px-4 py-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-300">
                        {doc.reg_number || '-'}
                      </td>
                      <td className="w-[88px] max-w-[88px] overflow-hidden whitespace-nowrap px-4 py-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-300">
                        {doc.doc_number || '-'}
                      </td>
                      <td className="w-[50px] max-w-[50px] overflow-hidden whitespace-nowrap px-4 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                        {doc.flow_type || '-'}
                      </td>
                      <td className="w-[628px] max-w-[628px] overflow-hidden px-4 py-1.5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {!!doc.is_locked && <span className="shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-bold leading-none text-red-600 dark:text-red-400">잠금</span>}
                          {isNew && <span className="shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-[11px] font-medium leading-none text-green-700 dark:text-green-400">NEW</span>}
                          {isMatched && <span className="shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-[11px] font-medium leading-none text-amber-700 dark:text-amber-400">{doc.matched_keyword}</span>}
                          {doc.detail_url ? (
                            <button
                              type="button"
                              onClick={() => openDoc(doc.detail_url!)}
                              className="min-w-0 truncate text-left text-[13px] text-blue-700 hover:underline dark:text-blue-400"
                            >
                              {doc.title || '(제목 없음)'}
                            </button>
                          ) : (
                            <span className="min-w-0 truncate text-[13px] text-slate-700 dark:text-slate-300">{doc.title || '(제목 없음)'}</span>
                          )}
                        </div>
                      </td>
                      <td className="w-[60px] max-w-[60px] overflow-hidden whitespace-nowrap px-4 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                        {doc.charger_nm || '-'}
                      </td>
                      <td className="w-[60px] max-w-[60px] overflow-hidden whitespace-nowrap px-4 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                        {doc.aprv_nm || '-'}
                      </td>
                      <td className="w-[60px] px-4 py-1.5">
                        <SkynetCopyRef doc={doc} />
                      </td>
                      <td className="w-[60px] max-w-[60px] overflow-hidden px-4 py-1.5">
                        {doc.recv_name ? (
                          <span
                            className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            title={doc.recv_name}
                          >
                            {doc.recv_name.length > 5 ? `${doc.recv_name.slice(0, 5)}…` : doc.recv_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="w-[120px] px-4 py-1.5">
                        <MemoCell doc={doc} onSave={saveMemo} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 px-6 py-2 dark:border-slate-700">
          <SkynetPagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            goToPage={goToPage}
            setPageSize={setPageSize}
          />
        </footer>
      </div>
    </div>
  );
}
