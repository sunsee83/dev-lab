export const VERIFIED_CACHE_KEY = 'ri311:items:v1';

export function createVerifiedCacheStore({ env = globalThis, delayMs = 300 } = {}) {
  let timer = 0;
  let pending = null;
  let destroyed = false;

  function load() {
    try {
      const parsed = JSON.parse(env.localStorage?.getItem?.(VERIFIED_CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function schedule(items) {
    if (destroyed) return false;
    pending = clone(items) || {};
    const delay = Math.max(0, Number(delayMs) || 0);
    if (!delay) return flush();
    if (timer) return true;
    const setTimer = env.setTimeout || setTimeout;
    timer = setTimer(() => {
      timer = 0;
      flush();
    }, delay);
    return true;
  }

  function flush(items) {
    if (items !== undefined) pending = clone(items) || {};
    if (pending == null) return false;
    const next = pending;
    pending = null;
    try {
      env.localStorage?.setItem?.(VERIFIED_CACHE_KEY, JSON.stringify(next));
      return true;
    } catch {
      pending = next;
      return false;
    }
  }

  function destroy() {
    if (destroyed) return;
    if (timer) (env.clearTimeout || clearTimeout)(timer);
    timer = 0;
    flush();
    destroyed = true;
  }

  return { load, schedule, flush, destroy };
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
