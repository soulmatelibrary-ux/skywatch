// 관리자 설정 — 업무일지 CSV·엑셀 가져오기 (일지 파일과 첨부 파일을 각각 올린다)
import { useRef, type ChangeEvent } from 'react';
import { useCsvImport } from '../../hooks/useCsvImport';
import { dailyImportApi, type DailyImportKind } from '../../services/api/dailyImportApi';
import { CsvImportDialog } from '../common/CsvImportDialog';

const ITEMS: { kind: DailyImportKind; label: string; file: string; desc: string }[] = [
  { kind: 'logs', label: '업무일지', file: 'daily_*.csv',
    desc: '같은 번호(seq)나 같은 날짜·근무의 일지가 이미 있으면 건너뜁니다. 근무자는 제목의 이름으로 찾습니다.' },
  { kind: 'attachments', label: '업무일지 첨부', file: 'attachfiledaily_*.csv',
    desc: '번호(filegrpId)로 일지를 찾아 첫 카드에 붙입니다. 실제 파일은 backend/uploads/legacy 에 직접 복사하세요.' },
];

export function DailyImportManager() {
  const imp = useCsvImport<DailyImportKind>(dailyImportApi.upload, () => {});
  const refs = useRef<Partial<Record<DailyImportKind, HTMLInputElement | null>>>({});

  const onPick = (kind: DailyImportKind) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';  // 같은 파일을 다시 골라도 동작하게
    if (f) void imp.pick(kind, f);
  };
  const current = ITEMS.find(it => it.kind === imp.kind);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">업무일지 가져오기</h2>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
          CSV 또는 엑셀(.xlsx, 첫 시트·첫 행 머리글)을 올리면 먼저 미리보기를 보여 줍니다. 두 파일은 따로 올려도 되며, 일지를 먼저 올린 뒤 첨부를 올리세요.
        </p>
      </div>
      {ITEMS.map(it => (
        <div key={it.kind} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{it.label} <span className="font-normal text-slate-400">{it.file}</span></p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{it.desc}</p>
          </div>
          <button type="button" disabled={imp.busy} onClick={() => refs.current[it.kind]?.click()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300">
            파일 선택
          </button>
          <input ref={el => { refs.current[it.kind] = el; }} type="file" accept=".csv,.xlsx,text/csv" hidden onChange={onPick(it.kind)} />
        </div>
      ))}
      {current && (
        <CsvImportDialog
          label={current.label} missingHint="backend/uploads/legacy 에 같은 이름으로 복사하면 열립니다."
          fileName={imp.fileName} step={imp.step} result={imp.result}
          busy={imp.busy} error={imp.error} onConfirm={() => void imp.confirm()} onClose={imp.close}
        />
      )}
    </div>
  );
}
