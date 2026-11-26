// 문의사항 상세 패널 (가운데 팝업, TipTap 에디터, 드래그/리사이즈 가능)
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef } from 'react';
import type { Inquiry } from '../../types/inquiry';
import { inquiryApi } from '../../services/api/inquiryApi';
import { useUIStore } from '../../store/uiStore';
import { TextStyle, FontSize, Underline, Color, Highlight, TextAlign, Table, TableRow, TableHeader, TableCell } from '../../lib/editorExtensions';

interface Props {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Inquiry) => void;
  isFullPage?: boolean;
}

const STORAGE_KEY = 'sw-inquiry-detail-state';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: '완료', cls: 'bg-green-100 text-green-700' },
  in_progress: { label: '진행중', cls: 'bg-blue-100 text-blue-700' },
  pr_registered: { label: 'PR등록', cls: 'bg-purple-100 text-purple-700' },
  pr_duplicate: { label: 'PR중복', cls: 'bg-orange-100 text-orange-700' },
  tracking: { label: '추적관찰', cls: 'bg-yellow-100 text-yellow-700' },
};

function formatContent(content: string): string {
  if (!content) return content;
  // (분석결과) 또는 분석결과 → <br> 개행으로 치환 (텍스트 자체는 숨김)
  return content.replace(/\(분석결과\)|분석결과/g, '<br>');
}

export function InquiryDetailPanel({ inquiry, isOpen, onClose, onSave, isFullPage = false }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState(inquiry?.note ?? '');
  const baselineHtml = useRef('');
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (isFullPage) return { x: 0, y: 0 };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { position: pos } = JSON.parse(stored);
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          return {
            x: Math.max(0, Math.min(pos.x, window.innerWidth - 420)),
            y: Math.max(0, Math.min(pos.y, window.innerHeight - 200)),
          };
        }
      }
    } catch { /* ignore */ }
    return { x: Math.max(0, (window.innerWidth - 800) / 2), y: Math.max(0, (window.innerHeight - 600) / 4) };
  });
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (isFullPage) return { width: 800, height: 600 };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { size: sz } = JSON.parse(stored);
        if (sz && typeof sz.width === 'number' && typeof sz.height === 'number') {
          return sz;
        }
      }
    } catch { /* ignore */ }
    return { width: 800, height: 600 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const addToast = useUIStore((s) => s.addToast);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      TextStyle, FontSize, Underline, Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: formatContent(inquiry?.content ?? ''),
  });

  useEffect(() => {
    if (editor && inquiry) {
      editor.commands.setContent(formatContent(inquiry.content ?? ''));
      // 에디터가 정규화한 HTML 을 기준값으로 저장 (변경 여부 비교용)
      baselineHtml.current = editor.getHTML();
      setNote(inquiry.note ?? '');
    }
    // 목록 재조회로 객체만 바뀐 경우 편집 중 내용을 덮어쓰지 않도록 id·수정시각 기준
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, inquiry?.id, inquiry?.updated_at]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - size.width)),
          y: Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - 80)),
        });
      } else if (isResizing) {
        setSize({
          width: Math.max(400, e.clientX - position.x),
          height: Math.max(300, e.clientY - position.y),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, position]);

  // 드래그/리사이즈 후 상태 저장 (isFullPage 시 건너뜀)
  useEffect(() => {
    if (isFullPage || isDragging || isResizing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
    } catch { /* ignore */ }
  }, [isFullPage, isDragging, isResizing, position, size]);

  const handleSave = async () => {
    if (!inquiry) return;
    try {
      setIsSaving(true);
      const html = editor?.getHTML() ?? '';
      const resp = await inquiryApi.patch(inquiry.id, {
        content: html,
        note: note.trim() || null,
      });
      baselineHtml.current = html;
      onSave?.(resp.data.data as Inquiry);
      addToast('저장되었습니다', 'success');
    } catch (error) {
      addToast('저장 실패', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !inquiry) return null;

  const isDirty = () =>
    (!!editor && editor.getHTML() !== baselineHtml.current) || note !== (inquiry.note ?? '');

  // 저장하지 않은 변경이 있으면 닫기 전에 확인
  const requestClose = () => {
    if (isDirty() && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return;
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!isSaving) void handleSave();
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const panel = (
    <div
      onKeyDown={handleKeyDown}
      className={`bg-white dark:bg-slate-900 overflow-hidden flex flex-col ${isFullPage ? 'h-full rounded-none shadow-none' : 'rounded-xl shadow-2xl relative'}`}
      style={isFullPage ? undefined : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        position: 'absolute',
      }}
    >
          {/* 헤더 — 끌어서 창 이동 */}
          <div
            className={`shrink-0 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-900 ${isFullPage ? '' : 'cursor-move'}`}
            onMouseDown={isFullPage ? undefined : handleHeaderMouseDown}
          >
            {/* 1줄: 번호 · 키워드 · 상태 · 닫기 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[16px] font-bold tabular-nums text-sky-700 dark:text-sky-300">{inquiry.inquiry_no}</span>
                {inquiry.keyword && (
                  <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{inquiry.keyword}</span>
                )}
                {inquiry.status && (() => {
                  const badge = STATUS_BADGE[inquiry.status] ?? { label: inquiry.status, cls: 'bg-slate-100 text-slate-700' };
                  return <span className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>;
                })()}
              </div>
              <button type="button" onClick={requestClose} aria-label="닫기" className="shrink-0 text-[22px] leading-none text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">×</button>
            </div>
            {/* 2줄: 발생일 · 접수자 */}
            <div className="mt-1 flex items-center gap-4 text-[12px] text-slate-500 dark:text-slate-400">
              <span>발생일 <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{inquiry.occurred_date}</span></span>
              <span>접수자 <span className="font-medium text-slate-700 dark:text-slate-200">{inquiry.received_by_name || inquiry.received_by_raw || '-'}</span></span>
            </div>
          </div>

          {/* 에디터 */}
          <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
            <div className="prose prose-sm max-w-none dark:prose-invert flex-1 flex flex-col">
              <EditorContent
                editor={editor}
                className="h-full flex-1 rounded-lg border border-slate-200 bg-white p-4 text-[15px] leading-[1.8] text-slate-800 focus-within:ring-2 focus-within:ring-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none"
              />
            </div>
            <label className="mt-3 mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">비고</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="참고사항"
              className="shrink-0 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg resize-y bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
            <span className="mr-auto text-[12px] text-slate-400">Ctrl+S로도 저장됩니다</span>
            <button
              onClick={requestClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>

          {/* 리사이즈 핸들 */}
          {!isFullPage && (
            <div
              className="absolute bottom-0 right-0 flex h-5 w-5 cursor-nwse-resize items-end justify-end pr-1 pb-1"
              onMouseDown={handleResizeMouseDown}
              title="드래그하여 창의 크기를 조절합니다"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-400">
                <path d="M1 7 L7 1 M4 7 L7 4 M7 7 L7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
    </div>
  );

  if (isFullPage) {
    return <div className="fixed inset-0 z-50 overflow-hidden">{panel}</div>;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={requestClose} />
      <div className="fixed inset-0 z-50 p-4" ref={containerRef}>
        {panel}
      </div>
    </>
  );
}
