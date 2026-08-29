import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMediaList } from '../../src/data/media-model.js';
import { createDataEngine } from '../../src/data/engine.js';
import { createHistoryStore, HISTORY_STORAGE_KEYS } from '../../src/store/history-store.js';

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

test('Data Engine can sync legacy snapshot and ingest verified payload without UI ownership', () => {
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
  const engine = createDataEngine({
    legacyAdapter: { getItemsSnapshot() { return legacyItems; } },
    history: { record(post) { historyCalls.push(post.shortcode); return true; } },
    now: () => 10_000
  });

  assert.equal(engine.getPost('OLD1').media[0].kind, 'photo');
  legacyItems = { NEW1: { code: 'NEW1', mediaType: 'PHOTO', thumbUrl: 'https://cdn.test/new.jpg' } };
  engine.syncLegacy();
  assert.equal(engine.getPost('OLD1').shortcode, 'OLD1');
  assert.equal(engine.getPost('OLD1').media.length, 0);
  assert.equal(engine.getPost('NEW1').media[0].kind, 'photo');

  const result = engine.ingest({
    code: 'REEL1', media_type: 2, product_type: 'clips', play_count: 100,
    user: { username: 'creator' }, video_url: 'https://cdn.test/reel.mp4'
  }, { pageUrl: 'https://www.instagram.com/reel/REEL1/', source: 'network' });
  assert.equal(result.post.views, 100);
  assert.equal(result.post.likes, undefined);
  assert.equal(result.post.media[0].kind, 'video');
  assert.deepEqual(historyCalls, ['REEL1']);
});
