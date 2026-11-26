import { useRef, useState } from 'react';
import { useNotifStore } from '../../store/notifStore';
import { useNotifications } from '../../hooks/useNotifications';
import { BellIcon } from '../icons';
import { NotificationPanel } from '../notifications/NotificationPanel';

/** 상단 바 알림 종 — 열면 안 읽은 알림을 모두 읽음 처리. 기존 화면·새 화면 공용 */
export function NotificationBell({ className, size = 20 }: { className: string; size?: number }) {
  const { unreadCount } = useNotifStore();
  const { notifications, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next && unreadCount > 0) void markAllRead();
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className={className} aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : '알림'}>
        <BellIcon size={size} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel notifications={notifications} anchorRef={ref} onClose={() => setOpen(false)} onRead={markRead} />
      )}
    </div>
  );
}
