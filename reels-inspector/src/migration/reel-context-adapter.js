const METRIC_PATTERNS = Object.freeze({
  likes: /좋아요|\blikes?\b/i,
  comments: /댓글|\bcomments?\b/i,
  reposts: /리포스트|재게시|\breposts?\b|\breshare\b/i
});

const PROFILE_RESERVED = new Set(['accounts', 'explore', 'reels', 'reel', 'p', 'direct', 'stories']);

export function createReelContextAdapter({ store, doc = globalThis.document, env = globalThis } = {}) {
  if (!store) throw new Error('Reel Context Adapter requires store adapter');

  function getCurrent() {
    const video = selectActiveVideo(doc, env);
    if (!video) return null;

    const viewport = viewportSize(env, doc);
    const videoRect = safeRect(video);
    if (!videoRect || visibleHeight(videoRect, viewport.height) < viewport.height * 0.45) return null;

    const root = findScopedRoot(video, viewport, env) || video.parentElement || doc;
    const native = readNativeMetrics(root, env);
    const username = readUsername(root, videoRect, viewport, env);
    const scopedCode = scopedShortcode(root, store, env);
    const mediaPost = store.findPostByMediaUrls?.(mediaUrls(video)) || null;
    const mediaCode = mediaPost?.shortcode || '';
    const urlCode = exactReelCode(env.location?.href || '');
    const resolved = resolveReelShortcode({ scopedCode, mediaCode, urlCode });
    const shortcode = resolved.shortcode;
    const post = shortcode ? store.getPost?.(shortcode) || null : null;
    const identity = shortcode ? toIdentity(post, {
      shortcode,
      username: username || post?.username || '',
      canonicalUrl: post?.canonicalUrl || canonicalReelUrl(shortcode),
      source: resolved.source
    }) : null;

    return {
      video,
      shortcode,
      identity,
      identitySource: resolved.source,
      username: username || post?.username || '',
      native,
      post
    };
  }

  function resolveActivityIdentity() {
    return getCurrent()?.identity || undefined;
  }

  return { getCurrent, resolveActivityIdentity };
}

export function resolveReelShortcode({ scopedCode = '', mediaCode = '', urlCode = '' } = {}) {
  if (scopedCode) return { shortcode: String(scopedCode), source: 'scoped-link' };
  if (mediaCode) return { shortcode: String(mediaCode), source: 'media-map' };
  if (urlCode) return { shortcode: String(urlCode), source: 'route' };
  return { shortcode: '', source: 'unresolved' };
}

export function parseMetricCount(text) {
  const source = String(text || '').replace(/\u00a0/g, ' ');
  const match = source.match(/([0-9]+(?:[.,][0-9]+)?)\s*(억|만|천|[KMBkmb])?/);
  if (!match) return undefined;
  let number = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(number) || number < 0) return undefined;
  const unit = match[2] || '';
  if (unit === '천' || /k/i.test(unit)) number *= 1000;
  else if (unit === '만') number *= 10000;
  else if (unit === '억') number *= 100000000;
  else if (/m/i.test(unit)) number *= 1000000;
  else if (/b/i.test(unit)) number *= 1000000000;
  return Math.round(number);
}

function selectActiveVideo(doc, env) {
  const videos = [...(doc?.querySelectorAll?.('video') || [])];
  const viewport = viewportSize(env, doc);
  let best = null;
  let bestScore = -Infinity;

  for (const video of videos) {
    const rect = safeRect(video);
    if (!rect) continue;
    const width = visibleWidth(rect, viewport.width);
    const height = visibleHeight(rect, viewport.height);
    const area = width * height;
    if (area < viewport.width * viewport.height * 0.18) continue;
    const center = (Math.max(0, rect.top) + Math.min(viewport.height, rect.bottom)) / 2;
    const playingBonus = video.paused === false ? viewport.width * viewport.height * 0.18 : 0;
    const score = area - Math.abs(center - viewport.height / 2) * viewport.width * 1.3 + playingBonus;
    if (score > bestScore) {
      best = video;
      bestScore = score;
    }
  }
  return best;
}

function findScopedRoot(video, viewport, env) {
  let current = video?.parentElement || null;
  let articleFallback = null;
  for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
    const rect = safeRect(current);
    if (!rect) continue;
    if (String(current.tagName || '').toLowerCase() === 'article') articleFallback = current;
    if (rect.width < viewport.width * 0.5 || rect.height < viewport.height * 0.42) continue;
    const recognized = recognizedControls(current, env, 180);
    if (recognized >= 2) return current;
  }
  return articleFallback;
}

function recognizedControls(root, env, limit) {
  let count = 0;
  const controls = root?.querySelectorAll?.('button,[role="button"],a') || [];
  for (let index = 0; index < controls.length && index < limit; index += 1) {
    const control = controls[index];
    if (!isVisible(control, env)) continue;
    const label = controlLabel(control);
    if (Object.values(METRIC_PATTERNS).some((pattern) => pattern.test(label))) count += 1;
  }
  return count;
}

function readNativeMetrics(root, env) {
  const output = { likes: undefined, comments: undefined, reposts: undefined };
  const controls = root?.querySelectorAll?.('button,[role="button"],a') || [];
  for (let index = 0; index < controls.length && index < 240; index += 1) {
    const control = controls[index];
    if (!isVisible(control, env)) continue;
    const label = controlLabel(control);
    const key = metricKey(label);
    if (!key || output[key] != null) continue;
    const value = metricValue(control, root, label);
    if (value != null) output[key] = value;
  }
  return output;
}

function metricKey(label) {
  for (const [key, pattern] of Object.entries(METRIC_PATTERNS)) if (pattern.test(label)) return key;
  return '';
}

function metricValue(control, root, label) {
  const fromLabel = parseMetricCount(label);
  if (fromLabel != null) return fromLabel;

  let current = control;
  for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
    const text = String(current.textContent || '').trim();
    if (text.length && text.length <= 90) {
      const value = parseMetricCount(text);
      if (value != null) return value;
    }
    if (current === root) break;
  }
  return undefined;
}

function readUsername(root, videoRect, viewport, env) {
  const links = root?.querySelectorAll?.('a[href^="/"]') || [];
  let best = null;
  let bestScore = -Infinity;
  for (let index = 0; index < links.length && index < 180; index += 1) {
    const link = links[index];
    if (!isVisible(link, env)) continue;
    const match = String(link.getAttribute?.('href') || '').match(/^\/([A-Za-z0-9._]+)\/?$/);
    if (!match || PROFILE_RESERVED.has(match[1].toLowerCase())) continue;
    const rect = safeRect(link);
    if (!rect) continue;
    const lowerHalf = rect.top >= Math.max(videoRect.top, 0) + Math.max(0, videoRect.height) * 0.45;
    const leftBias = Math.max(0, viewport.width - rect.left);
    const score = (lowerHalf ? 100000 : 0) + leftBias - Math.abs(rect.bottom - Math.min(viewport.height, videoRect.bottom));
    if (score > bestScore) {
      best = match[1].toLowerCase();
      bestScore = score;
    }
  }
  return best || '';
}

function scopedShortcode(root, store, env) {
  const anchors = root?.querySelectorAll?.('a[href*="/reel/"],a[href*="/reels/"]') || [];
  for (let index = 0; index < anchors.length && index < 120; index += 1) {
    const anchor = anchors[index];
    if (!isVisible(anchor, env)) continue;
    const code = store.codeFromUrl?.(anchor.href || anchor.getAttribute?.('href')) || exactReelCode(anchor.href || anchor.getAttribute?.('href'));
    if (code) return code;
  }
  return '';
}

function mediaUrls(video) {
  return [video?.currentSrc, video?.src, video?.poster]
    .map((value) => String(value || ''))
    .filter((value) => /^https?:/i.test(value));
}

function exactReelCode(url) {
  const match = String(url || '').match(/\/(?:reel|reels)\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
  return match ? match[1] : '';
}

function toIdentity(post, fallback) {
  return {
    shortcode: fallback.shortcode,
    mediaId: post?.mediaId || '',
    ownerId: post?.ownerId || '',
    username: fallback.username || '',
    mediaType: post?.mediaType || 'REEL',
    productType: post?.productType || '',
    canonicalUrl: fallback.canonicalUrl,
    parentMediaId: '',
    childMediaId: '',
    slideIndex: null,
    state: post?.mediaId || post?.username ? 'IDENTIFIED' : 'DETECTED',
    source: fallback.source
  };
}

function canonicalReelUrl(shortcode) {
  return shortcode ? `https://www.instagram.com/reel/${shortcode}/` : '';
}

function controlLabel(element) {
  const svg = element?.querySelector?.('svg[aria-label],svg[title]');
  return [
    element?.getAttribute?.('aria-label') || '',
    element?.getAttribute?.('title') || '',
    svg?.getAttribute?.('aria-label') || '',
    svg?.getAttribute?.('title') || '',
    element?.textContent || ''
  ].join(' ').trim();
}

function isVisible(element, env) {
  const rect = safeRect(element);
  if (!rect || rect.width <= 2 || rect.height <= 2) return false;
  const height = Number(env.innerHeight || env.visualViewport?.height || 0);
  return rect.bottom > 0 && (!height || rect.top < height);
}

function safeRect(element) {
  try {
    const rect = element?.getBoundingClientRect?.();
    if (!rect) return null;
    return {
      top: Number(rect.top) || 0,
      right: Number(rect.right) || 0,
      bottom: Number(rect.bottom) || 0,
      left: Number(rect.left) || 0,
      width: Number(rect.width) || 0,
      height: Number(rect.height) || 0
    };
  } catch {
    return null;
  }
}

function viewportSize(env, doc) {
  return {
    width: Number(env.visualViewport?.width || env.innerWidth || doc?.documentElement?.clientWidth || 0),
    height: Number(env.visualViewport?.height || env.innerHeight || doc?.documentElement?.clientHeight || 0)
  };
}

function visibleWidth(rect, viewportWidth) {
  return Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
}

function visibleHeight(rect, viewportHeight) {
  return Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
}
