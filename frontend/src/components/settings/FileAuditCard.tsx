import { useState } from 'react';
import { apiClient } from '../../services/api/client';
import type { ApiResponse } from '../../types';

interface OrphanFile  { file_name: string; size_bytes: number; }
interface MissingFile { file_name: string; original_name: string; owner_type: string; owner_id: number; }
interface AuditResult {
  matched: number; total_folder: number; total_db: number;
  orphan_files: OrphanFile[]; missing_files: MissingFile[];
}

function fmt(b: number) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024)         return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

export function FileAuditCard() {
  const [loading, setLoading]           = useState(false);
  const [delLoading, setDelLoading]     = useState(false);
  const [result, setResult]             = useState<AuditResult | null>(null);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [error, setError]               = useState<string | null>(null);

  async function runAudit() {
    setLoading(true); setResult(null); setError(null); setSelected(new Set());
    try {
      const res = await apiClient.get<ApiResponse<AuditResult>>('/admin/file-audit');
      setResult(res.data.data!);
    } catch (e) { setError(e instanceof Error ? e.message : '오류 발생'); }
    finally { setLoading(false); }
  }

  async function deleteOrphans() {
    if (!selected.size) return;
    if (!confirm(`선택한 ${selected.size}개 파일을 삭제합니다. 복구할 수 없습니다.`)) return;
    setDelLoading(true);
    try {
      await apiClient.delete('/admin/file-audit/orphans', { data: { file_names: [...selected] } });
      await runAudit();
    } catch (e) { setError(e instanceof Error ? e.message : '삭제 오류'); }
    finally { setDelLoading(false); }
  }

  function toggle(name: string) {
    setSelected(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  }

  function toggleAll() {
    if (!result) return;
    setSelected(selected.size === result.orphan_files.length
      ? new Set()
      : new Set(result.orphan_files.map(f => f.file_name)));
  }

  const allSelected = !!result && selected.size === result.orphan_files.length && result.orphan_files.length > 0;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/40 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">파일 정합성 검사</h3>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
            uploads/ 폴더와 DB 레코드를 비교하여 고아 파일·누락 파일을 탐지합니다.
          </p>
        </div>
        <button onClick={runAudit} disabled={loading || delLoading}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white text-[13px] rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {loading ? '검사 중...' : '검사 실행'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[12px] text-red-700 dark:text-red-400">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border rounded-lg p-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
              <p className="text-[20px] font-bold text-emerald-700 dark:text-emerald-400">{result.matched}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500">정상</p>
            </div>
            <div className={`border rounded-lg p-3 ${result.orphan_files.length
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <p className={`text-[20px] font-bold ${result.orphan_files.length ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>{result.orphan_files.length}</p>
              <p className={`text-[11px] ${result.orphan_files.length ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}>고아 파일</p>
            </div>
            <div className={`border rounded-lg p-3 ${result.missing_files.length
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <p className={`text-[20px] font-bold ${result.missing_files.length ? 'text-red-700 dark:text-red-400' : 'text-slate-400'}`}>{result.missing_files.length}</p>
              <p className={`text-[11px] ${result.missing_files.length ? 'text-red-600 dark:text-red-500' : 'text-slate-400'}`}>누락 파일</p>
            </div>
          </div>

          {result.orphan_files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                  고아 파일 (DB 레코드 없음) — {result.orphan_files.length}개
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={toggleAll} className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline">
                    {allSelected ? '전체 해제' : '전체 선택'}
                  </button>
                  {selected.size > 0 && (
                    <button onClick={deleteOrphans} disabled={delLoading}
                      className="px-3 py-1 bg-red-600 text-white text-[11px] rounded hover:bg-red-700 disabled:opacity-50 transition">
                      {delLoading ? '삭제 중...' : `선택 삭제 (${selected.size})`}
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                {result.orphan_files.map(f => (
                  <label key={f.file_name} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" checked={selected.has(f.file_name)} onChange={() => toggle(f.file_name)}
                      className="w-3.5 h-3.5 accent-red-600 shrink-0" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">{f.file_name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{fmt(f.size_bytes)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {result.missing_files.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">
                누락 파일 (uploads 폴더 없음) — {result.missing_files.length}개
              </p>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                {result.missing_files.map(f => (
                  <div key={f.file_name} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">{f.original_name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{f.owner_type}#{f.owner_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result.orphan_files.length && !result.missing_files.length && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-[12px] text-emerald-700 dark:text-emerald-400">
              파일 불일치 없음. 모든 파일이 정상입니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
