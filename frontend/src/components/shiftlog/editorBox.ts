import { V2_INPUT } from '../common/v2Styles';

/** 새 카드·카드 수정이 함께 쓰는 입력칸 / 편집기 바깥 상자 클래스 */
export const INPUT = `rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${V2_INPUT}`;

export const EDITOR_BOX = 'max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:[&_.tiptap-editor]:rounded-none v2:[&_.tiptap-editor]:border-0 v2:[&_.tiptap-editor]:bg-[var(--v2-panel)] [&_.tiptap]:!min-h-[140px] [&_.tiptap]:!px-3 [&_.tiptap]:!py-2 [&_.tiptap]:!text-[14px]';
