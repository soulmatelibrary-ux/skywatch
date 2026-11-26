import { useEffect, useRef, useState } from 'react';
import { techDocsApi } from '../../services/api/techDocsApi';
import type { CategoryTree, TechDocDetail } from '../../types/techDoc';
import { PROJECT_LABELS } from '../../constants/techDocLabels';
import { openAttachment } from '../../services/attachmentOpen';
import { injectTechDocLinks } from '../../utils/logLinkUtils';
import { RichContentView } from '../common/RichContentView';

interface Props {
  docId: number;
  categories?: CategoryTree[];
  onClose: () => void;
}

const MIN_W = 380;
const MIN_H = 280;

export function TechDocPreviewModal({ docId, categories, onClose }: Props) {
  const [doc, setDoc] = useState<TechDocDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 720, h: 560 });
  const [ready, setReady] = useState(false);
  const [nestedDocId, setNestedDocId] = useState<number | null>(null);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a.sw-td-link');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-techdoc-id');
    if (id) setNestedDocId(Number(id));
  };

  const drag = useRef({ active: false, startX: 0, startY: 0, px: 0, py: 0 });
  const rsz = useRef({ active: false, dir: '', startX: 0, startY: 0, sw: 0, sh: 0, px: 0, py: 0 });

  useEffect(() => {
    const w = Math.min(720, window.innerWidth - 32);
    const h = Math.min(560, window.innerHeight - 32);
    setSize({ w, h });
    setPos({ x: Math.round((window.innerWidth - w) / 2), y: Math.round((window.innerHeight - h) / 2) });
    setReady(true);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setDoc(null);
    techDocsApi.fetchTechDocDetail(docId)
      .then(res => setDoc(res.data.data))
      .finally(() => setIsLoading(false));
  }, [docId]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current.active) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - size.w, drag.current.px + e.clientX - drag.current.startX)),
          y: Math.max(0, Math.min(window.innerHeight - 40, drag.current.py + e.clientY - drag.current.startY)),
        });
      }
      if (rsz.current.active) {
        const dx = e.clientX - rsz.current.startX;
        const dy = e.clientY - rsz.current.startY;
        const d = rsz.current.dir;
        let nw = rsz.current.sw, nh = rsz.current.sh, nx = rsz.current.px, ny = rsz.current.py;
        if (d.includes('e')) nw = Math.max(MIN_W, rsz.current.sw + dx);
        if (d.includes('w')) { nw = Math.max(MIN_W, rsz.current.sw - dx); nx = rsz.current.px + rsz.current.sw - nw; }
        if (d.includes('s')) nh = Math.max(MIN_H, rsz.current.sh + dy);
        if (d.includes('n')) { nh = Math.max(MIN_H, rsz.current.sh - dy); ny = rsz.current.py + rsz.current.sh - nh; }
        setSize({ w: nw, h: nh });
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      drag.current.active = false;
      rsz.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [size.w]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, px: pos.x, py: pos.y };
    document.body.style.userSelect = 'none';
  };

  const startResize = (dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rsz.current = { active: true, dir, startX: e.clientX, startY: e.clientY, sw: size.w, sh: size.h, px: pos.x, py: pos.y };
    document.body.style.userSelect = 'none';
    const cursors: Record<string, string> = { e: 'e-resize', s: 's-resize', w: 'w-resize', se: 'se-resize', sw: 'sw-resize' };
    document.body.style.cursor = cursors[dir] ?? 'nwse-resize';
  };

  if (!ready) return null;

  const authorName = doc?.author_name || '관리자';

  const catNameMap = new Map<string, string>();
  if (categories) {
    for (const tree of categories) {
      for (const cat of tree.categories) catNameMap.set(cat.category_code, cat.name);
    }
  }

  return (
    <div className="fixed inset-0 z-50" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div
        className="fixed flex select-none flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 cursor-move items-center justify-between rounded-t-xl border-b border-slate-200 border-l-4 border-l-sky-500 bg-slate-50 px-5 py-2.5 dark:border-slate-700 dark:border-l-sky-400 dark:bg-slate-800"
          onMouseDown={startDrag}
        >
          <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
            관제시스템 문서 #TD:{docId}
          </span>
          <button
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            aria-label="닫기"
            className="cursor-pointer px-1 text-lg leading-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 text-sm space-y-4">
          {isLoading ? (
            <p className="text-slate-400">불러오는 중...</p>
          ) : !doc ? (
            <p className="text-slate-400">문서를 불러오지 못했습니다.</p>
          ) : (
            <>
              <h2 className="text-base font-bold leading-snug text-slate-800 dark:text-slate-100">
                {doc.title || '(제목 없음)'}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 pb-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {doc.record_date && <span>작성일: {doc.record_date}</span>}
                {doc.project_code && <span>프로젝트: {PROJECT_LABELS[doc.project_code] ?? doc.project_code}</span>}
                {doc.category_code && <span>분류: {catNameMap.get(doc.category_code) ?? doc.category_code}</span>}
                {doc.doc_type && <span>문서유형: {doc.doc_type}</span>}
                <span>작성자: {authorName}</span>
              </div>
              {doc.content && (
                <RichContentView
                  content={doc.content}
                  transform={injectTechDocLinks}
                  onClick={handleContentClick}
                  className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                />
              )}
              {doc.attachments.length > 0 && (
                <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">첨부파일</p>
                  <ul className="space-y-1.5">
                    {doc.attachments.map(att => (
                      <li key={att.id}>
                        <button
                          type="button"
                          onClick={() => void openAttachment({
                            attachmentId: att.id,
                            filename: att.original_name,
                            viewUrl: techDocsApi.getAttachmentViewUrl(att.id),
                            downloadUrl: techDocsApi.getAttachmentDownloadUrl(att.id, true),
                          })}
                          className="text-left text-xs text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {att.original_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute top-10 right-0 bottom-4 w-1 cursor-e-resize rounded hover:bg-blue-400/30" onMouseDown={startResize('e')} />
        <div className="absolute top-10 left-0 bottom-4 w-1 cursor-w-resize rounded hover:bg-blue-400/30" onMouseDown={startResize('w')} />
        <div className="absolute bottom-0 left-4 right-4 h-1 cursor-s-resize rounded hover:bg-blue-400/30" onMouseDown={startResize('s')} />
        <div className="absolute bottom-0 right-0 flex h-5 w-5 cursor-se-resize items-end justify-end pr-1 pb-1" onMouseDown={startResize('se')}>
          <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-400">
            <path d="M1 7 L7 1 M4 7 L7 4 M7 7 L7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 h-5 w-5 cursor-sw-resize" onMouseDown={startResize('sw')} />
      </div>

      {nestedDocId !== null && (
        <TechDocPreviewModal docId={nestedDocId} categories={categories} onClose={() => setNestedDocId(null)} />
      )}
    </div>
  );
}
