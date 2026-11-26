import { useRef, useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatchItem, PrBatchItemCreate, PrBatchItemKind, PrBatchItemStatus } from '../../types/prBatch';
import type { IssueListItem } from '../../types/issue';
import { useUIStore } from '../../store/uiStore';
import { usePrCatalogImport } from '../../hooks/usePrCatalogImport';
import { PrBatchIssuePicker } from './PrBatchIssuePicker';
import { PrBatchItemActions, PrBatchItemEmpty } from './PrBatchItemActions';
import { PrBatchItemDetail } from './PrBatchItemDetail';

const ITEM_STATUSES: PrBatchItemStatus[] = ['대기', '수정완료', '반환', '보류'];
const ITEM_KINDS: PrBatchItemKind[] = ['기본기능', '수정사항 연동', '개별 PR'];

const STATUS_CLS: Record<PrBatchItemStatus, string> = {
  대기:    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  수정완료: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  반환:    'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  보류:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const EMPTY: PrBatchItemCreate = {
  item_kind: '개별 PR',
  kac_pr_no: '', lm_pr_no: '', title: '',
  agreed_content: '', actual_fix: '', verify_method: '', item_status: '대기',
};

interface Props {
  batchId: number;
  version: string;
  items: PrBatchItem[];
  verificationCount: (itemId: number) => number;
  onChanged: () => void;
  readOnly?: boolean;
}

export function PrBatchItemTable({ batchId, version, items, verificationCount, onChanged, readOnly = false }: Props) {
  const [newRow, setNewRow] = useState<PrBatchItemCreate | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PrBatchItemCreate>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const catalogInput = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const addToast = useUIStore(s => s.addToast);
  const runCatalogImport = usePrCatalogImport(batchId, onChanged);

  const importing = useRef(false);  // 반영이 끝나기 전에 다른 엑셀을 또 올려 두 요청이 겹치지 않게
  const importCatalog = async (file?: File) => {
    if (!file || importing.current) return;
    importing.current = true;
    try { await runCatalogImport(file); }
    finally { importing.current = false; if (catalogInput.current) catalogInput.current.value = ''; }
  };

  const inputCls = 'w-full text-[12px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400';

  const saveNew = async () => {
    if (!newRow?.title) return;
    try {
      await prBatchApi.addItem(batchId, newRow);
      setNewRow(null);
      addToast('PR 항목이 추가되었습니다', 'success');
      onChanged();
    } catch {
      addToast('저장에 실패했습니다', 'error');
    }
  };

  const saveEdit = async (id: number) => {
    try {
      await prBatchApi.updateItem(id, editData);
      setEditId(null);
      setEditData({});
      addToast('수정되었습니다', 'success');
      onChanged();
    } catch {
      addToast('저장에 실패했습니다', 'error');
    }
  };

  const deleteItem = async (id: number) => {
    const records = verificationCount(id);
    const warn = records ? `\n\n이 PR에 검증 기록 ${records}건이 있습니다. 내 기록과 보고서는 함께 영구 삭제되며 되돌릴 수 없습니다. 다른 근무자의 기록이 있으면 삭제되지 않습니다.` : '';
    if (!confirm(`이 PR 항목을 삭제하시겠습니까?${warn}`)) return;
    try {
      await prBatchApi.deleteItem(id);
      addToast('삭제되었습니다', 'success');
      onChanged();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      addToast(typeof detail === 'string' ? detail : '삭제에 실패했습니다', 'error');
    }
  };

  const addFromIssues = async (issues: IssueListItem[]) => {
    const rows = issues.map((issue, index) => ({
      item_kind: '개별 PR' as PrBatchItemKind, kac_pr_no: issue.kac_pr_no, lm_pr_no: issue.lm_pr_no, title: issue.title,
      issue_id: issue.id, item_status: '대기' as PrBatchItemStatus, sort_order: items.length + index,
    }));
    try {
      await prBatchApi.addItemsBulk(batchId, rows);
      addToast(`PR 항목 ${rows.length}건을 가져왔습니다`, 'success');
      setShowPicker(false); onChanged();
    } catch { addToast('가져오기에 실패했습니다', 'error'); }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
          PR 항목 <span className="text-slate-400">({items.length})</span>
        </span>
        {!readOnly && items.length > 0 && <PrBatchItemActions onExcel={() => catalogInput.current?.click()}
          onPick={() => setShowPicker(true)} onAdd={() => setNewRow({ ...EMPTY })} />}
        <input ref={catalogInput} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={e => void importCatalog(e.target.files?.[0])} />
      </div>

      {/* 신규 행 입력 */}
      {newRow && (
        <div className="grid grid-cols-12 gap-1 p-2 bg-sky-50 dark:bg-sky-900/10 rounded-lg border border-sky-200 dark:border-sky-800">
          <div className="col-span-2"><select className={inputCls} value={newRow.item_kind} onChange={e => setNewRow(r => ({ ...r!, item_kind: e.target.value as PrBatchItemKind }))}>{ITEM_KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
          <div className="col-span-2"><input className={inputCls} placeholder="KAC PR번호"
            value={newRow.kac_pr_no ?? ''} onChange={e => setNewRow(r => ({ ...r!, kac_pr_no: e.target.value }))} /></div>
          <div className="col-span-2"><input className={inputCls} placeholder="제작사 PR번호"
            value={newRow.lm_pr_no ?? ''} onChange={e => setNewRow(r => ({ ...r!, lm_pr_no: e.target.value }))} /></div>
          <div className="col-span-4"><input className={inputCls} placeholder="제목 *"
            value={newRow.title} onChange={e => setNewRow(r => ({ ...r!, title: e.target.value }))} /></div>
          <div className="col-span-1">
            <select className={inputCls} value={newRow.item_status}
              onChange={e => setNewRow(r => ({ ...r!, item_status: e.target.value as PrBatchItemStatus }))}>
              {ITEM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-1 flex gap-0.5 justify-end">
            <button onClick={saveNew} className="text-[11px] px-1.5 py-0.5 bg-sky-500 text-white rounded hover:bg-sky-600">저장</button>
            <button onClick={() => setNewRow(null)} className="text-[11px] px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-slate-500">취소</button>
          </div>
        </div>
      )}

      {/* 헤더 행 */}
      {items.length > 0 && (
        <div className="grid grid-cols-12 gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          <div className="col-span-2">KAC PR번호</div>
          <div className="col-span-2">제작사 PR번호</div>
          <div className="col-span-4">제목</div>
          <div className="col-span-2">수정 상태</div>
          <div className="col-span-2 text-right">작업</div>
        </div>
      )}

      {/* 항목 목록 */}
      {items.length === 0 && !newRow && (
        <PrBatchItemEmpty onExcel={() => catalogInput.current?.click()} onPick={() => setShowPicker(true)} onAdd={() => setNewRow({ ...EMPTY })} />
      )}
      {items.map((item, idx) => (
        <div key={item.id} className={`border border-slate-200 dark:border-slate-700 rounded-lg ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
          <div className="grid grid-cols-12 gap-1 p-2 items-center">
            <div className="col-span-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {editId === item.id
                ? <input className={inputCls} value={editData.kac_pr_no ?? item.kac_pr_no ?? ''}
                    onChange={e => setEditData(d => ({ ...d, kac_pr_no: e.target.value }))} />
                : (item.kac_pr_no || (item.item_kind !== '개별 PR' ? <span className="font-sans">{item.item_kind}</span> : '-'))
              }
            </div>
            <div className="col-span-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {editId === item.id
                ? <input className={inputCls} value={editData.lm_pr_no ?? item.lm_pr_no ?? ''}
                    onChange={e => setEditData(d => ({ ...d, lm_pr_no: e.target.value }))} />
                : (item.lm_pr_no || '-')
              }
            </div>
            <div className="col-span-4 text-[12px] text-slate-700 dark:text-slate-200 truncate cursor-pointer"
              role={editId === item.id ? undefined : 'button'} tabIndex={editId === item.id ? undefined : 0}
              aria-expanded={editId === item.id ? undefined : expandedId === item.id}
              onKeyDown={e => { if (editId !== item.id && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedId(expandedId === item.id ? null : item.id); } }}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              {editId === item.id
                ? <input className={inputCls} value={editData.title ?? item.title}
                    onChange={e => setEditData(d => ({ ...d, title: e.target.value }))} />
                : item.title
              }
            </div>
            <div className="col-span-2">
              {editId === item.id
                ? <select className={inputCls} value={editData.item_status ?? item.item_status}
                    onChange={e => setEditData(d => ({ ...d, item_status: e.target.value as PrBatchItemStatus }))}>
                    {ITEM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                : <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLS[item.item_status]}`}>
                    {item.item_status}
                  </span>
              }
            </div>
            <div className="col-span-2 flex gap-1 justify-end whitespace-nowrap text-[12px]">
              {!readOnly && (editId === item.id
                ? <>
                    <button onClick={() => saveEdit(item.id)} className="px-1 py-0.5 text-sky-600 hover:text-sky-700 dark:text-sky-400">저장</button>
                    <button onClick={() => { setEditId(null); setEditData({}); }} className="px-1 py-0.5 text-slate-500">취소</button>
                  </>
                : <>
                    <button onClick={() => { setEditId(item.id); setEditData({}); }} className="px-1 py-0.5 text-slate-500 hover:text-sky-600 dark:text-slate-400">편집</button>
                    <button onClick={() => deleteItem(item.id)} className="px-1 py-0.5 text-slate-500 hover:text-red-600 dark:text-slate-400">삭제</button>
                  </>
              )}
            </div>
          </div>

          {/* 확장: 합의내용 / 실제수정 / PR 상세 내용 */}
          {expandedId === item.id && editId !== item.id && <PrBatchItemDetail item={item} />}
        </div>
      ))}

      {showPicker && (
        <PrBatchIssuePicker
          version={version}
          excludeIssueIds={items.map(i => i.issue_id).filter((id): id is number => id != null)}
          onAdd={addFromIssues}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
