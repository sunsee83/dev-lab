import { requestHandlePermission } from '../core/capability.js';
import { mediaFilename } from './media-resolver.js';

const VALID_KINDS = new Set(['video', 'cover', 'photo', 'carousel-slide', 'export']);

export function createDownloadManager({ env = globalThis, settings, capabilities, onChange } = {}) {
  if (!settings) throw new Error('Download Manager requires Settings Store');

  let activeJobs = 0;

  async function download(request, destinationOverride = null) {
    const normalized = normalizeRequest(request);
    if (!normalized.ok) return normalized.result;

    const destination = destinationOverride || await resolveDestination(false);
    if (!destination.ok) return destination.result;

    return runJob(normalized.request, destination);
  }

  async function downloadBatch(requests) {
    const normalizedRequests = [];
    for (const request of Array.isArray(requests) ? requests : []) {
      const normalized = normalizeRequest(request);
      if (!normalized.ok) return { ok: false, code: 'invalid-media', message: '다운로드할 미디어 정보가 올바르지 않습니다.' };
      normalizedRequests.push(normalized.request);
    }
    if (!normalizedRequests.length) return { ok: false, code: 'invalid-media', message: '다운로드할 파일이 없습니다.' };

    const destination = await resolveDestination(true);
    if (!destination.ok) return destination.result;

    const results = [];
    for (const request of normalizedRequests) results.push(await runJob(request, destination));
    const failed = results.find((result) => !result.ok);
    return {
      ok: !failed,
      code: failed ? 'batch-partial' : 'saved',
      destinationMode: destination.mode,
      folderName: destination.folderName || null,
      results,
      message: failed ? '일부 파일을 저장하지 못했습니다.' : `${results.length}개 파일 저장을 요청했습니다.`
    };
  }

  async function resolveDestination(batch) {
    const state = settings.getState();
    const mode = state.downloadMode || 'default';

    if (mode === 'default') return { ok: true, mode: 'default', folderName: null };

    if (mode === 'directory') {
      const handle = state.directoryHandle;
      if (!handle) {
        return failure('permission-denied', '저장 폴더를 다시 연결해야 합니다.', mode, state.directoryName);
      }
      const permission = await requestHandlePermission(handle);
      if (permission !== 'granted') {
        return failure('permission-denied', '저장 폴더 쓰기 권한이 필요합니다.', mode, state.directoryName);
      }
      return { ok: true, mode, handle, folderName: handle.name || state.directoryName || null };
    }

    if (mode === 'prompt') {
      if (batch) {
        if (!capabilities?.directoryPicker || typeof env.showDirectoryPicker !== 'function') {
          return failure('unsupported', '캐러셀 일괄 저장 위치 선택을 지원하지 않는 환경입니다.', mode);
        }
        try {
          const handle = await env.showDirectoryPicker({ mode: 'readwrite' });
          const permission = await requestHandlePermission(handle);
          if (permission !== 'granted') return failure('permission-denied', '선택한 폴더 쓰기 권한이 필요합니다.', mode, handle.name);
          return { ok: true, mode: 'prompt-directory', handle, folderName: handle.name || null };
        } catch (error) {
          if (error?.name === 'AbortError') return failure('cancelled', '저장 위치 선택을 취소했습니다.', mode);
          return failure('picker-failed', '저장 위치를 선택하지 못했습니다.', mode, null, error);
        }
      }

      if (capabilities?.saveFilePicker && typeof env.showSaveFilePicker === 'function') return { ok: true, mode: 'prompt-file' };
      if (capabilities?.directoryPicker && typeof env.showDirectoryPicker === 'function') {
        try {
          const handle = await env.showDirectoryPicker({ mode: 'readwrite' });
          const permission = await requestHandlePermission(handle);
          if (permission !== 'granted') return failure('permission-denied', '선택한 폴더 쓰기 권한이 필요합니다.', mode, handle.name);
          return { ok: true, mode: 'prompt-directory', handle, folderName: handle.name || null };
        } catch (error) {
          if (error?.name === 'AbortError') return failure('cancelled', '저장 위치 선택을 취소했습니다.', mode);
          return failure('picker-failed', '저장 위치를 선택하지 못했습니다.', mode, null, error);
        }
      }
      return failure('unsupported', '매번 저장 위치 선택을 지원하지 않는 환경입니다.', mode);
    }

    return failure('unsupported', '알 수 없는 저장 방식입니다.', mode);
  }

  async function runJob(request, destination) {
    activeJobs += 1;
    emitState({ activeJobs, state: 'running', request });
    try {
      let result;
      if (destination.mode === 'default') result = await saveBrowserDefault(request);
      else if (destination.mode === 'prompt-file') result = await saveWithFilePicker(request);
      else result = await saveToDirectory(request, destination.handle, destination.mode, destination.folderName);
      return result;
    } finally {
      activeJobs = Math.max(0, activeJobs - 1);
      emitState({ activeJobs, state: 'idle', request });
    }
  }

  async function saveToDirectory(request, handle, mode, folderName) {
    let blob;
    try {
      blob = await fetchBlob(request.url);
    } catch (error) {
      return result(false, 'fetch-failed', request, mode, folderName, '미디어 데이터를 가져오지 못했습니다.', error);
    }

    try {
      const fileHandle = await handle.getFileHandle(request.filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return result(true, 'saved', request, mode, folderName, '파일을 저장했습니다.');
    } catch (error) {
      return result(false, 'write-failed', request, mode, folderName, '선택한 폴더에 파일을 쓰지 못했습니다.', error);
    }
  }

  async function saveWithFilePicker(request) {
    let blob;
    try {
      blob = await fetchBlob(request.url);
    } catch (error) {
      return result(false, 'fetch-failed', request, 'prompt', null, '미디어 데이터를 가져오지 못했습니다.', error);
    }

    try {
      const handle = await env.showSaveFilePicker({ suggestedName: request.filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return result(true, 'saved', request, 'prompt', null, '파일을 저장했습니다.');
    } catch (error) {
      if (error?.name === 'AbortError') return result(false, 'cancelled', request, 'prompt', null, '저장을 취소했습니다.', error);
      return result(false, 'write-failed', request, 'prompt', null, '파일을 저장하지 못했습니다.', error);
    }
  }

  async function saveBrowserDefault(request) {
    let objectUrl = '';
    try {
      const blob = await fetchBlob(request.url);
      objectUrl = env.URL.createObjectURL(blob);
      clickDownload(objectUrl, request.filename);
      setTimeout(() => env.URL.revokeObjectURL(objectUrl), 2500);
      return result(true, 'saved', request, 'default', null, '브라우저 기본 다운로드로 저장을 요청했습니다.');
    } catch (error) {
      try {
        clickDownload(request.url, request.filename);
        return result(true, 'saved', request, 'default', null, '브라우저 기본 다운로드로 저장을 요청했습니다.');
      } catch (directError) {
        if (objectUrl) env.URL.revokeObjectURL(objectUrl);
        return result(false, 'write-failed', request, 'default', null, '브라우저 다운로드를 시작하지 못했습니다.', directError || error);
      }
    }
  }

  async function fetchBlob(url) {
    if (typeof env.fetch !== 'function') throw new Error('fetch unavailable');
    const response = await env.fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  }

  function clickDownload(url, filename) {
    const doc = env.document;
    if (!doc?.body) throw new Error('document body unavailable');
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function emitState(payload) {
    if (typeof onChange === 'function') onChange(payload);
  }

  return { download, downloadBatch };
}

function normalizeRequest(request) {
  if (!request || !VALID_KINDS.has(request.kind) || !/^https?:/i.test(String(request.url || ''))) {
    return { ok: false, result: { ok: false, code: 'invalid-media', message: '다운로드할 미디어 정보가 올바르지 않습니다.' } };
  }

  const shortcode = String(request.shortcode || '').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = sanitizeFilename(request.filename || mediaFilename({
    kind: request.kind,
    shortcode,
    url: request.url,
    slideIndex: request.slideIndex
  }));
  return {
    ok: true,
    request: {
      kind: request.kind,
      shortcode,
      url: String(request.url),
      filename,
      mimeHint: request.mimeHint || '',
      slideIndex: request.slideIndex ?? null
    }
  };
}

function sanitizeFilename(filename) {
  return String(filename || 'Instagram_media')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'Instagram_media';
}

function result(ok, code, request, destinationMode, folderName, message, error = null) {
  return {
    ok,
    code,
    destinationMode,
    folderName: folderName || null,
    filename: request.filename,
    message,
    error
  };
}

function failure(code, message, destinationMode, folderName = null, error = null) {
  return { ok: false, result: { ok: false, code, destinationMode, folderName, message, error } };
}
