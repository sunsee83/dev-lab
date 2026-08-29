import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { extractPermalinkHtml } from '../../src/data/permalink-extractor.js';
import { createDataEngine } from '../../src/data/engine.js';
import { installLegacyCaptureHandoff, LEGACY_PERMALINK_CAPTURE_HOOK } from '../../src/migration/capture-handoff.js';

const legacyRuntimeSource = await readFile(new URL('../../src/legacy-runtime.js', import.meta.url), 'utf8');

test('Permalink Extractor owns HTML meta and near-metric fallback without fabricating missing values', () => {
  const html = `
    <meta property="og:description" content="1.2K likes, 34 comments - creator">
    <meta property="og:image" content="https://cdn.test/cover.jpg?x=1&amp;y=2">
    <meta property="og:video" content="https://cdn.test/video.mp4">
    <script>{"shortcode":"ABC123","play_count":9000,"repost_count":5,"taken_at":1725000000}</script>
  `;
  const result = extractPermalinkHtml(html, {
    pageUrl: 'https://www.instagram.com/reel/ABC123/',
    fetched: 1234
  });

  assert.equal(result.shortcode, 'ABC123');
  assert.equal(result.patch.mediaType, 'REEL');
  assert.equal(result.patch.views, 9000);
  assert.equal(result.patch.likes, 1200);
  assert.equal(result.patch.comments, 34);
  assert.equal(result.patch.reposts, 5);
  assert.equal(result.patch.date, '2024-08-30');
  assert.equal(result.patch.coverUrl, 'https://cdn.test/cover.jpg?x=1&y=2');
  assert.equal(result.patch.videoUrl, 'https://cdn.test/video.mp4');
  assert.equal(result.patch.fetched, 1234);

  const photo = extractPermalinkHtml('<meta property="og:image" content="https://cdn.test/photo.jpg">', {
    pageUrl: 'https://www.instagram.com/p/PHOTO1/'
  });
  assert.equal(photo.patch.views, undefined);
  assert.equal(photo.patch.likes, undefined);
  assert.equal(photo.patch.comments, undefined);
});

test('Data Engine ingests permalink fallback through verified write ownership', () => {
  const historyCalls = [];
  const persisted = [];
  const engine = createDataEngine({
    history: { record(post) { historyCalls.push(post.shortcode); return true; } },
    persistence: {
      load() { return {}; },
      schedule(snapshot) { persisted.push(snapshot); return true; },
      flush() { return true; }
    },
    now: () => 5000
  });

  const result = engine.ingestPermalink(
    '<meta property="og:image" content="https://cdn.test/p.jpg"><script>{"shortcode":"POST123","like_count":8}</script>',
    { pageUrl: 'https://www.instagram.com/p/POST123/', fetched: 4444 }
  );

  assert.equal(result.post.likes, 8);
  assert.equal(result.post.thumbUrl, 'https://cdn.test/p.jpg');
  assert.equal(result.item.fetched, 4444);
  assert.deepEqual(historyCalls, ['POST123']);
  assert.equal(persisted.length, 1);
});

test('Legacy permalink fetch keeps inline JSON first, then Data Engine HTML fallback, then legacy emergency fallback', () => {
  const env = {};
  const calls = [];
  const stop = installLegacyCaptureHandoff({
    env,
    data: {
      ingestPermalink(html, options) {
        calls.push({ html, options });
        return { changed: true, item: { code: 'ABC123' } };
      }
    }
  });

  const response = env[LEGACY_PERMALINK_CAPTURE_HOOK]({
    html: '<html></html>',
    pageUrl: 'https://www.instagram.com/reel/ABC123/',
    fetched: 99
  });
  assert.equal(response.item.code, 'ABC123');
  assert.equal(calls[0].options.fetched, 99);
  stop();
  assert.equal(env[LEGACY_PERMALINK_CAPTURE_HOOK], undefined);

  const pumpStart = legacyRuntimeSource.indexOf('function pumpQueue()');
  const pumpEnd = legacyRuntimeSource.indexOf('function appBannerBoundary()', pumpStart);
  const pump = legacyRuntimeSource.slice(pumpStart, pumpEnd);
  assert.match(pump, /__RI32_CAPTURE_PERMALINK__/);
  assert.ok(pump.indexOf('scanPermalinkJson(html)') < pump.indexOf('__RI32_CAPTURE_PERMALINK__'));
  assert.ok(pump.indexOf('__RI32_CAPTURE_PERMALINK__') < pump.indexOf('parsePermalink(html, job.url)'));
});
