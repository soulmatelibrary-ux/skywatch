import { useRef, useState } from 'react';
import { attachmentApi } from '../../services/api/attachmentApi';
import { openAttachment } from '../../services/attachmentOpen';
import type { AttachmentBrief } from '../../types/shiftLog';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 저장된 첨부 목록 — 누르면 기존 첨부 열기 방식(한글 파일은 내려받기)으로 연다. */
export function AttachmentList({ items, compact = false }: { items: AttachmentBrief[]; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-1.5'}`} onClick={e => e.stopPropagation()}>
      {items.map(a => (
        <button key={a.id} type="button" title={`${a.original_name} · ${fileSize(a.file_size)}`}
          onClick={() => void openAttachment({
            attachmentId: a.id, filename: a.original_name,
            viewUrl: attachmentApi.viewUrl(a.id), downloadUrl: attachmentApi.downloadUrl(a.id, true),
          })}
          className="inline-flex max-w-[220px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span>📎</span><span className="truncate">{a.original_name}</span>
          <span className="shrink-0 text-[11px] text-slate-400">{fileSize(a.file_size)}</span>
        </button>
      ))}
    </div>
  );
}

interface PickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  onReject: (message: string) => void;
}

/** 올릴 파일 고르기 — 여러 개 선택·끌어다 놓기, 파일당 20MB 제한. */
export function AttachmentPicker({ files, onChange, onReject }: PickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function add(list: FileList | null) {
    if (!list?.length) return;
    const picked = Array.from(list);
    const tooBig = picked.filter(f => f.size > MAX_FILE_BYTES);
    if (tooBig.length) onReject(`20MB를 넘는 파일은 올릴 수 없습니다: ${tooBig.map(f => f.name).join(', ')}`);
    const keys = new Set(files.map(f => `${f.name}-${f.size}`));
    onChange([...files, ...picked.filter(f => f.size <= MAX_FILE_BYTES && !keys.has(`${f.name}-${f.size}`))]);
  }

  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[12px] ${over ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'}`}>
      <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">📎 파일 첨부</button>
      <input ref={inputRef} type="file" multiple hidden onChange={e => { add(e.target.files); e.target.value = ''; }} />
      {files.length === 0 && <span className="text-slate-400">여러 개 선택하거나 여기로 끌어다 놓기 · 파일당 20MB</span>}
      {files.map((f, i) => (
        <span key={`${f.name}-${f.size}`} className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span className="truncate">{f.name}</span><span className="shrink-0 text-[11px] text-slate-400">{fileSize(f.size)}</span>
          <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500" aria-label="첨부 빼기">×</button>
        </span>
      ))}
    </div>
  );
}
