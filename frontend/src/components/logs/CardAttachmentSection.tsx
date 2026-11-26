import { useRef, useState } from 'react';
import { attachmentApi } from '../../services/api/attachmentApi';
import { openAttachment, triggerDownload } from '../../services/attachmentOpen';

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type AttachmentLike = {
  id: number;
  original_name: string;
  file_name: string;
  file_size: number;
};

interface Props {
  cardId?: number | null;
  savedAttachments?: AttachmentLike[];
  pendingFiles?: File[];
  onAddFiles: (files: File[]) => void;
  onRemovePending?: (index: number) => void;
  onDeleteSaved?: (id: number) => void;
}

export function CardAttachmentSection({
  savedAttachments = [],
  pendingFiles = [],
  onAddFiles,
  onRemovePending,
  onDeleteSaved,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const total = savedAttachments.length + pendingFiles.length;

  function handleFiles(files: File[]) {
    setError(null);
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}은(는) 50MB를 초과하여 업로드할 수 없습니다.`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length) onAddFiles(valid);
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/60">
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <span className="font-medium">첨부</span>
          {total > 0 && <span className="text-slate-400 dark:text-slate-500">{total}개</span>}
        </span>
        <button
          type="button"
          className="px-3 py-1 text-[12px] border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => inputRef.current?.click()}
        >
          파일 추가
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>

      {(total > 0 || error) && (
        <div className="px-6 pb-4 space-y-2">
          {error && <div className="text-[12px] text-red-500">{error}</div>}

          {savedAttachments.map(f => (
            <div key={f.id} className="flex items-center gap-2 text-[13px] py-0.5">
              <button
                type="button"
                onClick={() => void openAttachment({
                  attachmentId: f.id,
                  filename: f.original_name,
                  viewUrl: attachmentApi.viewUrl(f.id),
                  downloadUrl: attachmentApi.downloadUrl(f.id, true),
                })}
                className="min-w-0 truncate text-left text-blue-600 hover:underline cursor-pointer dark:text-cyan-200"
              >
                {f.original_name}
              </button>
              <span className="shrink-0 text-slate-400 text-[12px] dark:text-slate-500">{formatSize(f.file_size)}</span>
              <button
                type="button"
                onClick={() => triggerDownload(attachmentApi.downloadUrl(f.id, true), f.original_name)}
                className="shrink-0 px-2 py-0.5 rounded border border-slate-300 text-[11px] text-slate-600 hover:bg-slate-100 transition dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                다운로드
              </button>
              {onDeleteSaved && (
                <button
                  type="button"
                  onClick={() => onDeleteSaved(f.id)}
                  className="shrink-0 px-2 py-0.5 rounded border border-red-200 text-[11px] text-red-500 hover:bg-red-50 transition dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  삭제
                </button>
              )}
            </div>
          ))}

          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] py-0.5">
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-100">{f.name}</span>
              <span className="shrink-0 text-slate-400 text-[12px] dark:text-slate-500">{formatSize(f.size)}</span>
              <span className="text-[11px] text-slate-300 dark:text-slate-500">임시</span>
              {onRemovePending && (
                <button
                  type="button"
                  onClick={() => onRemovePending(i)}
                  className="shrink-0 text-slate-400 hover:text-red-500 px-1 dark:text-slate-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
