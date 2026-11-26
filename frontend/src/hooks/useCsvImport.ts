import { useState } from 'react';
import type { CsvImportResult } from '../types/csvImport';

type Step = 'preview' | 'done';
type Upload<K extends string> = (kind: K, file: File, dryRun: boolean) => Promise<{ data: { data: CsvImportResult } }>;

function errorText(e: unknown): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '파일을 처리하지 못했습니다. 잠시 후 다시 시도하세요.';
}

/** CSV·엑셀 가져오기 공용 — 파일 고르기 → 미리보기(dry_run) → 가져오기 */
export function useCsvImport<K extends string>(upload: Upload<K>, onImported: () => void) {
  const [kind, setKind] = useState<K | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('preview');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (k: K, f: File) => {
    setKind(k); setFile(f); setStep('preview'); setResult(null); setError(null); setBusy(true);
    try {
      const res = await upload(k, f, true);
      setResult(res.data.data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!kind || !file) return;
    setBusy(true); setError(null);
    try {
      const res = await upload(kind, file, false);
      setResult(res.data.data);
      setStep('done');
      if (res.data.data.imported > 0) onImported();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setKind(null); setFile(null); setResult(null); setError(null); };

  return { kind, fileName: file?.name ?? '', step, result, busy, error, pick, confirm, close };
}
