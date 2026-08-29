import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildReelOverlayLines } from '../../src/ui/reel-overlay.js';

const overlaySource = await readFile(new URL('../../src/ui/reel-overlay.js', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../../src/ui/styles.js', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../../src/ui/layout.js', import.meta.url), 'utf8');

test('Reel overlay keeps the lightweight five-line baseline and hides missing values', () => {
  assert.deepEqual(
    buildReelOverlayLines(
      { views: 429000, date: '2026-08-26' },
      { engagementRate: 0.55, growth24h: 8.2, accountMultiple: 3.7 }
    ),
    ['▶ 42.9만', 'ER 0.55%', '24h +8.2%', '×3.7', '08/26']
  );
  assert.deepEqual(buildReelOverlayLines({}, {}), []);
});

test('new Reel overlay uses injected Metrics owner and shared layout without another MutationObserver', () => {
  assert.match(overlaySource, /metrics\.summarize\(livePost\)/);
  assert.match(overlaySource, /ri32-reel-overlay/);
  assert.doesNotMatch(overlaySource, /MutationObserver/);
  assert.match(stylesSource, /#ri3-tool,#ri3-panel,#ri3-reels-overlay\{display:none!important\}/);
  assert.match(stylesSource, /#ri32-reel-overlay\{[\s\S]*?var\(--ri-reel-overlay-right,60px\)/);
  assert.match(layoutSource, /--ri-reel-overlay-right/);
});
