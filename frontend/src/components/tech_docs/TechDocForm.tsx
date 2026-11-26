import { useState, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { CategoryTree, CreateTechDocInput, TechDocAttachment } from '../../types/techDoc';
import { PROJECT_LABELS } from '../../constants/techDocLabels';
import { CardEditor } from '../logs/CardEditor';
import { CardToolbar } from '../logs/CardToolbar';
import { techDocsApi } from '../../services/api/techDocsApi';
import { openAttachment } from '../../services/attachmentOpen';

interface Props {
  formData: CreateTechDocInput;
  categories: CategoryTree[];
  isLoading: boolean;
  docId?: number;
  attachments?: TechDocAttachment[];
  pendingFiles: File[];
  onUploadAttachment?: (file: File) => void;
  onDeleteAttachment?: (id: number) => void;
  onChangeField: (field: keyof CreateTechDocInput, value: string) => void;
  onPendingFilesChange: (updater: (prev: File[]) => File[]) => void;
  onPendingImageCountChange?: (count: number) => void;
}

const FIELD_CLASS = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-800 transition-colors hover:border-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const SELECT_CLASS = `${FIELD_CLASS} appearance-none pr-7 cursor-pointer`;
const LABEL_CLASS = 'mb-1 block text-[12px] font-semibold text-slate-500 dark:text-slate-400';

function SelectChevron() {
  return (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function plainTextToHtml(content: string): string {
  if (!content || content.trim().startsWith('<')) return content;
  // CSV 과정에서 생긴 \r\r\n 패턴 정규화 후 HTML 변환
  let s = content
    .replace(/\r\r\n\r\r\n/g, '\n\n')
    .replace(/\r\r\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const paragraphs = s.split('\n\n');
  return paragraphs
    .filter(p => p.trim())
    .map(p => `<p>${p.split('\n').join('<br>')}</p>`)
    .join('');
}

export function TechDocForm({
  formData, categories, isLoading: _isLoading,
  docId, attachments, pendingFiles, onUploadAttachment, onDeleteAttachment,
  onChangeField, onPendingFilesChange, onPendingImageCountChange,
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedProject = categories.find(c => c.project_code === formData.project_code);
  const subCategories = selectedProject?.categories ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (docId) {
      files.forEach(f => onUploadAttachment?.(f));
    } else {
      onPendingFilesChange(prev => [...prev, ...files]);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5 text-sm">
      {/* Row 1: 프로젝트 | 카테고리 | 키워드 | 작성일 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <label className={LABEL_CLASS}>프로젝트</label>
          <div className="relative">
            <select className={SELECT_CLASS} value={formData.project_code ?? ''}
              onChange={e => { onChangeField('project_code', e.target.value); onChangeField('category_code', ''); }}>
              <option value="">선택</option>
              {categories.map(c => (
                <option key={c.project_code} value={c.project_code}>
                  {PROJECT_LABELS[c.project_code] ?? c.project_code}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>카테고리</label>
          <div className="relative">
            <select className={SELECT_CLASS} value={formData.category_code ?? ''}
              onChange={e => onChangeField('category_code', e.target.value)}>
              <option value="">선택</option>
              {subCategories.map(c => <option key={c.category_code} value={c.category_code}>{c.name}</option>)}
            </select>
            <SelectChevron />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>키워드</label>
          <input className={FIELD_CLASS} value={formData.doc_type ?? ''} onChange={e => onChangeField('doc_type', e.target.value)} placeholder="패치, 모니터링, 장애..." />
        </div>
        <div>
          <label className={LABEL_CLASS}>작성일</label>
          <input type="date" className={FIELD_CLASS} value={formData.record_date ?? ''} onChange={e => onChangeField('record_date', e.target.value)} />
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className={LABEL_CLASS}>제목 <span className="text-red-500">*</span></label>
        <input className={FIELD_CLASS} value={formData.title} onChange={e => onChangeField('title', e.target.value)} placeholder="제목을 입력하세요" />
      </div>

      {/* 요약 */}
      <div>
        <label className={LABEL_CLASS}>요약 <span className="font-normal text-slate-400">— 적어 두면 의미 검색이 더 정확해집니다</span></label>
        <textarea
          className={`${FIELD_CLASS} resize-none`}
          rows={2}
          value={formData.summary ?? ''}
          onChange={e => onChangeField('summary', e.target.value)}
          placeholder="핵심 내용을 1~3줄로 요약 (벡터 검색에 활용)"
        />
      </div>

      {/* 본문 */}
      <div>
        <label className={LABEL_CLASS}>본문 <span className="font-normal text-slate-400">— 표·이미지는 붙여넣거나 도구에서 넣을 수 있습니다</span></label>
        <CardToolbar activeCardIdx={0} editor={editor} />
        <div className="mt-1" style={{ minHeight: 280 }}>
          <CardEditor
            initialContent={plainTextToHtml(formData.content ?? '')}
            onUpdate={html => onChangeField('content', html)}
            onFocus={() => {}}
            onEditor={setEditor}
            onPendingImageCountChange={onPendingImageCountChange}
          />
        </div>
      </div>

      {/* 첨부파일 */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">첨부파일</span>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-[12px] font-medium text-sky-700 hover:underline dark:text-sky-300">
            파일 추가
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          {!docId && pendingFiles.length > 0 && (
            <span className="text-xs text-slate-400">(저장 시 함께 업로드됩니다)</span>
          )}
        </div>

        {/* 신규 작성 중 대기 파일 */}
        {!docId && pendingFiles.length > 0 && (
          <ul className="space-y-1 mb-1">
            {pendingFiles.map((f, i) => {
              const size = f.size >= 1024 * 1024
                ? `${(f.size / 1024 / 1024).toFixed(1)}MB`
                : `${(f.size / 1024).toFixed(0)}KB`;
              return (
                <li key={`${f.name}_${i}`} className="flex items-center gap-2">
                  <span className="truncate text-xs text-slate-600 dark:text-slate-300">{f.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">({size})</span>
                  <button onClick={() => onPendingFilesChange(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0">✕</button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 수정 모드: 기존 첨부파일 */}
        {docId && (
          !attachments?.length ? (
            <p className="text-xs text-slate-400">첨부파일 없음</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map(att => (
                <li key={att.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void openAttachment({
                      attachmentId: att.id,
                      filename: att.original_name,
                      viewUrl: techDocsApi.getAttachmentViewUrl(att.id),
                      downloadUrl: techDocsApi.getAttachmentDownloadUrl(att.id, true),
                    })}
                    className="text-xs text-left text-blue-600 hover:underline truncate"
                  >
                    {att.original_name}
                  </button>
                  <button onClick={() => { if (confirm(`"${att.original_name}"을(를) 삭제하시겠습니까?`)) onDeleteAttachment?.(att.id); }}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0">삭제</button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

    </div>
  );
}
