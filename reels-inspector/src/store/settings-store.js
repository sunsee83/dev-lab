import { queryHandlePermission, requestHandlePermission } from '../core/capability.js';

const STORAGE_KEY = 'ri32:settings:v1';
const DB_NAME = 'ri32';
const DB_VERSION = 1;
const HANDLE_STORE = 'handles';
const DIRECTORY_KEY = 'download-directory';
const MODES = new Set(['default', 'directory', 'prompt']);

export function createSettingsStore({ env = globalThis, capabilities, onChange } = {}) {
  const listeners = new Set();
  let state = {
    downloadMode: 'default',
    directoryName: null,
    directoryHandle: null,
    directoryPermission: capabilities?.directoryPicker ? 'prompt' : 'unavailable',
    schemaVersion: 1
  };

  function notify() {
    const snapshot = getState();
    if (typeof onChange === 'function') onChange(snapshot);
    for (const listener of [...listeners]) {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn('[RI] settings listener failed', error);
      }
    }
  }

  function getState() {
    return { ...state };
  }

  async function init() {
    const persisted = readJson(env.localStorage, STORAGE_KEY);
    if (persisted && MODES.has(persisted.downloadMode)) state.downloadMode = persisted.downloadMode;
    if (typeof persisted?.directoryName === 'string') state.directoryName = persisted.directoryName || null;

    if (capabilities?.indexedDB) {
      try {
        const handle = await readHandle(env.indexedDB);
        if (handle) {
          state.directoryHandle = handle;
          state.directoryName = handle.name || state.directoryName;
          state.directoryPermission = await queryHandlePermission(handle);
        }
      } catch (error) {
        console.warn('[RI] directory handle restore failed', error);
      }
    }

    if (state.downloadMode === 'directory' && !state.directoryHandle) {
      state.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
    }
    persistScalarState();
    notify();
    return getState();
  }

  function setDownloadMode(mode) {
    if (!MODES.has(mode)) throw new Error(`Unsupported download mode: ${mode}`);
    if (state.downloadMode === mode) return getState();
    state.downloadMode = mode;
    persistScalarState();
    notify();
    return getState();
  }

  async function selectDirectory() {
    if (!capabilities?.directoryPicker || typeof env.showDirectoryPicker !== 'function') {
      return { ok: false, code: 'unsupported', message: '폴더 선택을 지원하지 않는 환경입니다.' };
    }

    try {
      const handle = await env.showDirectoryPicker({ mode: 'readwrite' });
      const permission = await requestHandlePermission(handle);
      if (permission !== 'granted') {
        state.directoryPermission = permission;
        notify();
        return { ok: false, code: 'permission-denied', message: '저장 폴더 쓰기 권한이 필요합니다.' };
      }

      state.directoryHandle = handle;
      state.directoryName = handle.name || null;
      state.directoryPermission = permission;
      state.downloadMode = 'directory';
      persistScalarState();
      if (capabilities?.indexedDB) {
        try {
          await writeHandle(env.indexedDB, handle);
        } catch (error) {
          console.warn('[RI] directory handle persistence failed', error);
        }
      }
      notify();
      return { ok: true, code: 'selected', folderName: state.directoryName };
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, code: 'cancelled', message: '폴더 선택을 취소했습니다.' };
      return { ok: false, code: 'picker-failed', message: '폴더를 선택하지 못했습니다.', error };
    }
  }

  async function clearDirectory() {
    state.directoryHandle = null;
    state.directoryName = null;
    state.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
    if (state.downloadMode === 'directory') state.downloadMode = 'default';
    persistScalarState();
    if (capabilities?.indexedDB) {
      try {
        await deleteHandle(env.indexedDB);
      } catch (error) {
        console.warn('[RI] directory handle delete failed', error);
      }
    }
    notify();
    return getState();
  }

  async function refreshDirectoryPermission({ request = false } = {}) {
    if (!state.directoryHandle) {
      state.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
      notify();
      return state.directoryPermission;
    }
    state.directoryPermission = request
      ? await requestHandlePermission(state.directoryHandle)
      : await queryHandlePermission(state.directoryHandle);
    notify();
    return state.directoryPermission;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function persistScalarState() {
    writeJson(env.localStorage, STORAGE_KEY, {
      downloadMode: state.downloadMode,
      directoryName: state.directoryName,
      schemaVersion: state.schemaVersion
    });
  }

  return {
    init,
    getState,
    setDownloadMode,
    selectDirectory,
    clearDirectory,
    refreshDirectoryPermission,
    subscribe
  };
}

function readJson(storage, key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[RI] settings persistence failed', error);
  }
}

function openDb(indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
  });
}

async function withHandleStore(indexedDB, mode, operation) {
  const db = await openDb(indexedDB);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, mode);
      const store = tx.objectStore(HANDLE_STORE);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error || new Error('indexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

function readHandle(indexedDB) {
  return withHandleStore(indexedDB, 'readonly', (store) => store.get(DIRECTORY_KEY));
}

function writeHandle(indexedDB, handle) {
  return withHandleStore(indexedDB, 'readwrite', (store) => store.put(handle, DIRECTORY_KEY));
}

function deleteHandle(indexedDB) {
  return withHandleStore(indexedDB, 'readwrite', (store) => store.delete(DIRECTORY_KEY));
}
