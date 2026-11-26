import { useRef, useState } from 'react';
import type { PrBatchDocType } from '../../types/prBatch';

interface Props {
  types: PrBatchDocType[];
  uploading: boolean;
  onUpload: (files: File[], type: PrBatchDocType) => void;
}

// 문서 올리기: 종류를 고르고 파일을 끌어 놓거나 선택한다 (여러 개 한 번에 가능).
export function PrBatchDocUpload({ types, uploading, onUpload }: Props) {
  const [type, setType] = useState<PrBatchDocType>(types[0]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length && !uploading) onUpload(files, type);
    if (fileRef.current) fileRef.current.value = '';
  };

  return <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
    onDrop={e => { e.preventDefault(); setDragging(false); send(e.dataTransfer.files); }}
    className={`rounded-xl border border-dashed p-3 ${dragging
      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800/40'}`}>
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
        문서 종류
        <select value={type} onChange={e => setType(e.target.value as PrBatchDocType)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
        {uploading ? '올리는 중…' : '파일 선택'}
      </button>
      <span className="text-[12px] text-slate-500 dark:text-slate-400">또는 여기로 끌어 놓으세요. 여러 파일을 한 번에 올릴 수 있고, 파일당 20MB까지입니다.</span>
    </div>
    <input ref={fileRef} type="file" multiple className="hidden" onChange={e => send(e.target.files)} />
  </div>;
}
