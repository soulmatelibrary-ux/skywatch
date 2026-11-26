import { useCallback } from 'react';
import { prBatchApi } from '../services/api/prBatchApi';
import { useUIStore } from '../store/uiStore';

const PREVIEW_LIMIT = 15;

// 기준 엑셀 반영: 먼저 미리보기(저장 안 함)로 새로 등록될 개별 PR 을 확인받고, 동의하면 실제 반영한다.
// 반환 함수의 두 번째 인자로 대상 버전을 바꿀 수 있다 (신규 버전을 만든 직후 그 버전에 올릴 때).
export function usePrCatalogImport(defaultBatchId: number, onChanged: () => void) {
  const addToast = useUIStore(s => s.addToast);

  return useCallback(async (file: File, batchId: number = defaultBatchId) => {
    try {
      const preview = (await prBatchApi.importCatalogWorkbook(batchId, file, true)).data.data;
      const fresh = preview?.new_issues ?? [];
      if (fresh.length) {
        const list = fresh.slice(0, PREVIEW_LIMIT).map(i => `• ${i.pr_no}  ${i.title}`).join('\n');
        const more = fresh.length > PREVIEW_LIMIT ? `\n… 외 ${fresh.length - PREVIEW_LIMIT}건` : '';
        const ok = confirm(
          `개별 PR에 없는 ${fresh.length}건을 새로 등록합니다.\n\n${list}${more}\n\n`
          + '이미 개별 PR에 있는 PR이라면 [취소]한 뒤, 그 개별 PR의 "제작사(LM) PR번호"에 위 번호를 먼저 입력하고 다시 올려 주세요.\n\n계속할까요?',
        );
        if (!ok) return false;
      }
      const result = (await prBatchApi.importCatalogWorkbook(batchId, file)).data.data;
      const issues = result?.created_issues ? `, 개별 PR ${result.created_issues}건 신규 등록` : '';
      addToast(`기준 PR ${result?.total_items ?? 0}건을 반영했습니다${issues}`, 'success');
      onChanged();
      return true;
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      addToast(typeof detail === 'string' ? detail : '기준 엑셀을 읽지 못했습니다. 첫 시트에 PR 번호와 제목이 있는지 확인해 주세요', 'error');
      onChanged();  // 목록은 반영됐는데 뒤의 원본 첨부만 실패했을 수 있으니 화면을 다시 불러온다
      return false;
    }
  }, [defaultBatchId, onChanged, addToast]);
}
