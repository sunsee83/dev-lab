import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp, EVENTS } from '../../src/core/app.js';
import { detectCapabilities } from '../../src/core/capability.js';
import { createSettingsStore } from '../../src/store/settings-store.js';
import { createDownloadManager } from '../../src/media/download-manager.js';

test('AppContext publishes events and dedupes scheduled render by key', async () => {
  let queuedFrame = null;
  const previousRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    queuedFrame = callback;
    return 1;
  };

  try {
    const app = createApp();
    const events = [];
    const unsubscribe = app.on(EVENTS.ROUTE_CHANGED, (payload) => events.push(payload.current.pathname));
    app.setRoute({ href: 'https://www.instagram.com/explore/', pathname: '/explore/' });
    app.setRoute({ href: 'https://www.instagram.com/explore/', pathname: '/explore/' });
    assert.deepEqual(events, ['/explore/']);

    const renders = [];
    app.scheduleRender('grid', () => renders.push('first'));
    app.scheduleRender('grid', () => renders.push('second'));
    assert.equal(typeof queuedFrame, 'function');
    queuedFrame();
    assert.deepEqual(renders, ['second']);

    unsubscribe();
    app.setRoute({ href: 'https://www.instagram.com/reels/', pathname: '/reels/' });
    assert.deepEqual(events, ['/explore/']);
    app.destroy();
  } finally {
    globalThis.requestAnimationFrame = previousRaf;
  }
});

test('capability detection is based on runtime APIs, not platform strings', () => {
  const env = {
    showDirectoryPicker() {},
    showSaveFilePicker() {},
    FileSystemDirectoryHandle: class {},
    indexedDB: {},
    navigator: { clipboard: { writeText() {} } },
    document: { createElement: () => ({ download: '' }) }
  };
  const capabilities = detectCapabilities(env);
  assert.equal(capabilities.directoryPicker, true);
  assert.equal(capabilities.saveFilePicker, true);
  assert.equal(capabilities.fileSystemWrite, true);
  assert.equal(capabilities.indexedDB, true);
  assert.equal(capabilities.clipboard, true);
  assert.equal(capabilities.anchorDownload, true);
});

test('Settings Store owns one global download mode and persists scalar state', async () => {
  const storageData = new Map();
  const env = {
    localStorage: {
      getItem(key) { return storageData.get(key) ?? null; },
      setItem(key, value) { storageData.set(key, value); }
    }
  };
  const store = createSettingsStore({
    env,
    capabilities: { directoryPicker: false, indexedDB: false }
  });

  await store.init();
  assert.equal(store.getState().downloadMode, 'default');
  store.setDownloadMode('prompt');
  assert.equal(store.getState().downloadMode, 'prompt');
  const persisted = JSON.parse(storageData.get('ri32:settings:v1'));
  assert.equal(persisted.downloadMode, 'prompt');
  assert.equal(persisted.schemaVersion, 1);
});

test('directory write failure returns an error and never falls back to browser download', async () => {
  let anchorClicks = 0;
  const env = createDownloadEnv({ anchorClicks: () => { anchorClicks += 1; } });
  const handle = {
    name: 'Research',
    async queryPermission() { return 'granted'; },
    async getFileHandle() { throw new Error('write blocked'); }
  };
  const settings = {
    getState() {
      return {
        downloadMode: 'directory',
        directoryHandle: handle,
        directoryName: 'Research'
      };
    }
  };
  const manager = createDownloadManager({ env, settings, capabilities: { directoryPicker: true } });
  const result = await manager.download({
    kind: 'photo',
    shortcode: 'ABC123',
    url: 'https://cdn.example.test/image.jpg',
    filename: 'Instagram_ABC123_image.jpg'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'write-failed');
  assert.equal(result.destinationMode, 'directory');
  assert.equal(anchorClicks, 0);
});

test('prompt batch chooses one directory and reuses it for every carousel slide', async () => {
  let pickerCalls = 0;
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
  env.showDirectoryPicker = async () => {
    pickerCalls += 1;
    return handle;
  };
  const settings = {
    getState() { return { downloadMode: 'prompt' }; }
  };
  const manager = createDownloadManager({
    env,
    settings,
    capabilities: { directoryPicker: true, saveFilePicker: false }
  });

  const result = await manager.downloadBatch([
    { kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/1.jpg', slideIndex: 1 },
    { kind: 'carousel-slide', shortcode: 'CAR123', url: 'https://cdn.example.test/2.jpg', slideIndex: 2 }
  ]);

  assert.equal(result.ok, true);
  assert.equal(pickerCalls, 1);
  assert.deepEqual(written, [
    'Instagram_CAR123_slide_01.jpg',
    'Instagram_CAR123_slide_02.jpg'
  ]);
});

function createDownloadEnv({ anchorClicks = () => {} } = {}) {
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
      body: {
        appendChild() {}
      },
      createElement() {
        return {
          style: {},
          click: anchorClicks,
          remove() {}
        };
      }
    }
  };
}
