import { useSkynetTodayDocs } from '../../hooks/skynet/useSkynetTodayDocs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { SkynetDocument } from '../../types/skynet';

function openDoc(url: string) {
  const w = 1100;
  const h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_doc_view', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

function DocRow({ doc }: { doc: SkynetDocument }) {
  const canOpen = !!doc.detail_url;
  const isNew = !!doc.matched_keyword && doc.reg_date?.slice(0, 10) === new Date().toISOString().slice(0, 10);
  const meta = [doc.reg_date?.slice(0, 10), doc.dept_name, doc.charger_nm, doc.doc_number].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => canOpen && openDoc(doc.detail_url!)}
      className={`group w-full text-left border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 transition-colors duration-150 ${
        canOpen ? 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer' : 'opacity-60 cursor-default'
      }`}
    >
      <div className="flex items-center gap-2">
        {isNew && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
            NEW
          </span>
        )}
        {doc.matched_keyword && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            {doc.matched_keyword}
          </span>
        )}
        <span className={`text-[14px] font-bold line-clamp-1 flex-1 transition-colors ${canOpen ? 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {doc.title || '(제목 없음)'}
        </span>
        {meta && (
          <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{meta}</span>
        )}
      </div>
    </button>
  );
}

export function SkynetTodayDocsPopupPage() {
  const { docs, loading } = useSkynetTodayDocs();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">오늘 수집 문서</h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">항목을 누르면 문서 원문을 새 창으로 엽니다.</p>
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-20 text-center text-[13px] text-slate-400 dark:text-slate-500">
              오늘 수집된 문서가 없습니다.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              {docs.map(doc => <DocRow key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
