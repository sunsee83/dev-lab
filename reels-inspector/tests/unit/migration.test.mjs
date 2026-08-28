import test from 'node:test';
import assert from 'node:assert/strict';

import { createLegacyStoreAdapter } from '../../src/migration/legacy-store-adapter.js';
import { resolveGridCardMedia, extensionFromUrl, mediaFilename } from '../../src/media/media-resolver.js';

test('legacy migration adapter exposes verified cache values and current identity', () => {
  const item = {
    fields: {
      mediaType: { value: 'REEL', status: 'verified' },
      views: { value: 12345, status: 'verified' },
      coverUrl: { value: 'https://cdn.example.test/cover.jpg', status: 'verified' }
    },
    pageUrl: 'https://www.instagram.com/reel/ABC123/'
  };
  const env = {
    location: { href: 'https://www.instagram.com/reel/ABC123/' },
    localStorage: {
      getItem(key) {
        return key === 'ri311:items:v1' ? JSON.stringify({ ABC123: item }) : null;
      }
    }
  };
  const adapter = createLegacyStoreAdapter({ env });
  const post = adapter.getPost('ABC123');
  const identity = adapter.getCurrentIdentity();

  assert.equal(post.mediaType, 'REEL');
  assert.equal(post.views, 12345);
  assert.equal(post.coverUrl, 'https://cdn.example.test/cover.jpg');
  assert.equal(identity.shortcode, 'ABC123');
  assert.equal(identity.mediaType, 'REEL');
  assert.equal(identity.state, 'IDENTIFIED');
});

test('media resolver keeps the large card body image instead of a small album image', () => {
  const album = fakeImage({ left: 80, top: 8, width: 20, height: 20, src: 'https://cdn.example.test/album.jpg', alt: 'music album' });
  const body = fakeImage({ left: 0, top: 0, width: 100, height: 100, src: 'https://cdn.example.test/body.jpg' });
  const anchor = {
    href: 'https://www.instagram.com/reel/ABC123/',
    getBoundingClientRect() { return rect(0, 0, 100, 100); },
    querySelectorAll(selector) { return selector === 'img' ? [album, body] : []; },
    querySelector() { return null; }
  };

  const media = resolveGridCardMedia({
    anchor,
    shortcode: 'ABC123',
    post: { shortcode: 'ABC123', mediaType: 'REEL', coverUrl: 'https://cdn.example.test/fallback.jpg' }
  });

  assert.equal(media.imageUrl, 'https://cdn.example.test/body.jpg');
  assert.equal(media.type, 'REEL');
  assert.equal(extensionFromUrl('https://cdn.example.test/a.JPG?x=1', '.jpg'), '.jpg');
});

test('media filename is owned by the media layer and preserves kind/index conventions', () => {
  assert.equal(mediaFilename({ kind: 'video', shortcode: 'ABC123', url: 'https://cdn.example.test/v.mp4?x=1' }), 'Instagram_ABC123_video.mp4');
  assert.equal(mediaFilename({ kind: 'cover', shortcode: 'ABC123', url: 'https://cdn.example.test/no-extension' }), 'Instagram_ABC123_thumb.jpg');
  assert.equal(mediaFilename({ kind: 'photo', shortcode: 'ABC123', url: 'https://cdn.example.test/a.webp' }), 'Instagram_ABC123_image.webp');
  assert.equal(mediaFilename({ kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/2.jpg', slideIndex: 2 }), 'Instagram_CAR123_slide_02.jpg');
});

function fakeImage({ left, top, width, height, src, alt = '' }) {
  return {
    alt,
    src,
    currentSrc: src,
    getBoundingClientRect() { return rect(left, top, width, height); },
    getAttribute(name) {
      if (name === 'srcset') return '';
      return '';
    }
  };
}

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}
