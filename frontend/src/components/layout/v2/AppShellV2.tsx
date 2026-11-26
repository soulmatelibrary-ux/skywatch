// 새 화면 틀 — 1층 아이콘 줄 | 상단 바 + 공지 + 회색 바탕 위 페이지 (목업 layout-redesign.html 기준)
import { NoticeTickerBanner } from '../NoticeTickerBanner';
import { RouteOutlet } from '../RouteOutlet';
import { RailNav } from './RailNav';
import { TopBarV2 } from './TopBarV2';

export function AppShellV2() {
  return (
    <div className="ui-v2 flex h-screen overflow-hidden bg-[var(--v2-bg)] text-[var(--v2-text)]">
      <RailNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBarV2 />
        <NoticeTickerBanner />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <RouteOutlet />
        </main>
      </div>
    </div>
  );
}
