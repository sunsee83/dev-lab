const MEDIA_TYPES = new Set(['REEL', 'VIDEO', 'PHOTO', 'CAROUSEL']);

export function shortcodeFromUrl(url) {
  const match = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : '';
}

export function mediaTypeFromUrl(url) {
  const value = String(url || '');
  if (/\/(?:reel|reels)\//.test(value)) return 'REEL';
  return '';
}

export function mediaUrlKey(url) {
  const text = String(url || '');
  if (!text || /^blob:/i.test(text)) return '';
  try {
    const parsed = new URL(text.replace(/\\u0026/g, '&').replace(/\\\//g, '/'), 'https://www.instagram.com/');
    return [parsed.hostname, parsed.pathname].join('');
  } catch {
    return '';
  }
}

export function canonicalizeInstagramUrl(url, baseUrl = 'https://www.instagram.com/') {
  if (!url) return '';
  try {
    const parsed = new URL(String(url), baseUrl);
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return String(url).split('?')[0].split('#')[0];
  }
}

export function normalizeIdentity(input = {}, fallbackUrl = '') {
  const sourceUrl = input.canonicalUrl || input.pageUrl || fallbackUrl || '';
  const shortcode = cleanShortcode(input.shortcode) || shortcodeFromUrl(sourceUrl);
  if (!shortcode) return null;

  const mediaId = cleanScalar(input.mediaId);
  const ownerId = cleanScalar(input.ownerId);
  const username = cleanUsername(input.username || input.owner);
  const mediaType = normalizeMediaType(input.mediaType) || mediaTypeFromUrl(sourceUrl);
  const canonicalUrl = canonicalizeInstagramUrl(sourceUrl);
  const productType = cleanScalar(input.productType);
  const parentMediaId = cleanScalar(input.parentMediaId);
  const childMediaId = cleanScalar(input.childMediaId);
  const slideIndex = Number.isInteger(Number(input.slideIndex)) && Number(input.slideIndex) >= 0
    ? Number(input.slideIndex)
    : null;

  return {
    shortcode,
    mediaId,
    ownerId,
    username,
    mediaType,
    productType,
    canonicalUrl,
    parentMediaId,
    childMediaId,
    slideIndex,
    state: identityState({ shortcode, mediaId, username, mediaType })
  };
}

export function identityKey(identity) {
  if (!identity?.shortcode) return '';
  return [
    identity.shortcode,
    identity.mediaId || '',
    identity.parentMediaId || '',
    identity.childMediaId || '',
    identity.slideIndex ?? ''
  ].join('|');
}

function identityState(identity) {
  if (identity.mediaId || (identity.username && identity.mediaType)) return 'IDENTIFIED';
  if (identity.username || identity.mediaType) return 'IDENTIFYING';
  return 'DETECTED';
}

function normalizeMediaType(value) {
  const type = String(value || '').toUpperCase();
  return MEDIA_TYPES.has(type) ? type : '';
}

function cleanShortcode(value) {
  const code = String(value || '').replace(/[^A-Za-z0-9_-]/g, '');
  return code;
}

function cleanUsername(value) {
  return String(value || '').trim().replace(/^@/, '');
}

function cleanScalar(value) {
  return value == null ? '' : String(value).trim();
}
