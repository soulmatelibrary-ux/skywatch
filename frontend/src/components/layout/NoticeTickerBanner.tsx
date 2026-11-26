import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
import { noticesApi, type TickerItem } from '../../services/api/noticesApi';

const TYPE_COLOR: Record<TickerItem['type'], string> = {
  notice: 'text-blue-700 dark:text-blue-300',
  leave:  'text-amber-700 dark:text-amber-400',
  memo:   'text-emerald-700 dark:text-emerald-400',
};

// 텍스트에서 "오늘", "내일", 날짜를 찾아 색상이 다른 부분으로 렌더링
function highlightSpecialTexts(text: string) {
  const parts: (string | { type: 'today' | 'tomorrow' | 'date'; text: string })[] = [];
  let lastIndex = 0;
  
  // "오늘", "내일", 날짜(YYYY-MM-DD 또는 M-DD 형식) 패턴
  const pattern = /(오늘|내일|\d{1,4}-\d{1,2}-\d{1,2})/g;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    const matched = match[1];
    if (matched === '오늘') {
      parts.push({ type: 'today', text: matched });
    } else if (matched === '내일') {
      parts.push({ type: 'tomorrow', text: matched });
    } else {
      parts.push({ type: 'date', text: matched });
    }
    
    lastIndex = match.index + matched.length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}

function HighlightedText({ text }: { text: string }) {
  const parts = highlightSpecialTexts(text);
  
  return (
    <>
      {parts.map((part, idx) => {
        if (typeof part === 'string') {
          return <span key={idx}>{part}</span>;
        }
        // 텍스트만 표시, 색상은 부모에서 처리
        return <span key={idx}>{part.text}</span>;
      })}
    </>
  );
}

// 텍스트에서 키워드를 감지하여 색상 클래스 결정
function getTextColorClass(text: string): string {
  if (text.includes('오늘')) return 'text-orange-600 dark:text-orange-400';
  if (text.includes('내일')) return 'text-blue-600 dark:text-blue-400';
  if (/\d{1,4}-\d{1,2}-\d{1,2}/.test(text)) return 'text-slate-500 dark:text-slate-400';
  return '';
}

export function NoticeTickerBanner() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    noticesApi.ticker()
      .then(res => setItems(res.data ?? []))
      .catch(() => {});
  }, []);

  const visible = items.filter(n => !dismissed.has(n.key));
  const dismiss = (key: string) => setDismissed(prev => new Set([...prev, key]));

  return (
    <div
      // 새 화면: 보여 줄 공지가 없으면 줄 자체를 숨겨 본문을 위로 올린다
      className={`shrink-0 flex items-center overflow-hidden relative bg-blue-50 dark:bg-slate-800/80 border-b border-blue-200 dark:border-slate-700 v2:bg-[var(--v2-panel)] v2:border-[var(--v2-line)] ${visible.length === 0 ? 'v2:hidden' : ''}`}
      style={{
        height: collapsed || visible.length === 0 ? 28 : 48,  // 보여 줄 공지가 없거나 접었을 땐 얇게 — 화면 위쪽을 아낀다
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
      }}
    >
      {/* 공지 라벨 */}
      <div
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center text-[13px] font-bold text-blue-600 dark:text-blue-400 z-10 shrink-0 bg-blue-100 dark:bg-slate-700 v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)]"
        style={{ width: 56, letterSpacing: '0.02em' }}
      >
        공지
      </div>

      {/* 티커 트랙 */}
      <div className="flex-1 overflow-hidden" style={{ paddingLeft: 56 }}>
        {collapsed ? (
          <span className="text-[13px] text-slate-500 pl-4">공지사항이 접혀 있습니다.</span>
        ) : visible.length === 0 ? (
          <span className="text-[13px] text-slate-400 pl-4">현재 표시 중인 공지가 없습니다.</span>
        ) : (
          <div className="ticker-track">
            {[...visible, ...visible].map((item, i) => {
              const textColorClass = getTextColorClass(item.text);
              const colorClass = textColorClass || TYPE_COLOR[item.type];
              
              return (
                <span key={`${item.key}-${i}`} className={`inline-flex items-center px-10 text-[15px] font-medium group ${colorClass}`}>
                  <span className="mr-2.5 text-blue-300 text-[16px]">·</span>
                  <HighlightedText text={item.text} />
                  {i < visible.length && (
                    <button
                      onClick={() => dismiss(item.key)}
                      className="ml-2 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition"
                      title="숨기기"
                    >×</button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 접기/펴기 버튼 */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn z-10"
        title={collapsed ? '공지사항 펴기' : '공지사항 접기'}
      >
        {collapsed ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
    </div>
  );
}
