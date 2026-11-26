// 참고 일지 패널(목록 줄·카드 미리보기 창)이 같이 쓰는 카드 상태 표시
export const STATUS_LABEL: Record<string, string> = { open: '진행중', hold: '보류', done: '완료' };
export const STATUS_CLS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  hold: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300',
  done: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
};
