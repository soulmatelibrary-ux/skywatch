import { useState, useCallback } from 'react';
import { techDocsApi } from '../services/api/techDocsApi';
import type { TechDocDetail, CreateTechDocInput, UpdateTechDocInput } from '../types/techDoc';

type Mode = 'view' | 'create' | 'edit';

const emptyForm = (): CreateTechDocInput => ({
  title: '',
  record_date: new Date().toISOString().slice(0, 10),
  project_code: '',
  category_code: '',
  content: '',
  summary: '',
  doc_type: '',
  adapt_version: '',
  service_date: new Date().toISOString().slice(0, 10),
  reference: '',
});

export function useTechDocDetail(onRefresh: () => void) {
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [docDetail, setDocDetail] = useState<TechDocDetail | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [formData, setFormData] = useState<CreateTechDocInput>(emptyForm());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectDoc = useCallback(async (id: number) => {
    setSelectedDocId(id);
    setMode('view');
    setIsLoading(true);
    setError(null);
    try {
      const res = await techDocsApi.fetchTechDocDetail(id);
      setDocDetail(res.data.data);
    } catch {
      setError('문서를 불러오지 못했습니다.');
      setDocDetail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCreate = useCallback((projectCode?: string | null, categoryCode?: string | null) => {
    setMode('create');
    setFormData({
      ...emptyForm(),
      project_code: projectCode ?? '',
      category_code: categoryCode ?? '',
    });
    setDocDetail(null);
    setSelectedDocId(null);
  }, []);

  const startEdit = useCallback(() => {
    if (!docDetail) return;
    setMode('edit');
    setFormData({
      title: docDetail.title ?? '',
      record_date: docDetail.record_date ?? '',
      project_code: docDetail.project_code ?? '',
      category_code: docDetail.category_code ?? '',
      content: docDetail.content ?? '',
      summary: docDetail.summary ?? '',
      doc_type: docDetail.doc_type ?? '',
      adapt_version: docDetail.adapt_version ?? '',
      service_date: docDetail.service_date ?? '',
      reference: docDetail.reference ?? '',
    });
  }, [docDetail]);

  const cancelEdit = useCallback(() => {
    setMode('view');
    if (!selectedDocId) setDocDetail(null);
  }, [selectedDocId]);

  const save = useCallback(async (pendingFiles: File[] = []): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'create') {
        // 1단계: 문서 생성 (실패 시 catch로 이동 — 중복 생성 없음)
        const res = await techDocsApi.createTechDoc(formData);
        const newDoc = res.data.data;
        // 2단계: 문서 생성 성공 확정 → 즉시 view 전환
        setDocDetail(newDoc);
        setSelectedDocId(newDoc.id);
        setMode('view');
        onRefresh();
        // 3단계: 파일 업로드 (실패해도 문서는 저장됨 — 별도 에러 처리)
        if (pendingFiles.length) {
          let failCount = 0;
          for (const file of pendingFiles) {
            try {
              await techDocsApi.uploadAttachment(newDoc.id, file);
            } catch {
              failCount++;
            }
          }
          const updated = await techDocsApi.fetchTechDocDetail(newDoc.id);
          setDocDetail(updated.data.data);
          if (failCount > 0) setError(`파일 ${failCount}개 업로드에 실패했습니다.`);
        }
        return true;
      } else if (mode === 'edit' && selectedDocId) {
        const payload: UpdateTechDocInput = {
          ...formData,
          record_date: formData.record_date || undefined,
          service_date: formData.service_date || undefined,
        };
        const res = await techDocsApi.updateTechDoc(selectedDocId, payload);
        setDocDetail(res.data.data);
        setMode('view');
        onRefresh();
        return true;
      }
      return false;
    } catch {
      setError('저장에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [mode, formData, selectedDocId, onRefresh]);

  const deleteDoc = useCallback(async (): Promise<boolean> => {
    if (!selectedDocId) return false;
    setIsLoading(true);
    try {
      await techDocsApi.deleteTechDoc(selectedDocId);
      setDocDetail(null);
      setSelectedDocId(null);
      setMode('view');
      onRefresh();
      return true;
    } catch {
      setError('삭제에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocId, onRefresh]);

  const uploadAttachment = useCallback(async (file: File): Promise<boolean> => {
    if (!selectedDocId) return false;
    try {
      await techDocsApi.uploadAttachment(selectedDocId, file);
      const res = await techDocsApi.fetchTechDocDetail(selectedDocId);
      setDocDetail(res.data.data);
      return true;
    } catch {
      setError('파일 업로드에 실패했습니다.');
      return false;
    }
  }, [selectedDocId]);

  const deleteAttachment = useCallback(async (attId: number): Promise<boolean> => {
    try {
      await techDocsApi.deleteAttachment(attId);
      if (selectedDocId) {
        const res = await techDocsApi.fetchTechDocDetail(selectedDocId);
        setDocDetail(res.data.data);
      }
      return true;
    } catch {
      setError('첨부파일 삭제에 실패했습니다.');
      return false;
    }
  }, [selectedDocId]);

  return {
    selectedDocId,
    docDetail,
    mode,
    formData,
    setFormData,
    selectDoc,
    startCreate,
    startEdit,
    cancelEdit,
    save,
    deleteDoc,
    uploadAttachment,
    deleteAttachment,
    isLoading,
    error,
  };
}
