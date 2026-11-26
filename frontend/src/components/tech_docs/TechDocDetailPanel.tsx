import { useRef, useState } from 'react';
import type { CategoryTree, TechDocDetail } from '../../types/techDoc';
import { techDocsApi } from '../../services/api/techDocsApi';
import { PROJECT_LABELS } from '../../constants/techDocLabels';
import { openAttachment } from '../../services/attachmentOpen';
import { injectTechDocLinks } from '../../utils/logLinkUtils';
import { TechDocPreviewModal } from './TechDocPreviewModal';
import { RichContentView } from '../common/RichContentView';

const fallbackCopy = (text: string) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } catch { /* 복사 실패는 무시 */ }
  document.body.removeChild(el);
};

interface Props {
  doc: TechDocDetail | null;
  isLoading: boolean;
  categories: CategoryTree[];
  onUploadAttachment: (file: File) => void;
  onDeleteAttachment: (id: number) => void;
}

export function TechDocDetailPanel({ doc, isLoading, categories, onUploadAttachment, onDeleteAttachment }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a.sw-td-link');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-techdoc-id');
    if (id) setPreviewDocId(Number(id));
  };

  const copyRef = () => {
    if (!doc) return;
    const text = `#TD:${doc.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const catNameMap = new Map<string, string>();
  for (const tree of categories) {
    for (const cat of tree.categories) catNameMap.set(cat.category_code, cat.name);
  }

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">불러오는 중…</div>;
  }

  if (!doc) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
        <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">왼쪽 목록에서 문서를 고르세요.</p>
        <p className="text-[12px] text-slate-400">본문의 #TD:번호를 누르면 그 문서를 바로 볼 수 있습니다.</p>
      </div>
    );
  }

  const authorName = doc.author_name || '관리자';

  // 제작사 관련 문서: 첫 번째 PDF 첨부파일을 인라인 미리보기
  const firstPdfAtt = (doc.project_code === 'SKYLINE' || doc.project_code === 'SKYLINE-1')
    ? doc.attachments.find(a => /\.pdf$/i.test(a.original_name))
    : null;

  const meta: [string, string | null | undefined][] = [
    ['작성일', doc.record_date],
    ['작성자', authorName],
    ['프로젝트', doc.project_code ? (PROJECT_LABELS[doc.project_code] ?? doc.project_code) : null],
    ['분류', doc.category_code ? (catNameMap.get(doc.category_code) ?? doc.category_code) : null],
    ['키워드', doc.doc_type],
    ['버전', doc.adapt_version],
    ['서비스일자', doc.service_date],
    ['최종 수정', doc.last_edited_by_name],
  ];
  const SECTION = 'mb-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400';

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 text-[14px]">
      <header>
        <div className="flex items-start gap-3">
          <h2 className="flex-1 text-[21px] font-bold leading-snug tracking-[-0.02em] text-slate-900 dark:text-white">{doc.title || '(제목 없음)'}</h2>
          <button
            type="button"
            onClick={copyRef}
            title="다른 글에 붙여 넣으면 이 문서로 연결됩니다"
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[12px] tabular-nums transition ${
              copied
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'border-slate-300 text-slate-500 hover:border-sky-500 hover:text-sky-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-sky-300'
            }`}
          >
            {copied ? '번호 복사됨' : `#TD:${doc.id} 복사`}
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1 border-b border-slate-200 pb-3 text-[13px] dark:border-slate-800">
          {meta.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-400 dark:text-slate-500">{k}</dt>
              <dd className="truncate text-slate-700 dark:text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* PDF 인라인 미리보기 (제작사 문서) */}
      {firstPdfAtt && (
        <div className="flex shrink-0 flex-col">
          <div className="mb-1.5 flex items-center gap-2">
            <p className={SECTION.replace('mb-1.5 ', '')}>PDF 미리보기</p>
            <span className="truncate text-[12px] text-slate-400">{firstPdfAtt.original_name}</span>
          </div>
          {/* 스크롤 영역 안에서 줄어들면 iframe 이 넘쳐 본문과 겹치므로 높이를 고정한다 */}
          <iframe
            src={techDocsApi.getAttachmentViewUrl(firstPdfAtt.id)}
            className="h-[70vh] min-h-[400px] w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            title={firstPdfAtt.original_name}
          />
        </div>
      )}

      {doc.content && (
        <section className="max-w-[80ch]">
          <RichContentView
            content={doc.content}
            transform={injectTechDocLinks}
            onClick={handleContentClick}
            className="text-[15px] leading-[1.8] text-slate-800 dark:text-slate-200"
          />
        </section>
      )}

      {doc.reference && (
        <section>
          <h3 className={SECTION}>참조</h3>
          <p className="whitespace-pre-wrap text-[13px] text-slate-600 dark:text-slate-300">{doc.reference}</p>
        </section>
      )}

      <section>
        <div className="mb-1.5 flex items-center gap-3">
          <h3 className={SECTION.replace('mb-1.5 ', '')}>첨부파일 {doc.attachments.length > 0 && <span className="tabular-nums">{doc.attachments.length}</span>}</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[12px] font-medium text-sky-700 hover:underline dark:text-sky-300"
          >
            파일 올리기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) {
                onUploadAttachment(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
        </div>

        {doc.attachments.length === 0 ? (
          <p className="text-[12px] text-slate-400">첨부파일이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {doc.attachments.map(att => (
              <li key={att.id} className="flex items-center gap-3 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => void openAttachment({
                    attachmentId: att.id,
                    filename: att.original_name,
                    viewUrl: techDocsApi.getAttachmentViewUrl(att.id),
                    downloadUrl: techDocsApi.getAttachmentDownloadUrl(att.id, true),
                  })}
                  className="min-w-0 flex-1 truncate text-left text-[13px] text-sky-700 hover:underline dark:text-sky-300"
                >
                  {att.original_name}
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(`"${att.original_name}"를 삭제하시겠습니까?`)) onDeleteAttachment(att.id); }}
                  className="shrink-0 text-[12px] text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {previewDocId !== null && (
        <TechDocPreviewModal docId={previewDocId} categories={categories} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}
