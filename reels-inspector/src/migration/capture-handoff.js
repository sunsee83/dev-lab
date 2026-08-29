export const LEGACY_CAPTURE_HOOK = '__RI32_CAPTURE_PATCH__';
export const LEGACY_RAW_CAPTURE_HOOK = '__RI32_CAPTURE_RAW__';

export function installLegacyCaptureHandoff({ env = globalThis, data } = {}) {
  const previousPatch = env[LEGACY_CAPTURE_HOOK];
  const previousRaw = env[LEGACY_RAW_CAPTURE_HOOK];

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

  return () => {
    restore(env, LEGACY_CAPTURE_HOOK, previousPatch);
    restore(env, LEGACY_RAW_CAPTURE_HOOK, previousRaw);
  };
}

function restore(env, key, previous) {
  if (previous === undefined) delete env[key];
  else env[key] = previous;
}
