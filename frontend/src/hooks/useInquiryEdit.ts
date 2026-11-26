// 문의사항 인라인 편집 상태 관리
import { useCallback, useRef, useState } from 'react';
import { inquiryApi } from '../services/api/inquiryApi';
import type { Inquiry, InquiryUpdate } from '../types/inquiry';
import { useUIStore } from '../store/uiStore';

export interface EditingCell {
  id: number;
  field: string;
}

export function useInquiryEdit(onSuccess?: (updated: Inquiry) => void) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const initialRef = useRef('');
  const savingRef = useRef(false);
  // 취소/저장 직후 언마운트 blur 로 인한 재저장 방지용 현재 편집 셀
  const editingRef = useRef<EditingCell | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const startEdit = useCallback((id: number, field: string, initialValue: unknown) => {
    const v = initialValue === null || initialValue === undefined ? '' : String(initialValue);
    initialRef.current = v;
    editingRef.current = { id, field };
    setEditingCell({ id, field });
    setEditValue(v);
  }, []);

  const cancelEdit = useCallback(() => {
    editingRef.current = null;
    setEditingCell(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async (id: number) => {
    const current = editingRef.current;
    if (!editingCell || !current || current.id !== id || current.field !== editingCell.field || savingRef.current) return;

    // 값 변경이 없으면 저장 요청 없이 종료
    if (editValue.trim() === initialRef.current.trim()) {
      cancelEdit();
      return;
    }

    try {
      savingRef.current = true;
      setIsSaving(true);
      const field = editingCell.field as keyof InquiryUpdate;
      const trimmed = editValue.trim();
      // 빈 값은 null 로 보내 필드를 비움 (발생일자는 필수라 제외)
      let value: string | number | null = trimmed || null;
      if (field === 'received_by') value = trimmed ? parseInt(trimmed, 10) : null;
      if (field === 'occurred_date' && !trimmed) {
        addToast('발생일자는 비울 수 없습니다', 'error');
        cancelEdit();
        return;
      }
      const updateData = { [field]: value } as InquiryUpdate;

      const resp = await inquiryApi.patch(id, updateData);
      onSuccess?.(resp.data.data as Inquiry);
      addToast('저장되었습니다', 'success');
      editingRef.current = null;
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Inquiry edit failed:', error);
      const msg = error instanceof Error ? error.message : '저장 실패';
      addToast(msg, 'error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [editingCell, editValue, addToast, onSuccess, cancelEdit]);

  return {
    editingCell,
    editValue,
    isSaving,
    startEdit,
    cancelEdit,
    setEditValue,
    saveEdit,
  };
}
