import { extractInstagramMedia } from './extractor.js';
import { createVerifiedStore } from '../store/verified-store.js';

export function createDataEngine({ legacyAdapter, history, now = () => Date.now() } = {}) {
  const verified = createVerifiedStore({
    initialItems: legacyAdapter?.getItemsSnapshot?.() || {},
    now
  });

  function syncLegacy() {
    const snapshot = legacyAdapter?.getItemsSnapshot?.();
    if (!snapshot) return verified.snapshot();
    return verified.replaceSnapshot(snapshot);
  }

  function ingest(input, { pageUrl = '', source = 'network', confidence } = {}) {
    const extracted = extractInstagramMedia(input, { pageUrl });
    if (!extracted?.shortcode) return null;
    const result = verified.upsert(extracted.shortcode, extracted.patch, { source, confidence });
    const post = verified.getPost(extracted.shortcode);
    if (result.changed) history?.record?.(post);
    return { identity: verified.getIdentity(extracted.shortcode), post, changed: result.changed };
  }

  return {
    getPost: verified.getPost,
    getIdentity: verified.getIdentity,
    getItem: verified.getItem,
    getSnapshots: history?.getSnapshots,
    getAccountPosts: history?.getAccountPosts,
    syncLegacy,
    ingest,
    snapshot: verified.snapshot
  };
}
