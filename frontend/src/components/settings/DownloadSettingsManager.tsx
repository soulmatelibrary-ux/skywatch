// 크롬·엣지 "다운로드 전에 저장 위치 확인" 끄기 — 웹페이지는 브라우저 설정을 직접 바꿀 수 없어서
// 정책 등록(.reg) 파일을 내려받아 실행하게 한다. (HKLM 정책 → 관리자 승인 필요, 브라우저 재시작 후 적용)
const KEYS = ['HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge'];

function regText(value: string): string {
  const lines = ['Windows Registry Editor Version 5.00', ''];
  for (const key of KEYS) lines.push(`[${key}]`, `"PromptForDownloadLocation"=${value}`, '');
  return lines.join('\r\n');
}

function saveReg(fileName: string, value: string) {
  const url = URL.createObjectURL(new Blob([regText(value)], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const btn = 'rounded px-3 py-1.5 text-[13px] font-semibold';

export function DownloadSettingsManager() {
  return (
    <div className="flex max-w-[640px] flex-col gap-4 text-[13px] text-slate-700 dark:text-slate-200">
      <div>
        <h3 className="text-[15px] font-bold">첨부파일 다운로드 설정</h3>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          크롬·엣지에서 첨부를 누를 때 저장 위치를 묻지 않고 바로 받도록 설정합니다. 이 PC에만 적용됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => saveReg('skywatch-download-on.reg', 'dword:00000000')}
          className={`${btn} bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950`}>
          저장 위치 묻지 않기 (설정 파일 받기)
        </button>
        <button type="button" onClick={() => saveReg('skywatch-download-off.reg', '-')}
          className={`${btn} border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800`}>
          되돌리기
        </button>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
        <li>버튼을 누르면 <b>.reg 파일</b>이 내려받아집니다. 다운로드 목록에서 파일을 엽니다.</li>
        <li>"레지스트리에 정보를 추가하시겠습니까?" → <b>예</b> (관리자 승인 창이 뜨면 승인).</li>
        <li><b>크롬·엣지를 모두 닫았다가 다시 엽니다.</b> 이후 첨부는 저장 위치를 묻지 않고 받아집니다.</li>
        <li>받은 파일을 바로 열려면: 다운로드 목록에서 파일의 ⋯ 메뉴 → <b>"이 유형의 파일 항상 열기"</b> (형식마다 한 번).</li>
      </ol>

      <p className="rounded bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        이 설정은 "조직에서 관리" 정책으로 들어가므로 브라우저 설정 화면에서는 바꿀 수 없습니다. 원래대로 하려면 "되돌리기" 파일을 같은 방법으로 실행하세요.
        PC 관리자 권한이 없으면 적용되지 않습니다 — 그때는 브라우저 설정 → 다운로드 → "다운로드 전에 각 파일의 저장 위치 확인"을 직접 끄세요.
      </p>
    </div>
  );
}
