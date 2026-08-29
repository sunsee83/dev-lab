import test from 'node:test';
import assert from 'node:assert/strict';

import { createSettingsStore } from '../../src/store/settings-store.js';
import { createDownloadManager } from '../../src/media/download-manager.js';

test('v1 global save setting migrates to v2 media profiles and profiles can diverge', async () => {
  const data = new Map([
    ['ri32:settings:v1', JSON.stringify({ downloadMode: 'prompt', directoryName: 'Legacy', schemaVersion: 1 })]
  ]);
  const store = createSettingsStore({
    env: {
      localStorage: {
        getItem(key) { return data.get(key) ?? null; },
        setItem(key, value) { data.set(key, value); },
        removeItem(key) { data.delete(key); }
      }
    },
    capabilities: { directoryPicker: false, indexedDB: false }
  });

  await store.init();
  const migrated = store.getState();
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.downloadPolicies.video.downloadMode, 'prompt');
  assert.equal(migrated.downloadPolicies.image.downloadMode, 'prompt');
  assert.equal(migrated.downloadPolicies.carousel.downloadMode, 'prompt');

  store.setDownloadMode('video', 'default');
  const split = store.getState();
  assert.equal(split.downloadPolicies.video.downloadMode, 'default');
  assert.equal(split.downloadPolicies.image.downloadMode, 'prompt');
  assert.equal(split.downloadPolicies.carousel.downloadMode, 'prompt');
  assert.equal(JSON.parse(data.get('ri32:settings:v2')).schemaVersion, 2);
  assert.equal(data.has('ri32:settings:v1'), false);
});

test('download manager routes video, image and carousel to their own directory profiles', async () => {
  const written = { video: [], image: [], carousel: [] };
  const handles = Object.fromEntries(Object.keys(written).map((key) => [key, createHandle(key, written[key])]));
  const settings = {
    getState() {
      return {
        downloadPolicies: {
          video: policy(handles.video),
          image: policy(handles.image),
          carousel: policy(handles.carousel)
        }
      };
    }
  };
  const manager = createDownloadManager({
    env: createDownloadEnv(),
    settings,
    capabilities: { directoryPicker: true, saveFilePicker: false }
  });

  assert.equal((await manager.download({ kind: 'video', shortcode: 'VID1', url: 'https://cdn.test/a.mp4' })).ok, true);
  assert.equal((await manager.download({ kind: 'photo', shortcode: 'IMG1', url: 'https://cdn.test/a.jpg' })).ok, true);
  assert.equal((await manager.downloadBatch([
    { kind: 'carousel-slide', shortcode: 'CAR1', url: 'https://cdn.test/1.jpg', slideIndex: 1 },
    { kind: 'carousel-slide', shortcode: 'CAR1', url: 'https://cdn.test/2.jpg', slideIndex: 2 }
  ])).ok, true);

  assert.deepEqual(written.video, ['Instagram_VID1_video.mp4']);
  assert.deepEqual(written.image, ['Instagram_IMG1_image.jpg']);
  assert.deepEqual(written.carousel, ['Instagram_CAR1_slide_01.jpg', 'Instagram_CAR1_slide_02.jpg']);
});

function policy(handle) {
  return { downloadMode: 'directory', directoryHandle: handle, directoryName: handle.name };
}

function createHandle(name, written) {
  return {
    name,
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
}

function createDownloadEnv() {
  return {
    fetch: async () => ({ ok: true, async blob() { return new Blob(['media']); } }),
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
    document: {
      body: { appendChild() {} },
      createElement() { return { style: {}, click() {}, remove() {} }; }
    }
  };
}
