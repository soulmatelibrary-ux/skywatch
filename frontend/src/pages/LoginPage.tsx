import { useEffect } from 'react';
import { useLogin } from '../hooks/useLogin';
import { useUIStore } from '../store/uiStore';

export function LoginPage() {
  const { loginId, setLoginId, password, setPassword, error, isLoading, login } = useLogin();
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') login();
  };

  return (
    <div className="min-h-screen bg-[#03111d] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_80%_18%,_rgba(59,130,246,0.11),_transparent_22%),radial-gradient(circle_at_30%_82%,_rgba(99,102,241,0.08),_transparent_24%),linear-gradient(135deg,_#03111d_0%,_#071827_52%,_#041019_100%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px]" />

          <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2">
            <div className="radar-pulse absolute inset-0 rounded-full border border-cyan-300/20 bg-cyan-400/5" />
            <div className="radar-pulse absolute left-10 top-10 right-10 bottom-10 rounded-full border border-cyan-300/18" />
            <div className="radar-pulse absolute left-24 top-24 right-24 bottom-24 rounded-full border border-cyan-300/16" />
            <div className="radar-pulse absolute left-40 top-40 right-40 bottom-40 rounded-full border border-cyan-300/14" />
            <div className="radar-pulse absolute left-56 top-56 right-56 bottom-56 rounded-full border border-cyan-300/12" />
            <div className="radar-sweep absolute inset-0 rounded-full">
              <div className="absolute left-1/2 top-1/2 h-[42%] w-[2px] -translate-x-1/2 -translate-y-full origin-bottom bg-gradient-to-t from-transparent via-cyan-200/30 to-cyan-300/90 shadow-[0_0_22px_rgba(103,232,249,0.65)]" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_32px_rgba(103,232,249,0.95)]" />

            {/* SVG flight tracks with dashed routes */}
            <svg aria-hidden="true" className="absolute inset-0" width="760" height="760" viewBox="0 0 760 760">
              <defs>
                <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* KAL1234 — cyan, NE bound (HDG 045) — upper-left */}
              <path id="r1" d="M400,570 Q310,412 220,258 Q155,168 108,92" fill="none" stroke="none" />
              <path d="M400,570 Q310,412 220,258" stroke="rgba(34,211,238,.44)" strokeWidth="1.5" fill="none" strokeDasharray="7 5" />
              <path d="M220,258 Q155,168 108,92" stroke="rgba(34,211,238,.18)" strokeWidth="1" fill="none" strokeDasharray="4 7" />
              <line x1="220" y1="258" x2="262" y2="216" stroke="rgba(34,211,238,.85)" strokeWidth="2" />
              <circle cx="220" cy="258" r="5" fill="#22d3ee" filter="url(#glow)" />
              <circle r="3.5" fill="rgba(103,232,249,.9)" filter="url(#glow)">
                <animateMotion dur="10s" repeatCount="indefinite"><mpath href="#r1" /></animateMotion>
              </circle>

              {/* CPA456 — blue, E bound (HDG 090) — upper-right */}
              <path id="r2" d="M175,158 Q343,150 510,143 L705,140" fill="none" stroke="none" />
              <path d="M175,158 Q343,150 510,143" stroke="rgba(96,165,250,.44)" strokeWidth="1.5" fill="none" strokeDasharray="7 5" />
              <path d="M510,143 L705,140" stroke="rgba(96,165,250,.18)" strokeWidth="1" fill="none" strokeDasharray="4 7" />
              <line x1="510" y1="143" x2="570" y2="143" stroke="rgba(96,165,250,.85)" strokeWidth="2" />
              <circle cx="510" cy="143" r="5" fill="#60a5fa" filter="url(#glow)" />
              <circle r="3.5" fill="rgba(147,197,253,.9)" filter="url(#glow)">
                <animateMotion dur="8.5s" repeatCount="indefinite"><mpath href="#r2" /></animateMotion>
              </circle>

              {/* HVN321 — indigo, SSE bound (HDG 155) — right side */}
              <path id="r3" d="M512,145 Q556,280 600,416 Q628,548 648,664" fill="none" stroke="none" />
              <path d="M512,145 Q556,280 600,416" stroke="rgba(129,140,248,.44)" strokeWidth="1.5" fill="none" strokeDasharray="7 5" />
              <path d="M600,416 Q628,548 648,664" stroke="rgba(129,140,248,.18)" strokeWidth="1" fill="none" strokeDasharray="4 7" />
              <line x1="600" y1="416" x2="624" y2="470" stroke="rgba(165,180,252,.85)" strokeWidth="2" />
              <circle cx="600" cy="416" r="5" fill="#818cf8" filter="url(#glow)" />
              <circle r="3.5" fill="rgba(196,181,253,.9)" filter="url(#glow)">
                <animateMotion dur="11s" repeatCount="indefinite"><mpath href="#r3" /></animateMotion>
              </circle>

              {/* AAR789 — teal, WNW bound (HDG 290) — lower-center */}
              <path id="r4" d="M704,654 Q574,619 445,585 Q296,547 210,512" fill="none" stroke="none" />
              <path d="M704,654 Q574,619 445,585" stroke="rgba(45,212,191,.44)" strokeWidth="1.5" fill="none" strokeDasharray="7 5" />
              <path d="M445,585 Q296,547 210,512" stroke="rgba(45,212,191,.18)" strokeWidth="1" fill="none" strokeDasharray="4 7" />
              <line x1="445" y1="585" x2="388" y2="564" stroke="rgba(45,212,191,.85)" strokeWidth="2" />
              <circle cx="445" cy="585" r="5" fill="#2dd4bf" filter="url(#glow)" />
              <circle r="3.5" fill="rgba(153,246,228,.9)" filter="url(#glow)">
                <animateMotion dur="11.5s" repeatCount="indefinite"><mpath href="#r4" /></animateMotion>
              </circle>

              {/* CES987 — sky, NNE bound (HDG 010) — lower-left */}
              <path id="r5" d="M168,730 Q162,655 155,580 Q149,492 142,394" fill="none" stroke="none" />
              <path d="M168,730 Q162,655 155,580" stroke="rgba(56,189,248,.44)" strokeWidth="1.5" fill="none" strokeDasharray="7 5" />
              <path d="M155,580 Q149,492 142,394" stroke="rgba(56,189,248,.18)" strokeWidth="1" fill="none" strokeDasharray="4 7" />
              <line x1="155" y1="580" x2="164" y2="520" stroke="rgba(56,189,248,.85)" strokeWidth="2" />
              <circle cx="155" cy="580" r="5" fill="#38bdf8" filter="url(#glow)" />
              <circle r="3.5" fill="rgba(125,211,252,.9)" filter="url(#glow)">
                <animateMotion dur="12s" repeatCount="indefinite"><mpath href="#r5" /></animateMotion>
              </circle>
            </svg>

            {/* KAL1234 label — upper-left */}
            <div className="track-label track-label-cyan" style={{ left: '28.9%', top: '33.9%', animationDelay: '0.25s', transform: 'translate(-105%, -50%)' }}>
              <div className="track-label-title">KAL1234</div>
              <div className="track-label-heading">HDG 045</div>
              <div className="track-label-meta">FL330 · M0.78</div>
            </div>
            {/* CPA456 label — upper-right */}
            <div className="track-label track-label-blue" style={{ left: '67.1%', top: '18.8%', animationDelay: '0.9s', transform: 'translate(-50%, -132%)' }}>
              <div className="track-label-title">CPA456</div>
              <div className="track-label-heading">HDG 090</div>
              <div className="track-label-meta">FL360 · M0.81</div>
            </div>
            {/* HVN321 label — right side */}
            <div className="track-label track-label-indigo" style={{ left: '78.9%', top: '54.7%', animationDelay: '1.55s', transform: 'translate(-105%, -50%)' }}>
              <div className="track-label-title">HVN321</div>
              <div className="track-label-heading">HDG 155</div>
              <div className="track-label-meta">FL280 · M0.74</div>
            </div>
            {/* AAR789 label — lower-center */}
            <div className="track-label track-label-mint" style={{ left: '58.6%', top: '77%', animationDelay: '2.1s', transform: 'translate(-50%, 12%)' }}>
              <div className="track-label-title">AAR789</div>
              <div className="track-label-heading">HDG 290</div>
              <div className="track-label-meta">FL290 · M0.76</div>
            </div>
            {/* CES987 label — lower-left */}
            <div className="track-label track-label-cyan" style={{ left: '20.4%', top: '76.3%', animationDelay: '2.65s', transform: 'translate(-10%, -132%)' }}>
              <div className="track-label-title">CES987</div>
              <div className="track-label-heading">HDG 010</div>
              <div className="track-label-meta">FL310 · M0.80</div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-[440px] rounded-[28px] border border-white/12 bg-white/94 p-7 text-slate-900 shadow-[0_24px_90px_-30px_rgba(15,23,42,0.72)] backdrop-blur-xl dark:bg-[#0f172ad9] dark:text-slate-100">
            <div className="mb-8">
              <div className="text-[12px] font-semibold tracking-[0.24em] text-cyan-600 dark:text-cyan-300">SKYWATCH</div>
              <h1 className="mt-2 text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-white">로그인</h1>
              <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">관제시스템 유지보수 일지, 알림 관리</p>
              <div className="mt-2 text-[12px] font-medium tracking-[0.18em] text-slate-400 dark:text-slate-500">한국공항공사</div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-300">사번</label>
                <input type="text" inputMode="numeric" placeholder="예: 24001" value={loginId} onChange={e => setLoginId(e.target.value)} onKeyDown={handleKey} autoComplete="username" autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[16px] font-mono text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-200/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400/20" />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600 dark:text-slate-300">비밀번호</label>
                <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[16px] text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-200/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400/20" />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /><span>{error}</span>
                </div>
              )}
              <button onClick={login} disabled={isLoading}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(37,99,235,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                {isLoading ? '로그인 중...' : '시스템 로그인'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
