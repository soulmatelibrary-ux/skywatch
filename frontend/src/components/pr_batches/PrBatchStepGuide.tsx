import type { PrBatchTab } from './PrBatchTabs';

const GUIDE: Record<PrBatchTab, { title: string; text: string }> = {
  items: { title: '이번 버전에서 검증할 PR 목록을 만듭니다.', text: '제작사 엑셀로 한 번에 올리거나, 개별 PR에서 골라 담거나, 직접 추가하세요. 목록은 누구나 볼 수 있습니다.' },
  verifications: { title: '맡은 PR을 검증하고 결과를 남깁니다.', text: 'PR마다 [내 검증 입력]으로 쓰거나, 시험확인서 엑셀을 한꺼번에 올리세요. 이름을 누르면 그 사람이 쓴 내용을 봅니다.' },
  docs: { title: '원본 문서를 모아 두는 곳입니다.', text: 'PR 목록, 제작사 절차서, 합의서 등을 올려 두면 누구나 바로 열어 볼 수 있습니다.' },
};

// 단계마다 "여기서 무엇을 하는지" 한 줄. 처음 쓰는 사람이 화면만 보고 다음 행동을 알 수 있게 한다.
export function PrBatchStepGuide({ tab }: { tab: PrBatchTab }) {
  const guide = GUIDE[tab];
  return <p className="shrink-0 border-b border-sky-100 bg-sky-50/70 px-4 py-2 text-[12px] text-slate-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-slate-300">
    <b className="font-semibold text-sky-800 dark:text-sky-300">{guide.title}</b> {guide.text}
  </p>;
}
