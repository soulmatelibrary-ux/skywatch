import type { Editor } from '@tiptap/react';
import type { WriteCard } from '../../hooks/useLogWrite';
import type { LogDetail } from '../../types/log';
import { EditorToolbar } from './EditorToolbar';

interface Props {
  editTarget?: LogDetail | null;
  error: string | null;
  showHelp: boolean;
  activeCardKey: string | null;
  cards: WriteCard[];
  activeEditor: Editor | null;
}

export function LogInfoSection({
  error, showHelp, activeCardKey, cards, activeEditor,
}: Props) {
  return (
    <div className="shrink-0 px-6 pt-4 pb-3 space-y-3 border-b border-slate-200 bg-slate-50">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{error}</div>
      )}
      {showHelp && (
        <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-4 text-[13px] text-emerald-800 space-y-1">
          <div className="font-semibold">작성 도움말</div>
          <div>야간 근무는 자정을 넘어도 근무 시작일 기준으로 작성합니다.</div>
          <div>카테고리를 선택하지 않으면 저장 시 기타로 분류됩니다.</div>
          <div className="text-emerald-600">오른쪽 참고 일지 패널에서 과거 카드를 검색 후 링크 복사 또는 내용 가져오기 할 수 있습니다.</div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeCardKey
              ? <span className="text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 shrink-0">
                  카드 {cards.findIndex(c => c._key === activeCardKey) + 1} 편집 중
                </span>
              : <span className="text-[12px] text-slate-400 shrink-0">카드 본문 클릭 시 활성화</span>}
            <EditorToolbar editor={activeEditor} />
          </div>
        </div>
      </div>
    </div>
  );
}
