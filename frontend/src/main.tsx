import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedTheme = localStorage.getItem('skywatch-theme') ?? 'dark';
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
document.documentElement.style.colorScheme = savedTheme === 'dark' ? 'dark' : 'light';

// 새 화면(v2)이면 <html> 에도 ui-v2 를 붙인다 — 팝업 창·모달까지 같은 색 체계를 쓰게 (index.css 색 통일)
const applyUiClass = () => {
  let v2 = false;
  try { v2 = localStorage.getItem('skywatch-ui') === 'v2'; } catch { /* 기본은 기존 화면 */ }
  document.documentElement.classList.toggle('ui-v2', v2);
};
applyUiClass();
// 다른 창에서 화면을 바꾸면 열린 팝업도 따라 바뀐다
window.addEventListener('storage', e => { if (e.key === 'skywatch-ui') applyUiClass(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
