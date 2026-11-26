// 관제시스템 문서 — 문서 CSV / 첨부 CSV 를 각각 올리는 버튼 (legacy 번호로 서로 연결)
import { useRef, type ChangeEvent } from 'react';
import { useCsvImport } from '../../hooks/useCsvImport';
import { techDocsApi } from '../../services/api/techDocsApi';
import type { TechDocCsvKind } from '../../types/techDoc';
import { CsvImportDialog } from '../common/CsvImportDialog';

const BTN = 'rounded-lg border border-slate-300 px-3 py-1 text-[13px] text-slate-700 transition hover:border-sky-500 hover:text-sky-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300';
const LABEL: Record<TechDocCsvKind, string> = { docs: '문서 CSV', attachments: '첨부 CSV' };

export function TechDocCsvImport({ onImported }: { onImported: () => void }) {
  const imp = useCsvImport<TechDocCsvKind>(techDocsApi.importCsv, onImported);
  const docRef = useRef<HTMLInputElement>(null);
  const attRef = useRef<HTMLInputElement>(null);

  const onPick = (kind: TechDocCsvKind) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';  // 같은 파일을 다시 골라도 동작하게
    if (f) void imp.pick(kind, f);
  };

  return (
    <>
      <button type="button" onClick={() => docRef.current?.click()} className={BTN} title="document_*.csv">문서 CSV</button>
      <button type="button" onClick={() => attRef.current?.click()} className={BTN} title="attachfile_*.csv — 실제 파일은 uploads/tech_docs 에 직접 복사">첨부 CSV</button>
      <input ref={docRef} type="file" accept=".csv,.xlsx,text/csv" hidden onChange={onPick('docs')} />
      <input ref={attRef} type="file" accept=".csv,.xlsx,text/csv" hidden onChange={onPick('attachments')} />
      {imp.kind && (
        <CsvImportDialog
          label={LABEL[imp.kind]} missingHint="backend/uploads/tech_docs 에 같은 이름으로 복사하면 열립니다."
          fileName={imp.fileName} step={imp.step} result={imp.result}
          busy={imp.busy} error={imp.error} onConfirm={() => void imp.confirm()} onClose={imp.close}
        />
      )}
    </>
  );
}
