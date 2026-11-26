import { useRef } from 'react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// 신규 버전을 만들 때 제작사 PR 목록 엑셀을 함께 고른다 (선택). 저장하면 PR 목록 단계가 자동으로 채워진다.
export function PrBatchExcelPick({ file, onChange, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-1 dark:border-slate-700">
    <legend className="px-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300">PR 목록 엑셀 (선택)</legend>
    <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
      제작사가 준 엑셀(이슈 번호, 문제 내용, 수정 내용)을 함께 올리면 버전을 만든 뒤 PR 목록이 자동으로 만들어집니다.
      개별 PR에 없는 PR은 함께 등록되며, 등록 전에 대상 목록을 보여 드립니다.
    </p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={disabled} onClick={() => input.current?.click()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
        {file ? '다른 파일 선택' : '엑셀 선택'}
      </button>
      {file
        ? <>
            <span className="min-w-0 truncate text-[12px] text-slate-700 dark:text-slate-200" title={file.name}>{file.name}</span>
            <button type="button" disabled={disabled} onClick={() => onChange(null)}
              className="text-[11px] text-slate-400 hover:text-red-500 disabled:opacity-50">빼기</button>
          </>
        : <span className="text-[12px] text-slate-400">고르지 않으면 빈 버전으로 만들고, 나중에 [PR 목록] 단계에서 올릴 수 있습니다.</span>}
    </div>
    <input ref={input} type="file" accept=".xlsx,.xlsm" className="hidden"
      onChange={e => { onChange(e.target.files?.[0] ?? null); e.target.value = ''; }} />
  </fieldset>;
}
