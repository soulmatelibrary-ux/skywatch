import { useSkynetTodayDocs } from '../../hooks/skynet/useSkynetTodayDocs';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { SkynetDocument } from '../../types/skynet';

interface Props {
  onClose: () => void;
}

function openDoc(url: string) {
  const w = 1100;
  const h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_doc', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

function DocRow({ doc }: { doc: SkynetDocument }) {
  const canOpen = !!doc.detail_url;

  return (
    <button
      type="button"
      onClick={() => canOpen && openDoc(doc.detail_url!)}
      className={`w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 transition ${
        canOpen ? 'hover:bg-amber-50 dark:hover:bg-amber-900/10 cursor-pointer' : 'opacity-75 cursor-default'
      }`}
    >
      <div className="flex items-start gap-2">
        {doc.matched_keyword && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 mt-0.5">
            {doc.matched_keyword}
          </span>
        )}
        <span className="text-[13px] text-slate-800 dark:text-slate-100 line-clamp-1 flex-1">
          {doc.title || '(제목 없음)'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
        {doc.reg_date && <span>{doc.reg_date}</span>}
        {doc.dept_name && <span>{doc.dept_name}</span>}
        {doc.charger_nm && <span>{doc.charger_nm}</span>}
        {doc.doc_number && <span>{doc.doc_number}</span>}
      </div>
    </button>
  );
}

export function SkynetTodayDocsModal({ onClose }: Props) {
  const { docs, loading } = useSkynetTodayDocs();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">오늘 수집 문서</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">항목을 누르면 새 창으로 문서를 엽니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[calc(80vh-74px)] overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400 dark:text-slate-500">
              오늘 수집된 문서가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => <DocRow key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
