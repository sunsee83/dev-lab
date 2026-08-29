import { createHistoryStore, HISTORY_STORAGE_KEYS } from '../store/history-store.js';

const CACHE_KEY = 'ri311:items:v1';
const WATCH_KEYS = [CACHE_KEY, HISTORY_STORAGE_KEYS.snapshots, HISTORY_STORAGE_KEYS.posts];

export function createLegacyStoreAdapter({ env = globalThis, history = createHistoryStore({ env }) } = {}) {
  function readStore(key) {
    try {
      const raw = env.localStorage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function readRaw(key) {
    try {
      return String(env.localStorage?.getItem(key) || '');
    } catch {
      return '';
    }
  }

  function getItemsSnapshot() {
    return readStore(CACHE_KEY);
  }

  function getItem(shortcode) {
    if (!shortcode) return null;
    return readStore(CACHE_KEY)[shortcode] || null;
  }

  function getPost(shortcode) {
    const item = getItem(shortcode);
    if (!item) return shortcode ? { shortcode } : null;
    const value = (key) => fieldValue(item, key);
    return {
      shortcode,
      mediaId: value('mediaId') || '',
      ownerId: value('ownerId') || '',
      username: value('owner') || '',
      mediaType: String(value('mediaType') || '').toUpperCase(),
      productType: value('productType') || '',
      canonicalUrl: value('canonicalUrl') || item.pageUrl || '',
      views: optionalMetric(value('views')),
      likes: optionalMetric(value('likes')),
      comments: optionalMetric(value('comments')),
      reposts: optionalMetric(value('reposts')),
      date: value('date') || '',
      videoUrl: value('videoUrl') || '',
      coverUrl: value('coverUrl') || '',
      thumbUrl: value('thumbUrl') || '',
      carouselImages: normalizeImages(value('carouselImages'))
    };
  }

  function getCurrentIdentity(url = env.location?.href || '') {
    const shortcode = codeFromUrl(url);
    if (!shortcode) return null;
    const post = getPost(shortcode) || { shortcode };
    return {
      shortcode,
      mediaId: post.mediaId || '',
      ownerId: post.ownerId || '',
      username: post.username || '',
      mediaType: post.mediaType || inferTypeFromUrl(url),
      productType: post.productType || '',
      canonicalUrl: post.canonicalUrl || stripQuery(url),
      parentMediaId: '',
      childMediaId: '',
      slideIndex: null,
      state: post.mediaType || post.mediaId ? 'IDENTIFIED' : 'DETECTED'
    };
  }

  function findPostByMediaUrls(urls) {
    const targets = new Set((Array.isArray(urls) ? urls : [urls]).map(normalizeMediaUrl).filter(Boolean));
    if (!targets.size) return null;

    const store = readStore(CACHE_KEY);
    let best = null;
    let bestScore = 0;
    for (const [shortcode, item] of Object.entries(store)) {
      if (!item || !shortcode) continue;
      const candidates = [
        [fieldValue(item, 'videoUrl'), 4],
        [fieldValue(item, 'coverUrl'), 3],
        [fieldValue(item, 'thumbUrl'), 2]
      ];
      let score = 0;
      for (const [url, weight] of candidates) {
        const key = normalizeMediaUrl(url);
        if (key && targets.has(key)) score = Math.max(score, weight);
      }
      if (score <= bestScore) continue;
      bestScore = score;
      best = getPost(shortcode);
      if (score === 4) break;
    }
    return best;
  }

  function createChangeTracker(listener, { delayMs = 360 } = {}) {
    if (typeof listener !== 'function') return { schedule() {}, checkNow() {}, destroy() {} };
    const last = new Map(WATCH_KEYS.map((key) => [key, readRaw(key)]));
    let timer = 0;
    let destroyed = false;
    let pendingReason = '';

    const checkNow = (reason = pendingReason || 'check') => {
      if (destroyed) return false;
      if (timer) {
        (env.clearTimeout || clearTimeout)(timer);
        timer = 0;
      }
      pendingReason = '';
      const changedKeys = [];
      for (const key of WATCH_KEYS) {
        const raw = readRaw(key);
        if (raw === last.get(key)) continue;
        last.set(key, raw);
        changedKeys.push(key);
      }
      if (!changedKeys.length) return false;
      listener({ reason, changedKeys });
      return true;
    };

    const schedule = (reason = 'activity') => {
      if (destroyed) return;
      pendingReason = reason;
      if (timer) return;
      const setTimer = env.setTimeout || setTimeout;
      timer = setTimer(() => {
        timer = 0;
        checkNow(pendingReason || reason);
      }, Math.max(0, Number(delayMs) || 0));
    };

    const onStorage = (event) => {
      if (event?.key && !WATCH_KEYS.includes(event.key)) return;
      checkNow('storage');
    };
    const onFocus = () => schedule('focus');
    const onPageShow = () => schedule('pageshow');
    env.addEventListener?.('storage', onStorage, true);
    env.addEventListener?.('focus', onFocus, true);
    env.addEventListener?.('pageshow', onPageShow, true);

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      if (timer) (env.clearTimeout || clearTimeout)(timer);
      timer = 0;
      env.removeEventListener?.('storage', onStorage, true);
      env.removeEventListener?.('focus', onFocus, true);
      env.removeEventListener?.('pageshow', onPageShow, true);
    };

    return { schedule, checkNow, destroy };
  }

  return {
    getItem,
    getItemsSnapshot,
    getPost,
    getCurrentIdentity,
    findPostByMediaUrls,
    getSnapshots: history.getSnapshots,
    getAccountPosts: history.getAccountPosts,
    createChangeTracker,
    codeFromUrl
  };
}

export function codeFromUrl(url) {
  const match = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : '';
}

function fieldValue(item, key) {
  const field = item?.fields?.[key];
  if (field && (field.status === 'verified' || field.status === 'conflict')) return field.value;
  return item?.[key] ?? null;
}

function optionalMetric(value) {
  return value == null || value === '' ? undefined : value;
}

function normalizeImages(value) {
  return Array.isArray(value) ? value.filter((url) => /^https?:/i.test(String(url || ''))) : [];
}

function normalizeMediaUrl(url) {
  if (!url || /^blob:/i.test(String(url))) return '';
  try {
    const parsed = new URL(String(url), 'https://www.instagram.com/');
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return '';
  }
}

function inferTypeFromUrl(url) {
  return /\/(?:reel|reels)\//.test(String(url || '')) ? 'REEL' : '';
}

function stripQuery(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return String(url || '').split('?')[0].split('#')[0];
  }
}
