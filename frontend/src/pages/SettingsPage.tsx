import { useState } from 'react';
import { useCategoryManager } from '../hooks/useCategoryManager';
import { useCardStatusManager } from '../hooks/useCardStatusManager';
import { useUserManager } from '../hooks/useUserManager';
import { useNoticeManager } from '../hooks/useNoticeManager';
import { useCarryOverManager } from '../hooks/useCarryOverManager';
import { useBackupManager } from '../hooks/useBackupManager';
import { useAuthStore } from '../store/authStore';
import { CategoryManager } from '../components/settings/CategoryManager';
import { StatusManager } from '../components/settings/StatusManager';
import { UserManager } from '../components/settings/UserManager';
import { NoticeManager } from '../components/settings/NoticeManager';
import { CarryOverManager } from '../components/settings/CarryOverManager';
import { BackupManager } from '../components/settings/BackupManager';
import { SystemManager } from '../components/settings/SystemManager';
import { RotationManager } from '../components/settings/RotationManager';
import { VectorManager } from '../components/settings/VectorManager';
import { DailyImportManager } from '../components/settings/DailyImportManager';
import { DownloadSettingsManager } from '../components/settings/DownloadSettingsManager';

type Tab = 'categories' | 'statuses' | 'users' | 'notices' | 'backup' | 'carryover' | 'vector' | 'system' | 'rotation' | 'dailyImport' | 'download';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const catManager = useCategoryManager();
  const statManager = useCardStatusManager();
  const currentUser = useAuthStore(s => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  // 훅은 항상 부르고(규칙), 관리자가 아니면 불러오기를 끈 뒤 결과를 쓰지 않는다
  const userManagerHook = useUserManager(isAdmin);
  const backupManagerHook = useBackupManager(isAdmin);
  const carryOverManagerHook = useCarryOverManager(isAdmin);
  const userManager = isAdmin ? userManagerHook : undefined;
  const noticeManager = useNoticeManager();
  const backupManager = isAdmin ? backupManagerHook : undefined;
  const carryOverManager = isAdmin ? carryOverManagerHook : undefined;

  // 새 화면(v2)에서는 위쪽 가로 탭이 왼쪽 세로 메뉴가 된다 (같은 버튼, 배치만 다름)
  const tabBtn = (t: Tab, label: string, v2Order: string) => (
    <button
      onClick={() => setTab(t)}
      aria-current={tab === t ? 'page' : undefined}
      className={`px-4 py-2.5 text-[13px] transition-colors border-b-2 -mb-px whitespace-nowrap v2:mb-0 v2:w-full v2:rounded-md v2:border-b-0 v2:px-3 v2:py-2 v2:text-left ${v2Order} ${
        tab === t
          ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)]'
          : 'border-transparent text-slate-400 dark:text-slate-500 font-medium hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 v2:text-slate-600 v2:dark:text-slate-300 v2:hover:bg-[var(--v2-hover)]'
      }`}
    >
      {label}
    </button>
  );
  // 새 화면에서만 보이는 메뉴 묶음 제목
  const group = (label: string, v2Order: string) => (
    <div className={`hidden px-3 pb-1 pt-4 text-[12px] font-semibold text-slate-500 v2:block dark:text-slate-400 ${v2Order}`}>{label}</div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-[#0f172a] v2:flex-row v2:bg-transparent">
      <div className="px-6 pt-5 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] shrink-0 v2:w-[230px] v2:overflow-y-auto v2:border-b-0 v2:border-r v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:px-3 v2:py-4">
        <nav aria-label="관리 메뉴" className="flex gap-0 overflow-x-auto v2:flex-col v2:gap-0.5 v2:overflow-visible">
          {/* 기존 화면의 탭 순서는 그대로 두고, 새 화면에서만 order 로 묶음별로 다시 놓는다 */}
          {group('업무 설정', 'v2:order-[1]')}
          {tabBtn('categories', '카테고리 관리', 'v2:order-[2]')}
          {tabBtn('statuses', '카드 상태 관리', 'v2:order-[3]')}
          {isAdmin && tabBtn('users', '사용자 관리', 'v2:order-[7]')}
          {tabBtn('notices', '공지사항 관리', 'v2:order-[8]')}
          {tabBtn('download', '다운로드 설정', 'v2:order-[9]')}
          {isAdmin && tabBtn('backup', 'DB 백업', 'v2:order-[11]')}
          {isAdmin && tabBtn('carryover', '이월시간 관리', 'v2:order-[4]')}
          {isAdmin && tabBtn('vector', '벡터 검색', 'v2:order-[12]')}
          {isAdmin && tabBtn('rotation', '근무순환 설정', 'v2:order-[5]')}
          {isAdmin && tabBtn('dailyImport', '업무일지 가져오기', 'v2:order-[13]')}
          {isAdmin && tabBtn('system', '시스템 관리', 'v2:order-[14]')}
          {group('사용자·공지', 'v2:order-[6]')}
          {isAdmin && group('시스템', 'v2:order-[10]')}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto v2:min-w-0 v2:p-5">
        <div className="bg-white dark:bg-[#1e293b] min-h-full px-6 py-6 v2:min-h-0 v2:max-w-[1280px] v2:rounded-md v2:border v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
          {tab === 'categories' && <CategoryManager manager={catManager} />}
          {tab === 'statuses' && <StatusManager manager={statManager} />}
          {tab === 'users' && isAdmin && userManager && <UserManager manager={userManager} />}
          {tab === 'notices' && <NoticeManager manager={noticeManager} />}
          {tab === 'download' && <DownloadSettingsManager />}
          {tab === 'backup' && isAdmin && backupManager && <BackupManager manager={backupManager} />}
          {tab === 'carryover' && isAdmin && carryOverManager && <CarryOverManager manager={carryOverManager} />}
          {tab === 'vector' && isAdmin && <VectorManager />}
          {tab === 'rotation' && isAdmin && <RotationManager />}
          {tab === 'dailyImport' && isAdmin && <DailyImportManager />}
          {tab === 'system' && isAdmin && <SystemManager />}
        </div>
      </div>
    </div>
  );
}
