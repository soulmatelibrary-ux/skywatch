// CSV·엑셀 가져오기 공용 미리보기·결과 창 (건너뛴 행은 사유만 보여 준다)
import type { CsvImportResult } from '../../types/csvImport';

interface Props {
  label: string;        // 예: "문서 CSV", "업무일지"
  missingHint: string;  // 실제 파일이 없는 첨부를 어디에 복사하면 되는지
  fileName: string;
  step: 'preview' | 'done';
  result: CsvImportResult | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function CsvImportDialog({ label, missingHint, fileName, step, result, busy, error, onConfirm, onClose }: Props) {
  const done = step === 'done';
  const canImport = !done && !!result && result.imported > 0 && !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={busy ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${label} 가져오기`} onClick={e => e.stopPropagation()}
        className="flex max-h-[80vh] w-[560px] max-w-[92vw] flex-col gap-3 rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900 dark:text-slate-100">
        <div>
          <h3 className="text-[15px] font-bold">{label} {done ? '가져오기 결과' : '미리보기'}</h3>
          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400" title={fileName}>{fileName}</p>
        </div>

        {busy && !result && <p className="text-[13px] text-slate-500">확인 중...</p>}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</p>}

        {result && (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <span>전체 <b>{result.total}</b>행</span>
              <span className="text-sky-700 dark:text-sky-300">{done ? '가져옴' : '가져올 것'} <b>{result.imported}</b>건</span>
              <span className="text-amber-700 dark:text-amber-300">건너뜀 <b>{result.skipped.length}</b>건</span>
            </div>
            {result.new_categories.length > 0 && (
              <p className="text-[12px] text-slate-500 dark:text-slate-400">새 분류 {done ? '생성' : '생성 예정'}: {result.new_categories.join(', ')}</p>
            )}
            {result.missing_files.length > 0 && (
              <p className="rounded bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                실제 파일이 아직 없는 첨부 {result.missing_files.length}건 — {missingHint}
              </p>
            )}
            {result.warnings.length > 0 && (
              <ul className="max-h-24 list-disc overflow-auto pl-5 text-[12px] text-slate-600 dark:text-slate-300">
                {result.warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            )}
            {result.skipped.length > 0 && (
              <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr><th className="px-2 py-1">행</th><th className="px-2 py-1">번호</th><th className="px-2 py-1">제목·파일</th><th className="px-2 py-1">건너뛴 사유</th></tr>
                  </thead>
                  <tbody>
                    {result.skipped.map(s => (
                      <tr key={s.line} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1 text-slate-400">{s.line}</td>
                        <td className="px-2 py-1">{s.key}</td>
                        <td className="max-w-[180px] truncate px-2 py-1" title={s.name}>{s.name}</td>
                        <td className="px-2 py-1 text-amber-700 dark:text-amber-300">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded border border-slate-300 px-3 py-1.5 text-[13px] hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800">
            {done ? '닫기' : '취소'}
          </button>
          {!done && (
            <button type="button" onClick={onConfirm} disabled={!canImport}
              className="rounded bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-40 dark:bg-sky-500 dark:text-slate-950">
              {busy && result ? '가져오는 중...' : `${result?.imported ?? 0}건 가져오기`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
