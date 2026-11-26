// SkyNet 설정 확장 — 게시판 키워드, 자동 수집, 인증 설정 훅
import { useState, useEffect } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import { useUIStore } from '../../store/uiStore';

export function useSkynetSettingsExt() {
  const { addToast } = useUIStore();

  // 게시판 키워드
  const [boardKeywords, setBoardKeywords]     = useState<{ id: number; keyword: string }[]>([]);
  const [newBoardKw, setNewBoardKw]           = useState('');

  // 자동 수집
  const [crawlTimes, setCrawlTimes]   = useState<string[]>(['', '', '', '', '']);
  const [crawlSpeed, setCrawlSpeed]   = useState('balanced');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // 인증
  const [jsessionid, setJsessionid]   = useState('');
  const [authMsg, setAuthMsg]         = useState('');
  const [autoDetecting, setAutoDetecting] = useState(false);

  useEffect(() => {
    skynetApi.boardKeywords().then(setBoardKeywords).catch(() => {});
    skynetApi.crawlSettings().then(d => {
      const times = [...d.auto_crawl_times];
      while (times.length < 5) times.push('');
      setCrawlTimes(times);
      setCrawlSpeed(d.crawl_speed);
    }).catch(() => {});
  }, []);

  const addBoardKw = async () => {
    const kw = newBoardKw.trim();
    if (!kw) return;
    try {
      const created = await skynetApi.addBoardKeyword(kw);
      setBoardKeywords(prev => [...prev, created]);
      setNewBoardKw('');
    } catch { addToast('게시판 키워드 추가 실패', 'error'); }
  };

  const removeBoardKw = async (id: number) => {
    setBoardKeywords(prev => prev.filter(k => k.id !== id));
    try { await skynetApi.deleteBoardKeyword(id); }
    catch { skynetApi.boardKeywords().then(setBoardKeywords).catch(() => {}); addToast('삭제 실패', 'error'); }
  };

  const saveCrawlSettings = async () => {
    try {
      await skynetApi.saveCrawlSettings({ auto_crawl_times: crawlTimes.filter(Boolean), crawl_speed: crawlSpeed });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch { addToast('설정 저장 실패', 'error'); }
  };

  const saveJsessionid = async () => {
    if (!jsessionid.trim()) return;
    try {
      const result = await skynetApi.setSession(jsessionid.trim());
      setAuthMsg(result?.message || '인증 성공');
      setJsessionid('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '저장 실패 — SkyNet 서비스 연결을 확인하세요.';
      setAuthMsg(detail);
    }
    setTimeout(() => setAuthMsg(''), 6000);
  };

  const autoDetect = async () => {
    setAutoDetecting(true);
    setAuthMsg('브라우저 쿠키 감지 중...');
    try {
      const result = await skynetApi.autoDetectSession();
      setAuthMsg(result?.message || '자동 감지 성공');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '자동 감지 실패 — SkyNet 서비스 연결을 확인하세요.';
      setAuthMsg(detail);
    } finally {
      setAutoDetecting(false);
      setTimeout(() => setAuthMsg(''), 8000);
    }
  };

  return {
    boardKeywords, newBoardKw, setNewBoardKw, addBoardKw, removeBoardKw,
    crawlTimes, setCrawlTimes, crawlSpeed, setCrawlSpeed, settingsSaved, saveCrawlSettings,
    jsessionid, setJsessionid, authMsg, saveJsessionid,
    autoDetecting, autoDetect,
  };
}
