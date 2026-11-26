import { XIcon } from '../icons';

interface Props {
  onClose: () => void;
}

export function ShiftCalendarPopup({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden"
        style={{ width: 'min(1200px, 95vw)', height: 'min(820px, 90vh)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
          aria-label="닫기"
        >
          <XIcon size={16} />
        </button>
        <iframe
          src="/shift-calendar.html"
          title="근무 스케줄"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
