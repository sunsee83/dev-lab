const TOAST_ID = 'ri32-toast';
const DEDUPE_WINDOW_MS = 1400;
let timer = 0;
let lastText = '';
let lastShownAt = 0;

export function showToast(doc, text, duration = 2400) {
  if (!doc?.documentElement || !text) return false;
  const value = String(text);
  const now = Date.now();
  const old = doc.getElementById(TOAST_ID);
  if (old && value === lastText && now - lastShownAt < DEDUPE_WINDOW_MS) return false;

  if (old) old.remove();
  if (timer) clearTimeout(timer);

  const toast = doc.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = value;
  doc.documentElement.appendChild(toast);
  lastText = value;
  lastShownAt = now;
  timer = setTimeout(() => {
    timer = 0;
    toast.remove();
  }, duration);
  return true;
}

export function showResult(doc, result) {
  if (!result || result.code === 'cancelled') return false;
  return showToast(doc, result.message || (result.ok ? '완료했습니다.' : '작업을 완료하지 못했습니다.'));
}
