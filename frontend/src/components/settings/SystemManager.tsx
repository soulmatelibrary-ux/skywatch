import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/client';
import type { ApiResponse } from '../../types';
import { FileAuditCard } from './FileAuditCard';

interface SyncResult { updated: number; skipped: number; missing: number; total: number; }
interface VectorModel { id: string; name: string; speed: string; accuracy: string; size: string; }
interface VectorConfig { current_model: string; latest_job: ReindexJob | null; }
interface ReindexJob {
  job_id: string; model: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; processed: number; total: number;
  error: string | null; started_at: string | null; completed_at: string | null;
}

export function SystemManager() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<VectorModel[]>([]);
  const [config, setConfig] = useState<VectorConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [reindexLoading, setReindexLoading] = useState(false);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [vectorUnsupported, setVectorUnsupported] = useState(false);

  useEffect(() => { loadVectorConfig(); }, []);

  useEffect(() => {
    if (config?.latest_job?.status === 'running' && config.latest_job.job_id) {
      const interval = setInterval(() => pollReindexStatus(config.latest_job!.job_id), 2000);
      return () => clearInterval(interval);
    }
  }, [config?.latest_job?.status, config?.latest_job?.job_id]);

  async function loadVectorConfig() {
    try {
      setConfigLoading(true); setVectorUnsupported(false);
      const [modelsRes, configRes] = await Promise.all([
        apiClient.get<ApiResponse<VectorModel[]>>('/admin/vector-models'),
        apiClient.get<ApiResponse<VectorConfig>>('/admin/vector-config'),
      ]);
      setModels(modelsRes.data.data || []); setConfig(configRes.data.data || null); setReindexError(null);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) { setVectorUnsupported(true); setConfig(null); setModels([]); setReindexError(null); }
      else setReindexError(e instanceof Error ? e.message : '설정 로드 실패');
    } finally { setConfigLoading(false); }
  }

  async function handleStartReindex(modelId: string) {
    if (!confirm(`${modelId}로 재벡터화하시겠습니까?\n\n전체 일지를 다시 벡터화하므로 시간이 걸릴 수 있습니다.`)) return;
    try {
      setReindexLoading(true); setReindexError(null);
      await apiClient.post<ApiResponse<ReindexJob>>('/admin/vector-reindex', { model_name: modelId });
      setTimeout(() => loadVectorConfig(), 500);
    } catch (e: unknown) { setReindexError(e instanceof Error ? e.message : '재벡터화 시작 실패'); }
    finally { setReindexLoading(false); }
  }

  async function pollReindexStatus(jobId: string) {
    try {
      const res = await apiClient.get<ApiResponse<ReindexJob>>(`/admin/vector-reindex/${jobId}`);
      if (res.data.data) setConfig(prev => prev ? { ...prev, latest_job: res.data.data! } : null);
    } catch (e) { console.warn(`[WARN] Failed to poll reindex status: ${e}`); }
  }

  async function handleSyncFileSizes() {
    if (!confirm('uploads/ 폴더를 스캔하여 첨부파일 크기를 갱신합니다.\n계속하시겠습니까?')) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await apiClient.post<ApiResponse<SyncResult>>('/admin/sync-file-sizes');
      setResult(res.data.data!);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '오류가 발생했습니다'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 mb-1">시스템 관리</h2>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">관리자 전용 일회성 작업입니다.</p>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/40 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">벡터 재설정</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">전체 일지를 다시 벡터화합니다. 데이터 양에 따라 시간이 소요될 수 있습니다.</p>
            {!configLoading && config && (
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2">
                현재 모델: <span className="font-semibold text-slate-700 dark:text-slate-200">{config.current_model}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={loadVectorConfig} disabled={configLoading || reindexLoading || vectorUnsupported}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition">
              {configLoading ? '로딩 중...' : '새로고침'}
            </button>
            <button onClick={() => config?.current_model && handleStartReindex(config.current_model)}
              disabled={reindexLoading || configLoading || vectorUnsupported || !config?.current_model || config?.latest_job?.status === 'running'}
              className="px-4 py-2 bg-blue-600 text-white text-[13px] rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {reindexLoading ? '시작 중...' : '재설정 실행'}
            </button>
          </div>
        </div>

        {vectorUnsupported && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-[12px] text-amber-700 dark:text-amber-400">
            현재 백엔드에서 벡터 재설정 API를 지원하지 않습니다. 서버 버전을 업데이트한 후 다시 시도하세요.
          </div>
        )}

        {!configLoading && config && (
          <>
            <h4 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 pt-4">벡터 검색 모델 설정</h4>
            <div className="grid grid-cols-1 gap-3 mb-4">
              {models.filter(m => m.id === 'kure-v1').map(model => (
                <div key={model.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 mb-1">{model.name}</p>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mb-3">
                    <p>속도: {model.speed}</p><p>정확도: {model.accuracy}</p><p>크기: {model.size}</p>
                  </div>
                  <button onClick={() => handleStartReindex(model.id)}
                    disabled={reindexLoading || config.latest_job?.status === 'running'}
                    className={`w-full py-2 text-[12px] rounded transition ${
                      model.id === config.current_model
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}>
                    {model.id === config.current_model ? '✓ 사용 중' : '전환'}
                  </button>
                </div>
              ))}
            </div>

            {config.latest_job && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">최신 작업</p>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">모델: {config.latest_job.model}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      config.latest_job.status === 'running' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                      config.latest_job.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                      config.latest_job.status === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {config.latest_job.status === 'running' ? '진행 중' : config.latest_job.status === 'completed' ? '완료' : config.latest_job.status === 'failed' ? '실패' : '대기 중'}
                    </span>
                  </div>
                  {config.latest_job.status === 'running' && (
                    <>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${config.latest_job.progress}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{config.latest_job.processed} / {config.latest_job.total} ({config.latest_job.progress}%)</p>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">⏳ 진행 중입니다...</p>
                    </>
                  )}
                  {config.latest_job.status === 'completed' && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ 완료! {config.latest_job.total}개 일지 재벡터화됨</p>}
                  {config.latest_job.status === 'failed' && <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">❌ 실패: {config.latest_job.error}</p>}
                </div>
              </div>
            )}
            {reindexError && <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[12px] text-red-700 dark:text-red-400">{reindexError}</div>}
          </>
        )}

        {!configLoading && !config && !vectorUnsupported && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-[12px] text-amber-700 dark:text-amber-400">벡터 설정을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.</div>
        )}
        {configLoading && <div className="text-[12px] text-slate-500 dark:text-slate-400">벡터 설정 불러오는 중...</div>}
        {reindexError && !config && !vectorUnsupported && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[12px] text-red-700 dark:text-red-400">{reindexError}</div>}
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">첨부파일 크기 갱신</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              <code className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1 rounded">uploads/</code> 폴더를 스캔하여 DB에 0으로 저장된 파일 크기를 실제 크기로 갱신합니다.
              <br />파일을 uploads 폴더에 복사한 후 한 번만 실행하세요.
            </p>
          </div>
          <button onClick={handleSyncFileSizes} disabled={loading}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-[13px] rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? '처리 중...' : '실행'}
          </button>
        </div>
        {result && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-[13px] text-emerald-800 dark:text-emerald-300">
            <p className="font-medium mb-1">완료</p>
            <ul className="space-y-0.5 text-[12px]">
              <li>대상: {result.total}건</li>
              <li>갱신: <span className="font-semibold">{result.updated}건</span></li>
              <li>파일 없음: {result.missing}건</li>
              <li>크기 0 유지: {result.skipped}건</li>
            </ul>
          </div>
        )}
        {error && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[13px] text-red-700 dark:text-red-400">{error}</div>}
      </div>

      <FileAuditCard />
    </div>
  );
}
