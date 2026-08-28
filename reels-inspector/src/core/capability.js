export function detectCapabilities(env = globalThis) {
  const doc = env.document;
  let anchorDownload = false;
  try {
    anchorDownload = !!doc && 'download' in doc.createElement('a');
  } catch {
    anchorDownload = false;
  }

  return Object.freeze({
    directoryPicker: typeof env.showDirectoryPicker === 'function',
    saveFilePicker: typeof env.showSaveFilePicker === 'function',
    fileSystemWrite: typeof env.FileSystemFileHandle !== 'undefined' || typeof env.FileSystemDirectoryHandle !== 'undefined',
    indexedDB: !!env.indexedDB,
    clipboard: !!env.navigator?.clipboard?.writeText,
    anchorDownload
  });
}

export async function queryHandlePermission(handle) {
  if (!handle) return 'unavailable';
  if (typeof handle.queryPermission !== 'function') return 'granted';
  try {
    return await handle.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

export async function requestHandlePermission(handle) {
  if (!handle) return 'unavailable';
  const current = await queryHandlePermission(handle);
  if (current === 'granted') return current;
  if (typeof handle.requestPermission !== 'function') return current;
  try {
    return await handle.requestPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}
