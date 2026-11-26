// 카드에서 문의사항 자동등록 모달 (드래그·리사이즈·위치저장 지원)
import { useState, useRef, useCallback } from 'react';
import type { LogCard } from '../../types/log';
import { inquiryApi } from '../../services/api/inquiryApi';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useLatestSwVersion } from '../../hooks/useLatestSwVersion';

interface Props {
  card: LogCard;
  logDate: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const STORE_KEY = 'inquiry_from_card_modal';

function loadLayout() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as { x: number; y: number; w: number; h: number } | null; }
  catch { return null; }
}

function saveLayout(patch: Partial<{ x: number; y: number; w: number; h: number }>) {
  const existing = loadLayout();
  localStorage.setItem(STORE_KEY, JSON.stringify({ ...existing, ...patch }));
}

export function InquiryFromCardModal({ card, logDate, onClose, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    occurred_time: '',
    controller_sector: '',
    sw_version: '',
    pr_no: '',
    note: '',
    content_additional: '',   // 카드 본문은 저장 때 자동으로 들어가므로 여기는 덧붙일 내용만
  });
  const addToast = useUIStore((s) => s.addToast);
  const { currentUser } = useAuthStore();
  // 발생버전 기본값 = 가장 최근에 입력된 버전 (이미 쓴 값은 덮지 않음)
  useLatestSwVersion(true, v => setFormData(f => (f.sw_version ? f : { ...f, sw_version: v })));

  const saved = loadLayout();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    saved ? { x: saved.x, y: saved.y } : null
  );
  const [dim, setDim] = useState<{ w: number; h: number } | null>(
    saved ? { w: saved.w, h: saved.h } : null
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOff = useRef<{ dx: number; dy: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (!modalRef.current) return;
    e.preventDefault();
    const r = modalRef.current.getBoundingClientRect();
    dragOff.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    const onMove = (me: MouseEvent) => {
      if (!dragOff.current) return;
      setPos({ x: me.clientX - dragOff.current.dx, y: me.clientY - dragOff.current.dy });
    };
    const onUp = (me: MouseEvent) => {
      if (!dragOff.current) return;
      saveLayout({ x: me.clientX - dragOff.current.dx, y: me.clientY - dragOff.current.dy });
      dragOff.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const onResizeEnd = useCallback(() => {
    if (!modalRef.current) return;
    const r = modalRef.current.getBoundingClientRect();
    const newDim = { w: Math.round(r.width), h: Math.round(r.height) };
    setDim(newDim);
    saveLayout(newDim);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const fullContent = [card.content, formData.content_additional].filter(Boolean).join('<br><br>');
      await inquiryApi.create({
        occurred_date: logDate,
        occurred_time: formData.occurred_time || undefined,
        controller_sector: formData.controller_sector || undefined,
        sw_version: formData.sw_version || undefined,
        received_by: currentUser?.id,
        category: card.category_name || undefined,
        keyword: card.title,
        content: fullContent || undefined,
        status: 'in_progress',
        pr_no: formData.pr_no || undefined,
        note: formData.note || undefined,
        card_id: card.id,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Inquiry creation failed:', error);
      addToast(error instanceof Error ? error.message : '등록 실패', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const field = 'w-full mt-1 px-2 py-1.5 text-[13px] border border-slate-200 rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200';
  const label = 'text-[11px] font-medium text-slate-700 dark:text-slate-300';
  const readBox = 'px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-[13px] text-slate-600 dark:text-slate-300';

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    ...(pos ? { left: pos.x, top: pos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
    width: dim?.w ?? 760,
    ...(dim?.h ? { height: dim.h } : {}),
    minWidth: 580,
    minHeight: 360,
    resize: 'both',
    overflow: 'hidden',
    zIndex: 411,
  };

  return (
    <>
      {/* 배경 — 클릭해도 닫히지 않음 */}
      <div className="fixed inset-0 bg-black/50 z-[410]" />
      <div
        ref={modalRef}
        style={modalStyle}
        onMouseUp={onResizeEnd}
        className="bg-white dark:bg-slate-900 rounded-lg shadow-xl flex flex-col"
      >
        {/* 헤더 — 드래그 핸들 */}
        <div
          className="shrink-0 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between cursor-move select-none"
          onMouseDown={onDragStart}
        >
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">문의사항 등록</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[20px] leading-none">×</button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 자동 채워진 필드 — 4열 */}
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={`block ${label} mb-1`}>발생일자</label>
                <div className={readBox}>{logDate}</div>
              </div>
              <div>
                <label className={`block ${label} mb-1`}>접수자</label>
                <div className={readBox}>{currentUser?.name || '-'}</div>
              </div>
              <div>
                <label className={`block ${label} mb-1`}>카테고리</label>
                <div className={readBox}>{card.category_name || '-'}</div>
              </div>
              <div>
                <label className={`block ${label} mb-1`}>키워드</label>
                <div className={`${readBox} truncate`}>{card.title}</div>
              </div>
            </div>
          </div>

          {/* 사용자 입력 필드 — 4열 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={label}>발생시간(z)</label>
              <input type="text" placeholder="1932z" value={formData.occurred_time}
                onChange={e => setFormData({ ...formData, occurred_time: e.target.value })}
                className={field} />
            </div>
            <div>
              <label className={label}>관제사(섹터)</label>
              <input type="text" value={formData.controller_sector}
                onChange={e => setFormData({ ...formData, controller_sector: e.target.value })}
                className={field} />
            </div>
            <div>
              <label className={label}>발생버전</label>
              <input type="text" placeholder="6.5" value={formData.sw_version}
                onChange={e => setFormData({ ...formData, sw_version: e.target.value })}
                className={field} />
            </div>
            <div>
              <label className={label}>PR번호</label>
              <input type="text" placeholder="P0119" value={formData.pr_no}
                onChange={e => setFormData({ ...formData, pr_no: e.target.value })}
                className={field} />
            </div>
          </div>

          <div>
            <label className={label}>추가 내용</label>
            <textarea value={formData.content_additional}
              onChange={e => setFormData({ ...formData, content_additional: e.target.value })}
              placeholder="카드 본문은 자동으로 들어갑니다. 덧붙일 내용만 적으세요 (비워 두어도 됩니다)"
              className={`${field} resize-none h-48`} />
          </div>

          <div>
            <label className={label}>비고</label>
            <textarea value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className={`${field} resize-none h-16`} />
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} disabled={isSaving}
              className="text-[13px] px-4 py-2 border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              취소
            </button>
            <button type="submit" disabled={isSaving}
              className="text-[13px] px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
