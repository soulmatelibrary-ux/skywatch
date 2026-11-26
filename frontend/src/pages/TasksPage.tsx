import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { usersApi } from '../services/api/usersApi';
import type { UserSimple } from '../services/api/usersApi';
import { useTaskList } from '../hooks/useTaskList';
import { useTemplates } from '../hooks/useTemplates';
import { TaskList } from '../components/tasks/TaskList';
import { TaskDetail } from '../components/tasks/TaskDetail';
import { TaskForm } from '../components/tasks/TaskForm';
import { TemplatePanel } from '../components/tasks/TemplatePanel';
import { TaskQuickViewModal } from '../components/notifications/TaskQuickViewModal';

const TABS = [
  { id: 'all', label: '전체 업무' },
  { id: 'mine', label: '내 담당' },
  { id: 'deadline', label: '마감·지연' },
  { id: 'archived', label: '보관함' },
];

const REPEAT_LABELS: Record<string, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  quarterly: '분기별',
};

function formatRepeatSummary(repeatType: string, repeatDays: string[] | null): string {
  const base = REPEAT_LABELS[repeatType] ?? repeatType;
  if (!repeatDays || repeatDays.length === 0) return base;
  if (repeatType === 'monthly') return `${base} ${repeatDays.join(', ')}`;
  return `${base} ${repeatDays.join(', ')}`;
}

function formatShiftSummary(shiftTypes: string[]): string {
  if (!shiftTypes || shiftTypes.length === 0) return '전체 근무';
  return shiftTypes.join(', ');
}

type TplMode = 'detail' | 'new' | 'edit' | null;

export function TasksPage() {
  const { currentUser } = useAuthStore();
  const uid = currentUser?.id ?? 0;
  const isAdmin = currentUser?.role === 'admin';
  const [users, setUsers] = useState<UserSimple[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [tplMode, setTplMode] = useState<TplMode>(null);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [isTplOpen, setIsTplOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskIdParam = searchParams.get('openTaskId');
  const openTaskId = openTaskIdParam ? Number(openTaskIdParam) : null;

  const taskHook = useTaskList(uid);
  const tplHook = useTemplates();
  const { addToast } = useUIStore();

  useEffect(() => {
    usersApi.list()
      .then(r => setUsers(r.data.data ?? []))
      .catch(() => addToast('사용자 목록을 불러오지 못했습니다.', 'error'));
  }, [addToast]);

  const {
    filtered,
    tab,
    setTab,
    days,
    loadMore,
    selectedId,
    setSelectedId,
    selectedTask,
    tabCount,
    createTask,
    updateTask,
    completeTask,
    removeTask,
    status,
    setStatus,
    createdOnly,
    setCreatedOnly,
    dateField,
    setDateField,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetDateFilter,
  } = taskHook;

  const { templates, create: createTpl, update: updateTpl, toggle: toggleTpl, remove: removeTpl } = tplHook;
  const selectedTpl = templates.find(t => t.id === selectedTplId) ?? null;

  const handleTabChange = (t: string) => {
    setTab(t);
    setSelectedId(null);
    setIsNewOpen(false);
    setIsEditOpen(false);
    setTplMode(null);
    setSelectedTplId(null);
    setIsTplOpen(false);
  };

  const handleOpenTemplates = () => {
    setIsTplOpen(true);
    setTplMode(null);
    setSelectedTplId(null);
    setSelectedId(null);
    setIsNewOpen(false);
    setIsEditOpen(false);
  };

  const cntBadgeCls = (id: string) =>
    id === 'deadline'
      ? 'text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      : 'text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';

  const tabCls = (id: string) =>
    `px-4 py-2 text-[14px] transition border-b-2 -mb-px flex items-center gap-1.5 ${
      tab === id ? 'border-blue-600 text-blue-700 font-semibold bg-white dark:bg-[#1e293b]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  const canLoadMore = tab === 'all' && status === 'active' && !dateFrom && !dateTo;

  return (
    <>
    <div className="flex flex-col h-full min-h-0">
      <div className="px-8 pt-4 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <label className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">상태</span>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'completed' | 'all')}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0f172a] dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="active">진행중</option>
                <option value="completed">완료</option>
                <option value="all">전체</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">기준</span>
              <select
                value={dateField}
                onChange={e => setDateField(e.target.value as 'created' | 'due')}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0f172a] dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="created">등록일</option>
                <option value="due">마감일</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">시작</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0f172a] dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">종료</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-[#0f172a] dark:text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <button
              onClick={resetDateFilter}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              날짜 초기화
            </button>

            {tab === 'all' && !isTplOpen && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createdOnly}
                  onChange={e => setCreatedOnly(e.target.checked)}
                  className="accent-blue-600 w-3.5 h-3.5"
                />
                <span className="text-slate-500 dark:text-slate-400">내가 등록한</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenTemplates}
              className={`px-3 py-2 border rounded-lg text-[13px] font-medium transition ${isTplOpen ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              📋 정기 템플릿
            </button>
            <button
              onClick={() => { setIsNewOpen(true); setIsEditOpen(false); setSelectedId(null); setIsTplOpen(false); }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-900 text-white rounded-lg text-[14px] font-medium transition"
            >
              + 새 Task
            </button>
          </div>
        </div>

        <div className="flex items-end gap-0 overflow-x-auto">
          {TABS.map(t => {
            const cnt = t.id === 'archived' ? 0 : tabCount(t.id);
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} className={tabCls(t.id)}>
                <span>{t.label}</span>
                {cnt > 0 && <span className={cntBadgeCls(t.id)}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-[494px] shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-[#0f172a]">
          {isTplOpen ? (
            <div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] sticky top-0 z-10">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">정기 템플릿</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setTplMode('new'); setSelectedTplId(null); }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-medium transition"
                  >
                    + 새 템플릿
                  </button>
                  <button
                    onClick={() => { setIsTplOpen(false); setTplMode(null); setSelectedTplId(null); }}
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[12px] transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
                  <div className="text-5xl mb-3">📄</div>
                  <p className="text-[14px]">등록된 정기 템플릿이 없습니다</p>
                </div>
              )}
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => { setSelectedTplId(tpl.id); setTplMode('detail'); }}
                  className={`px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition border-l-4 ${
                    selectedTplId === tpl.id && tplMode !== 'new' ? 'bg-blue-50 dark:bg-slate-700 border-l-blue-600' : 'border-l-transparent hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{tpl.name}</p>
                  <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>{formatRepeatSummary(tpl.repeat_type, tpl.repeat_days)}</span>
                    <span>·</span>
                    <span>{formatShiftSummary(tpl.target_shift_types)}</span>
                    <span className="ml-auto">
                      {tpl.is_active ? <span className="text-green-600 font-semibold">활성</span> : <span>일시 중지</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <TaskList
                tasks={filtered}
                selectedId={selectedId}
                users={users}
                currentUserId={uid}
                showDeadlineBadge={tab === 'deadline'}
                onSelect={id => {
                  setSelectedId(id);
                  setIsNewOpen(false);
                  setIsEditOpen(false);
                }}
              />
              {canLoadMore && filtered.length > 0 && (
                <button
                  onClick={loadMore}
                  className="w-full py-3 text-[13px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border-t border-slate-100 dark:border-slate-700 transition"
                >
                  더 보기 (현재 {days}일 범위, 클릭 시 {days + 60}일로 확장)
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e293b]">
          {isNewOpen && (
            <TaskForm
              key="new"
              users={users}
              onSave={async d => { await createTask(d); setIsNewOpen(false); }}
              onCancel={() => setIsNewOpen(false)}
            />
          )}

          {!isNewOpen && isEditOpen && selectedTask && (
            <TaskForm
              key={`edit-${selectedTask.id}`}
              task={selectedTask}
              users={users}
              onSave={async d => { await updateTask(selectedTask.id, d); setIsEditOpen(false); }}
              onCancel={() => setIsEditOpen(false)}
            />
          )}

          {!isNewOpen && !isEditOpen && !isTplOpen && selectedTask && (
            <TaskDetail
              task={selectedTask}
              users={users}
              currentUserId={uid}
              isAdmin={isAdmin}
              onComplete={tab === 'archived' ? undefined : async () => { await completeTask(selectedTask.id); }}
              onEdit={tab === 'archived' ? undefined : () => setIsEditOpen(true)}
              onDelete={async () => { await removeTask(selectedTask.id); }}
            />
          )}

          {isTplOpen && tplMode === 'detail' && selectedTpl && (
            <TemplatePanel
              key={`d-${selectedTpl.id}`}
              template={selectedTpl}
              mode="detail"
              onSave={async () => {}}
              onToggle={async () => { await toggleTpl(selectedTpl.id); }}
              onDelete={async () => { await removeTpl(selectedTpl.id); setSelectedTplId(null); setTplMode(null); }}
              onEdit={() => setTplMode('edit')}
              onCancel={() => setTplMode(null)}
            />
          )}

          {isTplOpen && (tplMode === 'new' || tplMode === 'edit') && (
            <TemplatePanel
              key={`f-${tplMode}-${selectedTplId}`}
              template={tplMode === 'edit' ? selectedTpl : null}
              mode={tplMode}
              onSave={async d => {
                if (tplMode === 'new') {
                  const t = await createTpl(d);
                  setSelectedTplId(t.id);
                  setTplMode('detail');
                } else if (selectedTpl) {
                  await updateTpl(selectedTpl.id, d);
                  setTplMode('detail');
                }
              }}
              onToggle={async () => {}}
              onDelete={async () => {}}
              onEdit={() => {}}
              onCancel={() => setTplMode(tplMode === 'edit' ? 'detail' : null)}
            />
          )}

          {!isNewOpen && !isEditOpen && !isTplOpen && !selectedTask && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <div className="text-5xl mb-3">📝</div>
              <p className="text-[15px]">왼쪽에서 Task를 선택하거나 새 Task를 만드세요</p>
            </div>
          )}

          {isTplOpen && !tplMode && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-[15px]">왼쪽에서 템플릿을 선택하거나 새로 등록하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
      <TaskQuickViewModal
        taskId={openTaskId}
        onClose={() => setSearchParams(prev => { prev.delete('openTaskId'); return prev; })}
      />
    </>
  );
}
