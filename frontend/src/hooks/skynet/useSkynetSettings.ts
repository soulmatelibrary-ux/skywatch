// SkyNet 설정 — 부서 관리 및 문서 키워드 CRUD 훅
import { useState, useEffect } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import { useUIStore } from '../../store/uiStore';

type Dept = { id: number; name: string; dept_id: string; doc_type: string; enabled: number };
type Keyword = { id: number; keyword: string; project_id: number | null };

export function useSkynetSettings() {
  const { addToast } = useUIStore();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [keywords, setKeywords]       = useState<Keyword[]>([]);
  const [loading, setLoading]         = useState(false);
  const [newKeyword, setNewKeyword]   = useState('');
  const [newDept, setNewDept]         = useState({ name: '', dept_id: '', doc_type: '기록문서등록' });
  const [saving, setSaving]           = useState(false);
  const [actionMsg, setActionMsg]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [depts, kws] = await Promise.all([skynetApi.allDepartments(), skynetApi.keywords()]);
      setDepartments(depts);
      setKeywords(kws);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleDept = async (id: number, enabled: boolean) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, enabled: enabled ? 1 : 0 } : d));
    try { await skynetApi.toggleDepartment(id, enabled); }
    catch { setDepartments(prev => prev.map(d => d.id === id ? { ...d, enabled: enabled ? 0 : 1 } : d)); addToast('부서 설정 저장 실패', 'error'); }
  };

  const addDept = async () => {
    if (!newDept.name.trim() || !newDept.dept_id.trim()) return;
    setSaving(true);
    try {
      const created = await skynetApi.addDepartment(newDept);
      setDepartments(prev => [...prev, created]);
      setNewDept({ name: '', dept_id: '', doc_type: '기록문서등록' });
      addToast(`부서 "${newDept.name}" 추가됨`, 'success');
    } catch { addToast('부서 추가 실패', 'error'); }
    finally { setSaving(false); }
  };

  const deleteDept = async (id: number, name: string) => {
    if (!confirm(`부서 "${name}"를 삭제하시겠습니까?`)) return;
    setDepartments(prev => prev.filter(d => d.id !== id));
    try { await skynetApi.deleteDepartment(id); }
    catch { load(); addToast('부서 삭제 실패', 'error'); }
  };

  const addKeyword = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    setSaving(true);
    try {
      const created = await skynetApi.addKeyword(kw);
      setKeywords(prev => [...prev, created].sort((a, b) => a.keyword.localeCompare(b.keyword)));
      setNewKeyword('');
      addToast(`키워드 "${kw}" 추가됨`, 'success');
    } catch (err: any) { addToast(err?.response?.data?.detail ?? '키워드 추가 실패', 'error'); }
    finally { setSaving(false); }
  };

  const removeKeyword = async (id: number, kw: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
    try { await skynetApi.deleteKeyword(id); }
    catch { load(); addToast(`"${kw}" 삭제 실패`, 'error'); }
  };

  const rematch = async () => {
    setActionMsg('DB 재수집 중...');
    try {
      const res = await skynetApi.keywordsRematch();
      setActionMsg(res.ok ? `완료 — 전체 ${res.total}건 중 ${res.matched}건 매칭` : '실패');
    } catch { setActionMsg('SkyNet 서비스에 연결할 수 없습니다.'); }
    setTimeout(() => setActionMsg(''), 5000);
  };

  const recrawl = async () => {
    setActionMsg('크롤링 재수집 요청 중...');
    try {
      const res = await skynetApi.keywordsRecrawl();
      setActionMsg(res.ok ? '크롤링이 백그라운드에서 시작됐습니다.' : '실패');
    } catch { setActionMsg('SkyNet 서비스에 연결할 수 없습니다.'); }
    setTimeout(() => setActionMsg(''), 5000);
  };

  return { departments, keywords, loading, saving, newKeyword, setNewKeyword, newDept, setNewDept, actionMsg, toggleDept, addDept, deleteDept, addKeyword, removeKeyword, rematch, recrawl };
}
