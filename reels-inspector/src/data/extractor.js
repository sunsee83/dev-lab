import { normalizeIdentity } from './identity.js';

const VIEW_KEYS = [
  'play_count', 'ig_play_count', 'video_play_count', 'video_view_count',
  'view_count', 'clips_play_count', 'reel_view_count', 'media_view_count',
  'views', 'plays'
];
const LIKE_KEYS = ['like_count', 'likes_count', 'likes', 'likeCount'];
const COMMENT_KEYS = ['comment_count', 'comments_count', 'comments', 'commentCount'];
const REPOST_KEYS = ['repost_count', 'reshare_count', 'reposts_count', 'reposts', 'repostCount'];

export function extractInstagramMedia(input, { pageUrl = '' } = {}) {
  const media = unwrapMedia(input);
  if (!media) return null;

  const shortcode = cleanShortcode(media.code || media.shortcode || media.short_code);
  if (!shortcode) return null;
  const user = media.user || media.owner || media.owner_user || {};
  const mediaType = detectMediaType(media);
  const evidence = collectMediaEvidence(media, shortcode);
  const coverUrl = bestImageFromMedia(media) || evidence.imageUrls[0] || '';
  const videoUrl = bestVideoUrl(media, evidence.videoUrls);
  const canonicalUrl = media.permalink || media.canonical_url || pageUrl || '';
  const patch = compact({
    mediaId: scalar(media.pk || media.id || media.media_id),
    ownerId: scalar(user.pk || user.id || media.user_id || media.owner_id),
    owner: username(user.username || media.owner_username),
    mediaType,
    productType: scalar(media.product_type || media.productType),
    canonicalUrl,
    pageUrl,
    views: metricFromMediaTree(media, VIEW_KEYS, shortcode),
    likes: metricFromMediaTree(media, LIKE_KEYS, shortcode),
    comments: metricFromMediaTree(media, COMMENT_KEYS, shortcode),
    reposts: metricFromMediaTree(media, REPOST_KEYS, shortcode),
    date: extractDate(media, shortcode),
    videoUrl,
    coverUrl,
    thumbUrl: coverUrl,
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

  return {
    shortcode: identity?.shortcode || shortcode,
    identity,
    patch,
    evidence
  };
}

export function detectMediaType(media) {
  const mt = Number(media?.media_type ?? media?.mediaType);
  const productType = String(media?.product_type || media?.productType || '').toLowerCase();
  if (/reel|clips/.test(productType)) return 'REEL';
  if (mt === 8 || carouselSlides(media).length) return 'CAROUSEL';
  if (mt === 2 || media?.video_versions || media?.video_url || media?.video_src) return 'VIDEO';
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
  const out = [];
  for (const slide of carouselSlides(media)) {
    const url = bestImageFromMedia(slide) || collectMediaEvidence(slide, '').imageUrls[0] || '';
    if (url) out.push(url);
  }
  return out;
}

export function collectMediaEvidence(media, shortcode = '') {
  const videoUrls = [];
  const imageUrls = [];
  const seenVideo = new Set();
  const seenImage = new Set();
  const stack = [{ value: media, depth: 0 }];

  while (stack.length) {
    const current = stack.pop();
    if (!current?.value || typeof current.value !== 'object' || current.depth > 3) continue;
    for (const [key, value] of Object.entries(current.value).slice(0, 130)) {
      if (typeof value === 'string' && /^https?:/i.test(value)) {
        const videoLike = /^(video_url|video_src|playback_url)$/i.test(key) || /\.mp4(?:\?|$)/i.test(value);
        const imageLike = /image|thumbnail|display|poster|image_url|src/i.test(key) && !/\.mp4/i.test(value);
        if (videoLike) addUnique(videoUrls, seenVideo, value);
        else if (imageLike) addUnique(imageUrls, seenImage, value);
        continue;
      }
      if (!value || typeof value !== 'object') continue;
      const childCode = cleanShortcode(value.code || value.shortcode || value.short_code);
      if (shortcode && childCode && childCode !== shortcode) continue;
      stack.push({ value, depth: current.depth + 1 });
    }
  }
  return { videoUrls, imageUrls };
}

function bestVideoUrl(media, evidenceUrls = []) {
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
  return best || media?.video_url || media?.video_src || evidenceUrls[0] || '';
}

function metricFromMediaTree(media, keys, shortcode) {
  const stack = [{ value: media, depth: 0 }];
  while (stack.length) {
    const current = stack.shift();
    const value = current?.value;
    if (!value || typeof value !== 'object' || current.depth > 2) continue;
    const direct = firstMetric(value, keys);
    if (direct !== undefined) return direct;
    for (const child of Object.values(value).slice(0, 80)) {
      if (!child || typeof child !== 'object' || Array.isArray(child)) continue;
      const childCode = cleanShortcode(child.code || child.shortcode || child.short_code);
      if (childCode && childCode !== shortcode) continue;
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }
  return undefined;
}

function firstMetric(media, keys) {
  for (const key of keys) {
    if (media?.[key] == null || media?.[key] === '') continue;
    const value = Number(media[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

function extractDate(media, shortcode) {
  if (typeof media?.date === 'string' && media.date) return media.date;
  const takenAt = metricFromMediaTree(media, ['taken_at', 'taken_at_timestamp', 'takenAt'], shortcode);
  if (!Number.isFinite(takenAt) || takenAt <= 0) return undefined;
  try {
    return new Date(takenAt * 1000).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

function carouselSlides(media) {
  if (Array.isArray(media?.carousel_media)) return media.carousel_media;
  if (Array.isArray(media?.carouselMedia)) return media.carouselMedia;
  const edges = media?.edge_sidecar_to_children?.edges;
  return Array.isArray(edges) ? edges.map((edge) => edge?.node || edge).filter(Boolean) : [];
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

function addUnique(out, seen, value) {
  if (!value || seen.has(value)) return;
  seen.add(value);
  out.push(value);
}

function cleanShortcode(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '');
}

function username(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function scalar(value) {
  return value == null ? '' : String(value).trim();
}
