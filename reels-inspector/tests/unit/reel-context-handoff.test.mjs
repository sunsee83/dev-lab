import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installLegacyReelContextHandoff, LEGACY_REEL_CONTEXT_HOOK } from '../../src/migration/reel-context-handoff.js';

const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
const legacySource = await readFile(new URL('../../src/legacy-runtime.js', import.meta.url), 'utf8');

test('Reel context handoff enriches Data Engine once per stable identity and exposes current native evidence', () => {
  const env = {};
  const patches = [];
  const current = {
    video: { id: 'video' },
    shortcode: 'ABC123',
    username: 'creator',
    native: { likes: 10, comments: 2, reposts: 1 },
    identity: { shortcode: 'ABC123', username: 'creator' }
  };
  const handoff = installLegacyReelContextHandoff({
    env,
    reelContext: { getCurrent() { return current; } },
    data: {
      ingestPatch(shortcode, patch, options) {
        patches.push({ shortcode, patch, options });
        return {
          post: { shortcode, username: patch.owner, mediaType: 'REEL', canonicalUrl: patch.canonicalUrl },
          identity: { shortcode, username: patch.owner, mediaType: 'REEL', canonicalUrl: patch.canonicalUrl }
        };
      },
      getPost(shortcode) { return { shortcode, username: 'creator', mediaType: 'REEL' }; },
      getIdentity(shortcode) { return { shortcode, username: 'creator', mediaType: 'REEL' }; }
    }
  });

  const first = env[LEGACY_REEL_CONTEXT_HOOK]();
  const second = handoff.getCurrent();
  assert.equal(first.shortcode, 'ABC123');
  assert.equal(first.native.likes, 10);
  assert.equal(second.status, 'IDENTIFIED');
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].options, { source: 'dom', confidence: 'high' });
  assert.equal(patches[0].patch.canonicalUrl, 'https://www.instagram.com/reel/ABC123/');

  handoff.destroy();
  assert.equal(env[LEGACY_REEL_CONTEXT_HOOK], undefined);
});

test('Legacy Reel visual consumes modern context before fuzzy fallback while main route identity uses the same handoff', () => {
  const start = legacySource.indexOf('function reelContext()');
  const end = legacySource.indexOf('function ensureOverlay()', start);
  const body = legacySource.slice(start, end);
  assert.match(body, /__RI32_REEL_CONTEXT__/);
  assert.ok(body.indexOf('__RI32_REEL_CONTEXT__') < body.indexOf('activeVideo()'));
  assert.ok(body.indexOf('__RI32_REEL_CONTEXT__') < body.indexOf('saveItem(code'));

  assert.match(mainSource, /installLegacyReelContextHandoff/);
  assert.match(mainSource, /reelContextHandoff\.getCurrent\(\)\?\.identity/);
  assert.doesNotMatch(mainSource, /reelContext\.resolveActivityIdentity\(\)/);
});
