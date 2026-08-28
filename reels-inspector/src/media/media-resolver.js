export function resolveGridCardMedia({ anchor, post, shortcode } = {}) {
  const type = effectiveType(anchor, post);
  const imageUrl = bestDomImageUrl(anchor) || post?.coverUrl || post?.thumbUrl || '';
  const videoUrl = /^https?:/i.test(String(post?.videoUrl || '')) ? post.videoUrl : '';
  const carouselImages = Array.isArray(post?.carouselImages) ? post.carouselImages.filter(Boolean) : [];
  const href = String(anchor?.href || '');
  return {
    shortcode: shortcode || post?.shortcode || '',
    type,
    imageUrl,
    videoUrl,
    carouselImages,
    pageUrl: stripQuery(href) || post?.canonicalUrl || ''
  };
}

export function extensionFromUrl(url, fallback = '') {
  const clean = String(url || '').split('?')[0];
  const match = clean.match(/\.([A-Za-z0-9]{2,5})$/);
  return match ? `.${match[1].toLowerCase()}` : fallback;
}

export function mediaFilename({ kind, shortcode, url = '', slideIndex = null } = {}) {
  const code = String(shortcode || 'media').replace(/[^A-Za-z0-9_-]/g, '') || 'media';
  if (kind === 'video') return `Instagram_${code}_video${extensionFromUrl(url, '.mp4')}`;
  if (kind === 'cover') return `Instagram_${code}_thumb${extensionFromUrl(url, '.jpg')}`;
  if (kind === 'photo') return `Instagram_${code}_image${extensionFromUrl(url, '.jpg')}`;
  if (kind === 'carousel-slide') {
    const index = Math.max(0, Number(slideIndex || 0));
    return `Instagram_${code}_slide_${String(index).padStart(2, '0')}${extensionFromUrl(url, '.jpg')}`;
  }
  return `Instagram_${code}_export.txt`;
}

function effectiveType(anchor, post) {
  const stored = String(post?.mediaType || '').toUpperCase();
  if (['REEL', 'VIDEO', 'PHOTO', 'CAROUSEL'].includes(stored)) return stored;
  const href = String(anchor?.href || '');
  if (/\/(?:reel|reels)\//.test(href)) return 'REEL';
  if (anchor?.querySelector?.('video')) return 'VIDEO';
  return /\/p\//.test(href) ? 'PHOTO' : '';
}

function bestDomImageUrl(anchor) {
  if (!anchor?.querySelectorAll) return '';
  const ar = anchor.getBoundingClientRect();
  const anchorArea = Math.max(1, ar.width * ar.height);
  let best = '';
  let bestScore = -1;

  for (const img of anchor.querySelectorAll('img')) {
    const rect = img.getBoundingClientRect();
    const overlapWidth = Math.max(0, Math.min(ar.right, rect.right) - Math.max(ar.left, rect.left));
    const overlapHeight = Math.max(0, Math.min(ar.bottom, rect.bottom) - Math.max(ar.top, rect.top));
    const overlap = overlapWidth * overlapHeight;
    if (!overlap) continue;
    const coverage = overlap / anchorArea;
    if (rect.width < ar.width * 0.62 || rect.height < ar.height * 0.62 || coverage < 0.38) continue;

    const label = [img.alt || '', img.getAttribute?.('aria-label') || '', img.getAttribute?.('title') || '']
      .join(' ')
      .toLowerCase();
    if (/music|audio|album|avatar|profile|음악|음원|오디오|앨범|프로필/.test(label) && coverage < 0.8) continue;

    const url = bestSrcFromImg(img);
    if (!url) continue;
    let score = coverage * 1_000_000 + overlap;
    if (rect.width >= ar.width * 0.9 && rect.height >= ar.height * 0.9) score += 1_000_000;
    if (score > bestScore) {
      bestScore = score;
      best = url;
    }
  }
  return best;
}

function bestSrcFromImg(img) {
  const srcset = img?.getAttribute?.('srcset') || '';
  let best = '';
  let bestWidth = -1;
  if (srcset) {
    for (const part of srcset.split(',')) {
      const match = part.trim().match(/^(.*)\s+(\d+(?:\.\d+)?)(w|x)$/);
      if (!match) continue;
      let score = Number(match[2]);
      if (match[3] === 'x') score *= 10_000;
      if (score > bestWidth) {
        bestWidth = score;
        best = match[1].trim();
      }
    }
  }
  return best || img?.currentSrc || img?.src || '';
}

function stripQuery(url) {
  return String(url || '').split('?')[0].split('#')[0];
}
