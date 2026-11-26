import { create } from 'zustand';
import type { Editor } from '@tiptap/core';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  count: number;
}

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  return (localStorage.getItem('skywatch-theme') as Theme) ?? 'dark';
}

/** classic = 기존 화면, v2 = 새 화면(아이콘 줄 + 상단 바). PC별로 기억, 처음엔 기존 화면 */
export type UiVersion = 'classic' | 'v2';
const UI_KEY = 'skywatch-ui';

function getInitialUiVersion(): UiVersion {
  try { return localStorage.getItem(UI_KEY) === 'v2' ? 'v2' : 'classic'; } catch { return 'classic'; }
}

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  theme: Theme;
  toggleTheme: () => void;

  uiVersion: UiVersion;
  setUiVersion: (v: UiVersion) => void;

  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;

  navRefreshKeys: Record<string, number>;
  bumpNavRefresh: (path: string) => void;

  referencePanelOpen: boolean;
  referenceEditor: Editor | null;
  openReferencePanel: () => void;
  closeReferencePanel: () => void;
  toggleReferencePanel: () => void;
  setReferenceEditor: (editor: Editor | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    localStorage.setItem('skywatch-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  },

  uiVersion: getInitialUiVersion(),
  setUiVersion: (v) => {
    set({ uiVersion: v });
    document.documentElement.classList.toggle('ui-v2', v === 'v2');
    try { localStorage.setItem(UI_KEY, v); } catch { /* 저장 못 해도 이번 화면에는 적용 */ }
  },

  toasts: [],

  addToast: (message, type = 'info') => {
    const existing = get().toasts.find(t => t.message === message && t.type === type);
    if (existing) {
      set({ toasts: get().toasts.map(t => t === existing ? { ...t, count: t.count + 1 } : t) });
      return;
    }
    const id = Math.random().toString(36).slice(2);
    const ttl = type === 'error' ? 6000 : type === 'success' ? 3000 : 4000;
    set(s => ({ toasts: [...s.toasts, { id, message, type, count: 1 }] }));
    setTimeout(() => get().removeToast(id), ttl);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  navRefreshKeys: {},
  bumpNavRefresh: (path) => set(s => ({
    navRefreshKeys: { ...s.navRefreshKeys, [path]: (s.navRefreshKeys[path] ?? 0) + 1 },
  })),

  referencePanelOpen: false,
  referenceEditor: null,
  openReferencePanel: () => set({ referencePanelOpen: true }),
  closeReferencePanel: () => set({ referencePanelOpen: false }),
  toggleReferencePanel: () => set(s => ({ referencePanelOpen: !s.referencePanelOpen })),
  setReferenceEditor: (editor) => set({ referenceEditor: editor }),
}));

// 다른 창(탭)에서 기존/새 화면을 바꾸면 이 창의 바깥 틀도 같이 바꾼다.
// <html> 의 ui-v2 클래스는 main.tsx 가 바꾸므로, 틀만 기존 화면으로 남아 새 화면 전용 숨김(v2:hidden)이 걸리는 일을 막는다
window.addEventListener('storage', e => {
  if (e.key === UI_KEY) useUIStore.setState({ uiVersion: e.newValue === 'v2' ? 'v2' : 'classic' });
});
