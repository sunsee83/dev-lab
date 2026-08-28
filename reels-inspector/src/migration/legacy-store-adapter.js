const CACHE_KEY = 'ri311:items:v1';

export function createLegacyStoreAdapter({ env = globalThis } = {}) {
  function readItems() {
    try {
      const raw = env.localStorage?.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function getItem(shortcode) {
    if (!shortcode) return null;
    return readItems()[shortcode] || null;
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
      views: value('views'),
      likes: value('likes'),
      comments: value('comments'),
      reposts: value('reposts'),
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

  return { getItem, getPost, getCurrentIdentity, codeFromUrl };
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

function normalizeImages(value) {
  return Array.isArray(value) ? value.filter((url) => /^https?:/i.test(String(url || ''))) : [];
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
