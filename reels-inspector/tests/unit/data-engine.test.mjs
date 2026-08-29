import test from 'node:test';
import assert from 'node:assert/strict';

import { identityKey, normalizeIdentity } from '../../src/data/identity.js';
import { extractInstagramMedia } from '../../src/data/extractor.js';
import { createVerifiedStore } from '../../src/store/verified-store.js';

test('Identity normalizes route evidence without inventing owner or media id', () => {
  const identity = normalizeIdentity({}, 'https://www.instagram.com/reel/ABC_123/?utm_source=test');
  assert.equal(identity.shortcode, 'ABC_123');
  assert.equal(identity.mediaType, 'REEL');
  assert.equal(identity.mediaId, '');
  assert.equal(identity.username, '');
  assert.equal(identity.canonicalUrl, 'https://www.instagram.com/reel/ABC_123/');
  assert.equal(identity.state, 'IDENTIFYING');
  assert.equal(identityKey(identity), 'ABC_123||||');
});

test('Extractor maps exact Instagram media payload fields and leaves missing metrics missing', () => {
  const result = extractInstagramMedia({
    code: 'REEL123',
    pk: '987',
    media_type: 2,
    product_type: 'clips',
    user: { pk: '42', username: 'creator' },
    play_count: 120000,
    like_count: 0,
    comment_count: 321,
    taken_at: 1_725_000_000,
    video_versions: [
      { url: 'https://cdn.example.test/low.mp4', width: 360, height: 640 },
      { url: 'https://cdn.example.test/high.mp4', width: 720, height: 1280 }
    ],
    image_versions2: {
      candidates: [
        { url: 'https://cdn.example.test/cover-small.jpg', width: 360, height: 640 },
        { url: 'https://cdn.example.test/cover.jpg', width: 1080, height: 1920 }
      ]
    }
  }, { pageUrl: 'https://www.instagram.com/reel/REEL123/' });

  assert.equal(result.identity.state, 'IDENTIFIED');
  assert.equal(result.patch.mediaType, 'REEL');
  assert.equal(result.patch.views, 120000);
  assert.equal(result.patch.likes, 0);
  assert.equal(result.patch.comments, 321);
  assert.equal(result.patch.reposts, undefined);
  assert.equal(result.patch.videoUrl, 'https://cdn.example.test/high.mp4');
  assert.equal(result.patch.coverUrl, 'https://cdn.example.test/cover.jpg');
});

test('Verified Store preserves provenance, blocks weaker evidence and marks suspicious metric conflicts', () => {
  let clock = 1_000_000;
  const changes = [];
  const store = createVerifiedStore({
    now: () => clock,
    onChange(change) { changes.push(change.shortcode); }
  });

  store.upsert('ABC123', {
    owner: 'creator',
    mediaType: 'REEL',
    views: 1000,
    canonicalUrl: 'https://www.instagram.com/reel/ABC123/'
  }, { source: 'network' });

  clock += 30_000;
  const weak = store.upsert('ABC123', { views: 900 }, { source: 'dom' });
  assert.equal(weak.changed, false);
  assert.equal(store.getPost('ABC123').views, 1000);

  clock += 30_000;
  const conflict = store.upsert('ABC123', { views: 900 }, { source: 'network' });
  assert.equal(conflict.changed, true);
  assert.equal(store.getPost('ABC123').views, 1000);
  assert.equal(store.getItem('ABC123').fields.views.status, 'conflict');

  clock += 180_000;
  store.upsert('ABC123', { views: 1100 }, { source: 'network' });
  assert.equal(store.getPost('ABC123').views, 1100);
  assert.equal(store.getItem('ABC123').fields.views.status, 'verified');
  assert.equal(store.getIdentity('ABC123').state, 'IDENTIFIED');
  assert.deepEqual(changes, ['ABC123', 'ABC123', 'ABC123']);
});

test('Verified Store allows VIDEO to REEL refinement while keeping missing values undefined', () => {
  const store = createVerifiedStore({ now: () => 1000 });
  store.upsert('VID123', { mediaType: 'VIDEO', views: 50 }, { source: 'dom' });
  store.upsert('VID123', { mediaType: 'REEL' }, { source: 'dom' });

  const post = store.getPost('VID123');
  assert.equal(post.mediaType, 'REEL');
  assert.equal(post.likes, undefined);
  assert.equal(post.comments, undefined);
  assert.equal(post.reposts, undefined);
});
