import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { inquiryApi } from '../services/api/inquiryApi';
import { useUIStore } from '../store/uiStore';

interface Filters {
  year: number | null;
  month: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  category: string | null;
  status: string | null;
  searchQuery: string;
}

const VALID_TYPES = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
const VALID_EXT = ['.csv', '.xlsx', '.xls'];
const MAX_SIZE = 10 * 1024 * 1024;

/** 문의사항 엑셀 내려받기(현재 조건) · 올리기 */
export function useInquiryExcel(f: Filters, onImported: () => void) {
  const addToast = useUIStore(s => s.addToast);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const excelLabel = f.year && f.month ? `${f.year}년 ${f.month}월 엑셀로 받기`
    : f.year ? `${f.year}년 엑셀로 받기`
      : f.dateFrom || f.dateTo ? '기간 엑셀로 받기' : '전체 엑셀로 받기';

  const exportExcel = async () => {
    try {
      const resp = await inquiryApi.exportExcel({
        year: f.year, month: f.month, date_from: f.dateFrom, date_to: f.dateTo,
        category: f.category, status: f.status, q: f.searchQuery || null,
      });
      const url = URL.createObjectURL(new Blob([resp.data], { type: VALID_TYPES[1] }));
      const a = document.createElement('a');
      a.href = url;
      a.download = '문의사항관리대장.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      addToast('엑셀 파일을 받았습니다.', 'success');
    } catch {
      addToast('엑셀 파일을 만들지 못했습니다.', 'error');
    }
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VALID_TYPES.includes(file.type) && !VALID_EXT.includes(ext)) { addToast('CSV, XLSX, XLS 파일만 올릴 수 있습니다.', 'error'); return; }
    if (file.size > MAX_SIZE) { addToast('10MB 이하 파일만 올릴 수 있습니다.', 'error'); return; }

    setIsImporting(true);
    try {
      const resp = await inquiryApi.import(file);
      const result = resp.data.data as { success: number; skipped: number; errors: string[] } | undefined;
      if (!result) { addToast('올리기 결과를 받지 못했습니다.', 'error'); return; }
      addToast(`엑셀 반영: ${result.success}건 추가, ${result.skipped}건 건너뜀`, result.skipped === 0 ? 'success' : 'warning');
      if (result.errors.length > 0) {
        // 건너뛴 사유를 화면에 노출 (최대 3건)
        const more = result.errors.length > 3 ? ` 외 ${result.errors.length - 3}건` : '';
        addToast(`건너뛴 이유: ${result.errors.slice(0, 3).join(' / ')}${more}`, 'warning');
        console.warn('Import errors:', result.errors);
      }
      onImported();
    } catch (error) {
      addToast('엑셀을 반영하지 못했습니다.', 'error');
      console.error(error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return { excelLabel, exportExcel, importFile, isImporting, fileInputRef };
}
