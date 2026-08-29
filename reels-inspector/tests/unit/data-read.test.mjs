import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createDataEngine } from '../../src/data/engine.js';

const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
const gridSource = await readFile(new URL('../../src/ui/grid.js', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../../src/ui/ri-panel.js', import.meta.url), 'utf8');
const reelContextSource = await readFile(new URL('../../src/migration/reel-context-adapter.js', import.meta.url), 'utf8');

test('Data Engine owns route identity and exact media lookup for renderer/context reads', () => {
  const engine = createDataEngine({
    legacyAdapter: {
      getItemsSnapshot() {
        return {
          ABC123: {
            code: 'ABC123',
            mediaType: 'REEL',
            owner: 'creator',
            videoUrl: 'https://cdn.test/video.mp4?token=1',
            coverUrl: 'https://cdn.test/cover.jpg?token=1',
            canonicalUrl: 'https://www.instagram.com/reel/ABC123/'
          },
          PHOTO1: {
            code: 'PHOTO1',
            mediaType: 'PHOTO',
            thumbUrl: 'https://cdn.test/photo.jpg'
          }
        };
      }
    }
  });

  const identity = engine.getIdentityFromUrl('https://www.instagram.com/reel/ABC123/?utm_source=test');
  assert.equal(identity.shortcode, 'ABC123');
  assert.equal(identity.mediaType, 'REEL');
  assert.equal(identity.username, 'creator');

  const byVideo = engine.findPostByMediaUrls('https://cdn.test/video.mp4?different=1');
  assert.equal(byVideo.shortcode, 'ABC123');
  assert.equal(engine.findPostByMediaUrls('blob:https://www.instagram.com/x'), null);
});

test('Grid, RI Panel and Reel context read through Data Engine instead of legacy adapter', () => {
  assert.match(mainSource, /createReelContextAdapter\(\{ store: data,/);
  assert.match(mainSource, /mountGridActions\(\{ app, data,/);
  assert.match(mainSource, /\n  data,\n  workspace,/);
  assert.doesNotMatch(mainSource, /adapter:\s*legacyStore/);

  assert.match(gridSource, /data\.getPost\(shortcode\)/);
  assert.doesNotMatch(gridSource, /adapter\.getPost/);
  assert.match(panelSource, /data\?\.getPost\?\.\(identity\.shortcode\)/);
  assert.match(panelSource, /data\?\.getIdentityFromUrl\?/);
  assert.doesNotMatch(panelSource, /adapter\?\.getPost/);
  assert.match(reelContextSource, /shortcodeFromUrl/);
  assert.doesNotMatch(reelContextSource, /store\.codeFromUrl/);
});
