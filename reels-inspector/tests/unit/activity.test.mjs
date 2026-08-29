import test from 'node:test';
import assert from 'node:assert/strict';

import { createActivityStore } from '../../src/core/activity.js';
import { createDownloadManager } from '../../src/media/download-manager.js';

test('Activity Store merges progress by id and prioritizes persistent errors over running work', () => {
  let tick = 100;
  const store = createActivityStore({ now: () => tick += 1 });
  const changes = [];
  store.subscribe((change) => changes.push(change.type));

  store.apply({
    id: 'download:1',
    kind: 'download',
    state: 'running',
    label: '캐러셀 8장 저장',
    progress: { current: 1, total: 8 },
    message: '1/8 저장 중'
  });
  store.apply({
    id: 'download:1',
    kind: 'download',
    state: 'running',
    label: '캐러셀 8장 저장',
    progress: { current: 3, total: 8 },
    message: '3/8 저장 중'
  });

  assert.equal(store.getState().activities.length, 1);
  assert.deepEqual(store.getVisible().progress, { current: 3, total: 8 });
  assert.equal(store.getVisible().message, '3/8 저장 중');

  store.apply({
    id: 'download:2',
    kind: 'download',
    state: 'error',
    label: '이미지 저장',
    code: 'permission-denied',
    message: '저장 폴더 쓰기 권한이 필요합니다.',
    persistent: true,
    action: 'open-settings',
    actionLabel: '설정 열기'
  });

  assert.equal(store.getVisible().id, 'download:2');
  assert.equal(store.getVisible().action, 'open-settings');
  store.dismiss('download:2');
  assert.equal(store.getVisible().id, 'download:1');
  assert.deepEqual(changes, ['added', 'updated', 'added', 'removed']);
});

test('Download Manager publishes carousel progress and one final success activity', async () => {
  const changes = [];
  const written = [];
  const handle = {
    name: 'Batch',
    async queryPermission() { return 'granted'; },
    async getFileHandle(filename) {
      return {
        async createWritable() {
          return {
            async write() { written.push(filename); },
            async close() {}
          };
        }
      };
    }
  };
  const env = createDownloadEnv();
  env.showDirectoryPicker = async () => handle;
  const manager = createDownloadManager({
    env,
    settings: { getState: () => ({ downloadMode: 'prompt' }) },
    capabilities: { directoryPicker: true, saveFilePicker: false },
    onChange(change) { changes.push(change); }
  });

  const result = await manager.downloadBatch([
    { kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/1.jpg', slideIndex: 1 },
    { kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/2.jpg', slideIndex: 2 },
    { kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/3.jpg', slideIndex: 3 }
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(written, [
    'Instagram_CAR123_slide_01.jpg',
    'Instagram_CAR123_slide_02.jpg',
    'Instagram_CAR123_slide_03.jpg'
  ]);
  const activities = changes.map((change) => change.activity).filter(Boolean);
  assert.deepEqual(
    activities.filter((item) => item.state === 'running').map((item) => item.message),
    ['3장 저장 준비 중…', '1/3 저장 중', '2/3 저장 중', '3/3 저장 중']
  );
  assert.equal(activities.at(-1).state, 'success');
  assert.equal(activities.at(-1).message, '3개 파일 저장을 요청했습니다.');
});

test('Download Manager makes directory permission failures persistent and actionable without fallback', async () => {
  let anchorClicks = 0;
  const changes = [];
  const env = createDownloadEnv(() => { anchorClicks += 1; });
  const handle = {
    name: 'Research',
    async queryPermission() { return 'denied'; },
    async requestPermission() { return 'denied'; }
  };
  const manager = createDownloadManager({
    env,
    settings: {
      getState() {
        return {
          downloadMode: 'directory',
          directoryHandle: handle,
          directoryName: 'Research'
        };
      }
    },
    capabilities: { directoryPicker: true },
    onChange(change) { changes.push(change); }
  });

  const result = await manager.download({
    kind: 'photo',
    shortcode: 'ABC123',
    url: 'https://cdn.example.test/image.jpg'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'permission-denied');
  assert.equal(anchorClicks, 0);
  const activity = changes.map((change) => change.activity).find((item) => item?.state === 'error');
  assert.equal(activity.persistent, true);
  assert.equal(activity.action, 'open-settings');
  assert.equal(activity.actionLabel, '설정 열기');
});

function createDownloadEnv(anchorClick = () => {}) {
  return {
    fetch: async () => ({
      ok: true,
      async blob() { return new Blob(['media']); }
    }),
    URL: {
      createObjectURL() { return 'blob:ri-test'; },
      revokeObjectURL() {}
    },
    document: {
      body: { appendChild() {} },
      createElement() {
        return {
          style: {},
          click: anchorClick,
          remove() {}
        };
      }
    }
  };
}
