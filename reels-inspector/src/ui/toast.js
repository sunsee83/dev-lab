const TOAST_ID = 'ri32-toast';
let timer = 0;

export function showToast(doc, text, duration = 2400) {
  if (!doc?.documentElement || !text) return;
  const old = doc.getElementById(TOAST_ID);
  if (old) old.remove();
  if (timer) clearTimeout(timer);

  const toast = doc.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = String(text);
  doc.documentElement.appendChild(toast);
  timer = setTimeout(() => {
    timer = 0;
    toast.remove();
  }, duration);
}

export function showResult(doc, result) {
  if (!result || result.code === 'cancelled') return;
  showToast(doc, result.message || (result.ok ? '완료했습니다.' : '작업을 완료하지 못했습니다.'));
}
