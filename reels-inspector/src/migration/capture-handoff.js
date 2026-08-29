export const LEGACY_CAPTURE_HOOK = '__RI32_CAPTURE_PATCH__';

export function installLegacyCaptureHandoff({ env = globalThis, data } = {}) {
  const previous = env[LEGACY_CAPTURE_HOOK];
  env[LEGACY_CAPTURE_HOOK] = (capture = {}) => {
    if (!data?.ingestPatch) return null;
    return data.ingestPatch(capture.shortcode, capture.patch, {
      source: capture.source || 'embedded',
      confidence: capture.confidence
    });
  };

  return () => {
    if (previous === undefined) delete env[LEGACY_CAPTURE_HOOK];
    else env[LEGACY_CAPTURE_HOOK] = previous;
  };
}
