import test from 'node:test';
import assert from 'node:assert/strict';

import { captionText, extractCaptionEntities, extractContentModel } from '../../src/data/content-model.js';
import { extractInstagramMedia } from '../../src/data/extractor.js';
import { createVerifiedStore } from '../../src/store/verified-store.js';

test('Content Model preserves full caption and extracts ordered unique hashtags/mentions', () => {
  const media = {
    caption: {
      text: '첫 줄 그대로\n#리서치 #AI @Creator @creator #리서치 #데이터_분석'
    }
  };
  const content = extractContentModel(media);

  assert.equal(content.caption, media.caption.text);
  assert.deepEqual(content.hashtags, ['#리서치', '#AI', '#데이터_분석']);
  assert.deepEqual(content.mentions, ['@Creator']);
  assert.deepEqual(extractCaptionEntities('본문 없음'), { hashtags: [], mentions: [] });
});

test('Extractor maps edge caption fallback into the common post content model without inventing missing text', () => {
  const result = extractInstagramMedia({
    code: 'POST123',
    media_type: 1,
    edge_media_to_caption: {
      edges: [{ node: { text: '사진 본문 #여행 @friend.name' } }]
    }
  }, { pageUrl: 'https://www.instagram.com/p/POST123/' });

  assert.equal(result.patch.caption, '사진 본문 #여행 @friend.name');
  assert.deepEqual(result.patch.hashtags, ['#여행']);
  assert.deepEqual(result.patch.mentions, ['@friend.name']);
  assert.equal(captionText({ caption: { text: '   ' } }), '');

  const missing = extractInstagramMedia({ code: 'EMPTY1', media_type: 1 }, {
    pageUrl: 'https://www.instagram.com/p/EMPTY1/'
  });
  assert.equal(missing.patch.caption, undefined);
  assert.equal(missing.patch.hashtags, undefined);
  assert.equal(missing.patch.mentions, undefined);
});

test('Verified Store exposes content and allows verified caption edits without weaker evidence rollback', () => {
  let clock = 1000;
  const store = createVerifiedStore({ now: () => clock });
  store.upsert('EDIT1', {
    caption: '원문 #one',
    hashtags: ['#one'],
    mentions: []
  }, { source: 'network' });

  clock += 1000;
  const weak = store.upsert('EDIT1', {
    caption: '약한 DOM 값 #wrong',
    hashtags: ['#wrong']
  }, { source: 'dom' });
  assert.equal(weak.changed, false);
  assert.equal(store.getPost('EDIT1').caption, '원문 #one');

  clock += 1000;
  store.upsert('EDIT1', {
    caption: '수정된 원문 #two @person',
    hashtags: ['#two'],
    mentions: ['@person']
  }, { source: 'network' });

  const post = store.getPost('EDIT1');
  assert.equal(post.caption, '수정된 원문 #two @person');
  assert.deepEqual(post.hashtags, ['#two']);
  assert.deepEqual(post.mentions, ['@person']);
  assert.deepEqual(post.content, {
    caption: '수정된 원문 #two @person',
    hashtags: ['#two'],
    mentions: ['@person']
  });
});
