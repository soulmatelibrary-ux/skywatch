interface Props {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

export function LinkPopover({ x, y, onDelete, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <div
        className="fixed z-[56] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[110px]"
        style={{ left: x, top: y + 6 }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onDelete}
          className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          링크 삭제
        </button>
      </div>
    </>
  );
}
