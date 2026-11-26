// 알림 클릭 시 해당 페이지로 이동하는 훅
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types/notification';
import type { ApiResponse } from '../types';
import { cardApi } from '../services/api/logApi';
import { apiClient } from '../services/api/client';

export function useNotificationHandler() {
  const navigate = useNavigate();

  const handleOpen = async (notif: Notification) => {
    if ((notif.type === 'task' || notif.ref_type === 'task') && notif.ref_id) {
      navigate(`/tasks?openTaskId=${notif.ref_id}`);
      return;
    }
    if (notif.type === 'task' || notif.ref_type === 'task') {
      navigate('/tasks');
      return;
    }

    if ((notif.type === 'card' || notif.type === 'card_edited') && notif.ref_type === 'card' && notif.ref_id) {
      try {
        const res = await cardApi.get(notif.ref_id);
        const logId = res.data.data?.log_id;
        if (logId) {
          navigate(`/logs?openLogId=${logId}`);
          return;
        }
      } catch {
        // fall through
      }
    }

    if (notif.ref_type === 'comment' && notif.ref_id) {
      try {
        const res = await apiClient.get<ApiResponse<{ log_id: number }>>(`/comments/${notif.ref_id}/log-id`);
        const logId = res.data.data?.log_id;
        if (logId) {
          navigate(`/logs?openLogId=${logId}`);
          return;
        }
      } catch {
        // fall through
      }
    }

    if (notif.ref_type === 'log' && notif.ref_id) {
      navigate(`/logs?openLogId=${notif.ref_id}`);
      return;
    }

    navigate('/notifications');
  };

  return { handleOpen };
}
