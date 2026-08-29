export const LEGACY_REEL_CONTEXT_HOOK = '__RI32_REEL_CONTEXT__';

export function installLegacyReelContextHandoff({ env = globalThis, reelContext, data } = {}) {
  const previous = env[LEGACY_REEL_CONTEXT_HOOK];
  let lastEnrichmentKey = '';

  function getCurrent() {
    const current = reelContext?.getCurrent?.() || null;
    if (!current) return null;

    const shortcode = current.shortcode || current.identity?.shortcode || '';
    if (!shortcode) return { ...current, status: 'IDENTIFYING' };

    const username = current.username || current.identity?.username || '';
    const canonicalUrl = current.post?.canonicalUrl || current.identity?.canonicalUrl || `https://www.instagram.com/reel/${shortcode}/`;
    const enrichmentKey = `${shortcode}|${username}|${canonicalUrl}`;
    let enriched = null;

    if (enrichmentKey !== lastEnrichmentKey) {
      lastEnrichmentKey = enrichmentKey;
      enriched = data?.ingestPatch?.(shortcode, {
        owner: username || undefined,
        mediaType: 'REEL',
        pageUrl: canonicalUrl,
        canonicalUrl
      }, { source: 'dom', confidence: 'high' }) || null;
    }

    const post = enriched?.post || data?.getPost?.(shortcode) || current.post || null;
    const identity = enriched?.identity || data?.getIdentity?.(shortcode) || current.identity || null;
    return {
      ...current,
      shortcode,
      username: username || post?.username || identity?.username || '',
      post,
      identity,
      status: 'IDENTIFIED'
    };
  }

  env[LEGACY_REEL_CONTEXT_HOOK] = getCurrent;

  function destroy() {
    if (previous === undefined) delete env[LEGACY_REEL_CONTEXT_HOOK];
    else env[LEGACY_REEL_CONTEXT_HOOK] = previous;
  }

  return { getCurrent, destroy };
}
