export interface AttachmentOpenRequest {
  attachmentId: number;
  filename: string;
  viewUrl: string;
  downloadUrl: string;
}

type AgentOpenResult = boolean | void | { opened?: boolean };

type SkywatchAgentBridge = {
  openAttachment?: (request: AttachmentOpenRequest) => Promise<AgentOpenResult> | AgentOpenResult;
  ensureAttachment?: (request: AttachmentOpenRequest) => Promise<AgentOpenResult> | AgentOpenResult;
};

function getSkywatchAgent(): SkywatchAgentBridge | undefined {
  return window.skywatchAgent;
}

function isOpenSuccess(result: AgentOpenResult): boolean {
  if (result === false) return false;
  if (typeof result === 'object' && result !== null && 'opened' in result) {
    return Boolean(result.opened);
  }
  return true;
}

// 브라우저 안에서 바로 볼 수 있는 형식 — 나머지(hwp·xlsx·pptx·zip 등)는 일반 다운로드로 받아
// 브라우저의 "이 유형의 파일 항상 열기" 설정(또는 정책)에 따라 한글·엑셀 등으로 바로 열리게 한다.
const VIEWABLE = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'txt']);

function isViewable(filename: string): boolean {
  return VIEWABLE.has(filename.split('.').pop()?.toLowerCase() ?? '');
}

export async function openAttachment(request: AttachmentOpenRequest): Promise<boolean> {
  const viewable = isViewable(request.filename);
  const bridge = getSkywatchAgent();
  const handler = bridge?.openAttachment ?? bridge?.ensureAttachment;

  if (handler) {
    try {
      const result = await handler(request);
      if (isOpenSuccess(result)) return true;
    } catch (error) {
      console.warn('skywatchAgent attachment open failed', error);
    }
  }

  if (!viewable) {
    await triggerDownload(request.downloadUrl, request.filename);
    return true;
  }

  const w = 1200, h = 800;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(request.viewUrl, '_blank', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  return false;
}

/** 서버에 파일이 있는지 응답 머리만 보고 확인 (본문은 받지 않고 끊음). 확인 못 하면 null. */
async function checkStatus(url: string): Promise<number | null> {
  const ctrl = new AbortController();
  try {
    const res = await fetch(url, { credentials: 'include', signal: ctrl.signal });
    ctrl.abort();
    return res.status;
  } catch {
    return null;
  }
}

/** 일반 다운로드 (저장 위치를 묻지 않음 — 브라우저 다운로드 설정·자동 열기 설정을 따른다). */
export async function triggerDownload(url: string, filename: string): Promise<void> {
  const status = await checkStatus(url);
  if (status === 404) {
    alert(`"${filename}" 파일이 서버에 없습니다.\n관리자에게 첨부 파일 복사를 요청하세요.`);
    return;
  }
  if (status !== null && status >= 400) {
    alert(`"${filename}" 파일을 내려받지 못했습니다. (${status})`);
    return;
  }
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
}
