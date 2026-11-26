// 관제시스템 문서 팝업 — 상단 막대(제목·검색·새 문서)와 문서 칸 머리(수정·삭제·저장)
import type { ReactNode } from 'react';

const GHOST = 'rounded-lg border border-slate-300 px-3 py-1 text-[13px] text-slate-700 transition hover:border-sky-500 hover:text-sky-700 disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:text-sky-300';
const PRIMARY = 'rounded-lg bg-sky-600 px-3 py-1 text-[13px] font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400';

interface TopProps {
  search: ReactNode;
  selectedCount: number;
  managerOpen: boolean;
  onCreate: () => void;
  onBulkMove: () => void;
  onToggleManager: () => void;
  extra?: ReactNode;  // CSV 가져오기 버튼 등
}

export function TechDocTopBar({ search, selectedCount, managerOpen, onCreate, onBulkMove, onToggleManager, extra }: TopProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="shrink-0 text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">관제시스템 문서</h1>
      {search}
      <div className="flex shrink-0 items-center gap-2">
        {selectedCount > 0 && (
          <button type="button" onClick={onBulkMove} className="rounded-lg bg-amber-500 px-3 py-1 text-[13px] font-semibold text-white hover:bg-amber-600">
            선택한 {selectedCount}건 분류 옮기기
          </button>
        )}
        {extra}
        <button type="button" onClick={onToggleManager} aria-pressed={managerOpen} className={`${GHOST} ${managerOpen ? 'border-sky-500 text-sky-700 dark:text-sky-300' : ''}`}>분류 편집</button>
        <button type="button" onClick={onCreate} className={PRIMARY}>새 문서</button>
        <button type="button" onClick={() => window.close()} aria-label="창 닫기" className="ml-1 rounded-md px-1.5 text-[18px] leading-none text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">×</button>
      </div>
    </header>
  );
}

interface PaneProps {
  mode: 'view' | 'create' | 'edit' | string;
  hasDoc: boolean;
  canEdit: boolean;
  saving: boolean;
  pendingImages: number;
  canSave: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function TechDocPaneHeader({ mode, hasDoc, canEdit, saving, pendingImages, canSave, onEdit, onDelete, onCancel, onSave }: PaneProps) {
  const form = mode === 'create' || mode === 'edit';
  const lockTitle = !canEdit ? '작성자와 관리자만 바꿀 수 있습니다' : undefined;
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-800">
      <span className="flex-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'create' ? '새 문서 쓰기' : mode === 'edit' ? '문서 고치기' : '문서'}
      </span>
      {!form && hasDoc && (
        <>
          <button type="button" onClick={onDelete} disabled={!canEdit} title={lockTitle}
            className="rounded-lg px-2.5 py-1 text-[13px] text-slate-500 transition hover:text-red-600 disabled:opacity-40 dark:text-slate-400 dark:hover:text-red-400">삭제</button>
          <button type="button" onClick={onEdit} disabled={!canEdit} title={lockTitle} className={GHOST}>수정</button>
        </>
      )}
      {form && (
        <>
          <button type="button" onClick={onCancel} className={GHOST}>취소</button>
          <button type="button" onClick={onSave} disabled={saving || pendingImages > 0 || !canSave} className={PRIMARY}>
            {saving ? '저장 중…' : pendingImages > 0 ? '이미지 넣는 중…' : '저장'}
          </button>
        </>
      )}
    </div>
  );
}
