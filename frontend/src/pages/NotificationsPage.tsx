import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogQuickViewModal } from '../components/notifications/LogQuickViewModal';
import { TaskQuickViewModal } from '../components/notifications/TaskQuickViewModal';
import { CardPreviewModal } from '../components/logs/CardPreviewModal';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient } from '../services/api/client';
import { notificationApi } from '../services/api/notificationApi';
import { useNotifStore } from '../store/notifStore';
import type { ApiResponse, Pagination } from '../types';
import type { Notification } from '../types/notification';

function getOneMonthAgoToTodayRange(): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    from: formatDate(start),
    to: formatDate(end),
  };
}

export function NotificationsPage() {
  const { markRead, markAllRead, deleteNotif, deleteRead } = useNotifications();
  const unreadCount = useNotifStore(s => s.unreadCount);
  const navigate = useNavigate();
  const [previewLogId, setPreviewLogId] = useState<number | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<number | null>(null);
  const [previewCardId, setPreviewCardId] = useState<number | null>(null);

  const defaultRange = getOneMonthAgoToTodayRange();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultRange.from);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultRange.to);

  const fetchPage = useCallback(async (p: number, query: string, from: string, to: string) => {
    const res = await notificationApi.list({ page: p, perPage: 20, q: query, dateFrom: from || undefined, dateTo: to || undefined });
    setNotifications(res.data.data ?? []);
    setPagination(res.data.pagination ?? null);
  }, []);

  useEffect(() => { void fetchPage(page, q, appliedDateFrom, appliedDateTo); }, [page, q, appliedDateFrom, appliedDateTo, fetchPage]);

  useEffect(() => {
    if (unreadCount > 0) {
      void markAllRead();
    }
  }, [unreadCount, markAllRead]);

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const resolveCommentLogId = async (commentId: number): Promise<number | null> => {
    try {
      const res = await apiClient.get<ApiResponse<{ log_id: number; is_deleted: boolean }>>(
        `/comments/${commentId}/log-id`
      );
      return res.data.data?.log_id ?? null;
    } catch {
      return null;
    }
  };

  const handleOpen = async (notif: Notification) => {
    if ((notif.type === 'task' || notif.ref_type === 'task') && notif.ref_id) {
      if (!notif.read_at) await markRead(notif.id);
      setPreviewTaskId(notif.ref_id);
      return;
    }

    if ((notif.type === 'card' || notif.type === 'card_edited') && notif.ref_type === 'card' && notif.ref_id) {
      if (!notif.read_at) await markRead(notif.id);
      setPreviewCardId(notif.ref_id);
      return;
    }

    if (notif.ref_type === 'comment' && notif.ref_id) {
      const logId = await resolveCommentLogId(notif.ref_id);
      if (logId) { navigate(`/logs?openLogId=${logId}`); return; }
    }

    if (notif.ref_type === 'log' && notif.ref_id) {
      navigate(`/logs?openLogId=${notif.ref_id}`);
      return;
    }

    navigate('/notifications');
  };

  const handlePreviewLog = async (notif: Notification) => {
    if (!notif.ref_id) return;
    if (!notif.read_at) await markRead(notif.id);

    if (notif.ref_type === 'comment') {
      const logId = await resolveCommentLogId(notif.ref_id);
      if (logId) setPreviewLogId(logId);
      return;
    }
    if (notif.ref_type === 'log') {
      setPreviewLogId(notif.ref_id);
    }
  };

  const handleRead = async (id: number) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const handleDelete = async (id: number) => {
    await deleteNotif(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteRead = async () => {
    if (!window.confirm('읽은 알림을 모두 삭제하시겠습니까?')) return;
    await deleteRead();
    setNotifications(prev => prev.filter(n => !n.read_at));
  };

  return (
    <>
      <div className="h-full bg-slate-100 dark:bg-slate-950 p-3">
        <div className="mx-auto flex h-full max-w-[1440px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h1 className="text-[19px] font-bold text-slate-800 dark:text-white leading-none">알림</h1>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                총 {pagination?.total ?? notifications.length}건
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="px-3 py-2 text-[12px] rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                전체 읽음 처리
              </button>
              <button
                onClick={handleDeleteRead}
                className="px-3 py-2 text-[12px] rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                읽은 알림 삭제
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <NotificationCenter
              notifications={notifications}
              pagination={pagination}
              page={page}
              searchInput={searchInput}
              onSearchChange={setSearchInput}
              onSearch={handleSearch}
              onPageChange={setPage}
              onRead={handleRead}
              onOpen={handleOpen}
              onPreviewLog={handlePreviewLog}
              onDelete={handleDelete}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>
      </div>

      <LogQuickViewModal
        logId={previewLogId}
        onClose={() => setPreviewLogId(null)}
      />
      <TaskQuickViewModal
        taskId={previewTaskId}
        onClose={() => setPreviewTaskId(null)}
      />
      {previewCardId !== null && (
        <CardPreviewModal
          cardId={previewCardId}
          onClose={() => setPreviewCardId(null)}
        />
      )}
    </>
  );
}
