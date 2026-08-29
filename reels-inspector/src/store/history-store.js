const SNAP_KEY = 'ri311:snap:v1';
const POST_KEY = 'ri311:posts:v1';
export const HISTORY_STORAGE_KEYS = Object.freeze({ snapshots: SNAP_KEY, posts: POST_KEY });
const SNAPSHOT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SNAPSHOT_MIN_GAP_MS = 30 * 60 * 1000;
const SNAPSHOT_LIMIT = 80;
const ACCOUNT_POST_LIMIT = 500;

export function createHistoryStore({ env = globalThis, now = () => Date.now() } = {}) {
  function getSnapshots(shortcode) {
    const list = readStore(env.localStorage, SNAP_KEY)[String(shortcode || '')];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeSnapshot).filter(Boolean);
  }

  function getAccountPosts(username) {
    const owner = String(username || '').toLowerCase();
    if (!owner) return [];
    return Object.values(readStore(env.localStorage, POST_KEY))
      .map(normalizeAccountPost)
      .filter((entry) => entry && entry.owner === owner);
  }

  function record(post) {
    if (!post?.shortcode) return false;
    const snapshotChanged = recordSnapshot(post.shortcode, post.views);
    const accountChanged = recordAccountPost(post);
    return snapshotChanged || accountChanged;
  }

  function recordSnapshot(shortcode, views) {
    const code = cleanCode(shortcode);
    const value = positiveNumber(views);
    if (!code || value == null) return false;
    const timestamp = safeNow(now);
    const store = readStore(env.localStorage, SNAP_KEY);
    let list = Array.isArray(store[code]) ? store[code].map(normalizeSnapshot).filter(Boolean) : [];
    const last = list.at(-1) || null;
    if (last && timestamp - last.t < SNAPSHOT_MIN_GAP_MS && last.v === value) return false;
    list.push({ t: timestamp, v: value });
    list = list.filter((entry) => timestamp - entry.t <= SNAPSHOT_MAX_AGE_MS).slice(-SNAPSHOT_LIMIT);
    store[code] = list;
    return writeStore(env.localStorage, SNAP_KEY, store);
  }

  function recordAccountPost(post) {
    const code = cleanCode(post?.shortcode);
    const owner = String(post?.username || post?.owner || '').toLowerCase();
    const views = positiveNumber(post?.views);
    if (!code || !owner || views == null) return false;
    const store = readStore(env.localStorage, POST_KEY);
    store[code] = { code, owner, views, t: safeNow(now) };
    const keys = Object.keys(store);
    if (keys.length > ACCOUNT_POST_LIMIT) {
      keys.sort((a, b) => Number(store[b]?.t || 0) - Number(store[a]?.t || 0));
      keys.slice(ACCOUNT_POST_LIMIT).forEach((key) => delete store[key]);
    }
    return writeStore(env.localStorage, POST_KEY, store);
  }

  return { getSnapshots, getAccountPosts, record, recordSnapshot, recordAccountPost };
}

function readStore(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeSnapshot(entry) {
  const t = Number(entry?.t);
  const v = positiveNumber(entry?.v);
  return Number.isFinite(t) && t > 0 && v != null ? { t, v } : null;
}

function normalizeAccountPost(entry) {
  const code = cleanCode(entry?.code);
  const owner = String(entry?.owner || '').toLowerCase();
  const views = positiveNumber(entry?.views);
  const t = Number(entry?.t);
  return code && owner && views != null && Number.isFinite(t) && t > 0 ? { code, owner, views, t } : null;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function cleanCode(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '');
}

function safeNow(now) {
  const value = Number(now());
  return Number.isFinite(value) && value > 0 ? value : Date.now();
}
