import { EVENTS } from '../core/app.js';
import { compactCountLabel, multipleLabel, percentLabel, shortDateLabel } from './metric-format.js';

const OVERLAY_ID = 'ri32-reel-overlay';
const LEGACY_OVERLAY_ID = 'ri3-reels-overlay';

export function mountReelOverlay({
  app,
  reelContext,
  store,
  metrics,
  layout,
  doc = globalThis.document,
  env = globalThis
} = {}) {
  if (!doc?.documentElement || !reelContext || !store || !metrics) {
    throw new Error('Reel Overlay requires document, context adapter, store and Metrics Engine');
  }

  let destroyed = false;
  let node = doc.getElementById(OVERLAY_ID);
  let scheduled = false;
  let frameId = 0;
  let renderKey = '';
  const cleanups = [];

  doc.getElementById(LEGACY_OVERLAY_ID)?.remove();

  function ensureNode() {
    if (node) return node;
    node = doc.createElement('div');
    node.id = OVERLAY_ID;
    node.setAttribute('aria-hidden', 'true');
    doc.documentElement.appendChild(node);
    return node;
  }

  function render() {
    scheduled = false;
    frameId = 0;
    if (destroyed) return;
    doc.getElementById(LEGACY_OVERLAY_ID)?.remove();

    const context = reelContext.getCurrent();
    if (!context?.shortcode) return hide();

    const stored = store.getPost?.(context.shortcode) || context.post || { shortcode: context.shortcode };
    const livePost = mergePost(stored, context);
    const derived = metrics.summarize(livePost) || {};
    const lines = buildLines(livePost, derived);
    if (!lines.length) return hide();

    const overlay = ensureNode();
    const nextKey = `${context.shortcode}|${lines.join('|')}`;
    if (nextKey !== renderKey) {
      overlay.replaceChildren(...lines.map((text) => {
        const row = doc.createElement('div');
        row.textContent = text;
        return row;
      }));
      renderKey = nextKey;
    }
    overlay.style.display = 'flex';
  }

  function hide() {
    if (node) node.style.display = 'none';
    renderKey = '';
  }

  function schedule() {
    if (destroyed || scheduled) return;
    scheduled = true;
    const raf = env.requestAnimationFrame || ((callback) => (env.setTimeout || setTimeout)(callback, 16));
    frameId = raf(render);
  }

  function listen(target, eventName) {
    if (!target?.addEventListener) return;
    target.addEventListener(eventName, schedule, true);
    cleanups.push(() => target.removeEventListener?.(eventName, schedule, true));
  }

  for (const eventName of [EVENTS.ROUTE_CHANGED, EVENTS.IDENTITY_CHANGED, EVENTS.STORE_CHANGED]) {
    cleanups.push(app?.on?.(eventName, schedule) || (() => {}));
  }
  cleanups.push(layout?.subscribe?.(schedule) || (() => {}));
  listen(doc, 'play');
  listen(doc, 'loadedmetadata');
  listen(env, 'scroll');
  listen(env, 'resize');
  schedule();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    scheduled = false;
    for (const cleanup of cleanups.splice(0)) cleanup();
    if (frameId && typeof env.cancelAnimationFrame === 'function') env.cancelAnimationFrame(frameId);
    frameId = 0;
    node?.remove();
    node = null;
    renderKey = '';
  }

  return { render, schedule, destroy };
}

export function buildReelOverlayLines(post, derived = {}) {
  return buildLines(post, derived);
}

function mergePost(stored, context) {
  return {
    ...stored,
    shortcode: context.shortcode,
    username: context.username || stored?.username || '',
    mediaType: stored?.mediaType || 'REEL',
    likes: liveMetric(context.native?.likes, stored?.likes),
    comments: liveMetric(context.native?.comments, stored?.comments),
    reposts: liveMetric(context.native?.reposts, stored?.reposts)
  };
}

function liveMetric(nativeValue, storedValue) {
  return nativeValue == null ? storedValue : nativeValue;
}

function buildLines(post, derived) {
  const lines = [];
  const views = compactCountLabel(post?.views, { missing: '' });
  const engagement = percentLabel(derived?.engagementRate, { missing: '' });
  const growth = percentLabel(derived?.growth24h, { sign: true, missing: '' });
  const multiple = multipleLabel(derived?.accountMultiple, { missing: '' });
  const date = shortDateLabel(post?.date, { missing: '' });

  if (views) lines.push(`▶ ${views}`);
  if (engagement) lines.push(`ER ${engagement}`);
  if (growth) lines.push(`24h ${growth}`);
  if (multiple) lines.push(multiple);
  if (date) lines.push(date);
  return lines;
}
