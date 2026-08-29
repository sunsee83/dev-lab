import { shortcodeFromUrl } from './identity.js';

const VIEW_KEYS = [
  'play_count', 'ig_play_count', 'video_play_count', 'video_view_count',
  'view_count', 'clips_play_count', 'reel_view_count', 'media_view_count',
  'views', 'plays'
];
const LIKE_KEYS = ['like_count', 'likes_count'];
const COMMENT_KEYS = ['comment_count', 'comments_count'];
const REPOST_KEYS = ['reshare_count', 'repost_count', 'reposts_count'];
const DATE_KEYS = ['taken_at', 'taken_at_timestamp'];

export function extractPermalinkHtml(html, { pageUrl = '', fetched } = {}) {
  const source = String(html || '');
  const shortcode = shortcodeFromUrl(pageUrl);
  if (!shortcode) return null;

  const meta = extractMeta(source);
  const description = meta.description || meta['og:description'] || '';
  const videoUrl = meta['og:video:secure_url'] || meta['og:video'] || '';
  const coverUrl = meta['og:image'] || '';
  const reel = /\/(?:reel|reels)\//i.test(pageUrl);
  const takenAt = nearMetric(source, shortcode, DATE_KEYS);

  const patch = compact({
    pageUrl,
    canonicalUrl: pageUrl,
    mediaType: reel ? 'REEL' : (videoUrl ? 'VIDEO' : undefined),
    views: reel || videoUrl ? nearMetric(source, shortcode, VIEW_KEYS) : undefined,
    likes: descriptionMetric(description, 'likes') ?? nearMetric(source, shortcode, LIKE_KEYS),
    comments: descriptionMetric(description, 'comments') ?? nearMetric(source, shortcode, COMMENT_KEYS),
    reposts: nearMetric(source, shortcode, REPOST_KEYS),
    date: unixDate(takenAt),
    videoUrl,
    coverUrl,
    thumbUrl: coverUrl,
    fetched: Number.isFinite(Number(fetched)) ? Number(fetched) : undefined
  });

  return { shortcode, patch };
}

export function nearMetric(html, shortcode, keys) {
  const source = String(html || '');
  const code = String(shortcode || '');
  const position = source.indexOf(code);
  if (!code || position < 0) return undefined;
  const area = source.slice(Math.max(0, position - 18000), Math.min(source.length, position + 30000));
  for (const key of keys || []) {
    const match = area.match(new RegExp('["\\\\]?' + escapeRegExp(key) + '["\\\\]?\\s*:\\s*["\\\\]?([0-9]+)', 'i'));
    if (match) return Number(match[1]);
  }
  return undefined;
}

function extractMeta(html) {
  const output = {};
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = extractAttributes(tag);
    const key = String(attrs.property || attrs.name || '').toLowerCase();
    if (!key || output[key]) continue;
    output[key] = decodeAttribute(attrs.content || '');
  }
  return output;
}

function extractAttributes(tag) {
  const output = {};
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    output[String(match[1] || '').toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return output;
}

function descriptionMetric(description, label) {
  const match = String(description || '').match(new RegExp('([\\d.,]+\\s*[KkMmBb]?)\\s+' + label + '?', 'i'));
  return match ? parseCount(match[1]) : undefined;
}

function parseCount(text) {
  const source = String(text || '').replace(/[\s,]/g, '');
  const match = source.match(/^([0-9]+(?:\.[0-9]+)?)([KMBkmb])?$/);
  if (!match) return undefined;
  let value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0) return undefined;
  const unit = match[2] || '';
  if (/k/i.test(unit)) value *= 1000;
  else if (/m/i.test(unit)) value *= 1000000;
  else if (/b/i.test(unit)) value *= 1000000000;
  return Math.round(value);
}

function unixDate(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  try {
    return new Date(timestamp * 1000).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

function decodeAttribute(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
