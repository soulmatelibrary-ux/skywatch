import { useRef, useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatch } from '../../types/prBatch';

interface Props {
  batch: PrBatch;
  working: boolean;
  onUpload: (file: File) => void;
  workers: { id: number; name: string }[];
  workerId: number | null;
  onWorker: (id: number | null) => void;
  selectedIds: number[];
  reportCount: number;
}

const BOX = 'rounded-xl border p-3 dark:bg-slate-800/40';

export function PrVerificationToolbar({ batch, working, onUpload, workers, workerId, onWorker, selectedIds, reportCount }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const href = prBatchApi.exportUrl(batch.id, { userId: workerId, itemIds: selectedIds });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !working) onUpload(file);
  };

  // 패널 너비 기준(@container)으로 2열/1열을 바꾼다. 화면이 좁아 목록과 같이 열려도 글자가 세로로 깨지지 않게.
  return <div className="grid gap-3 @3xl:grid-cols-2">
    <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
      className={`${BOX} ${dragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 bg-white dark:border-slate-700'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-48 flex-1">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">시험확인서 엑셀로 한꺼번에 올리기</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">PR별 시트가 있는 엑셀을 올리거나 여기로 끌어 놓으세요. 다시 올리면 내 기록만 덮어쓰고, PR 목록에 없는 시트는 건너뜁니다. PR 하나만 쓸 때는 아래 목록의 [내 검증 입력]을 누르세요.</p>
        </div>
        <a href={prBatchApi.templateUrl(batch.id, selectedIds.length ? selectedIds : undefined)}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          title={selectedIds.length ? `체크한 PR ${selectedIds.length}건의 양식` : '전체 PR 양식'}>양식 받기</a>
        <button disabled={working} onClick={() => fileInput.current?.click()}
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] text-white hover:bg-sky-700 disabled:opacity-50">{working ? '처리 중…' : '엑셀 올리기'}</button>
        <input ref={fileInput} type="file" accept=".xlsx,.xlsm" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </div>
      {batch.workbook_imports.length > 0 && <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-700">
        {batch.workbook_imports.map(w => <div key={w.id} className="flex flex-wrap gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{w.user_name}</span>
          <a href={prBatchApi.workerWorkbookUrl(batch.id, w.user_id)} title="올린 엑셀 원본 받기"
            className="min-w-0 truncate text-sky-700 hover:underline dark:text-sky-400">{w.original_name}</a>
          <span>PR {w.imported_items}건, {new Date(w.uploaded_at).toLocaleString()}</span>
        </div>)}
      </div>}
    </div>
    <div className={`${BOX} border-slate-200 bg-white dark:border-slate-700`}>
      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">보고서를 PDF 한 파일로 받기</p>
      <p className="text-[12px] text-slate-500 dark:text-slate-400">PR 순서대로 묶고 PR별 책갈피를 넣습니다. 아래 목록에서 체크한 PR이 있으면 그 PR만 묶습니다.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={workerId ?? ''} onChange={e => onWorker(e.target.value ? Number(e.target.value) : null)} aria-label="근무자"
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[12px] dark:border-slate-600 dark:bg-slate-800">
          <option value="">전체 근무자</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{selectedIds.length ? `체크한 PR ${selectedIds.length}건` : '전체 PR'}, 보고서 {reportCount}건</span>
        {reportCount > 0
          ? <a href={href} className="ml-auto rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] text-white hover:bg-sky-700">PDF 받기</a>
          : <span className="ml-auto text-[11px] text-slate-400">받을 보고서가 없습니다</span>}
      </div>
    </div>
  </div>;
}
