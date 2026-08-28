export const EVENTS = Object.freeze({
  ROUTE_CHANGED: 'route:changed',
  IDENTITY_CHANGED: 'identity:changed',
  STORE_CHANGED: 'store:changed',
  SETTINGS_CHANGED: 'settings:changed',
  DOWNLOAD_CHANGED: 'download:changed'
});

export function createApp({ version = '' } = {}) {
  const listeners = new Map();
  const renderQueue = new Map();
  let frameId = 0;
  let destroyed = false;
  let route = { href: '', pathname: '' };
  let currentIdentity = null;

  const app = {
    version,
    services: Object.create(null),
    adapters: Object.create(null),

    on(eventName, listener) {
      if (destroyed || typeof listener !== 'function') return () => {};
      const bucket = listeners.get(eventName) || new Set();
      bucket.add(listener);
      listeners.set(eventName, bucket);
      return () => {
        bucket.delete(listener);
        if (!bucket.size) listeners.delete(eventName);
      };
    },

    emit(eventName, payload) {
      if (destroyed) return;
      const bucket = listeners.get(eventName);
      if (!bucket) return;
      for (const listener of [...bucket]) {
        try {
          listener(payload);
        } catch (error) {
          console.warn('[RI] event listener failed', eventName, error);
        }
      }
    },

    scheduleRender(key, callback) {
      if (destroyed || !key || typeof callback !== 'function') return;
      renderQueue.set(key, callback);
      if (frameId) return;
      const raf = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
      frameId = raf(() => {
        frameId = 0;
        const jobs = [...renderQueue.values()];
        renderQueue.clear();
        for (const job of jobs) {
          try {
            job();
          } catch (error) {
            console.warn('[RI] render job failed', error);
          }
        }
      });
    },

    setRoute(nextRoute) {
      const next = {
        href: String(nextRoute?.href || ''),
        pathname: String(nextRoute?.pathname || '')
      };
      if (next.href === route.href && next.pathname === route.pathname) return false;
      const previous = route;
      route = next;
      app.emit(EVENTS.ROUTE_CHANGED, { previous, current: { ...route } });
      return true;
    },

    getRoute() {
      return { ...route };
    },

    setCurrentIdentity(identity) {
      const previousKey = identityKey(currentIdentity);
      const nextKey = identityKey(identity);
      currentIdentity = identity || null;
      if (previousKey === nextKey) return false;
      app.emit(EVENTS.IDENTITY_CHANGED, { current: currentIdentity });
      return true;
    },

    getCurrentIdentity() {
      return currentIdentity;
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      renderQueue.clear();
      if (frameId && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(frameId);
      frameId = 0;
      currentIdentity = null;
      app.services = Object.create(null);
      app.adapters = Object.create(null);
    }
  };

  return app;
}

function identityKey(identity) {
  if (!identity) return '';
  return [
    identity.shortcode || '',
    identity.mediaId || '',
    identity.childMediaId || '',
    identity.slideIndex ?? ''
  ].join('|');
}
