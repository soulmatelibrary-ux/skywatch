// 문의사항 테이블 (더블클릭 인라인 편집, 헤더 클릭 정렬) — 왼쪽 띠 = 처리상태, 월이 바뀌면 구분 줄
import { Fragment } from 'react';
import type { Inquiry } from '../../types/inquiry';
import type { UserSimple } from '../../services/api/usersApi';
import { InquiryTableCell } from './InquiryTableCell';
import type { EditingCell } from '../../hooks/useInquiryEdit';
import type { SortOrder } from '../../hooks/useInquiryList';

interface Props {
  inquiries: Inquiry[];
  editingCell: EditingCell | null;
  editValue: string;
  isSaving: boolean;
  users: UserSimple[];
  sort: string | null;
  order: SortOrder;
  onSort: (key: string) => void;
  onStartEdit: (id: number, field: string, value: unknown) => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: (id: number) => void;
  onCancelEdit: () => void;
  onDeleteInquiry: (inquiry: Inquiry) => void;
  onClickContent: (id: number) => void;
  onOpenPopup?: (id: number) => void;
}

// editKey: 저장 시 사용할 필드 (표시 필드와 다를 때만 지정)
const COLUMNS: Array<{ key: keyof Inquiry; label: string; width: string; editKey?: keyof Inquiry}> = [
  { key: 'inquiry_no', label: '번호', width: 'w-[72px]' },
  { key: 'occurred_date', label: '발생일', width: 'w-[98px]' },
  { key: 'occurred_time', label: '시각(Z)', width: 'w-[56px]' },
  { key: 'controller_sector', label: '관제사(섹터)', width: 'w-[116px]' },
  { key: 'sw_version', label: '버전', width: 'w-[100px]' },
  { key: 'received_by_name', label: '접수자', width: 'w-[60px]', editKey: 'received_by' },
  { key: 'category', label: '카테고리', width: 'w-[76px]' },
  { key: 'keyword', label: '키워드', width: 'w-[88px]' },
  { key: 'content', label: '상세내용', width: '' },
  { key: 'status', label: '상태', width: 'w-[64px]' },
  { key: 'completed_date', label: '완료일', width: 'w-[98px]' },
  { key: 'pr_no', label: 'PR', width: 'w-[64px]' },
];

// 처리상태별 왼쪽 띠 (완료는 띠 없음)
const STATUS_EDGE: Record<string, string> = {
  in_progress: 'shadow-[inset_3px_0_0_#0ea5e9]',
  pr_registered: 'shadow-[inset_3px_0_0_#8b5cf6]',
  pr_duplicate: 'shadow-[inset_3px_0_0_#f97316]',
  tracking: 'shadow-[inset_3px_0_0_#f59e0b]',
};

const TH = 'border-b border-slate-200 px-2 py-2 text-left text-[12px] font-semibold whitespace-nowrap dark:border-slate-700';

// 상세내용 HTML → 미리보기 텍스트
function previewText(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function InquiryTable({
  inquiries, editingCell, editValue, isSaving, users, sort, order, onSort,
  onStartEdit, onEditValueChange, onSaveEdit, onCancelEdit,
  onDeleteInquiry, onClickContent, onOpenPopup,
}: Props) {
  const colCount = COLUMNS.length + 1;
  // 월 구분 줄은 발생일 순서일 때만 (다른 열로 정렬하면 줄마다 끼어듦)
  const groupByMonth = !sort || sort === 'occurred_date';
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900">
      <table className="w-full min-w-[1160px] table-fixed text-xs">
        <thead className="sticky top-0 z-[1] bg-slate-50 dark:bg-slate-800/80">
          <tr>
            {COLUMNS.map(col => {
              const sortable = col.key !== 'content';
              const active = sort === col.key;
              return (
                <th key={col.key} scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  onClick={sortable ? () => onSort(col.key) : undefined}
                  className={`${col.width} ${TH} ${sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-white' : ''} ${active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {col.label}
                  {active && <span className="ml-0.5 text-[10px]">{order === 'asc' ? '▲' : '▼'}</span>}
                </th>
              );
            })}
            <th className={`w-[44px] ${TH} text-center text-slate-500 dark:text-slate-400`}><span className="sr-only">작업</span></th>
          </tr>
        </thead>
        <tbody>
          {inquiries.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-12 text-center">
                <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">조건에 맞는 문의사항이 없습니다.</p>
                <p className="mt-1 text-[12px] text-slate-400">기간이나 상태 조건을 바꾸거나 &lsquo;전체 보기&rsquo;를 눌러 보세요.</p>
              </td>
            </tr>
          ) : inquiries.map((inquiry, idx) => {
            const month = inquiry.occurred_date?.slice(0, 7) ?? '';
            const newMonth = idx === 0 || month !== (inquiries[idx - 1].occurred_date?.slice(0, 7) ?? '');
            return (
              <Fragment key={inquiry.id}>
                {groupByMonth && newMonth && month && (
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                    <td colSpan={colCount} className="border-t border-slate-200 px-3 py-1 text-[12px] font-semibold tabular-nums text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {month.replace('-', '년 ')}월
                    </td>
                  </tr>
                )}
                <tr className={`group border-t border-slate-100 align-top transition-colors hover:bg-sky-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60 v2:hover:bg-[var(--v2-hover)]`}>
                  {COLUMNS.map(col => {
                    if (col.key === 'inquiry_no') {
                      return (
                        <td key={col.key} className={`px-2 py-2.5 text-[12px] ${STATUS_EDGE[inquiry.status] ?? ''}`}>
                          <button type="button" onClick={() => onClickContent(inquiry.id)} title="상세 보기"
                            className="font-semibold tabular-nums text-sky-700 hover:underline dark:text-sky-300">
                            {inquiry.inquiry_no}
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'content') {
                      const text = previewText(inquiry.content);
                      return (
                        <td key={col.key} className="px-2 py-2.5 text-[12px]">
                          <div className="flex min-w-0 items-start gap-1.5">
                            <button type="button" onClick={() => onClickContent(inquiry.id)} title={text ? text.slice(0, 300) : undefined}
                              className="line-clamp-2 min-w-0 flex-1 text-left leading-relaxed text-slate-700 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300">
                              {text || <span className="text-slate-400">(내용 없음)</span>}
                            </button>
                            {onOpenPopup && (
                              <button type="button" onClick={e => { e.stopPropagation(); onOpenPopup(inquiry.id); }} title="새 창으로 열기" aria-label="새 창으로 열기"
                                className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-sky-600 dark:text-slate-600 dark:hover:text-sky-400">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }
                    const editKey = col.editKey ?? col.key;
                    return (
                      <InquiryTableCell
                        key={`${inquiry.id}-${col.key}`}
                        field={col.key}
                        inquiry={inquiry}
                        isEditing={editingCell?.id === inquiry.id && editingCell?.field === editKey}
                        editValue={editValue}
                        isSaving={isSaving}
                        users={users}
                        onStartEdit={() => onStartEdit(inquiry.id, editKey, inquiry[editKey])}
                        onEditValueChange={onEditValueChange}
                        onSave={() => onSaveEdit(inquiry.id)}
                        onCancel={onCancelEdit}
                      />
                    );
                  })}
                  <td className="px-1 py-2 text-center">
                    {/* 새 화면: 실수로 누르지 않게 마우스를 올린 줄에서만 보인다 (키보드 초점 때도 보임) */}
                    <button type="button" onClick={() => onDeleteInquiry(inquiry)} disabled={isSaving}
                      className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition v2:opacity-0 v2:group-hover:opacity-100 v2:focus-visible:opacity-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                      삭제
                    </button>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
