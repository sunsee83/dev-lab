import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installLegacyRendererHandoff, LEGACY_RENDER_VIEW_HOOK } from '../../src/migration/legacy-renderer-handoff.js';

const legacySource = await readFile(new URL('../../src/legacy-runtime.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');

test('Legacy renderer handoff merges live Reel metrics and delegates all derived values to Metrics Engine', () => {
  const env = {};
  const summarized = [];
  const handoff = installLegacyRendererHandoff({
    env,
    data: {
      getPost(shortcode) {
        return {
          shortcode,
          username: 'creator',
          views: 1000,
          likes: 10,
          comments: 3,
          reposts: 1,
          date: '2026-08-29'
        };
      }
    },
    metrics: {
      summarize(post) {
        summarized.push(post);
        return { engagementRate: 2, growth24h: 10, accountMultiple: 1.5 };
      }
    }
  });

  const grid = handoff.getView('ABC123');
  assert.equal(grid.post.likes, 10);
  assert.equal(grid.derived.growth24h, 10);

  const reel = env[LEGACY_RENDER_VIEW_HOOK]('ABC123', { likes: 20, comments: 4, reposts: 0 });
  assert.equal(reel.post.likes, 20);
  assert.equal(reel.post.comments, 4);
  assert.equal(reel.post.reposts, 0);
  assert.equal(summarized.at(-1).likes, 20);
  assert.equal(summarized.length, 2);

  handoff.destroy();
  assert.equal(env[LEGACY_RENDER_VIEW_HOOK], undefined);
});

test('Frozen Grid and legacy Reel visual read modern post/derived data before compatibility formulas without changing slot markup', () => {
  const gridStart = legacySource.indexOf('function renderGridCard(anchor, data)');
  const gridEnd = legacySource.indexOf('function scanGrid()', gridStart);
  const grid = legacySource.slice(gridStart, gridEnd);
  assert.match(grid, /__RI32_RENDER_VIEW__/);
  assert.ok(grid.indexOf('__RI32_RENDER_VIEW__') < grid.indexOf('engagement(views'));
  assert.match(grid, /summary \? summary\.growth24h : growth24h\(code, views\)/);
  assert.match(grid, /summary \? summary\.accountMultiple : accountMultiple\(code,/);

  const reelStart = legacySource.indexOf('function renderReelOverlay(ctx)');
  const reelEnd = legacySource.indexOf('function moreButton()', reelStart);
  const reel = legacySource.slice(reelStart, reelEnd);
  assert.match(reel, /__RI32_RENDER_VIEW__/);
  assert.ok(reel.indexOf('__RI32_RENDER_VIEW__') < reel.indexOf('engagement(views'));
  assert.match(reel, /summary \? summary\.engagementRate/);

  assert.match(legacySource, /ri3-grid-row1[^\n]*<span><\/span><span><\/span><span><\/span><span><\/span>[^\n]*ri3-grid-row2[^\n]*<span><\/span><span><\/span><span><\/span><span><\/span>/);
  assert.match(mainSource, /installLegacyRendererHandoff\(\{ env: globalThis, data, metrics \}\)/);
});
