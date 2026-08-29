import { extractInstagramMedia } from './extractor.js';
import { createVerifiedStore } from '../store/verified-store.js';

export function createDataEngine({ legacyAdapter, history, persistence, now = () => Date.now(), onChange } = {}) {
  const initialItems = persistence?.load?.() || legacyAdapter?.getItemsSnapshot?.() || {};
  const verified = createVerifiedStore({ initialItems, now });

  function syncLegacy() {
    const snapshot = legacyAdapter?.getItemsSnapshot?.();
    if (!snapshot) return verified.snapshot();
    return verified.replaceSnapshot(snapshot);
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
    getItem: verified.getItem,
    getSnapshots: history?.getSnapshots,
    getAccountPosts: history?.getAccountPosts,
    syncLegacy,
    ingest,
    ingestPatch,
    flush,
    destroy,
    snapshot: verified.snapshot
  };
}
