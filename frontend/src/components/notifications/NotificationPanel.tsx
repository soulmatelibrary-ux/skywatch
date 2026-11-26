// 알림 패널 팝업 컴포넌트
import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../types/notification';
import { useNotifStore } from '../../store/notifStore';
import { useNotificationHandler } from '../../hooks/useNotificationHandler';
import { NotificationItem } from './NotificationItem';
import { XIcon } from '../icons';

interface Props {
  notifications: Notification[];
  anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onRead: (id: number) => void;
}

export function NotificationPanel({ notifications, anchorRef, onClose, onRead }: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifStore();
  const { handleOpen } = useNotificationHandler();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 320;
      const gap = 8;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
      setPos({ top: rect.bottom + gap, left, width });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  const onOpen = async (notif: Notification) => {
    onClose();
    await handleOpen(notif);
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-transparent" onMouseDown={onClose} />
      <div
        className="fixed bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
        style={{ top: pos.top, left: pos.left, width: pos.width, maxWidth: 'calc(100vw - 24px)' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">알림</span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">{unreadCount}건</span>
            <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[13px]">알림이 없습니다</div>
          ) : (
            notifications.slice(0, 10).map(n => (
              <NotificationItem
                key={n.id}
                notif={n}
                onRead={onRead}
                onOpen={onOpen}
              />
            ))
          )}
        </div>

        <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => { onClose(); navigate('/notifications'); }}
            className="w-full text-[12px] text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 text-center"
          >
            전체 알림 보기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
