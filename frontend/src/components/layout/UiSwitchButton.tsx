import { useUIStore } from '../../store/uiStore';

/** 기존 화면 ↔ 새 화면 전환. 주소는 그대로 두고 바깥 틀만 바꾼다 */
export function UiSwitchButton({ className = '' }: { className?: string }) {
  const uiVersion = useUIStore(s => s.uiVersion);
  const setUiVersion = useUIStore(s => s.setUiVersion);
  const toV2 = uiVersion === 'classic';
  return (
    <button
      type="button"
      onClick={() => setUiVersion(toV2 ? 'v2' : 'classic')}
      title={toV2 ? '새 화면으로 봅니다. 언제든 기존 화면으로 돌아올 수 있습니다' : '기존 화면으로 돌아갑니다'}
      className={className}
    >
      {toV2 ? '새 화면으로 보기' : '기존 화면으로'}
    </button>
  );
}
