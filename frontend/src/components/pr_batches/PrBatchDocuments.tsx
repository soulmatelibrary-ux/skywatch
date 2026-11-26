import { useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatchAttachment, PrBatchDocType } from '../../types/prBatch';
import { useUIStore } from '../../store/uiStore';
import { PrBatchDocUpload } from './PrBatchDocUpload';

// '기준 엑셀'은 PR 목록 단계의 [엑셀로 한 번에 등록]으로만 올라온다 (직접 첨부 유형에서는 제외).
const DOC_TYPES: PrBatchDocType[] = ['기준 엑셀', 'PR목록', '제작사 절차서', '테스트절차', '수정문서', '합의서', '납품문서', '검증결과', '기타'];
const UPLOAD_TYPES = DOC_TYPES.filter(t => t !== '기준 엑셀');
const PREVIEWABLE = /\.(pdf|png|jpe?g|gif|webp|txt)$/i;  // 서버도 이 형식만 브라우저에서 바로 연다

// 서버가 보낸 사유(detail)나 HTTP 상태를 붙여 원인을 알 수 있게 한다.
function failReason(base: string, err: unknown) {
  const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  if (typeof res?.data?.detail === 'string') return `${base}: ${res.data.detail}`;
  return res?.status ? `${base} (오류 ${res.status})` : `${base} (서버에 연결하지 못했습니다)`;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface Props {
  batchId: number;
  attachments: PrBatchAttachment[];
  onChanged: () => void;
}

const LINK = 'rounded-lg border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700';

export function PrBatchDocuments({ batchId, attachments, onChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const addToast = useUIStore(s => s.addToast);

  const handleUpload = async (files: File[], type: PrBatchDocType) => {
    setUploading(true);
    let done = 0;
    try {
      for (const file of files) {
        await prBatchApi.uploadAttachment(batchId, file, type);
        done += 1;
      }
      addToast(done > 1 ? `파일 ${done}개를 올렸습니다` : '파일을 올렸습니다', 'success');
    } catch (err) {
      addToast(failReason(`${files[done].name} 업로드에 실패했습니다${done ? ` (앞의 ${done}개는 올라감)` : ''}`, err), 'error');
    } finally {
      setUploading(false);
      if (done) onChanged();
    }
  };

  const handleDelete = async (attId: number, name: string) => {
    if (!confirm(`"${name}"을 삭제하시겠습니까?`)) return;
    try {
      await prBatchApi.deleteAttachment(attId);
      addToast('삭제되었습니다', 'success');
      onChanged();
    } catch (err) {
      addToast(failReason('삭제에 실패했습니다', err), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <PrBatchDocUpload types={UPLOAD_TYPES} uploading={uploading} onUpload={(files, type) => void handleUpload(files, type)} />

      {/* 종류별 문서 목록 */}
      {DOC_TYPES.map(type => {
        const docs = attachments.filter(a => a.doc_type === type);
        if (docs.length === 0) return null;
        return (
          <div key={type}>
            <p className="mb-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              {type} <span className="font-normal text-slate-400">{docs.length}</span>
            </p>
            <div className="space-y-1">
              {docs.map(att => (
                <div key={att.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-l-4 border-slate-200 border-l-sky-500 bg-white px-3 py-1.5 dark:border-slate-700 dark:border-l-sky-400 dark:bg-slate-800">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px] text-slate-700 dark:text-slate-200" title={att.original_name}>{att.original_name}</span>
                    {att.file_size && <span className="shrink-0 text-[11px] text-slate-400">{fmtSize(att.file_size)}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {PREVIEWABLE.test(att.original_name) && (
                      <a href={prBatchApi.downloadUrl(att.id)} target="_blank" rel="noreferrer" className={LINK}>보기</a>
                    )}
                    <a href={prBatchApi.downloadUrl(att.id, true)} className={LINK}>받기</a>
                    <button onClick={() => handleDelete(att.id, att.original_name)}
                      className="px-1 text-[11px] text-slate-400 hover:text-red-500">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {attachments.length === 0 && (
        <p className="py-2 text-center text-[12px] text-slate-500 dark:text-slate-400">
          아직 올린 문서가 없습니다. 위에서 종류를 고르고 PR 목록이나 제작사 절차서 같은 문서를 올려 주세요.
        </p>
      )}
    </div>
  );
}
