// 홈 대시보드 페이지 (화면 2)
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHomePage } from '../hooks/useHomePage';
import { useTodayWorkers } from '../hooks/useTodayWorkers';
import { TodayWorkersCard } from '../components/home/TodayWorkersCard';
import { MyIncompleteTasksCard } from '../components/home/MyIncompleteTasksCard';
import { MyInProgressTasksCard } from '../components/home/MyInProgressTasksCard';
import { UnreadLogsCard } from '../components/home/UnreadLogsCard';
import { SkynetTodayDocsCard } from '../components/home/SkynetTodayDocsCard';
import { SkynetTodayBoardCard } from '../components/home/SkynetTodayBoardCard';
import { LogDetailModal } from '../components/logs/LogDetailModal';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayLabel() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${getTodayStr()} (${days[d.getDay()]})`;
}

export function HomePage() {
  const { currentUser } = useAuthStore();
  const today = useMemo(() => getTodayStr(), []);

  const { myTodoTasks, myInProgressTasks, unreadLogs, isLoading: taskLoading, reload } = useHomePage(currentUser?.id ?? 0);
  const { users, shiftGroups, tomorrowShiftGroups, todayShiftInfo, tomorrowShiftInfo, isLoading: workerLoading, error: workerError, saveAdjustment } = useTodayWorkers(today);
  const isLoading = taskLoading || workerLoading;
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const openPopup = (path: string, name: string) => {
    const w = 1200;
    const h = 860;
    const left = Math.round((screen.width - w) / 2);
    const top = Math.round((screen.height - h) / 2);
    window.open(path, name, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  return (
    <>
      {selectedLogId !== null && (
        <LogDetailModal
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
          onEdit={() => setSelectedLogId(null)}
          onDeleted={() => { setSelectedLogId(null); reload(); }}
        />
      )}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[14px] text-slate-500">
            {getTodayLabel()} · {currentUser?.name ?? ''}
          </p>
        </div>

        <div className={`grid grid-cols-4 gap-5 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
          <TodayWorkersCard
            allUsers={users}
            shiftGroups={shiftGroups}
            tomorrowShiftGroups={tomorrowShiftGroups}
            todayShiftInfo={todayShiftInfo}
            tomorrowShiftInfo={tomorrowShiftInfo}
            today={today}
            error={workerError}
            onSave={saveAdjustment}
          />
          <MyIncompleteTasksCard tasks={myTodoTasks} />
          <MyInProgressTasksCard tasks={myInProgressTasks} />
          <UnreadLogsCard
            logs={unreadLogs}
            onOpenLog={(id) => setSelectedLogId(id)}
          />
        </div>
        <div className="grid grid-cols-4 gap-5 mt-5">
          <div className="col-span-2">
            <SkynetTodayDocsCard onOpen={() => openPopup('/skynet/today-docs-popup', 'skynet_today_docs_popup')} />
          </div>
          <div className="col-span-2">
            <SkynetTodayBoardCard onOpen={() => openPopup('/skynet/today-board-popup', 'skynet_today_board_popup')} />
          </div>
        </div>
      </div>
    </>
  );
}
