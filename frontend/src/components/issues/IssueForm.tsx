import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { Issue, IssueCreate } from '../../types/issue';
import { CardEditor } from '../logs/CardEditor';
import { CardToolbar } from '../logs/CardToolbar';
import { textToHtml } from '../../utils/shiftText';

/** 예전 평문 본문은 문단 HTML로 바꿔 편집기에 넣는다 */
const toEditorHtml = (v: string) => (v.trim().startsWith('<') ? v : textToHtml(v));
/** 글자·표·이미지가 하나도 없으면 빈 본문 */
const isEmptyHtml = (html: string) => !/<(img|table)\b/i.test(html) && !html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();

const STATUSES = ['진행중', '수정완료', '경고', '반환'];

type FormData = Omit<IssueCreate, 'reg_date'> & { reg_date: string };

interface Props {
  initial?: Issue;
  onSubmit: (data: IssueCreate) => Promise<void>;
  onCancel: () => void;
}

const empty: FormData = {
  kac_pr_no: '',
  lm_pr_no: '',
  title: '',
  content: '',
  status: '진행중',
  acc_type: '',
  keyword: '',
  version: '',
  mod_version: '',
  reg_date: new Date().toISOString().slice(0, 10),
  action_date: '',
  acc_pr: '',
};

function toForm(issue?: Issue): FormData {
  if (!issue) return empty;
  return {
    kac_pr_no: issue.kac_pr_no ?? '',
    lm_pr_no: issue.lm_pr_no ?? '',
    title: issue.title,
    content: issue.content ?? '',
    status: issue.status,
    acc_type: issue.acc_type ?? '',
    keyword: issue.keyword ?? '',
    version: issue.version ?? '',
    mod_version: issue.mod_version ?? '',
    reg_date: issue.reg_date,
    action_date: issue.action_date ?? '',
    acc_pr: issue.acc_pr ?? '',
  };
}

export function IssueForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormData>(() => toForm(initial));
  const [initialHtml] = useState(() => toEditorHtml(initial?.content ?? ''));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendingImages, setPendingImages] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목은 필수입니다.'); return; }
    if (!form.reg_date) { setError('등록일은 필수입니다.'); return; }
    if (pendingImages > 0) { setError('이미지를 넣는 중입니다. 잠시 후 다시 저장하세요.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { acc_type: _accType, acc_pr: _accPr, ...rest } = form;
      const payload: IssueCreate = {
        ...rest,
        kac_pr_no: form.kac_pr_no || undefined,
        lm_pr_no: form.lm_pr_no || undefined,
        // 수정 중 본문을 모두 지우면 빈 값을 보내야 서버에서 지워진다 (안 보내면 기존 본문 유지)
        content: isEmptyHtml(form.content ?? '') ? (initial ? '' : undefined) : form.content,
        keyword: form.keyword || undefined,
        version: form.version || undefined,
        mod_version: form.mod_version || undefined,
        action_date: form.action_date || undefined,
      };
      await onSubmit(payload);
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // 컴포넌트가 아닌 함수로 그린다 (렌더마다 새 컴포넌트가 되면 입력 중 포커스가 빠짐)
  function renderField(label: string, field: keyof FormData, type = 'text') {
    return (
      <div key={field} className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-500 dark:text-slate-400">{label}</label>
        <input
          type={type}
          value={form[field] as string}
          onChange={e => set(field, e.target.value)}
          className="w-full text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-auto p-4 gap-3">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-3 flex-1">
        <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mb-1">
          {initial ? '이슈 수정' : '이슈 등록'}
        </div>

        {error && (
          <div className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {renderField('KAC PR번호', 'kac_pr_no')}
          {renderField('제작사(LM) PR번호', 'lm_pr_no')}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">상태</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full max-w-[180px] text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {renderField('키워드', 'keyword')}
          <div />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 dark:text-slate-400">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            required
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {renderField('등록일 *', 'reg_date', 'date')}
          {renderField('조치일', 'action_date', 'date')}
          {renderField('발생 버전', 'version')}
          {renderField('수정 버전', 'mod_version')}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 dark:text-slate-400">내용 <span className="text-slate-400">— 표·이미지는 붙여넣거나 도구에서 넣을 수 있습니다</span></label>
          <CardToolbar activeCardIdx={0} editor={editor} />
          <CardEditor
            initialContent={initialHtml}
            onUpdate={html => set('content', html)}
            onFocus={() => {}}
            onEditor={setEditor}
            onPendingImageCountChange={setPendingImages}
          />
        </div>

        <div className="flex gap-2 mt-auto pt-2 shrink-0">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-500 disabled:opacity-50 transition"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            취소
          </button>
        </div>
      </div>
    </form>
  );
}
