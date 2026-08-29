import { normalizeIdentity } from './identity.js';

const VIEW_KEYS = [
  'play_count', 'ig_play_count', 'video_play_count', 'video_view_count',
  'view_count', 'clips_play_count', 'reel_view_count', 'media_view_count',
  'views', 'plays'
];

export function extractInstagramMedia(input, { pageUrl = '' } = {}) {
  const media = unwrapMedia(input);
  if (!media) return null;

  const user = media.user || media.owner || {};
  const shortcode = cleanShortcode(media.code || media.shortcode);
  const mediaType = detectMediaType(media);
  const canonicalUrl = media.permalink || pageUrl || '';
  const patch = compact({
    mediaId: scalar(media.pk || media.id),
    ownerId: scalar(user.pk || user.id || media.owner_id),
    owner: username(user.username || media.owner_username),
    mediaType,
    productType: scalar(media.product_type || media.productType),
    canonicalUrl,
    pageUrl,
    views: firstMetric(media, VIEW_KEYS),
    likes: firstMetric(media, ['like_count', 'likes', 'likeCount']),
    comments: firstMetric(media, ['comment_count', 'comments', 'commentCount']),
    reposts: firstMetric(media, ['repost_count', 'reshare_count', 'reposts', 'repostCount']),
    date: extractDate(media),
    videoUrl: bestVideoUrl(media),
    coverUrl: bestImageFromMedia(media),
    thumbUrl: bestImageFromMedia(media),
    carouselImages: carouselImagesFromMedia(media)
  });

  const identity = normalizeIdentity({
    shortcode,
    mediaId: patch.mediaId,
    ownerId: patch.ownerId,
    username: patch.owner,
    mediaType: patch.mediaType,
    productType: patch.productType,
    canonicalUrl: patch.canonicalUrl
  }, pageUrl);

  return { shortcode: identity?.shortcode || shortcode, identity, patch };
}

export function detectMediaType(media) {
  const mt = Number(media?.media_type ?? media?.mediaType);
  const productType = String(media?.product_type || media?.productType || '').toLowerCase();
  if (/reel|clips/.test(productType)) return 'REEL';
  if (mt === 8 || Array.isArray(media?.carousel_media)) return 'CAROUSEL';
  if (mt === 2 || media?.video_versions || media?.video_url) return 'VIDEO';
  if (mt === 1) return 'PHOTO';
  return '';
}

export function bestImageFromMedia(media) {
  if (!media || typeof media !== 'object') return '';
  const candidates = [
    ...(Array.isArray(media.image_versions2?.candidates) ? media.image_versions2.candidates : []),
    ...(Array.isArray(media.display_resources) ? media.display_resources : [])
  ];
  let best = '';
  let bestScore = -1;
  for (const candidate of candidates) {
    const url = candidate?.url || candidate?.src || '';
    const width = Number(candidate?.width || candidate?.config_width || 0);
    const height = Number(candidate?.height || candidate?.config_height || 0);
    const score = width * height;
    if (url && (score > bestScore || !best)) {
      best = url;
      bestScore = score;
    }
  }
  return best || media.display_url || media.thumbnail_src || media.thumbnail_url || media.image_url || '';
}

export function carouselImagesFromMedia(media) {
  const slides = Array.isArray(media?.carousel_media) ? media.carousel_media : [];
  const seen = new Set();
  const out = [];
  for (const slide of slides) {
    const url = bestImageFromMedia(slide);
    const key = normalizeMediaUrl(url) || url;
    if (!url || seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function bestVideoUrl(media) {
  const versions = Array.isArray(media?.video_versions) ? media.video_versions : [];
  let best = '';
  let bestScore = -1;
  for (const version of versions) {
    const url = version?.url || '';
    const score = Number(version?.width || 0) * Number(version?.height || 0);
    if (url && (score > bestScore || !best)) {
      best = url;
      bestScore = score;
    }
  }
  return best || media?.video_url || '';
}

function firstMetric(media, keys) {
  for (const key of keys) {
    const value = Number(media?.[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

function extractDate(media) {
  if (typeof media?.date === 'string' && media.date) return media.date;
  const takenAt = Number(media?.taken_at || media?.takenAt);
  if (!Number.isFinite(takenAt) || takenAt <= 0) return undefined;
  try {
    return new Date(takenAt * 1000).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

function unwrapMedia(input) {
  if (!input || typeof input !== 'object') return null;
  return input.media || input.item || input.node || input;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => {
    if (item === undefined || item === null || item === '') return false;
    return !Array.isArray(item) || item.length > 0;
  }));
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

function cleanShortcode(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '');
}

function username(value) {
  return String(value || '').trim().replace(/^@/, '');
}

function scalar(value) {
  return value == null ? '' : String(value).trim();
}
