import { useEffect, useRef, useState } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import { useUIStore } from '../../store/uiStore';
import type { SkynetDepartment, CrawlStatusResponse } from '../../types/skynet';

const FIXED_MANUAL_DEPARTMENTS = ['인천항공교통시설단', '항로시설본부'] as const;
const FIXED_MANUAL_SET = new Set<string>(FIXED_MANUAL_DEPARTMENTS);
type ManualDepartmentRow = SkynetDepartment & { enabled: number };

function buildFixedRows() {
  return FIXED_MANUAL_DEPARTMENTS.map((name, idx) => ({ id: -1000 - idx, name }));
}

export function useSkynetManual() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [warmupCount, setWarmupCount] = useState(15);
  const [intervalSeconds, setIntervalSeconds] = useState(20);
  const [departments, setDepartments] = useState<SkynetDepartment[]>([]);
  const [selectedDeptNames, setSelectedDeptNames] = useState<string[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [count, setCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function mergeManualDepartments(rows: ManualDepartmentRow[]) {
    const fixedRows = buildFixedRows();
    const enabledRows = rows
      .filter(d => d.enabled === 1 && !FIXED_MANUAL_SET.has(d.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...fixedRows, ...enabledRows];
  }

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPoll(), []);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      setLoadingDepts(true);
      try {
        const rows = await skynetApi.allDepartments();
        if (cancelled) return;

        const nextDepartments = mergeManualDepartments(rows);
        setDepartments(nextDepartments);
        setSelectedDeptNames(prev => {
          const preserved = prev.filter(name => nextDepartments.some(d => d.name === name));
          const next = [...FIXED_MANUAL_DEPARTMENTS, ...preserved];
          return Array.from(new Set(next));
        });
      } catch {
        if (!cancelled) {
          const fallback = buildFixedRows();
          setDepartments(fallback);
          setSelectedDeptNames(fallback.map(d => d.name));
        }
      } finally {
        if (!cancelled) setLoadingDepts(false);
      }
    };

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDept = (name: string) => {
    if (FIXED_MANUAL_SET.has(name)) return;
    setSelectedDeptNames(prev => (prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]));
  };

  const selectAllDepts = () => {
    setSelectedDeptNames(departments.map(d => d.name));
  };

  const clearDepts = () => {
    setSelectedDeptNames([...FIXED_MANUAL_DEPARTMENTS]);
  };

  const startBatch = async () => {
    if (!startDate || !endDate || selectedDeptNames.length === 0) return;
    setRunning(true);
    setPercent(0);
    setCount(0);
    setStatusMsg('배치 수집 시작 중...');

    try {
      const res = await skynetApi.manualBatchCrawl({
        start_date: startDate,
        end_date: endDate,
        warmup_count: warmupCount,
        interval_seconds: intervalSeconds,
        dept_names: selectedDeptNames,
      });

      if (res.auth_required) {
        setStatusMsg('인증이 필요합니다. 인증 설정 후 JSESSIONID를 등록하세요.');
        setRunning(false);
        return;
      }

      if (!res.ok) {
        setStatusMsg(res.message || '수집 시작 실패');
        setRunning(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const s = await skynetApi.crawlStatus() as CrawlStatusResponse;
          setPercent(s.percent ?? 0);
          setStatusMsg(s.message ?? '');
          setCount(s.count ?? 0);
          if (s.state === 'done' || s.state === 'idle') {
            stopPoll();
            setRunning(false);
            const msg = `배치 수집 완료: ${s.count ?? 0}건 저장되었습니다.`;
            useUIStore().addToast(msg, 'success');
          }
        } catch (error) {
          stopPoll();
          setRunning(false);
          setPercent(0);
          setStatusMsg('');
          setCount(0);
          const errorMsg = '크롤링 상태 조회 실패. 다시 시도하세요.';
          useUIStore().addToast(errorMsg, 'error');
        }
      }, 2000);
    } catch (error) {
      const errorMsg = 'SkyNet 서비스에 연결할 수 없습니다.';
      setStatusMsg(errorMsg);
      setRunning(false);
      setPercent(0);
      setCount(0);
      useUIStore().addToast(errorMsg, 'error');
    }
  };

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    warmupCount,
    setWarmupCount,
    intervalSeconds,
    setIntervalSeconds,
    departments,
    selectedDeptNames,
    loadingDepts,
    toggleDept,
    selectAllDepts,
    clearDepts,
    running,
    percent,
    statusMsg,
    count,
    startBatch,
  };
}
