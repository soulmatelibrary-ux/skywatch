// 수정 중인 카드가 있을 때 창을 닫으려 하면 뜨는 확인 창
interface Props {
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function LogUnsavedConfirm({ onSaveAndClose, onDiscard, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-[360px] border border-slate-200 dark:border-slate-700">
        <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 mb-1">수정 중인 내용이 있습니다</p>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">저장하지 않고 닫으면 변경 사항이 사라집니다.</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveAndClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-[14px] hover:bg-blue-700 transition"
          >
            저장하고 닫기
          </button>
          <button
            onClick={onDiscard}
            className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-[14px] hover:bg-slate-50 transition dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            저장 안 하고 닫기
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-slate-500 rounded-lg text-[14px] hover:bg-slate-100 transition dark:text-slate-400 dark:hover:bg-slate-700"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
