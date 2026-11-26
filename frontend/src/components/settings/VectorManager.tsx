// 벡터 검색 관리 컴포넌트
import { useEffect, useState } from 'react';
import {
  vectorApi,
  type VectorStatus,
  type ReindexJob,
  type CardVectorStatus,
  type SimpleVectorStatus,
} from '../../services/api/vectorApi';
import { useUIStore } from '../../store/uiStore';

interface SectionStatus {
  vectorized_count: number;
  total_count: number;
  coverage: number;
}

function StatusBar({ st, color }: { st: SectionStatus | null; color: string }) {
  if (!st) return null;
  const missing = st.total_count - st.vectorized_count;
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">인덱싱 진행률</span>
        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {st.vectorized_count.toLocaleString()} / {st.total_count.toLocaleString()}
          {missing > 0 && (
            <span className="ml-2 text-amber-500 dark:text-amber-400 font-normal text-[12px]">
              (미완료 {missing.toLocaleString()}건)
            </span>
          )}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${st.coverage}%` }} />
      </div>
      <div className="text-right">
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{st.coverage.toFixed(1)}% 완료</span>
      </div>
    </div>
  );
}

export function VectorManager() {
  const [status, setStatus] = useState<VectorStatus | null>(null);
  const [cardStatus, setCardStatus] = useState<CardVectorStatus | null>(null);
  const [inquiryStatus, setInquiryStatus] = useState<SimpleVectorStatus | null>(null);
  const [issueStatus, setIssueStatus] = useState<SimpleVectorStatus | null>(null);
  const [techDocStatus, setTechDocStatus] = useState<SimpleVectorStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ReindexJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isCardBackfilling, setIsCardBackfilling] = useState(false);
  const [isInquiryBackfilling, setIsInquiryBackfilling] = useState(false);
  const [isIssueBackfilling, setIsIssueBackfilling] = useState(false);
  const [isTechDocBackfilling, setIsTechDocBackfilling] = useState(false);
  const addToast = useUIStore(s => s.addToast);

  useEffect(() => { loadStatus(); }, []);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(() => loadJobStatus(jobId), 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [logRes, cardRes, inquiryRes, issueRes, techDocRes] = await Promise.all([
        vectorApi.getStatus(),
        vectorApi.getCardStatus(),
        vectorApi.getInquiryStatus(),
        vectorApi.getIssueStatus(),
        vectorApi.getTechDocStatus(),
      ]);
      setStatus(logRes.data?.data || null);
      setCardStatus(cardRes.data?.data || null);
      setInquiryStatus(inquiryRes.data?.data || null);
      setIssueStatus(issueRes.data?.data || null);
      setTechDocStatus(techDocRes.data?.data || null);
    } catch {
      addToast('벡터 상태 조회 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadJobStatus = async (jid: string) => {
    try {
      const res = await vectorApi.getJobStatus(jid);
      setJobStatus(res.data?.data || null);
      if (res.data?.data?.status === 'completed' || res.data?.data?.status === 'failed') {
        setJobId(null);
        loadStatus();
      }
    } catch { /* 조용히 처리 */ }
  };

  const handleStartBackfill = async () => {
    try {
      setIsBackfilling(true);
      const res = await vectorApi.startBackfill();
      const jid = res.data?.data?.job_id;
      if (jid) { setJobId(jid); addToast('벡터화 작업이 시작되었습니다', 'success'); }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '벡터화 시작 실패', 'error');
    } finally { setIsBackfilling(false); }
  };

  const handleStartCardBackfill = async () => {
    try {
      setIsCardBackfilling(true);
      await vectorApi.startCardBackfill();
      addToast('카드 벡터화가 시작되었습니다', 'success');
      setTimeout(loadStatus, 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '카드 벡터화 시작 실패', 'error');
    } finally { setIsCardBackfilling(false); }
  };

  const handleStartInquiryBackfill = async () => {
    try {
      setIsInquiryBackfilling(true);
      await vectorApi.startInquiryBackfill();
      addToast('문의사항 벡터화가 시작되었습니다', 'success');
      setTimeout(loadStatus, 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '문의사항 벡터화 시작 실패', 'error');
    } finally { setIsInquiryBackfilling(false); }
  };

  const handleStartIssueBackfill = async () => {
    try {
      setIsIssueBackfilling(true);
      await vectorApi.startIssueBackfill();
      addToast('PR관리 벡터화가 시작되었습니다', 'success');
      setTimeout(loadStatus, 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'PR관리 벡터화 시작 실패', 'error');
    } finally { setIsIssueBackfilling(false); }
  };

  const handleStartTechDocBackfill = async () => {
    try {
      setIsTechDocBackfilling(true);
      await vectorApi.startTechDocBackfill();
      addToast('기록문서 벡터화가 시작되었습니다', 'success');
      setTimeout(loadStatus, 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '기록문서 벡터화 시작 실패', 'error');
    } finally { setIsTechDocBackfilling(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-slate-500">로딩 중...</div></div>;
  }

  const coverage = status?.coverage || 0;
  const isRunning = jobStatus?.status === 'running' || jobStatus?.status === 'pending';

  return (
    <div className="max-w-3xl space-y-6">

      {/* 일지 */}
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">일지 벡터 인덱싱</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">
          현재 모델: <span className="font-medium">{status?.current_model ?? '-'}</span>
        </p>
        <StatusBar st={status} color="bg-blue-500" />
        {isRunning && jobStatus && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-blue-900 dark:text-blue-300">벡터화 진행 중...</span>
              <span className="text-[13px] font-semibold text-blue-900 dark:text-blue-300">{jobStatus.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${jobStatus.progress}%` }} />
            </div>
            <div className="text-[12px] text-blue-700 dark:text-blue-400 mt-2">
              {jobStatus.processed.toLocaleString()} / {jobStatus.total.toLocaleString()}건 처리 완료
            </div>
          </div>
        )}
        {jobStatus?.status === 'failed' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <div className="text-[13px] font-medium text-red-900 dark:text-red-400">벡터화 실패</div>
            {jobStatus.error && <div className="text-[12px] text-red-700 dark:text-red-400 mt-1">{jobStatus.error}</div>}
          </div>
        )}
        <button
          onClick={handleStartBackfill}
          disabled={isBackfilling || isRunning || coverage === 100}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isBackfilling ? '준비 중...' : isRunning ? '진행 중...' : coverage === 100 ? '완료됨' : '벡터화 시작'}
        </button>
      </div>

      {/* 카드 */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">카드 벡터 인덱싱</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">업무일지 카드 단위 임베딩 (KURE-v1)</p>
        <StatusBar st={cardStatus} color="bg-emerald-500" />
        <button
          onClick={handleStartCardBackfill}
          disabled={isCardBackfilling || (cardStatus?.coverage ?? 0) === 100}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCardBackfilling ? '준비 중...' : (cardStatus?.coverage ?? 0) === 100 ? '완료됨' : '카드 벡터화 시작'}
        </button>
      </div>

      {/* 문의사항 */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">문의사항 벡터 인덱싱</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">문의사항 자연어 검색용 임베딩 (KURE-v1)</p>
        <StatusBar st={inquiryStatus} color="bg-violet-500" />
        <button
          onClick={handleStartInquiryBackfill}
          disabled={isInquiryBackfilling || (inquiryStatus?.coverage ?? 0) === 100}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-[13px] font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isInquiryBackfilling ? '시작 중...' : (inquiryStatus?.coverage ?? 0) === 100 ? '완료됨' : '문의사항 벡터화 시작'}
        </button>
      </div>

      {/* PR관리 */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">PR관리 벡터 인덱싱</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">PR관리(이슈) 자연어 검색용 임베딩 (KURE-v1)</p>
        <StatusBar st={issueStatus} color="bg-orange-500" />
        <button
          onClick={handleStartIssueBackfill}
          disabled={isIssueBackfilling || (issueStatus?.coverage ?? 0) === 100}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-[13px] font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isIssueBackfilling ? '시작 중...' : (issueStatus?.coverage ?? 0) === 100 ? '완료됨' : 'PR관리 벡터화 시작'}
        </button>
      </div>

      {/* 기록문서 */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">기록문서 벡터 인덱싱</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">기록문서 자연어 검색용 임베딩 (KURE-v1)</p>
        <StatusBar st={techDocStatus} color="bg-teal-500" />
        <button
          onClick={handleStartTechDocBackfill}
          disabled={isTechDocBackfilling || (techDocStatus?.coverage ?? 0) === 100}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-[13px] font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTechDocBackfilling ? '시작 중...' : (techDocStatus?.coverage ?? 0) === 100 ? '완료됨' : '기록문서 벡터화 시작'}
        </button>
      </div>

      {/* 안내 */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <ul className="text-[12px] text-slate-500 dark:text-slate-400 space-y-1">
          <li>• 신규/수정 항목은 저장 시 자동으로 벡터화됩니다</li>
          <li>• 미완료 항목이 있는 경우 해당 버튼으로 일괄 처리하세요</li>
          <li>• 벡터화는 백그라운드에서 실행되며, 완료 후 진행률이 갱신됩니다</li>
        </ul>
      </div>

    </div>
  );
}
