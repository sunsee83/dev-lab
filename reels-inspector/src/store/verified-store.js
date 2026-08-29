import { normalizeIdentity } from '../data/identity.js';
import { buildMediaList } from '../data/media-model.js';

const SOURCE_RANK = Object.freeze({ legacy: 1, permalink: 2, dom: 3, embedded: 4, network: 5 });
const METRIC_FIELDS = new Set(['views', 'likes', 'comments', 'reposts']);
const REPLACEABLE_FIELDS = new Set(['videoUrl', 'coverUrl', 'thumbUrl', 'carouselImages']);
const FIELDS = [
  'views', 'likes', 'comments', 'reposts', 'date', 'owner',
  'videoUrl', 'coverUrl', 'thumbUrl', 'carouselImages',
  'mediaId', 'ownerId', 'mediaType', 'productType', 'canonicalUrl'
];

export function createVerifiedStore({ initialItems = {}, now = () => Date.now(), onChange } = {}) {
  let items = clone(initialItems) || {};

  function getItem(shortcode) {
    const item = items[shortcode];
    return item ? clone(item) : null;
  }

  function getPost(shortcode) {
    if (!shortcode) return null;
    const item = items[shortcode];
    if (!item) return { shortcode, media: [] };
    const read = (key) => fieldValue(item, key);
    const post = { shortcode };
    post.mediaId = read('mediaId') || '';
    post.ownerId = read('ownerId') || '';
    post.username = read('owner') || '';
    post.mediaType = String(read('mediaType') || '').toUpperCase();
    post.productType = read('productType') || '';
    post.canonicalUrl = read('canonicalUrl') || item.pageUrl || '';
    post.views = optional(read('views'));
    post.likes = optional(read('likes'));
    post.comments = optional(read('comments'));
    post.reposts = optional(read('reposts'));
    post.date = read('date') || '';
    post.videoUrl = read('videoUrl') || '';
    post.coverUrl = read('coverUrl') || '';
    post.thumbUrl = read('thumbUrl') || '';
    const carouselImages = read('carouselImages');
    post.carouselImages = Array.isArray(carouselImages) ? [...carouselImages] : [];
    post.media = buildMediaList(post);
    return post;
  }

  function getIdentity(shortcode) {
    const post = getPost(shortcode);
    if (!post?.shortcode) return null;
    return normalizeIdentity(post, post.canonicalUrl);
  }

  function upsert(shortcode, patch = {}, { source = 'dom', confidence } = {}) {
    const code = cleanShortcode(shortcode);
    if (!code) return { item: null, changed: false };
    const item = items[code] || { code, fields: {}, conflicts: {} };
    let changed = false;

    const nextPatch = { ...patch };
    if (!nextPatch.mediaType && /\/(?:reel|reels)\//.test(String(nextPatch.pageUrl || nextPatch.canonicalUrl || ''))) {
      nextPatch.mediaType = 'REEL';
    }

    for (const key of FIELDS) {
      if (!hasValue(nextPatch[key])) continue;
      if (setField(item, key, nextPatch[key], source, confidence)) changed = true;
    }

    if (nextPatch.pageUrl) item.pageUrl = nextPatch.pageUrl;
    if (nextPatch.fetched) item.fetched = nextPatch.fetched;
    item.seen = now();
    item.identity = buildIdentity(code, item);
    items[code] = item;

    if (changed && typeof onChange === 'function') {
      onChange({ shortcode: code, item: clone(item) });
    }
    return { item: clone(item), changed };
  }

  function replaceSnapshot(nextItems = {}) {
    items = clone(nextItems) || {};
    return snapshot();
  }

  function snapshot() {
    return clone(items);
  }

  function setField(item, key, value, source, confidence) {
    item.fields ||= {};
    const old = item.fields[key] || null;
    const newRank = sourceRank(source);
    const oldRank = old ? sourceRank(old.source) : -1;

    if (old && isVerified(old) && !sameValue(old.value, value)) {
      if (newRank < oldRank) return false;
      if (METRIC_FIELDS.has(key) && metricConflict(old, value, now())) {
        return markConflict(item, key, old, value, source, now());
      }
      const videoToReel = key === 'mediaType' && old.value === 'VIDEO' && value === 'REEL';
      if (!METRIC_FIELDS.has(key) && !REPLACEABLE_FIELDS.has(key) && !videoToReel && newRank <= oldRank) {
        return markConflict(item, key, old, value, source, now());
      }
    }

    if (old && sameValue(old.value, value) && newRank <= oldRank && old.status === 'verified') return false;
    item.fields[key] = {
      value: clone(value),
      source: source || 'dom',
      confidence: confidence || (newRank >= 4 ? 'high' : 'medium'),
      status: 'verified',
      updatedAt: now()
    };
    item[key] = clone(value);
    if (item.conflicts) delete item.conflicts[key];
    return true;
  }

  return { getItem, getPost, getIdentity, upsert, replaceSnapshot, snapshot };
}

export function sourceRank(source) {
  return SOURCE_RANK[source] || 0;
}

export function fieldValue(item, key) {
  const field = item?.fields?.[key];
  if (field && isVerified(field)) return field.value;
  return item?.[key] ?? null;
}

function buildIdentity(code, item) {
  return normalizeIdentity({
    shortcode: code,
    mediaId: fieldValue(item, 'mediaId'),
    ownerId: fieldValue(item, 'ownerId'),
    username: fieldValue(item, 'owner'),
    mediaType: fieldValue(item, 'mediaType'),
    productType: fieldValue(item, 'productType'),
    canonicalUrl: fieldValue(item, 'canonicalUrl') || item.pageUrl || ''
  });
}

function markConflict(item, key, oldField, incoming, source, timestamp) {
  item.conflicts ||= {};
  item.conflicts[key] = {
    previous: clone(oldField.value),
    incoming: clone(incoming),
    source,
    at: timestamp
  };
  item.fields[key] = {
    value: clone(oldField.value),
    source: oldField.source,
    confidence: oldField.confidence,
    status: 'conflict',
    updatedAt: timestamp
  };
  item[key] = clone(oldField.value);
  return true;
}

function metricConflict(oldField, incoming, timestamp) {
  const previous = Number(oldField.value);
  const next = Number(incoming);
  const age = timestamp - Number(oldField.updatedAt || 0);
  if (!(previous > 0) || !Number.isFinite(next)) return false;
  if (next < previous && previous - next > Math.max(5, previous * 0.02)) return true;
  return age < 120000 && previous > 100 && next > previous * 20;
}

function sameValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) return JSON.stringify(left) === JSON.stringify(right);
  return String(left) === String(right);
}

function isVerified(field) {
  return field?.status === 'verified' || field?.status === 'conflict';
}

function optional(value) {
  return value == null || value === '' ? undefined : value;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function cleanShortcode(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '');
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
