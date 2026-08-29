import { requestHandlePermission } from '../core/capability.js';
import { mediaFilename } from './media-resolver.js';

const VALID_KINDS = new Set(['video', 'cover', 'photo', 'carousel-slide', 'export']);

export function createDownloadManager({ env = globalThis, settings, capabilities, onChange } = {}) {
  if (!settings) throw new Error('Download Manager requires Settings Store');

  let activeJobs = 0;
  let activitySeq = 0;

  async function download(request, destinationOverride = null) {
    const activityId = nextActivityId();
    const normalized = normalizeRequest(request);
    const label = downloadLabel(normalized.ok ? normalized.request.kind : request?.kind);
    emitActivity(runningActivity(activityId, label, null, '저장 준비 중…'));

    if (!normalized.ok) {
      emitResultActivity(activityId, label, normalized.result);
      return normalized.result;
    }

    const destination = destinationOverride || await resolveDestination(false);
    if (!destination.ok) {
      emitResultActivity(activityId, label, destination.result);
      return destination.result;
    }

    emitActivity(runningActivity(activityId, label, null, '파일 저장 중…'));
    const result = await runJob(normalized.request, destination);
    emitResultActivity(activityId, label, result);
    return result;
  }

  async function downloadBatch(requests) {
    const normalizedRequests = [];
    for (const request of Array.isArray(requests) ? requests : []) {
      const normalized = normalizeRequest(request);
      if (!normalized.ok) return normalized.result;
      normalizedRequests.push(normalized.request);
    }
    if (!normalizedRequests.length) return { ok: false, code: 'invalid-media', message: '다운로드할 파일이 없습니다.' };

    const total = normalizedRequests.length;
    const activityId = nextActivityId('download-batch');
    const label = `캐러셀 ${total}장 저장`;
    emitActivity(runningActivity(activityId, label, { current: 0, total }, `${total}장 저장 준비 중…`));

    const destination = await resolveDestination(true);
    if (!destination.ok) {
      emitResultActivity(activityId, label, destination.result, { current: 0, total });
      return destination.result;
    }

    const results = [];
    for (let index = 0; index < normalizedRequests.length; index += 1) {
      const current = index + 1;
      emitActivity(runningActivity(activityId, label, { current, total }, `${current}/${total} 저장 중`));
      results.push(await runJob(normalizedRequests[index], destination));
    }

    const failedResults = results.filter((item) => !item.ok);
    const failed = failedResults[0] || null;
    const successCount = results.length - failedResults.length;
    const batchResult = {
      ok: !failed,
      code: failed ? 'batch-partial' : 'saved',
      failedCode: failed?.code || null,
      failedCount: failedResults.length,
      successCount,
      destinationMode: destination.mode,
      folderName: destination.folderName || null,
      results,
      message: failed
        ? `${successCount}/${results.length}개 저장, ${failedResults.length}개 실패했습니다.`
        : `${results.length}개 파일 저장을 요청했습니다.`
    };
    emitResultActivity(activityId, label, batchResult, { current: total, total }, failed);
    return batchResult;
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
    try {
      if (destination.mode === 'default') return await saveBrowserDefault(request);
      if (destination.mode === 'prompt-file') return await saveWithFilePicker(request);
      return await saveToDirectory(request, destination.handle, destination.mode, destination.folderName);
    } finally {
      activeJobs = Math.max(0, activeJobs - 1);
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

  function emitActivity(activity) {
    if (typeof onChange === 'function') onChange({ activeJobs, activity });
  }

  function emitResultActivity(activityId, label, downloadResult, progress = null, failedResult = null) {
    if (downloadResult?.code === 'cancelled') {
      emitActivity({ id: activityId, kind: 'download', remove: true });
      return;
    }

    if (downloadResult?.ok) {
      emitActivity({
        id: activityId,
        kind: 'download',
        state: 'success',
        label,
        progress,
        code: downloadResult.code || 'saved',
        message: downloadResult.message || '저장을 완료했습니다.'
      });
      return;
    }

    const feedback = failureFeedback(failedResult || downloadResult);
    const failedMessage = failedResult?.message && failedResult.message !== downloadResult?.message
      ? `${downloadResult?.message || '저장하지 못했습니다.'} ${failedResult.message}`
      : (downloadResult?.message || failedResult?.message || '저장하지 못했습니다.');
    emitActivity({
      id: activityId,
      kind: 'download',
      state: 'error',
      label,
      progress,
      code: downloadResult?.failedCode || downloadResult?.code || failedResult?.code || 'download-failed',
      message: failedMessage,
      persistent: feedback.persistent,
      action: feedback.action,
      actionLabel: feedback.actionLabel
    });
  }

  function nextActivityId(prefix = 'download') {
    activitySeq += 1;
    return `${prefix}:${activitySeq}`;
  }

  return { download, downloadBatch };
}

function runningActivity(id, label, progress, message) {
  return { id, kind: 'download', state: 'running', label, progress, message };
}

function failureFeedback(downloadResult) {
  const code = downloadResult?.code || '';
  const mode = downloadResult?.destinationMode || '';
  const directoryWriteFailure = code === 'write-failed' && (mode === 'directory' || mode === 'prompt-directory');
  const needsSettings = code === 'permission-denied' || code === 'unsupported' || code === 'picker-failed' || directoryWriteFailure;
  return needsSettings
    ? { persistent: true, action: 'open-settings', actionLabel: '설정 열기' }
    : { persistent: false, action: null, actionLabel: null };
}

function downloadLabel(kind) {
  if (kind === 'video') return '영상 저장';
  if (kind === 'cover') return '썸네일 저장';
  if (kind === 'photo') return '이미지 저장';
  if (kind === 'carousel-slide') return '캐러셀 이미지 저장';
  if (kind === 'export') return '내보내기';
  return '미디어 저장';
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
