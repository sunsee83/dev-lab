import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildMediaList } from '../../src/data/media-model.js';
import { createDataEngine } from '../../src/data/engine.js';
import { installLegacyCaptureHandoff, LEGACY_CAPTURE_HOOK, LEGACY_RAW_CAPTURE_HOOK } from '../../src/migration/capture-handoff.js';
import { createHistoryStore, HISTORY_STORAGE_KEYS } from '../../src/store/history-store.js';
import { createVerifiedCacheStore, VERIFIED_CACHE_KEY } from '../../src/store/verified-cache-store.js';

const legacyRuntimeSource = await readFile(new URL('../../src/legacy-runtime.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    dump(key) { return JSON.parse(map.get(key) || '{}'); }
  };
}

test('History Store reads legacy-compatible history and records only real positive views', () => {
  let clock = 2_000_000;
  const storage = memoryStorage({
    [HISTORY_STORAGE_KEYS.snapshots]: JSON.stringify({ ABC: [{ t: 1000, v: 10 }, { t: 2000, v: 0 }] }),
    [HISTORY_STORAGE_KEYS.posts]: JSON.stringify({ ABC: { code: 'ABC', owner: 'Creator', views: 10, t: 1000 } })
  });
  const history = createHistoryStore({ env: { localStorage: storage }, now: () => clock });

  assert.deepEqual(history.getSnapshots('ABC'), [{ t: 1000, v: 10 }]);
  assert.equal(history.getAccountPosts('creator').length, 1);
  assert.equal(history.recordSnapshot('ABC', 0), false);
  assert.equal(history.record({ shortcode: 'ABC', username: 'Creator', views: 20 }), true);
  assert.equal(history.getSnapshots('ABC').at(-1).v, 20);
  assert.equal(storage.dump(HISTORY_STORAGE_KEYS.posts).ABC.views, 20);

  clock += 1000;
  assert.equal(history.recordSnapshot('ABC', 20), false);
});

test('Verified Cache Store owns the legacy-compatible item cache side effect', () => {
  const storage = memoryStorage();
  const cache = createVerifiedCacheStore({ env: { localStorage: storage }, delayMs: 0 });
  assert.deepEqual(cache.load(), {});
  assert.equal(cache.schedule({ ABC: { code: 'ABC', views: 10 } }), true);
  assert.equal(storage.dump(VERIFIED_CACHE_KEY).ABC.views, 10);
  cache.destroy();
});

test('common media[] preserves media roles and Carousel slide order', () => {
  assert.deepEqual(buildMediaList({
    mediaType: 'REEL',
    videoUrl: 'https://cdn.test/reel.mp4',
    coverUrl: 'https://cdn.test/cover.jpg'
  }).map((item) => item.kind), ['video', 'cover']);

  const slides = buildMediaList({
    mediaType: 'CAROUSEL',
    carouselImages: ['https://cdn.test/a.jpg', 'https://cdn.test/a.jpg', 'https://cdn.test/c.jpg']
  });
  assert.deepEqual(slides.map((item) => item.slideIndex), [0, 1, 2]);
  assert.deepEqual(slides.map((item) => item.kind), ['carousel-slide', 'carousel-slide', 'carousel-slide']);
});

test('Data Engine owns verified cache/history writes for raw payloads and compatibility patches', () => {
  let legacyItems = {
    OLD1: {
      code: 'OLD1',
      fields: {
        mediaType: { value: 'PHOTO', source: 'network', confidence: 'high', status: 'verified', updatedAt: 1 },
        thumbUrl: { value: 'https://cdn.test/old.jpg', source: 'network', confidence: 'high', status: 'verified', updatedAt: 1 }
      }
    }
  };
  const historyCalls = [];
  const persisted = [];
  const engine = createDataEngine({
    legacyAdapter: { getItemsSnapshot() { return legacyItems; } },
    history: { record(post) { historyCalls.push(post.shortcode); return true; } },
    persistence: {
      load() { return legacyItems; },
      schedule(snapshot) { persisted.push(snapshot); return true; },
      flush() { return true; }
    },
    now: () => 10_000
  });

  assert.equal(engine.getPost('OLD1').media[0].kind, 'photo');
  legacyItems = { NEW1: { code: 'NEW1', mediaType: 'PHOTO', thumbUrl: 'https://cdn.test/new.jpg' } };
  engine.syncLegacy();
  assert.equal(engine.getPost('OLD1').shortcode, 'OLD1');
  assert.equal(engine.getPost('OLD1').media.length, 0);
  assert.equal(engine.getPost('NEW1').media[0].kind, 'photo');

  const raw = engine.ingest({
    code: 'REEL1', media_type: 2, product_type: 'clips', play_count: 100,
    user: { username: 'creator' }, video_url: 'https://cdn.test/reel.mp4'
  }, { pageUrl: 'https://www.instagram.com/reel/REEL1/', source: 'network' });
  assert.equal(raw.post.views, 100);
  assert.equal(raw.post.likes, undefined);
  assert.equal(raw.post.media[0].kind, 'video');
  assert.deepEqual(raw.evidence.videoUrls, ['https://cdn.test/reel.mp4']);

  const compatibility = engine.ingestPatch('DOM1', {
    owner: 'creator', mediaType: 'PHOTO', views: 25, thumbUrl: 'https://cdn.test/dom.jpg'
  }, { source: 'dom', confidence: 'medium' });
  assert.equal(compatibility.item.code, 'DOM1');
  assert.equal(compatibility.post.media[0].kind, 'photo');
  assert.deepEqual(historyCalls, ['REEL1', 'DOM1']);
  assert.equal(persisted.length, 2);
  assert.equal(persisted.at(-1).DOM1.views, 25);
});

test('legacy capture handoff exposes raw and compatibility paths and active raw parser precedes fallback', () => {
  const env = {};
  const calls = [];
  const stop = installLegacyCaptureHandoff({
    env,
    data: {
      ingest(input, options) {
        calls.push({ kind: 'raw', input, options });
        return { changed: true, item: { code: input.code }, evidence: { videoUrls: [], imageUrls: [] } };
      },
      ingestPatch(shortcode, patch, options) {
        calls.push({ kind: 'patch', shortcode, patch, options });
        return { changed: true, item: { code: shortcode, views: patch.views } };
      }
    }
  });

  env[LEGACY_RAW_CAPTURE_HOOK]({ input: { code: 'RAW123' }, source: 'network', confidence: 'high' });
  env[LEGACY_CAPTURE_HOOK]({ shortcode: 'ABC123', patch: { views: 99 }, source: 'dom' });
  assert.deepEqual(calls.map((entry) => entry.kind), ['raw', 'patch']);
  stop();
  assert.equal(env[LEGACY_RAW_CAPTURE_HOOK], undefined);
  assert.equal(env[LEGACY_CAPTURE_HOOK], undefined);

  const rememberStart = legacyRuntimeSource.lastIndexOf('rememberObject = function (obj, source)');
  const rememberEnd = legacyRuntimeSource.indexOf('parsePermalink = function', rememberStart);
  const activeRemember = legacyRuntimeSource.slice(rememberStart, rememberEnd);
  assert.match(activeRemember, /window\.__RI32_CAPTURE_RAW__/);
  assert.ok(activeRemember.indexOf('__RI32_CAPTURE_RAW__') < activeRemember.indexOf('sameMediaNumber'));

  const saveStart = legacyRuntimeSource.lastIndexOf('saveItem = function (code, patch, source, confidence)');
  const saveEnd = legacyRuntimeSource.indexOf('rememberObject = function', saveStart);
  const activeSaveItem = legacyRuntimeSource.slice(saveStart, saveEnd);
  assert.match(activeSaveItem, /window\.__RI32_CAPTURE_PATCH__/);
  assert.ok(activeSaveItem.indexOf('__RI32_CAPTURE_PATCH__') < activeSaveItem.indexOf('scheduleStoreWrite()'));
  assert.match(mainSource, /installLegacyCaptureHandoff\(\{ env: globalThis, data \}\)/);
});
