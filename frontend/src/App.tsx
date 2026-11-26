import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthInit } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then(m => ({ default: m.LogsPage })));
const LogsListTab = lazy(() => import('./pages/LogsListTab').then(m => ({ default: m.LogsListTab })));
const ChainsTab = lazy(() => import('./components/logs/ChainsTab').then(m => ({ default: m.ChainsTab })));
const BoardTab = lazy(() => import('./components/logs/BoardTab').then(m => ({ default: m.BoardTab })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const SkynetSearchPage = lazy(() => import('./pages/skynet/SkynetSearchPage').then(m => ({ default: m.SkynetSearchPage })));
const SkynetDashboardPage = lazy(() => import('./pages/skynet/SkynetDashboardPage').then(m => ({ default: m.SkynetDashboardPage })));
const SkynetBoardPage = lazy(() => import('./pages/skynet/SkynetBoardPage').then(m => ({ default: m.SkynetBoardPage })));
const SkynetSettingsPage = lazy(() => import('./pages/skynet/SkynetSettingsPage').then(m => ({ default: m.SkynetSettingsPage })));
const SkynetTodayDocsPopupPage = lazy(() => import('./pages/skynet/SkynetTodayDocsPopupPage').then(m => ({ default: m.SkynetTodayDocsPopupPage })));
const SkynetTodayBoardPopupPage = lazy(() => import('./pages/skynet/SkynetTodayBoardPopupPage').then(m => ({ default: m.SkynetTodayBoardPopupPage })));
const LogCreatePopupPage = lazy(() => import('./pages/LogCreatePopupPage').then(m => ({ default: m.LogCreatePopupPage })));
const LogViewPopupPage = lazy(() => import('./pages/LogViewPopupPage').then(m => ({ default: m.LogViewPopupPage })));
const InquiryViewPopupPage = lazy(() => import('./pages/InquiryViewPopupPage').then(m => ({ default: m.InquiryViewPopupPage })));
const IssueViewPopupPage = lazy(() => import('./pages/IssueViewPopupPage').then(m => ({ default: m.IssueViewPopupPage })));
const LogChainPopupPage = lazy(() => import('./pages/LogChainPopupPage').then(m => ({ default: m.LogChainPopupPage })));
const InquiryPage = lazy(() => import('./pages/InquiryPage').then(m => ({ default: m.InquiryPage })));
const IssuesPage = lazy(() => import('./pages/IssuesPage').then(m => ({ default: m.IssuesPage })));
const PrBatchesPage = lazy(() => import('./pages/PrBatchesPage').then(m => ({ default: m.PrBatchesPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const TechDocsPopupPage = lazy(() => import('./pages/TechDocsPopupPage').then(m => ({ default: m.TechDocsPopupPage })));
const ShiftSectionPage = lazy(() => import('./pages/shiftlog/ShiftSectionPage').then(m => ({ default: m.ShiftSectionPage })));
const ShiftWritePage = lazy(() => import('./pages/shiftlog/ShiftWritePage').then(m => ({ default: m.ShiftWritePage })));
const ShiftReadPage = lazy(() => import('./pages/shiftlog/ShiftReadPage').then(m => ({ default: m.ShiftReadPage })));
const CardExplorePage = lazy(() => import('./pages/shiftlog/CardExplorePage').then(m => ({ default: m.CardExplorePage })));
const ThreadBoardPage = lazy(() => import('./pages/shiftlog/ThreadBoardPage').then(m => ({ default: m.ThreadBoardPage })));
const ThreadMergePage = lazy(() => import('./pages/shiftlog/ThreadMergePage').then(m => ({ default: m.ThreadMergePage })));

function AppRoutes() {
  useAuthInit();
  const { currentUser, isLoading } = useAuthStore();

  if (isLoading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <LoadingSpinner size={36} />
    </div>
  );

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-[#0f172a]">
          <LoadingSpinner size={36} />
        </div>
      }
    >
      {!currentUser ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/tech-docs-popup" element={<TechDocsPopupPage />} />
          <Route path="/skynet/today-docs-popup" element={<SkynetTodayDocsPopupPage />} />
          <Route path="/skynet/today-board-popup" element={<SkynetTodayBoardPopupPage />} />
          <Route path="/logs/create-popup" element={<LogCreatePopupPage />} />
          <Route path="/logs/view-popup" element={<LogViewPopupPage />} />
          <Route path="/logs/chain-popup" element={<LogChainPopupPage />} />
          <Route path="/inquiries/view-popup" element={<InquiryViewPopupPage />} />
          <Route path="/issues/view-popup" element={<IssueViewPopupPage />} />
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/logs" element={<LogsPage />}>
              <Route index element={<LogsListTab />} />
              <Route path="chains" element={<ChainsTab />} />
              <Route path="board" element={<BoardTab />} />
            </Route>
            <Route path="/shift" element={<ShiftSectionPage />}>
              <Route index element={<Navigate to="/shift/write" replace />} />
              <Route path="write" element={<ShiftWritePage />} />
              <Route path="read" element={<ShiftReadPage />} />
              <Route path="explore" element={<CardExplorePage />} />
              <Route path="board" element={<ThreadBoardPage />} />
              <Route path="merge" element={<ThreadMergePage />} />
            </Route>
            <Route path="/chains" element={<Navigate to="/logs/chains" replace />} />
            <Route path="/board" element={<Navigate to="/logs/board" replace />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/inquiries" element={<InquiryPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/pr-batches" element={<PrBatchesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/skynet" element={<Navigate to="/skynet/dashboard" replace />} />
            <Route path="/skynet/search" element={<SkynetSearchPage />} />
            <Route path="/skynet/dashboard" element={<SkynetDashboardPage />} />
            <Route path="/skynet/board" element={<SkynetBoardPage />} />
            <Route path="/skynet/settings" element={<SkynetSettingsPage />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      )}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
