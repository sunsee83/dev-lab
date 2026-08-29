const OWN_ID_PREFIX = 'ri32-';

export function computeLayoutSnapshot({
  viewportWidth = 0,
  viewportHeight = 0,
  safeBottom = 0,
  bottomBlockers = [],
  rightBlockers = [],
  keyboardVisible = false
} = {}) {
  const width = positive(viewportWidth);
  const height = positive(viewportHeight);
  const safe = Math.max(0, Number(safeBottom) || 0);
  const baseBottom = Math.max(88, safe + 78);
  const bottomTop = lowestBlockerTop(bottomBlockers, height);
  const blockedHeight = bottomTop == null ? 0 : Math.max(0, height - bottomTop);
  const launcherBottom = Math.max(baseBottom, blockedHeight + 12);
  const rightInset = widestRightInset(rightBlockers, width);
  const launcherRight = Math.max(12, rightInset ? rightInset + 10 : 12);
  const panelBottom = launcherBottom + 44;
  const feedbackBottom = Math.max(panelBottom + 2, blockedHeight + 14);
  const availableHeight = Math.max(240, height - safe - 16);

  return Object.freeze({
    viewportWidth: width,
    viewportHeight: height,
    safeBottom: safe,
    keyboardVisible: !!keyboardVisible,
    launcherAnchor: Object.freeze({ right: launcherRight, bottom: launcherBottom }),
    reelOverlayLane: Object.freeze({ right: Math.max(60, launcherRight + 40) }),
    sheetMetrics: Object.freeze({
      compactHeight: Math.round(clamp(availableHeight * 0.52, 260, availableHeight * 0.62)),
      expandedHeight: Math.round(clamp(availableHeight * 0.82, 420, availableHeight * 0.9)),
      maxHeight: Math.round(availableHeight)
    }),
    feedbackAnchor: Object.freeze({ bottom: feedbackBottom })
  });
}

export function createLayoutManager({ app, doc = globalThis.document, env = globalThis } = {}) {
  let snapshot = computeLayoutSnapshot();
  let scheduled = false;
  let destroyed = false;
  const listeners = new Set();
  const cleanups = [];

  function measure() {
    if (destroyed) return snapshot;
    const viewport = viewportSize(env, doc);
    const candidates = blockerCandidates(doc);
    const bottomBlockers = [];
    const rightBlockers = [];

    for (const element of candidates) {
      const rect = visibleFixedRect(element, env, viewport);
      if (!rect) continue;
      if (isBottomBlocker(rect, viewport)) bottomBlockers.push(rect);
      if (isRightBlocker(rect, viewport)) rightBlockers.push(rect);
    }

    const next = computeLayoutSnapshot({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      safeBottom: measureSafeBottom(doc, env),
      bottomBlockers,
      rightBlockers,
      keyboardVisible: isKeyboardVisible(env, viewport.height)
    });
    const changed = layoutKey(next) !== layoutKey(snapshot);
    snapshot = next;
    applyCssVariables(doc, snapshot);
    if (changed) for (const listener of [...listeners]) listener(snapshot);
    return snapshot;
  }

  function schedule() {
    if (destroyed || scheduled) return;
    scheduled = true;
    const raf = env.requestAnimationFrame || ((fn) => (env.setTimeout || setTimeout)(fn, 16));
    raf(() => {
      scheduled = false;
      measure();
    });
  }

  function listen(target, eventName) {
    if (!target?.addEventListener) return;
    target.addEventListener(eventName, schedule, true);
    cleanups.push(() => target.removeEventListener?.(eventName, schedule, true));
  }

  listen(env, 'resize');
  listen(env, 'orientationchange');
  listen(env.visualViewport, 'resize');
  listen(env.visualViewport, 'scroll');
  const offRoute = app?.on?.('route:changed', schedule) || (() => {});
  cleanups.push(offRoute);
  measure();

  return {
    getSnapshot() {
      return snapshot;
    },
    measure,
    schedule,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const cleanup of cleanups.splice(0)) cleanup();
      listeners.clear();
    }
  };
}

function viewportSize(env, doc) {
  const visual = env.visualViewport;
  return {
    width: positive(visual?.width || env.innerWidth || doc?.documentElement?.clientWidth),
    height: positive(visual?.height || env.innerHeight || doc?.documentElement?.clientHeight)
  };
}

function blockerCandidates(doc) {
  const result = new Set();
  for (const element of doc?.body?.children || []) result.add(element);
  for (const selector of ['nav', '[role="navigation"]']) {
    for (const element of doc?.querySelectorAll?.(selector) || []) result.add(element);
  }
  return [...result].filter((element) => !String(element?.id || '').startsWith(OWN_ID_PREFIX));
}

function visibleFixedRect(element, env, viewport) {
  if (!element?.getBoundingClientRect) return null;
  const style = env.getComputedStyle?.(element);
  if (!style || (style.position !== 'fixed' && style.position !== 'sticky')) return null;
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width < 20 || rect.height < 20) return null;
  if (rect.bottom <= 0 || rect.top >= viewport.height || rect.right <= 0 || rect.left >= viewport.width) return null;
  return normalizeRect(rect);
}

function isBottomBlocker(rect, viewport) {
  return rect.bottom >= viewport.height - 6
    && rect.width >= viewport.width * 0.38
    && rect.height <= viewport.height * 0.38;
}

function isRightBlocker(rect, viewport) {
  return rect.right >= viewport.width - 6
    && rect.left >= viewport.width * 0.62
    && rect.height >= 80;
}

function lowestBlockerTop(blockers, viewportHeight) {
  let top = null;
  for (const rect of blockers || []) {
    const value = Number(rect?.top);
    if (!Number.isFinite(value) || value < 0 || value > viewportHeight) continue;
    top = top == null ? value : Math.min(top, value);
  }
  return top;
}

function widestRightInset(blockers, viewportWidth) {
  let inset = 0;
  for (const rect of blockers || []) {
    const left = Number(rect?.left);
    if (!Number.isFinite(left) || left < 0 || left > viewportWidth) continue;
    inset = Math.max(inset, viewportWidth - left);
  }
  return inset;
}

function measureSafeBottom(doc, env) {
  if (!doc?.documentElement || !doc.createElement || !env.getComputedStyle) return 0;
  const probe = doc.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;left:-9999px;bottom:0;padding-bottom:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden';
  doc.documentElement.appendChild(probe);
  const value = Number.parseFloat(env.getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return value;
}

function isKeyboardVisible(env, viewportHeight) {
  const innerHeight = positive(env.innerHeight);
  if (!innerHeight || !viewportHeight) return false;
  return innerHeight - viewportHeight > Math.max(120, innerHeight * 0.18);
}

function applyCssVariables(doc, snapshot) {
  const style = doc?.documentElement?.style;
  if (!style?.setProperty) return;
  style.setProperty('--ri-launcher-right', `${snapshot.launcherAnchor.right}px`);
  style.setProperty('--ri-launcher-bottom', `${snapshot.launcherAnchor.bottom}px`);
  style.setProperty('--ri-panel-bottom', `${snapshot.launcherAnchor.bottom + 44}px`);
  style.setProperty('--ri-reel-overlay-right', `${snapshot.reelOverlayLane.right}px`);
  style.setProperty('--ri-feedback-bottom', `${snapshot.feedbackAnchor.bottom}px`);
  style.setProperty('--ri-sheet-compact-height', `${snapshot.sheetMetrics.compactHeight}px`);
  style.setProperty('--ri-sheet-expanded-height', `${snapshot.sheetMetrics.expandedHeight}px`);
}

function layoutKey(snapshot) {
  return [
    snapshot.viewportWidth,
    snapshot.viewportHeight,
    snapshot.safeBottom,
    snapshot.keyboardVisible ? 1 : 0,
    snapshot.launcherAnchor.right,
    snapshot.launcherAnchor.bottom,
    snapshot.reelOverlayLane.right,
    snapshot.sheetMetrics.compactHeight,
    snapshot.sheetMetrics.expandedHeight,
    snapshot.feedbackAnchor.bottom
  ].join('|');
}

function normalizeRect(rect) {
  return {
    top: Number(rect.top) || 0,
    right: Number(rect.right) || 0,
    bottom: Number(rect.bottom) || 0,
    left: Number(rect.left) || 0,
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0
  };
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  if (max < min) return Math.max(0, max);
  return Math.min(Math.max(value, min), max);
}
