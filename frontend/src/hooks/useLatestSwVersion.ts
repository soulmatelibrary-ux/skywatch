// 문의사항 발생버전 기본값 — 가장 최근에 입력된 문의사항의 발생버전을 받아 칸이 비어 있을 때만 채운다
import { useEffect } from 'react';
import { inquiryApi } from '../services/api/inquiryApi';

/** enabled 일 때 한 번 받아 apply(버전)을 부른다. 못 받으면 아무것도 하지 않는다(칸은 비어 있음). */
export function useLatestSwVersion(enabled: boolean, apply: (version: string) => void) {
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    inquiryApi.latestSwVersion()
      .then(res => { const v = res.data.data; if (alive && v) apply(v); })
      .catch(() => { /* 기본값을 못 받아도 입력은 그대로 할 수 있다 */ });
    return () => { alive = false; };
    // apply 는 매 렌더 새 함수라 넣지 않는다 — 열릴 때 한 번만 받는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
