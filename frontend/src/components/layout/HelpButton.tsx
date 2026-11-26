import { useLocation } from 'react-router-dom';
import { helpSection, openHelp } from '../../utils/help';

/** 도움말 버튼 — section 을 주지 않으면 현재 주소로 고른다 */
export function HelpButton({ className = '', section, label = '도움말' }: { className?: string; section?: string; label?: string }) {
  const { pathname } = useLocation();
  return (
    <button type="button" onClick={() => openHelp(section ?? helpSection(pathname))} className={className}
      title="이 화면의 사용법을 새 창으로 엽니다">
      ? {label}
    </button>
  );
}
