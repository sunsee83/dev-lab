import { mediaUrlKey, normalizeIdentity, shortcodeFromUrl } from './identity.js';
import { extractInstagramMedia } from './extractor.js';
import { extractPermalinkHtml } from './permalink-extractor.js';
import { createVerifiedStore } from '../store/verified-store.js';

export function createDataEngine({ legacyAdapter, history, persistence, now = () => Date.now(), onChange } = {}) {
  const initialItems = persistence?.load?.() || legacyAdapter?.getItemsSnapshot?.() || {};
  const verified = createVerifiedStore({ initialItems, now });

  function syncLegacy() {
    const snapshot = legacyAdapter?.getItemsSnapshot?.();
    if (!snapshot) return verified.snapshot();
    return verified.replaceSnapshot(snapshot);
  }

  function getIdentityFromUrl(url = '') {
    const shortcode = shortcodeFromUrl(url);
    if (!shortcode) return null;
    const post = verified.getPost(shortcode) || { shortcode };
    return normalizeIdentity({ ...post, shortcode }, url);
  }

  function findPostByMediaUrls(urls) {
    const targets = new Set((Array.isArray(urls) ? urls : [urls]).map(mediaUrlKey).filter(Boolean));
    if (!targets.size) return null;

    let best = null;
    let bestScore = 0;
    const snapshot = verified.snapshot();
    for (const shortcode of Object.keys(snapshot)) {
      const post = verified.getPost(shortcode);
      if (!post) continue;
      const candidates = [
        [post.videoUrl, 4],
        [post.coverUrl, 3],
        [post.thumbUrl, 2],
        ...(post.carouselImages || []).map((url) => [url, 1])
      ];
      let score = 0;
      for (const [url, weight] of candidates) {
        const key = mediaUrlKey(url);
        if (key && targets.has(key)) score = Math.max(score, weight);
      }
      if (score <= bestScore) continue;
      bestScore = score;
      best = post;
      if (score === 4) break;
    }
    return best;
  }

  function applyPatch(shortcode, patch = {}, { source = 'dom', confidence } = {}) {
    const result = verified.upsert(shortcode, patch, { source, confidence });
    if (!result.item) return null;
    const post = verified.getPost(shortcode);
    const identity = verified.getIdentity(shortcode);
    if (result.changed) {
      history?.record?.(post);
      persistence?.schedule?.(verified.snapshot());
      if (typeof onChange === 'function') onChange({ shortcode, identity, post, item: result.item });
    }
    return { identity, post, item: result.item, changed: result.changed };
  }

  function ingestPatch(shortcode, patch = {}, options = {}) {
    return applyPatch(shortcode, patch, options);
  }

  function ingest(input, { pageUrl = '', source = 'network', confidence } = {}) {
    const extracted = extractInstagramMedia(input, { pageUrl });
    if (!extracted?.shortcode) return null;
    const result = applyPatch(extracted.shortcode, extracted.patch, { source, confidence });
    return result ? { ...result, evidence: extracted.evidence } : null;
  }

  function ingestPermalink(html, { pageUrl = '', source = 'permalink', confidence = 'medium', fetched = now() } = {}) {
    const extracted = extractPermalinkHtml(html, { pageUrl, fetched });
    if (!extracted?.shortcode) return null;
    return applyPatch(extracted.shortcode, extracted.patch, { source, confidence });
  }

  function flush() {
    return persistence?.flush?.(verified.snapshot()) ?? false;
  }

  function destroy() {
    flush();
    persistence?.destroy?.();
  }

  return {
    getPost: verified.getPost,
    getIdentity: verified.getIdentity,
    getIdentityFromUrl,
    findPostByMediaUrls,
    getItem: verified.getItem,
    getSnapshots: history?.getSnapshots,
    getAccountPosts: history?.getAccountPosts,
    syncLegacy,
    ingest,
    ingestPermalink,
    ingestPatch,
    flush,
    destroy,
    snapshot: verified.snapshot
  };
}
