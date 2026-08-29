export const VERSION = '3.2.6';
export const UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';

export function updateInstallUrl(cacheBust = Date.now()) {
  const value = Number(cacheBust);
  const stamp = Number.isFinite(value) ? Math.trunc(value) : Date.now();
  return `${UPDATE_URL}?ri=${stamp}`;
}
