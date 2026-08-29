import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMetricsEngine,
  calculateEngagementRate,
  calculateGrowth24h,
  calculateAccountMultiple
} from '../../src/metrics/metrics.js';

test('ER requires complete verified-compatible inputs and never invents a missing metric as zero', () => {
  assert.equal(calculateEngagementRate({ views: 1000, likes: 40, comments: 5, reposts: 5 }), 5);
  assert.equal(calculateEngagementRate({ views: 1000, likes: 40, comments: 5 }), undefined);
  assert.equal(calculateEngagementRate({ views: 0, likes: 0, comments: 0, reposts: 0 }), undefined);
});

test('24h growth uses the closest real snapshot inside the 18-32 hour window', () => {
  const now = Date.UTC(2026, 7, 29, 0, 0, 0);
  const snapshots = [
    { t: now - 10 * 60 * 60 * 1000, v: 600 },
    { t: now - 23 * 60 * 60 * 1000, v: 800 },
    { t: now - 28 * 60 * 60 * 1000, v: 700 }
  ];
  assert.equal(calculateGrowth24h({ views: 1000, snapshots, now }), 25);
  assert.equal(calculateGrowth24h({ views: 700, snapshots, now }), undefined);
});

test('account multiple uses up to 20 recent same-account posts, excludes current and requires five samples', () => {
  const posts = [100, 200, 300, 400, 500, 600].map((views, index) => ({
    code: `P${index}`,
    owner: 'creator',
    views,
    t: 1000 + index
  }));
  assert.equal(calculateAccountMultiple({ shortcode: 'CURRENT', username: 'creator', views: 700, posts }), 700 / 350);
  assert.equal(calculateAccountMultiple({ shortcode: 'CURRENT', username: 'creator', views: 700, posts: posts.slice(0, 4) }), undefined);
});

test('Metrics Engine reads history through its injected boundary', () => {
  const now = Date.UTC(2026, 7, 29, 0, 0, 0);
  const history = {
    getSnapshots() { return [{ t: now - 24 * 60 * 60 * 1000, v: 800 }]; },
    getAccountPosts() {
      return [100, 200, 300, 400, 500].map((views, index) => ({ code: `P${index}`, owner: 'creator', views, t: index + 1 }));
    }
  };
  const metrics = createMetricsEngine({ history, now: () => now });
  const result = metrics.summarize({
    shortcode: 'CURRENT', username: 'creator', views: 1000, likes: 50, comments: 20, reposts: 10
  });
  assert.equal(result.engagementRate, 8);
  assert.equal(result.growth24h, 25);
  assert.equal(result.accountMultiple, 1000 / 300);
});
