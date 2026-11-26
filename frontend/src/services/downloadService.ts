/**
 * File System Access API 기반 다운로드 서비스.
 * showSaveFilePicker로 저장 위치를 매번 선택 (마지막 경로 기억).
 * skywatch 전용 폴더가 설정되어 있으면 자동 미러 저장.
 */

const DB_NAME          = 'skywatch-download';
const STORE            = 'handles';
const LAST_HANDLE_KEY  = 'lastFileHandle';
const SKYWATCH_DIR_KEY = 'skywatchDir';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export function isPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

function fallbackDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

export async function saveAttachment(url: string, filename: string): Promise<void> {
  if (!isPickerSupported()) { fallbackDownload(url, filename); return; }

  const lastHandle = await dbGet<FileSystemFileHandle>(LAST_HANDLE_KEY);

  // picker는 유저 제스처 컨텍스트에서 즉시 호출 (fetch 이전)
  let fileHandle: FileSystemFileHandle;
  try {
    fileHandle = await win.showSaveFilePicker({
      suggestedName: filename,
      startIn: lastHandle ?? 'downloads',
    });
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return; // 사용자 취소
    throw e;
  }

  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('download failed: empty response body');
  }

  const writable = await fileHandle.createWritable();
  await writable.write(new Uint8Array(buffer));
  await writable.close();

  await dbSet(LAST_HANDLE_KEY, fileHandle);

  // skywatch 폴더 미러 저장
  const skywatchDir = await dbGet<FileSystemDirectoryHandle>(SKYWATCH_DIR_KEY);
  if (skywatchDir) {
    try {
      const perm = await (skywatchDir as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        const fh = await skywatchDir.getFileHandle(filename, { create: true });
        const w  = await fh.createWritable();
        await w.write(new Uint8Array(buffer));
        await w.close();
      }
    } catch { /* 미러 실패는 무시 */ }
  }
}

/** skywatch 미러 폴더 지정. 반환값: 선택 완료 여부 */
export async function configureSkywatchFolder(): Promise<boolean> {
  try {
    const handle: FileSystemDirectoryHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
    await dbSet(SKYWATCH_DIR_KEY, handle);
    return true;
  } catch { return false; }
}

export async function getSkywatchFolderName(): Promise<string | null> {
  const h = await dbGet<FileSystemDirectoryHandle>(SKYWATCH_DIR_KEY);
  return h?.name ?? null;
}
