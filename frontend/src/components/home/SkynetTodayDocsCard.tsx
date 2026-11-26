import { useSkynetTodayDocs } from '../../hooks/skynet/useSkynetTodayDocs';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Props {
  onOpen?: () => void;
}

function openDoc(url: string) {
  const w = 1100;
  const h = 750;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, 'skynet_doc', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

export function SkynetTodayDocsCard({ onOpen }: Props) {
  const { docs, loading } = useSkynetTodayDocs();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        오늘 수집 문서
        {docs.length > 0 && (
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            {docs.length}건
          </span>
        )}
        {onOpen && (
          <button
            onClick={onOpen}
            className="ml-auto text-[11px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
          >
            전체 보기
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-6"><LoadingSpinner size={24} /></div>}

      {!loading && docs.length === 0 && (
        <p className="text-[13px] text-slate-400 dark:text-slate-500 py-4 text-center">
          오늘 수집된 문서가 없습니다.
        </p>
      )}

      {!loading && docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => {
            const isNew = !!doc.matched_keyword && doc.reg_date?.slice(0, 10) === today;

            return (
              <div
                key={doc.id}
                className={`p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 text-[13px] ${doc.detail_url ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 transition' : ''}`}
                onClick={doc.detail_url ? () => openDoc(doc.detail_url!) : undefined}
              >
                <div className="flex items-start gap-2">
                  {isNew && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 mt-0.5">
                      NEW
                    </span>
                  )}
                  {doc.matched_keyword && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 mt-0.5">
                      {doc.matched_keyword}
                    </span>
                  )}
                  <span className="text-slate-800 dark:text-slate-100 line-clamp-1 flex-1">
                    {doc.title || '(제목 없음)'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {doc.reg_date && <span>{doc.reg_date}</span>}
                  {doc.dept_name && <span>{doc.dept_name}</span>}
                  {doc.charger_nm && <span>{doc.charger_nm}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
