import { useState } from 'react';
import type { SkynetDocument } from '../../types/skynet';

const fallbackCopy = (text: string) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(el);
};

export const SkynetCopyRef = ({ doc }: { doc: SkynetDocument }) => {
  const [cp, setCp] = useState(false);
  const ref = doc.doc_number || '';
  if (!ref) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const dateSuffix = doc.reg_date ? `(${doc.reg_date.slice(2).replace(/-/g, '.')})` : '';
  const copyText = ref + dateSuffix;
  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyText).catch(() => fallbackCopy(copyText));
    } else {
      fallbackCopy(copyText);
    }
    setCp(true);
    setTimeout(() => setCp(false), 500);
  };
  return (
    <button
      onClick={copy}
      title={copyText}
      className={`cursor-copy rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
        cp
          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
          : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:text-blue-400'
      }`}
    >
      {cp ? '완료!' : '복사하기'}
    </button>
  );
};
