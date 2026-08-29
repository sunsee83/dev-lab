import { queryHandlePermission, requestHandlePermission } from '../core/capability.js';

const STORAGE_KEY = 'ri32:settings:v2';
const LEGACY_STORAGE_KEY = 'ri32:settings:v1';
const DB_NAME = 'ri32';
const DB_VERSION = 1;
const HANDLE_STORE = 'handles';
const LEGACY_DIRECTORY_KEY = 'download-directory';
const POLICY_KEYS = ['video', 'image', 'carousel'];
const MODES = new Set(['default', 'directory', 'prompt']);

export function createSettingsStore({ env = globalThis, capabilities, onChange } = {}) {
  const listeners = new Set();
  let state = {
    downloadPolicies: createPolicies(capabilities),
    schemaVersion: 2
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
    const video = state.downloadPolicies.video;
    return {
      downloadPolicies: Object.fromEntries(POLICY_KEYS.map((key) => [key, { ...state.downloadPolicies[key] }])),
      downloadMode: video.downloadMode,
      directoryName: video.directoryName,
      directoryHandle: video.directoryHandle,
      directoryPermission: video.directoryPermission,
      schemaVersion: state.schemaVersion
    };
  }

  async function init() {
    const persisted = readJson(env.localStorage, STORAGE_KEY);
    const legacy = persisted ? null : readJson(env.localStorage, LEGACY_STORAGE_KEY);
    applyPersistedPolicies(persisted, legacy);

    if (capabilities?.indexedDB) {
      try {
        await restoreDirectoryHandles(env.indexedDB, { migrateLegacy: !!legacy });
      } catch (error) {
        console.warn('[RI] directory handle restore failed', error);
      }
    }

    for (const key of POLICY_KEYS) normalizeDirectoryState(state.downloadPolicies[key], capabilities);
    persistScalarState();
    notify();
    return getState();
  }

  function setDownloadMode(profileKey, mode) {
    if (mode === undefined && MODES.has(profileKey)) {
      mode = profileKey;
      let changed = false;
      for (const key of POLICY_KEYS) {
        if (state.downloadPolicies[key].downloadMode === mode) continue;
        state.downloadPolicies[key].downloadMode = mode;
        changed = true;
      }
      if (!changed) return getState();
      persistScalarState();
      notify();
      return getState();
    }
    const policy = getPolicy(profileKey);
    if (!MODES.has(mode)) throw new Error(`Unsupported download mode: ${mode}`);
    if (policy.downloadMode === mode) return getState();
    policy.downloadMode = mode;
    persistScalarState();
    notify();
    return getState();
  }

  async function selectDirectory(profileKey = null) {
    const targetKeys = profileKey ? [profileKey] : POLICY_KEYS;
    const policy = getPolicy(targetKeys[0]);
    if (!capabilities?.directoryPicker || typeof env.showDirectoryPicker !== 'function') {
      return { ok: false, code: 'unsupported', message: '폴더 선택을 지원하지 않는 환경입니다.' };
    }

    try {
      const handle = await env.showDirectoryPicker({ mode: 'readwrite' });
      const permission = await requestHandlePermission(handle);
      if (permission !== 'granted') {
        policy.directoryPermission = permission;
        notify();
        return { ok: false, code: 'permission-denied', message: '저장 폴더 쓰기 권한이 필요합니다.' };
      }

      for (const key of targetKeys) {
        const target = getPolicy(key);
        target.directoryHandle = handle;
        target.directoryName = handle.name || null;
        target.directoryPermission = permission;
        target.downloadMode = 'directory';
      }
      persistScalarState();
      if (capabilities?.indexedDB) {
        try {
          for (const key of targetKeys) await writeHandle(env.indexedDB, handleKey(key), handle);
        } catch (error) {
          console.warn('[RI] directory handle persistence failed', error);
        }
      }
      notify();
      return { ok: true, code: 'selected', folderName: policy.directoryName, profileKey: profileKey || 'all' };
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, code: 'cancelled', message: '폴더 선택을 취소했습니다.' };
      return { ok: false, code: 'picker-failed', message: '폴더를 선택하지 못했습니다.', error };
    }
  }

  async function clearDirectory(profileKey) {
    const policy = getPolicy(profileKey);
    policy.directoryHandle = null;
    policy.directoryName = null;
    policy.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
    if (policy.downloadMode === 'directory') policy.downloadMode = 'default';
    persistScalarState();
    if (capabilities?.indexedDB) {
      try {
        await deleteHandle(env.indexedDB, handleKey(profileKey));
      } catch (error) {
        console.warn('[RI] directory handle delete failed', error);
      }
    }
    notify();
    return getState();
  }

  async function refreshDirectoryPermission(profileKey, { request = false } = {}) {
    const policy = getPolicy(profileKey);
    if (!policy.directoryHandle) {
      policy.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
      notify();
      return policy.directoryPermission;
    }
    policy.directoryPermission = request
      ? await requestHandlePermission(policy.directoryHandle)
      : await queryHandlePermission(policy.directoryHandle);
    notify();
    return policy.directoryPermission;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getPolicy(profileKey) {
    if (!POLICY_KEYS.includes(profileKey)) throw new Error(`Unsupported download profile: ${profileKey}`);
    return state.downloadPolicies[profileKey];
  }

  function applyPersistedPolicies(persisted, legacy) {
    if (persisted?.downloadPolicies) {
      for (const key of POLICY_KEYS) applyScalarPolicy(state.downloadPolicies[key], persisted.downloadPolicies[key]);
      return;
    }
    if (!legacy || !MODES.has(legacy.downloadMode)) return;
    for (const key of POLICY_KEYS) {
      applyScalarPolicy(state.downloadPolicies[key], {
        downloadMode: legacy.downloadMode,
        directoryName: legacy.directoryName
      });
    }
  }

  async function restoreDirectoryHandles(indexedDB, { migrateLegacy = false } = {}) {
    let legacyHandle = null;
    if (migrateLegacy) legacyHandle = await readHandle(indexedDB, LEGACY_DIRECTORY_KEY);

    for (const key of POLICY_KEYS) {
      const policy = state.downloadPolicies[key];
      const storedHandle = await readHandle(indexedDB, handleKey(key));
      const handle = storedHandle || legacyHandle;
      if (!handle) continue;
      policy.directoryHandle = handle;
      policy.directoryName = handle.name || policy.directoryName;
      policy.directoryPermission = await queryHandlePermission(handle);
      if (!storedHandle && legacyHandle) await writeHandle(indexedDB, handleKey(key), legacyHandle);
    }
  }

  function persistScalarState() {
    writeJson(env.localStorage, STORAGE_KEY, {
      downloadPolicies: Object.fromEntries(POLICY_KEYS.map((key) => [key, {
        downloadMode: state.downloadPolicies[key].downloadMode,
        directoryName: state.downloadPolicies[key].directoryName
      }])),
      schemaVersion: state.schemaVersion
    });
    const first = state.downloadPolicies.video;
    const globalCompatible = POLICY_KEYS.every((key) => {
      const policy = state.downloadPolicies[key];
      return policy.downloadMode === first.downloadMode && policy.directoryName === first.directoryName;
    });
    if (globalCompatible) {
      writeJson(env.localStorage, LEGACY_STORAGE_KEY, {
        downloadMode: first.downloadMode,
        directoryName: first.directoryName,
        schemaVersion: 1
      });
    } else {
      try { env.localStorage?.removeItem?.(LEGACY_STORAGE_KEY); } catch {}
    }
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

function createPolicies(capabilities) {
  return Object.fromEntries(POLICY_KEYS.map((key) => [key, {
    downloadMode: 'default',
    directoryName: null,
    directoryHandle: null,
    directoryPermission: capabilities?.directoryPicker ? 'prompt' : 'unavailable'
  }]));
}

function applyScalarPolicy(policy, persisted) {
  if (MODES.has(persisted?.downloadMode)) policy.downloadMode = persisted.downloadMode;
  if (typeof persisted?.directoryName === 'string') policy.directoryName = persisted.directoryName || null;
}

function normalizeDirectoryState(policy, capabilities) {
  if (policy.downloadMode === 'directory' && !policy.directoryHandle) {
    policy.directoryPermission = capabilities?.directoryPicker ? 'prompt' : 'unavailable';
  }
}

function handleKey(profileKey) {
  return `download-directory:${profileKey}`;
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

function readHandle(indexedDB, key) {
  return withHandleStore(indexedDB, 'readonly', (store) => store.get(key));
}

function writeHandle(indexedDB, key, handle) {
  return withHandleStore(indexedDB, 'readwrite', (store) => store.put(handle, key));
}

function deleteHandle(indexedDB, key) {
  return withHandleStore(indexedDB, 'readwrite', (store) => store.delete(key));
}
