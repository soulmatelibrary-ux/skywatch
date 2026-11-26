// 새 화면 1층 — 좁은 아이콘 줄. 메뉴·동작은 기존 사이드바와 같은 정의(navMenu)를 쓴다
import { Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifStore } from '../../../store/notifStore';
import { useUIStore } from '../../../store/uiStore';
import { NAV_ITEMS, SKYNET_ITEMS, TECH_DOCS_ITEM, isNavActive, openNavPopup, type NavItem } from '../navMenu';

const MAIN = NAV_ITEMS.filter(i => i.id !== 'spa-viewer' && i.id !== 'manage');
const TAIL = NAV_ITEMS.filter(i => i.id === 'spa-viewer');
const MANAGE = NAV_ITEMS.filter(i => i.id === 'manage');

const SEP = <div className="mx-2 my-[3px] h-px shrink-0 bg-white/10" />;

// 화면 높이에 맞춰 줄어들어 스크롤이 생기지 않게 한다: 버튼은 남는 높이를 나눠 갖고(flex-1, 34~52px),
// 620px보다 낮은 화면에서는 글자를 숨기고 아이콘만 둔다 (이름은 마우스를 올리면 말풍선으로 나온다).
// 이 프로젝트는 Tailwind 간격 단위가 기본보다 커서(min-h-9 = 40.5px) 높이는 px 로 직접 적는다.
// 클래스 이름은 조합하지 않고 통째로 적어야 Tailwind 가 찾아서 만든다.

export function RailNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bumpNavRefresh = useUIStore(s => s.bumpNavRefresh);
  const unreadCount = useNotifStore(s => s.unreadCount);

  const go = (item: NavItem) => {
    if (item.disabled || openNavPopup(item.id)) return;
    bumpNavRefresh(item.path);
    navigate(item.path);
  };

  const btn = (item: NavItem) => {
    const on = isNavActive(item, pathname);
    const badge = item.id === 'notif' && unreadCount > 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => go(item)}
        disabled={!!item.disabled}
        aria-label={badge ? `${item.label} ${unreadCount}건` : item.label}
        aria-current={on ? 'page' : undefined}
        title={item.label}
        className={`relative flex min-h-[34px] max-h-[52px] w-full flex-1 basis-0 flex-col items-center justify-center gap-[2px] rounded-md px-0.5 text-[10.5px] leading-none transition [@media(max-height:619px)]:min-h-[30px] ${
          on ? 'bg-[#2160D6] text-white dark:bg-[#2F6FE0]' : 'text-[#AFC0D6] hover:bg-white/[.06] hover:text-white dark:text-[#7F8FA6]'
        }`}
      >
        <item.Icon size={18} className="shrink-0" />
        <span className={`whitespace-nowrap text-center [@media(max-height:619px)]:hidden`}>{item.rail}</span>
        {badge && (
          <span className="absolute right-1.5 top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  return (
    // 극단적으로 낮은 화면에서만 넘치므로 스크롤 막대는 숨긴다 (휠로는 계속 움직인다)
    <nav aria-label="주요 메뉴" className="flex w-16 shrink-0 flex-col gap-px overflow-y-auto bg-[#1C2B3F] px-1.5 py-[6px] [scrollbar-width:none] dark:bg-[#0A111B] [&::-webkit-scrollbar]:hidden">
      <div className="mb-px grid h-[34px] shrink-0 place-items-center">
        <span className="grid h-[28px] w-[28px] place-items-center rounded-[7px] bg-[#2160D6] text-[12px] font-extrabold tracking-tight text-white">SW</span>
      </div>
      {MAIN.map(item => (
        <Fragment key={item.id}>
          {btn(item)}
          {item.id === 'inquiries' && btn(TECH_DOCS_ITEM)}
        </Fragment>
      ))}
      {SEP}
      <div className="shrink-0 text-center text-[10px] font-semibold leading-3 text-[#6F829B] dark:text-[#55657A]">SkyNet</div>
      {SKYNET_ITEMS.map(btn)}
      {SEP}
      {TAIL.map(btn)}
      <div className="min-h-0 flex-1 basis-0" />
      {MANAGE.map(btn)}
    </nav>
  );
}
