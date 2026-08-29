export const LEGACY_CAPTURE_HOOK = '__RI32_CAPTURE_PATCH__';
export const LEGACY_RAW_CAPTURE_HOOK = '__RI32_CAPTURE_RAW__';
export const LEGACY_PERMALINK_CAPTURE_HOOK = '__RI32_CAPTURE_PERMALINK__';

export function installLegacyCaptureHandoff({ env = globalThis, data } = {}) {
  const previousPatch = env[LEGACY_CAPTURE_HOOK];
  const previousRaw = env[LEGACY_RAW_CAPTURE_HOOK];
  const previousPermalink = env[LEGACY_PERMALINK_CAPTURE_HOOK];

  env[LEGACY_CAPTURE_HOOK] = (capture = {}) => {
    if (!data?.ingestPatch) return null;
    return data.ingestPatch(capture.shortcode, capture.patch, {
      source: capture.source || 'embedded',
      confidence: capture.confidence
    });
  };

  env[LEGACY_RAW_CAPTURE_HOOK] = (capture = {}) => {
    if (!data?.ingest) return null;
    return data.ingest(capture.input, {
      pageUrl: capture.pageUrl || '',
      source: capture.source || 'embedded',
      confidence: capture.confidence
    });
  };

  env[LEGACY_PERMALINK_CAPTURE_HOOK] = (capture = {}) => {
    if (!data?.ingestPermalink) return null;
    return data.ingestPermalink(capture.html || '', {
      pageUrl: capture.pageUrl || '',
      source: capture.source || 'permalink',
      confidence: capture.confidence,
      fetched: capture.fetched
    });
  };

  return () => {
    restore(env, LEGACY_CAPTURE_HOOK, previousPatch);
    restore(env, LEGACY_RAW_CAPTURE_HOOK, previousRaw);
    restore(env, LEGACY_PERMALINK_CAPTURE_HOOK, previousPermalink);
  };
}

function restore(env, key, previous) {
  if (previous === undefined) delete env[key];
  else env[key] = previous;
}
