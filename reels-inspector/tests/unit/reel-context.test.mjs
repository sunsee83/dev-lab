import test from 'node:test';
import assert from 'node:assert/strict';

import { createLegacyStoreAdapter } from '../../src/migration/legacy-store-adapter.js';
import { parseMetricCount, resolveReelShortcode } from '../../src/migration/reel-context-adapter.js';

test('Reel shortcode resolution prefers scoped evidence, then exact media mapping, then route', () => {
  assert.deepEqual(
    resolveReelShortcode({ scopedCode: 'SCOPED1', mediaCode: 'MEDIA2', urlCode: 'ROUTE3' }),
    { shortcode: 'SCOPED1', source: 'scoped-link' }
  );
  assert.deepEqual(
    resolveReelShortcode({ mediaCode: 'MEDIA2', urlCode: 'ROUTE3' }),
    { shortcode: 'MEDIA2', source: 'media-map' }
  );
  assert.deepEqual(
    resolveReelShortcode({ urlCode: 'ROUTE3' }),
    { shortcode: 'ROUTE3', source: 'route' }
  );
  assert.deepEqual(resolveReelShortcode(), { shortcode: '', source: 'unresolved' });
});

test('native Reel metric parser supports Korean units, K/M/B and grouped counts', () => {
  assert.equal(parseMetricCount('좋아요 1.2만'), 12000);
  assert.equal(parseMetricCount('댓글 3.4K'), 3400);
  assert.equal(parseMetricCount('Likes 1,234'), 1234);
  assert.equal(parseMetricCount('Likes 1,234,567'), 1234567);
  assert.equal(parseMetricCount('리포스트 0'), 0);
  assert.equal(parseMetricCount('좋아요 표시'), undefined);
});

test('legacy migration adapter resolves active media only by exact normalized media URL', () => {
  const cache = {
    VID111: {
      code: 'VID111',
      pageUrl: 'https://www.instagram.com/reel/VID111/',
      fields: {
        videoUrl: { value: 'https://scontent.example.test/media/video.mp4?token=old', status: 'verified' },
        thumbUrl: { value: 'https://scontent.example.test/media/thumb.jpg?token=old', status: 'verified' },
        mediaType: { value: 'REEL', status: 'verified' },
        owner: { value: 'creator', status: 'verified' }
      }
    },
    OTHER2: {
      code: 'OTHER2',
      fields: {
        videoUrl: { value: 'https://scontent.example.test/media/other.mp4', status: 'verified' },
        mediaType: { value: 'REEL', status: 'verified' }
      }
    }
  };
  const storage = new Map([['ri311:items:v1', JSON.stringify(cache)]]);
  const adapter = createLegacyStoreAdapter({
    env: {
      localStorage: { getItem(key) { return storage.get(key) ?? null; } },
      location: { href: 'https://www.instagram.com/reels/' },
      addEventListener() {},
      removeEventListener() {}
    }
  });

  assert.equal(
    adapter.findPostByMediaUrls(['https://scontent.example.test/media/video.mp4?token=fresh'])?.shortcode,
    'VID111'
  );
  assert.equal(
    adapter.findPostByMediaUrls(['https://scontent.example.test/media/thumb.jpg?token=fresh'])?.shortcode,
    'VID111'
  );
  assert.equal(adapter.findPostByMediaUrls(['https://scontent.example.test/media/missing.mp4']), null);
});
