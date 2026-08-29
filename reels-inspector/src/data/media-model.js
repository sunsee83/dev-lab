import { mediaUrlKey } from './identity.js';

export function buildMediaList(post = {}) {
  const type = String(post.mediaType || '').toUpperCase();
  const out = [];
  const seen = new Set();
  const add = (kind, url, extra = {}) => {
    const value = cleanUrl(url);
    const key = mediaUrlKey(value) || value;
    const identity = kind === 'carousel-slide' ? `${kind}|${extra.slideIndex}` : `${kind}|${key}`;
    if (!value || seen.has(identity)) return;
    seen.add(identity);
    out.push(Object.freeze({ kind, url: value, ...extra }));
  };

  if (type === 'REEL' || type === 'VIDEO') {
    add('video', post.videoUrl);
    add('cover', post.coverUrl || post.thumbUrl);
  } else if (type === 'PHOTO') {
    add('photo', post.coverUrl || post.thumbUrl);
  } else if (type === 'CAROUSEL') {
    const images = Array.isArray(post.carouselImages) ? post.carouselImages : [];
    images.forEach((url, index) => add('carousel-slide', url, { slideIndex: index }));
  }

  return Object.freeze(out);
}

function cleanUrl(url) {
  const value = String(url || '').trim();
  return /^https?:/i.test(value) ? value : '';
}
