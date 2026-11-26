import { useEffect, useRef, useState } from 'react';
import { attachmentApi } from '../../services/api/attachmentApi';
import type { Attachment } from '../../types/attachment';
import { openAttachment, triggerDownload } from '../../services/attachmentOpen';

interface Props {
  cardId?: number | null;
  canDelete?: boolean;
  onPendingChange?: (files: File[]) => void;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function CardAttachSection({ cardId, canDelete = true, onPendingChange }: Props) {
  const [serverFiles, setServerFiles] = useState<Attachment[]>([]);
  const [localQueue, setLocalQueue] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalCount = serverFiles.length + localQueue.length;

  useEffect(() => {
    if (!cardId) return;
    attachmentApi.list('card', cardId).then(setServerFiles).catch(() => {});
  }, [cardId]);

  function handleFiles(files: File[]) {
    if (!cardId) {
      setLocalQueue(prev => {
        const next = [...prev, ...files];
        onPendingChange?.(next);
        return next;
      });
      return;
    }
    files.forEach(async file => {
      try {
        const att = await attachmentApi.upload('card', cardId, file);
        setServerFiles(p => [...p, att]);
      } catch {
        // 업로드 실패 시 조용히 무시 (사용자는 재시도 가능)
      }
    });
  }

  function removeLocal(idx: number) {
    setLocalQueue(prev => {
      const next = prev.filter((_, i) => i !== idx);
      onPendingChange?.(next);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    await attachmentApi.delete(targetId);
    setServerFiles(p => p.filter(f => f.id !== targetId));
    setDeleteTarget(null);
  }

  return (
    <div className="border border-slate-200 rounded-2xl bg-white mt-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-200">첨부</span>
          {totalCount > 0 && <span className="text-[12px] text-slate-400 dark:text-slate-500">{totalCount}개</span>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-[12px] font-medium hover:bg-blue-100 transition dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30 dark:hover:bg-cyan-500/25"
        >
          파일 추가
        </button>
      </div>

      {totalCount > 0 && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 space-y-2 dark:border-slate-700">
          {serverFiles.map(f => (
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
              >{f.original_name}</button>
              <span className="shrink-0 text-slate-400 text-[12px] dark:text-slate-500">{fmtSize(f.file_size)}</span>
              <button
                type="button"
                onClick={() => triggerDownload(attachmentApi.downloadUrl(f.id, true), f.original_name)}
                className="shrink-0 px-2 py-0.5 rounded border border-slate-300 text-[11px] text-slate-600 hover:bg-slate-100 transition dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                다운로드
              </button>
              {canDelete && <button type="button" onClick={() => setDeleteTarget(f)} className="shrink-0 px-2 py-0.5 rounded border border-red-200 text-[11px] text-red-500 hover:bg-red-50 transition dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-500/10">삭제</button>}
            </div>
          ))}

          {localQueue.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] py-0.5">
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-100">{f.name}</span>
              <span className="shrink-0 text-slate-400 text-[12px] dark:text-slate-500">{fmtSize(f.size)}</span>
              <span className="text-[11px] text-slate-300 dark:text-slate-500">임시</span>
              <button onClick={() => removeLocal(i)} className="shrink-0 text-slate-400 hover:text-red-500 px-1 dark:text-slate-400 dark:hover:text-red-300">×</button>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/60 w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 dark:bg-red-950/40 px-5 py-4 border-b border-red-200 dark:border-red-900/60">
              <div className="text-[15px] font-bold text-red-600 dark:text-red-400">파일 삭제</div>
              <div className="text-[12px] text-red-500 dark:text-red-300 mt-0.5">삭제한 파일은 복구할 수 없습니다.</div>
            </div>
            <div className="px-5 py-4">
              <div className="text-[13px] text-slate-600 dark:text-slate-300 mb-1">다음 파일을 삭제하시겠습니까?</div>
              <div className="text-[13px] font-semibold text-red-600 dark:text-red-400 break-all">{deleteTarget.original_name}</div>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-xl border border-slate-300 text-[13px] text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                취소
              </button>
              <button type="button" onClick={confirmDelete} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
