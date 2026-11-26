// SkyNet 크롤링 설정 페이지 — 부서/키워드/게시판키워드/자동수집/수동수집/인증 관리
import { useState } from 'react';
import { useSkynetSettings } from '../../hooks/skynet/useSkynetSettings';
import { useSkynetSettingsExt } from '../../hooks/skynet/useSkynetSettingsExt';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PlusIcon, XIcon } from '../../components/icons';
import { DeptTab } from '../../components/skynet/SkynetSettingsDeptTab';
import { ManualTab } from '../../components/skynet/SkynetSettingsManualTab';

type Tab = 'dept' | 'keyword' | 'board_kw' | 'auto' | 'manual' | 'auth';

export function SkynetSettingsPage() {
  const [tab, setTab] = useState<Tab>('dept');
  const s = useSkynetSettings();
  const ext = useSkynetSettingsExt();

  const TAB = (t: Tab, label: string, count?: number) => (
    <button key={t} onClick={() => setTab(t)}
      className={`shrink-0 px-3 py-1.5 text-[13px] font-semibold border-b-2 transition ${tab === t ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}>
      <span className="whitespace-nowrap">{label}</span>{count != null && <span className="ml-1 text-[11px] text-slate-400">({count})</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-6 pt-4 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="shrink-0 text-[19px] font-bold text-slate-800 dark:text-white leading-none v2:sr-only">크롤링 설정</h1>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          {TAB('dept',     '부서 관리',     s.departments.length)}
          {TAB('keyword',  '키워드',        s.keywords.length)}
          {TAB('board_kw', '게시판 키워드', ext.boardKeywords.length)}
          {TAB('auto',     '자동 수집')}
          {TAB('manual',   '수동 수집')}
          {TAB('auth',     '인증 설정')}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'manual'   ? <ManualTab />
          : tab === 'auto'   ? <AutoTab ext={ext} />
          : tab === 'auth'   ? <AuthTab ext={ext} />
          : tab === 'board_kw' ? <BoardKwTab ext={ext} />
          : s.loading        ? <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>
          : tab === 'dept'   ? <DeptTab s={s} />
          : <KeywordTab s={s} />
        }
      </div>
    </div>
  );
}

// ── 키워드 탭 ────────────────────────────────────────────────────
function KeywordTab({ s }: { s: ReturnType<typeof useSkynetSettings> }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
        <div className="flex gap-2 items-center flex-wrap">
          <input value={s.newKeyword} onChange={e => s.setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && s.addKeyword()}
            placeholder="예: 기획부&홍길동" list="kw-hint"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <datalist id="kw-hint"><option value="기획부&홍길동" /><option value="홍길동|김철수" /></datalist>
          <button onClick={s.addKeyword} disabled={s.saving || !s.newKeyword.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50">
            {s.saving ? <LoadingSpinner size={14} /> : <PlusIcon size={14} />} 추가
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 shrink-0" />
          <button onClick={s.rematch} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition">DB 재수집</button>
          <button onClick={s.recrawl} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition">크롤링 재수집</button>
          <span className="text-[12px] text-slate-400 dark:text-slate-500">
            <code>|</code> OR &nbsp;·&nbsp; <code>&amp;</code> AND &nbsp;·&nbsp; 첫 토큰이 부서명이면 해당 부서만 수집
          </span>
        </div>
        {s.actionMsg && <p className="mt-2 text-[13px] text-blue-600 dark:text-blue-400">{s.actionMsg}</p>}
      </div>
      {s.keywords.length === 0
        ? <p className="text-[14px] text-slate-400 py-2">등록된 키워드가 없습니다.</p>
        : <div className="flex flex-wrap gap-2">
            {s.keywords.map(k => (
              <span key={k.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px]">
                {k.keyword}
                <button onClick={() => s.removeKeyword(k.id, k.keyword)} className="text-slate-400 hover:text-red-500 transition"><XIcon size={13} /></button>
              </span>
            ))}
          </div>
      }
    </div>
  );
}

// ── 게시판 키워드 탭 ─────────────────────────────────────────────
function BoardKwTab({ ext }: { ext: ReturnType<typeof useSkynetSettingsExt> }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
        <div className="flex gap-2 items-center flex-wrap">
          <input value={ext.newBoardKw} onChange={e => ext.setNewBoardKw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ext.addBoardKw()}
            placeholder="예: 결혼|부고" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={ext.addBoardKw} disabled={!ext.newBoardKw.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50">
            <PlusIcon size={14} /> 추가
          </button>
          <span className="text-[12px] text-slate-400 dark:text-slate-500">등록된 키워드와 일치하는 게시글만 수집됩니다. <code>|</code> OR, <code>&amp;</code> AND 지원.</span>
        </div>
      </div>
      {ext.boardKeywords.length === 0
        ? <p className="text-[14px] text-slate-400 py-2">등록된 게시판 키워드가 없습니다.</p>
        : <div className="flex flex-wrap gap-2">
            {ext.boardKeywords.map(k => (
              <span key={k.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[13px]">
                {k.keyword}
                <button onClick={() => ext.removeBoardKw(k.id)} className="text-amber-400 hover:text-red-500 transition"><XIcon size={13} /></button>
              </span>
            ))}
          </div>
      }
    </div>
  );
}

// ── 자동 수집 탭 ─────────────────────────────────────────────────
function AutoTab({ ext }: { ext: ReturnType<typeof useSkynetSettingsExt> }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">자동 수집 스케줄 (최대 5개)</span>
            <div className="flex gap-2">
              {ext.crawlTimes.map((t, i) => (
                <input key={i} type="time" value={t} onChange={e => ext.setCrawlTimes(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 shrink-0" />
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">수집 속도</span>
            <select value={ext.crawlSpeed} onChange={e => ext.setCrawlSpeed(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none">
              <option value="ultra_safe">초저부하 (1분)</option>
              <option value="conservative">보수</option>
              <option value="balanced">균형</option>
              <option value="fast">빠른</option>
            </select>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 shrink-0" />
          <button onClick={ext.saveCrawlSettings}
            className={`shrink-0 px-5 py-1.5 rounded-lg text-[13px] font-semibold transition ${ext.settingsSaved ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}>
            {ext.settingsSaved ? '저장됐습니다 ✓' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 인증 설정 탭 ─────────────────────────────────────────────────
function AuthTab({ ext }: { ext: ReturnType<typeof useSkynetSettingsExt> }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={ext.autoDetect}
            disabled={ext.autoDetecting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[14px] font-semibold transition disabled:opacity-50"
          >
            {ext.autoDetecting
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : null}
            자동 감지
          </button>
          <span className="text-[12px] text-slate-400 dark:text-slate-500">
            Edge IE 모드로 EKP에 로그인된 상태면 자동으로 세션을 가져옵니다.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">직접 입력</span>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 shrink-0" />
          <input value={ext.jsessionid} onChange={e => ext.setJsessionid(e.target.value)}
            placeholder="JSESSIONID 붙여넣기"
            className="flex-1 min-w-[280px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={ext.saveJsessionid} disabled={!ext.jsessionid.trim()}
            className="shrink-0 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50">
            적용
          </button>
          <span className="text-[12px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            F12 → Application → Cookies → JSESSIONID 값 복사
          </span>
        </div>
        {ext.authMsg && <p className="mt-2 text-[13px] text-blue-600 dark:text-blue-400">{ext.authMsg}</p>}
      </div>
    </div>
  );
}
