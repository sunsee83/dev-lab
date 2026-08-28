export async function copyText(text, { env = globalThis, doc = env.document, capabilities } = {}) {
  const value = String(text || '');
  if (!value) return false;

  if (capabilities?.clipboard && env.navigator?.clipboard?.writeText) {
    try {
      await env.navigator.clipboard.writeText(value);
      return true;
    } catch {}
  }

  if (!doc?.body || typeof doc.createElement !== 'function') return false;
  let textarea = null;
  try {
    textarea = doc.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute?.('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    doc.body.appendChild(textarea);
    textarea.select?.();
    textarea.setSelectionRange?.(0, value.length);
    return doc.execCommand?.('copy') !== false;
  } catch {
    return false;
  } finally {
    textarea?.remove?.();
  }
}
