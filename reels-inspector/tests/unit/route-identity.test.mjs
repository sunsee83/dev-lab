import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../src/core/app.js';

test('shared SPA observer can refresh active identity without adding a second observer or changing href', () => {
  let observerCallback = null;
  let queuedFrame = null;
  let observerCount = 0;
  let activityIdentity = undefined;

  class FakeMutationObserver {
    constructor(callback) {
      observerCount += 1;
      observerCallback = callback;
    }
    observe() {}
    disconnect() {}
  }

  const env = {
    location: { href: 'https://www.instagram.com/reels/', pathname: '/reels/' },
    document: { documentElement: {} },
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame(callback) { queuedFrame = callback; return 1; },
    addEventListener() {},
    removeEventListener() {}
  };
  const app = createApp();

  const stop = app.startRouteTracking({
    env,
    resolveIdentity() {
      return { shortcode: 'ROUTE111' };
    },
    resolveActivityIdentity() {
      return activityIdentity;
    }
  });

  assert.equal(observerCount, 1);
  assert.equal(app.getCurrentIdentity().shortcode, 'ROUTE111');

  activityIdentity = { shortcode: 'ACTIVE222' };
  observerCallback();
  assert.equal(typeof queuedFrame, 'function');
  queuedFrame();
  assert.equal(app.getCurrentIdentity().shortcode, 'ACTIVE222');
  assert.equal(app.getRoute().href, 'https://www.instagram.com/reels/');

  activityIdentity = undefined;
  observerCallback();
  queuedFrame();
  assert.equal(app.getCurrentIdentity().shortcode, 'ACTIVE222');

  stop();
});
