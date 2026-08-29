export function extractContentModel(media) {
  const caption = captionText(media);
  if (!caption) return {};
  const entities = extractCaptionEntities(caption);
  return {
    caption,
    hashtags: entities.hashtags,
    mentions: entities.mentions
  };
}

export function captionText(media) {
  if (!media || typeof media !== 'object') return '';
  const candidates = [
    media.caption?.text,
    media.caption?.caption_text,
    media.caption_text,
    media.edge_media_to_caption?.edges?.[0]?.node?.text
  ];
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const cleaned = value.replace(/\u0000/g, '');
    if (cleaned.trim()) return cleaned;
  }
  return '';
}

export function extractCaptionEntities(text) {
  const source = String(text || '');
  return {
    hashtags: collectTokens(source, /#[\p{L}\p{N}_]+/gu),
    mentions: collectTokens(source, /@[A-Za-z0-9._]+/g)
  };
}

function collectTokens(source, pattern) {
  const out = [];
  const seen = new Set();
  for (const match of source.matchAll(pattern)) {
    const token = match[0];
    const key = token.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}
