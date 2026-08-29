export const LEGACY_RENDER_VIEW_HOOK = '__RI32_RENDER_VIEW__';

export function installLegacyRendererHandoff({ env = globalThis, data, metrics } = {}) {
  const previous = env[LEGACY_RENDER_VIEW_HOOK];

  function getView(shortcode, liveMetrics = {}) {
    if (!shortcode) return null;
    const stored = data?.getPost?.(shortcode) || null;
    if (!stored) return null;
    const post = {
      ...stored,
      shortcode,
      likes: liveMetric(liveMetrics.likes, stored.likes),
      comments: liveMetric(liveMetrics.comments, stored.comments),
      reposts: liveMetric(liveMetrics.reposts, stored.reposts)
    };
    return {
      post,
      derived: metrics?.summarize?.(post) || {
        engagementRate: undefined,
        growth24h: undefined,
        accountMultiple: undefined
      }
    };
  }

  env[LEGACY_RENDER_VIEW_HOOK] = getView;

  function destroy() {
    if (previous === undefined) delete env[LEGACY_RENDER_VIEW_HOOK];
    else env[LEGACY_RENDER_VIEW_HOOK] = previous;
  }

  return { getView, destroy };
}

function liveMetric(nativeValue, storedValue) {
  return nativeValue == null ? storedValue : nativeValue;
}
