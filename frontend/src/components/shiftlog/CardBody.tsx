import { useState } from 'react';
import { isLongBody, isRichHtml, parseBody } from '../../utils/shiftText';
import { RichBody } from './RichBody';

const KV_STYLE: Record<string, string> = {
  조치: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  원인: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  결과: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  다음: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

/** 링크(<a>)나 #TD:번호·#LOG:번호가 있으면 글자만으로는 누를 수 없으므로 HTML로 보여준다 */
const HAS_LINK = /<a\s|#(?:TD|LOG)[:-]\d/i;

/** 조치·원인·결과·다음 할 일 항목을 색 이름표로 나눠 보여준다. clamp면 긴 본문은 세 줄까지만.
 *  html에 표·이미지·링크가 있으면 기존 업무일지와 같은 HTML 그대로 보여준다. */
export function CardBody({ text, html = null, clamp = false }: { text: string; html?: string | null; clamp?: boolean }) {
  const [open, setOpen] = useState(false);
  if (html && (isRichHtml(html) || HAS_LINK.test(html))) return <RichBody html={html} clamp={clamp} />;
  if (!text) return null;
  const long = clamp && isLongBody(text);
  const folded = long && !open;
  return (
    <div>
      <div className={`relative text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 ${folded ? 'max-h-[5.2em] overflow-hidden' : ''}`}>
        {parseBody(text).map((line, i) => {
          if (line.type === 'kv') {
            return (
              <div key={i} className="my-0.5 flex items-baseline gap-2">
                <span className={`min-w-[58px] shrink-0 rounded px-1.5 text-center text-[11px] font-extrabold ${KV_STYLE[line.key]}`}>
                  {line.key === '다음' ? '다음 할 일' : line.key}
                </span>
                <span className="[overflow-wrap:anywhere]">{line.text}</span>
              </div>
            );
          }
          if (line.type === 'hr') return <div key={i} className="my-2 h-px bg-slate-200 dark:bg-slate-700" />;
          if (line.type === 'li') return <div key={i} className="my-0.5 pl-3 before:-ml-3 before:mr-1.5 before:text-slate-400 before:content-['•']">{line.text}</div>;
          return <p key={i} className="my-0.5 [overflow-wrap:anywhere]">{line.text}</p>;
        })}
        {folded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white dark:from-[#1e293b]" />}
      </div>
      {long && (
        <button type="button" onClick={e => { e.stopPropagation(); setOpen(v => !v); }} className="mt-0.5 text-[12px] font-bold text-blue-600 dark:text-blue-400">
          {open ? '접기 ▴' : '더 보기 ▾'}
        </button>
      )}
    </div>
  );
}
