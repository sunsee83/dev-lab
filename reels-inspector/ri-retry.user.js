// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      3.2.3
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==
// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Source: reels-inspector/src/*
// Build version: 3.2.3

(() => {
  // src/version.js
  var VERSION = "3.2.3";
  var UPDATE_URL = "https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js";
  function updateInstallUrl(cacheBust = Date.now()) {
    const value = Number(cacheBust);
    const stamp = Number.isFinite(value) ? Math.trunc(value) : Date.now();
    return `${UPDATE_URL}?ri=${stamp}`;
  }

  // src/core/app.js
  var EVENTS = Object.freeze({
    ROUTE_CHANGED: "route:changed",
    IDENTITY_CHANGED: "identity:changed",
    STORE_CHANGED: "store:changed",
    SETTINGS_CHANGED: "settings:changed",
    DOWNLOAD_CHANGED: "download:changed"
  });
  function createApp({ version = "" } = {}) {
    const listeners = /* @__PURE__ */ new Map();
    const renderQueue = /* @__PURE__ */ new Map();
    let frameId = 0;
    let destroyed = false;
    let route = { href: "", pathname: "" };
    let currentIdentity = null;
    let stopRouteTracking2 = null;
    const app2 = {
      version,
      services: /* @__PURE__ */ Object.create(null),
      adapters: /* @__PURE__ */ Object.create(null),
      on(eventName, listener) {
        if (destroyed || typeof listener !== "function") return () => {
        };
        const bucket = listeners.get(eventName) || /* @__PURE__ */ new Set();
        bucket.add(listener);
        listeners.set(eventName, bucket);
        return () => {
          bucket.delete(listener);
          if (!bucket.size) listeners.delete(eventName);
        };
      },
      emit(eventName, payload) {
        if (destroyed) return;
        const bucket = listeners.get(eventName);
        if (!bucket) return;
        for (const listener of [...bucket]) {
          try {
            listener(payload);
          } catch (error) {
            console.warn("[RI] event listener failed", eventName, error);
          }
        }
      },
      scheduleRender(key, callback) {
        if (destroyed || !key || typeof callback !== "function") return;
        renderQueue.set(key, callback);
        if (frameId) return;
        const raf = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
        frameId = raf(() => {
          frameId = 0;
          const jobs = [...renderQueue.values()];
          renderQueue.clear();
          for (const job of jobs) {
            try {
              job();
            } catch (error) {
              console.warn("[RI] render job failed", error);
            }
          }
        });
      },
      setRoute(nextRoute) {
        const next = {
          href: String(nextRoute?.href || ""),
          pathname: String(nextRoute?.pathname || "")
        };
        if (next.href === route.href && next.pathname === route.pathname) return false;
        const previous = route;
        route = next;
        app2.emit(EVENTS.ROUTE_CHANGED, { previous, current: { ...route } });
        return true;
      },
      getRoute() {
        return { ...route };
      },
      setCurrentIdentity(identity) {
        const previousKey = identityKey(currentIdentity);
        const nextKey = identityKey(identity);
        currentIdentity = identity || null;
        if (previousKey === nextKey) return false;
        app2.emit(EVENTS.IDENTITY_CHANGED, { current: currentIdentity });
        return true;
      },
      getCurrentIdentity() {
        return currentIdentity;
      },
      startRouteTracking({ env = globalThis, resolveIdentity, onActivity } = {}) {
        stopRouteTracking2?.();
        if (destroyed) return () => {
        };
        const doc = env.document;
        let stopped = false;
        let queued = false;
        let lastHref = "";
        const sync = () => {
          queued = false;
          if (stopped || destroyed) return;
          const href = String(env.location?.href || "");
          if (href === lastHref) return;
          lastHref = href;
          app2.setRoute({ href, pathname: String(env.location?.pathname || "") });
          if (typeof resolveIdentity === "function") {
            try {
              app2.setCurrentIdentity(resolveIdentity(href) || null);
            } catch (error) {
              console.warn("[RI] route identity sync failed", error);
              app2.setCurrentIdentity(null);
            }
          }
        };
        const schedule = (reason = "activity") => {
          if (stopped || destroyed) return;
          if (typeof onActivity === "function") {
            try {
              onActivity(reason);
            } catch (error) {
              console.warn("[RI] activity listener failed", error);
            }
          }
          if (queued) return;
          queued = true;
          const raf = env.requestAnimationFrame || ((fn) => (env.setTimeout || setTimeout)(fn, 16));
          raf(sync);
        };
        const observer = env.MutationObserver && doc?.documentElement ? new env.MutationObserver(() => schedule("dom")) : null;
        observer?.observe(doc.documentElement, { childList: true, subtree: true });
        const eventNames = ["popstate", "hashchange", "pageshow"];
        const handlers = /* @__PURE__ */ new Map();
        for (const name of eventNames) {
          const handler = () => schedule(name);
          handlers.set(name, handler);
          env.addEventListener?.(name, handler, true);
        }
        sync();
        const cleanup = () => {
          if (stopped) return;
          stopped = true;
          observer?.disconnect();
          for (const [name, handler] of handlers) env.removeEventListener?.(name, handler, true);
          if (stopRouteTracking2 === cleanup) stopRouteTracking2 = null;
        };
        stopRouteTracking2 = cleanup;
        return cleanup;
      },
      destroy() {
        if (destroyed) return;
        stopRouteTracking2?.();
        destroyed = true;
        listeners.clear();
        renderQueue.clear();
        if (frameId && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(frameId);
        frameId = 0;
        currentIdentity = null;
        app2.services = /* @__PURE__ */ Object.create(null);
        app2.adapters = /* @__PURE__ */ Object.create(null);
      }
    };
    return app2;
  }
  function identityKey(identity) {
    if (!identity) return "";
    return [
      identity.shortcode || "",
      identity.mediaId || "",
      identity.childMediaId || "",
      identity.slideIndex ?? ""
    ].join("|");
  }

  // src/core/capability.js
  function detectCapabilities(env = globalThis) {
    const doc = env.document;
    let anchorDownload = false;
    try {
      anchorDownload = !!doc && "download" in doc.createElement("a");
    } catch {
      anchorDownload = false;
    }
    return Object.freeze({
      directoryPicker: typeof env.showDirectoryPicker === "function",
      saveFilePicker: typeof env.showSaveFilePicker === "function",
      fileSystemWrite: typeof env.FileSystemFileHandle !== "undefined" || typeof env.FileSystemDirectoryHandle !== "undefined",
      indexedDB: !!env.indexedDB,
      clipboard: !!env.navigator?.clipboard?.writeText,
      anchorDownload
    });
  }
  async function queryHandlePermission(handle) {
    if (!handle) return "unavailable";
    if (typeof handle.queryPermission !== "function") return "granted";
    try {
      return await handle.queryPermission({ mode: "readwrite" });
    } catch {
      return "denied";
    }
  }
  async function requestHandlePermission(handle) {
    if (!handle) return "unavailable";
    const current = await queryHandlePermission(handle);
    if (current === "granted") return current;
    if (typeof handle.requestPermission !== "function") return current;
    try {
      return await handle.requestPermission({ mode: "readwrite" });
    } catch {
      return "denied";
    }
  }

  // src/store/settings-store.js
  var STORAGE_KEY = "ri32:settings:v1";
  var DB_NAME = "ri32";
  var DB_VERSION = 1;
  var HANDLE_STORE = "handles";
  var DIRECTORY_KEY = "download-directory";
  var MODES = /* @__PURE__ */ new Set(["default", "directory", "prompt"]);
  function createSettingsStore({ env = globalThis, capabilities: capabilities2, onChange } = {}) {
    const listeners = /* @__PURE__ */ new Set();
    let state = {
      downloadMode: "default",
      directoryName: null,
      directoryHandle: null,
      directoryPermission: capabilities2?.directoryPicker ? "prompt" : "unavailable",
      schemaVersion: 1
    };
    function notify() {
      const snapshot = getState();
      if (typeof onChange === "function") onChange(snapshot);
      for (const listener of [...listeners]) {
        try {
          listener(snapshot);
        } catch (error) {
          console.warn("[RI] settings listener failed", error);
        }
      }
    }
    function getState() {
      return { ...state };
    }
    async function init() {
      const persisted = readJson(env.localStorage, STORAGE_KEY);
      if (persisted && MODES.has(persisted.downloadMode)) state.downloadMode = persisted.downloadMode;
      if (typeof persisted?.directoryName === "string") state.directoryName = persisted.directoryName || null;
      if (capabilities2?.indexedDB) {
        try {
          const handle = await readHandle(env.indexedDB);
          if (handle) {
            state.directoryHandle = handle;
            state.directoryName = handle.name || state.directoryName;
            state.directoryPermission = await queryHandlePermission(handle);
          }
        } catch (error) {
          console.warn("[RI] directory handle restore failed", error);
        }
      }
      if (state.downloadMode === "directory" && !state.directoryHandle) {
        state.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
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
      if (!capabilities2?.directoryPicker || typeof env.showDirectoryPicker !== "function") {
        return { ok: false, code: "unsupported", message: "폴더 선택을 지원하지 않는 환경입니다." };
      }
      try {
        const handle = await env.showDirectoryPicker({ mode: "readwrite" });
        const permission = await requestHandlePermission(handle);
        if (permission !== "granted") {
          state.directoryPermission = permission;
          notify();
          return { ok: false, code: "permission-denied", message: "저장 폴더 쓰기 권한이 필요합니다." };
        }
        state.directoryHandle = handle;
        state.directoryName = handle.name || null;
        state.directoryPermission = permission;
        state.downloadMode = "directory";
        persistScalarState();
        if (capabilities2?.indexedDB) {
          try {
            await writeHandle(env.indexedDB, handle);
          } catch (error) {
            console.warn("[RI] directory handle persistence failed", error);
          }
        }
        notify();
        return { ok: true, code: "selected", folderName: state.directoryName };
      } catch (error) {
        if (error?.name === "AbortError") return { ok: false, code: "cancelled", message: "폴더 선택을 취소했습니다." };
        return { ok: false, code: "picker-failed", message: "폴더를 선택하지 못했습니다.", error };
      }
    }
    async function clearDirectory() {
      state.directoryHandle = null;
      state.directoryName = null;
      state.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
      if (state.downloadMode === "directory") state.downloadMode = "default";
      persistScalarState();
      if (capabilities2?.indexedDB) {
        try {
          await deleteHandle(env.indexedDB);
        } catch (error) {
          console.warn("[RI] directory handle delete failed", error);
        }
      }
      notify();
      return getState();
    }
    async function refreshDirectoryPermission({ request = false } = {}) {
      if (!state.directoryHandle) {
        state.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
        notify();
        return state.directoryPermission;
      }
      state.directoryPermission = request ? await requestHandlePermission(state.directoryHandle) : await queryHandlePermission(state.directoryHandle);
      notify();
      return state.directoryPermission;
    }
    function subscribe(listener) {
      if (typeof listener !== "function") return () => {
      };
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
      console.warn("[RI] settings persistence failed", error);
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
      request.onerror = () => reject(request.error || new Error("indexedDB open failed"));
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
        request.onerror = () => reject(request.error || new Error("indexedDB request failed"));
      });
    } finally {
      db.close();
    }
  }
  function readHandle(indexedDB) {
    return withHandleStore(indexedDB, "readonly", (store) => store.get(DIRECTORY_KEY));
  }
  function writeHandle(indexedDB, handle) {
    return withHandleStore(indexedDB, "readwrite", (store) => store.put(handle, DIRECTORY_KEY));
  }
  function deleteHandle(indexedDB) {
    return withHandleStore(indexedDB, "readwrite", (store) => store.delete(DIRECTORY_KEY));
  }

  // src/media/media-resolver.js
  function resolveGridCardMedia({ anchor, post, shortcode } = {}) {
    const type = effectiveType(anchor, post);
    const imageUrl = bestDomImageUrl(anchor) || post?.coverUrl || post?.thumbUrl || "";
    const videoUrl = /^https?:/i.test(String(post?.videoUrl || "")) ? post.videoUrl : "";
    const carouselImages = Array.isArray(post?.carouselImages) ? post.carouselImages.filter(Boolean) : [];
    const href = String(anchor?.href || "");
    return {
      shortcode: shortcode || post?.shortcode || "",
      type,
      imageUrl,
      videoUrl,
      carouselImages,
      pageUrl: stripQuery(href) || post?.canonicalUrl || ""
    };
  }
  function extensionFromUrl(url, fallback = "") {
    const clean = String(url || "").split("?")[0];
    const match = clean.match(/\.([A-Za-z0-9]{2,5})$/);
    return match ? `.${match[1].toLowerCase()}` : fallback;
  }
  function mediaFilename({ kind, shortcode, url = "", slideIndex = null } = {}) {
    const code = String(shortcode || "media").replace(/[^A-Za-z0-9_-]/g, "") || "media";
    if (kind === "video") return `Instagram_${code}_video${extensionFromUrl(url, ".mp4")}`;
    if (kind === "cover") return `Instagram_${code}_thumb${extensionFromUrl(url, ".jpg")}`;
    if (kind === "photo") return `Instagram_${code}_image${extensionFromUrl(url, ".jpg")}`;
    if (kind === "carousel-slide") {
      const index = Math.max(0, Number(slideIndex || 0));
      return `Instagram_${code}_slide_${String(index).padStart(2, "0")}${extensionFromUrl(url, ".jpg")}`;
    }
    return `Instagram_${code}_export.txt`;
  }
  function effectiveType(anchor, post) {
    const stored = String(post?.mediaType || "").toUpperCase();
    if (["REEL", "VIDEO", "PHOTO", "CAROUSEL"].includes(stored)) return stored;
    const href = String(anchor?.href || "");
    if (/\/(?:reel|reels)\//.test(href)) return "REEL";
    if (anchor?.querySelector?.("video")) return "VIDEO";
    return /\/p\//.test(href) ? "PHOTO" : "";
  }
  function bestDomImageUrl(anchor) {
    if (!anchor?.querySelectorAll) return "";
    const ar = anchor.getBoundingClientRect();
    const anchorArea = Math.max(1, ar.width * ar.height);
    let best = "";
    let bestScore = -1;
    for (const img of anchor.querySelectorAll("img")) {
      const rect = img.getBoundingClientRect();
      const overlapWidth = Math.max(0, Math.min(ar.right, rect.right) - Math.max(ar.left, rect.left));
      const overlapHeight = Math.max(0, Math.min(ar.bottom, rect.bottom) - Math.max(ar.top, rect.top));
      const overlap = overlapWidth * overlapHeight;
      if (!overlap) continue;
      const coverage = overlap / anchorArea;
      if (rect.width < ar.width * 0.62 || rect.height < ar.height * 0.62 || coverage < 0.38) continue;
      const label = [img.alt || "", img.getAttribute?.("aria-label") || "", img.getAttribute?.("title") || ""].join(" ").toLowerCase();
      if (/music|audio|album|avatar|profile|음악|음원|오디오|앨범|프로필/.test(label) && coverage < 0.8) continue;
      const url = bestSrcFromImg(img);
      if (!url) continue;
      let score = coverage * 1e6 + overlap;
      if (rect.width >= ar.width * 0.9 && rect.height >= ar.height * 0.9) score += 1e6;
      if (score > bestScore) {
        bestScore = score;
        best = url;
      }
    }
    return best;
  }
  function bestSrcFromImg(img) {
    const srcset = img?.getAttribute?.("srcset") || "";
    let best = "";
    let bestWidth = -1;
    if (srcset) {
      for (const part of srcset.split(",")) {
        const match = part.trim().match(/^(.*)\s+(\d+(?:\.\d+)?)(w|x)$/);
        if (!match) continue;
        let score = Number(match[2]);
        if (match[3] === "x") score *= 1e4;
        if (score > bestWidth) {
          bestWidth = score;
          best = match[1].trim();
        }
      }
    }
    return best || img?.currentSrc || img?.src || "";
  }
  function stripQuery(url) {
    return String(url || "").split("?")[0].split("#")[0];
  }

  // src/media/download-manager.js
  var VALID_KINDS = /* @__PURE__ */ new Set(["video", "cover", "photo", "carousel-slide", "export"]);
  function createDownloadManager({ env = globalThis, settings: settings2, capabilities: capabilities2, onChange } = {}) {
    if (!settings2) throw new Error("Download Manager requires Settings Store");
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
        if (!normalized.ok) return { ok: false, code: "invalid-media", message: "다운로드할 미디어 정보가 올바르지 않습니다." };
        normalizedRequests.push(normalized.request);
      }
      if (!normalizedRequests.length) return { ok: false, code: "invalid-media", message: "다운로드할 파일이 없습니다." };
      const destination = await resolveDestination(true);
      if (!destination.ok) return destination.result;
      const results = [];
      for (const request of normalizedRequests) results.push(await runJob(request, destination));
      const failed = results.find((result2) => !result2.ok);
      return {
        ok: !failed,
        code: failed ? "batch-partial" : "saved",
        destinationMode: destination.mode,
        folderName: destination.folderName || null,
        results,
        message: failed ? "일부 파일을 저장하지 못했습니다." : `${results.length}개 파일 저장을 요청했습니다.`
      };
    }
    async function resolveDestination(batch) {
      const state = settings2.getState();
      const mode = state.downloadMode || "default";
      if (mode === "default") return { ok: true, mode: "default", folderName: null };
      if (mode === "directory") {
        const handle = state.directoryHandle;
        if (!handle) {
          return failure("permission-denied", "저장 폴더를 다시 연결해야 합니다.", mode, state.directoryName);
        }
        const permission = await requestHandlePermission(handle);
        if (permission !== "granted") {
          return failure("permission-denied", "저장 폴더 쓰기 권한이 필요합니다.", mode, state.directoryName);
        }
        return { ok: true, mode, handle, folderName: handle.name || state.directoryName || null };
      }
      if (mode === "prompt") {
        if (batch) {
          if (!capabilities2?.directoryPicker || typeof env.showDirectoryPicker !== "function") {
            return failure("unsupported", "캐러셀 일괄 저장 위치 선택을 지원하지 않는 환경입니다.", mode);
          }
          try {
            const handle = await env.showDirectoryPicker({ mode: "readwrite" });
            const permission = await requestHandlePermission(handle);
            if (permission !== "granted") return failure("permission-denied", "선택한 폴더 쓰기 권한이 필요합니다.", mode, handle.name);
            return { ok: true, mode: "prompt-directory", handle, folderName: handle.name || null };
          } catch (error) {
            if (error?.name === "AbortError") return failure("cancelled", "저장 위치 선택을 취소했습니다.", mode);
            return failure("picker-failed", "저장 위치를 선택하지 못했습니다.", mode, null, error);
          }
        }
        if (capabilities2?.saveFilePicker && typeof env.showSaveFilePicker === "function") return { ok: true, mode: "prompt-file" };
        if (capabilities2?.directoryPicker && typeof env.showDirectoryPicker === "function") {
          try {
            const handle = await env.showDirectoryPicker({ mode: "readwrite" });
            const permission = await requestHandlePermission(handle);
            if (permission !== "granted") return failure("permission-denied", "선택한 폴더 쓰기 권한이 필요합니다.", mode, handle.name);
            return { ok: true, mode: "prompt-directory", handle, folderName: handle.name || null };
          } catch (error) {
            if (error?.name === "AbortError") return failure("cancelled", "저장 위치 선택을 취소했습니다.", mode);
            return failure("picker-failed", "저장 위치를 선택하지 못했습니다.", mode, null, error);
          }
        }
        return failure("unsupported", "매번 저장 위치 선택을 지원하지 않는 환경입니다.", mode);
      }
      return failure("unsupported", "알 수 없는 저장 방식입니다.", mode);
    }
    async function runJob(request, destination) {
      activeJobs += 1;
      emitState({ activeJobs, state: "running", request });
      try {
        let result2;
        if (destination.mode === "default") result2 = await saveBrowserDefault(request);
        else if (destination.mode === "prompt-file") result2 = await saveWithFilePicker(request);
        else result2 = await saveToDirectory(request, destination.handle, destination.mode, destination.folderName);
        return result2;
      } finally {
        activeJobs = Math.max(0, activeJobs - 1);
        emitState({ activeJobs, state: "idle", request });
      }
    }
    async function saveToDirectory(request, handle, mode, folderName) {
      let blob;
      try {
        blob = await fetchBlob(request.url);
      } catch (error) {
        return result(false, "fetch-failed", request, mode, folderName, "미디어 데이터를 가져오지 못했습니다.", error);
      }
      try {
        const fileHandle = await handle.getFileHandle(request.filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return result(true, "saved", request, mode, folderName, "파일을 저장했습니다.");
      } catch (error) {
        return result(false, "write-failed", request, mode, folderName, "선택한 폴더에 파일을 쓰지 못했습니다.", error);
      }
    }
    async function saveWithFilePicker(request) {
      let blob;
      try {
        blob = await fetchBlob(request.url);
      } catch (error) {
        return result(false, "fetch-failed", request, "prompt", null, "미디어 데이터를 가져오지 못했습니다.", error);
      }
      try {
        const handle = await env.showSaveFilePicker({ suggestedName: request.filename });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return result(true, "saved", request, "prompt", null, "파일을 저장했습니다.");
      } catch (error) {
        if (error?.name === "AbortError") return result(false, "cancelled", request, "prompt", null, "저장을 취소했습니다.", error);
        return result(false, "write-failed", request, "prompt", null, "파일을 저장하지 못했습니다.", error);
      }
    }
    async function saveBrowserDefault(request) {
      let objectUrl = "";
      try {
        const blob = await fetchBlob(request.url);
        objectUrl = env.URL.createObjectURL(blob);
        clickDownload(objectUrl, request.filename);
        setTimeout(() => env.URL.revokeObjectURL(objectUrl), 2500);
        return result(true, "saved", request, "default", null, "브라우저 기본 다운로드로 저장을 요청했습니다.");
      } catch (error) {
        try {
          clickDownload(request.url, request.filename);
          return result(true, "saved", request, "default", null, "브라우저 기본 다운로드로 저장을 요청했습니다.");
        } catch (directError) {
          if (objectUrl) env.URL.revokeObjectURL(objectUrl);
          return result(false, "write-failed", request, "default", null, "브라우저 다운로드를 시작하지 못했습니다.", directError || error);
        }
      }
    }
    async function fetchBlob(url) {
      if (typeof env.fetch !== "function") throw new Error("fetch unavailable");
      const response = await env.fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    }
    function clickDownload(url, filename) {
      const doc = env.document;
      if (!doc?.body) throw new Error("document body unavailable");
      const anchor = doc.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.style.display = "none";
      doc.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    function emitState(payload) {
      if (typeof onChange === "function") onChange(payload);
    }
    return { download, downloadBatch };
  }
  function normalizeRequest(request) {
    if (!request || !VALID_KINDS.has(request.kind) || !/^https?:/i.test(String(request.url || ""))) {
      return { ok: false, result: { ok: false, code: "invalid-media", message: "다운로드할 미디어 정보가 올바르지 않습니다." } };
    }
    const shortcode = String(request.shortcode || "").replace(/[^A-Za-z0-9_-]/g, "");
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
        mimeHint: request.mimeHint || "",
        slideIndex: request.slideIndex ?? null
      }
    };
  }
  function sanitizeFilename(filename) {
    return String(filename || "Instagram_media").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "Instagram_media";
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

  // src/metrics/metrics.js
  function createMetricsEngine({ history: history2, now = () => Date.now() } = {}) {
    return {
      summarize(post) {
        if (!post?.shortcode) return emptySummary();
        const engagementRate = calculateEngagementRate({
          views: post.views,
          likes: post.likes,
          comments: post.comments,
          reposts: post.reposts
        });
        const growth24h = calculateGrowth24h({
          views: post.views,
          snapshots: history2?.getSnapshots?.(post.shortcode) || [],
          now: now()
        });
        const accountMultiple = calculateAccountMultiple({
          shortcode: post.shortcode,
          username: post.username,
          views: post.views,
          posts: history2?.getAccountPosts?.(post.username) || []
        });
        return { engagementRate, growth24h, accountMultiple };
      }
    };
  }
  function calculateEngagementRate({ views, likes, comments, reposts, requireComplete = true } = {}) {
    const viewCount = positiveNumber(views);
    if (viewCount == null) return void 0;
    const raw = [likes, comments, reposts];
    const values = raw.map(nonNegativeNumber);
    if (requireComplete && values.some((value) => value == null)) return void 0;
    const known = values.filter((value) => value != null);
    if (!known.length) return void 0;
    const total = known.reduce((sum, value) => sum + value, 0);
    if (!requireComplete && total <= 0) return void 0;
    return total / viewCount * 100;
  }
  function calculateGrowth24h({ views, snapshots, now = Date.now(), minAgeMs = 18 * 60 * 60 * 1e3, maxAgeMs = 32 * 60 * 60 * 1e3 } = {}) {
    const current = positiveNumber(views);
    if (current == null || !Array.isArray(snapshots)) return void 0;
    let best = null;
    let bestDelta = Infinity;
    const targetAge = 24 * 60 * 60 * 1e3;
    for (const snapshot of snapshots) {
      const timestamp = positiveNumber(snapshot?.t);
      const previous = positiveNumber(snapshot?.v);
      if (timestamp == null || previous == null) continue;
      const age = Number(now) - timestamp;
      if (!Number.isFinite(age) || age < minAgeMs || age > maxAgeMs) continue;
      const delta = Math.abs(age - targetAge);
      if (delta >= bestDelta) continue;
      best = previous;
      bestDelta = delta;
    }
    if (best == null || current < best) return void 0;
    return (current - best) / best * 100;
  }
  function calculateAccountMultiple({ shortcode, username, views, posts, maxRecent = 20, minSamples = 5 } = {}) {
    const current = positiveNumber(views);
    const owner = String(username || "").toLowerCase();
    if (current == null || !owner || !Array.isArray(posts)) return void 0;
    const samples = posts.filter((entry) => entry && String(entry.code || "") !== String(shortcode || "")).filter((entry) => String(entry.owner || "").toLowerCase() === owner).map((entry) => ({ views: positiveNumber(entry.views), t: Number(entry.t) })).filter((entry) => entry.views != null && Number.isFinite(entry.t)).sort((a, b) => b.t - a.t).slice(0, Math.max(1, Number(maxRecent) || 20));
    if (samples.length < Math.max(1, Number(minSamples) || 5)) return void 0;
    const values = samples.map((entry) => entry.views).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    return median > 0 ? current / median : void 0;
  }
  function emptySummary() {
    return { engagementRate: void 0, growth24h: void 0, accountMultiple: void 0 };
  }
  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : void 0;
  }
  function nonNegativeNumber(value) {
    if (value == null || value === "") return void 0;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : void 0;
  }

  // src/migration/legacy-store-adapter.js
  var CACHE_KEY = "ri311:items:v1";
  var SNAP_KEY = "ri311:snap:v1";
  var POST_KEY = "ri311:posts:v1";
  var WATCH_KEYS = [CACHE_KEY, SNAP_KEY, POST_KEY];
  function createLegacyStoreAdapter({ env = globalThis } = {}) {
    function readStore(key) {
      try {
        const raw = env.localStorage?.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }
    function readRaw(key) {
      try {
        return String(env.localStorage?.getItem(key) || "");
      } catch {
        return "";
      }
    }
    function getItem(shortcode) {
      if (!shortcode) return null;
      return readStore(CACHE_KEY)[shortcode] || null;
    }
    function getPost(shortcode) {
      const item = getItem(shortcode);
      if (!item) return shortcode ? { shortcode } : null;
      const value = (key) => fieldValue(item, key);
      return {
        shortcode,
        mediaId: value("mediaId") || "",
        ownerId: value("ownerId") || "",
        username: value("owner") || "",
        mediaType: String(value("mediaType") || "").toUpperCase(),
        productType: value("productType") || "",
        canonicalUrl: value("canonicalUrl") || item.pageUrl || "",
        views: optionalMetric(value("views")),
        likes: optionalMetric(value("likes")),
        comments: optionalMetric(value("comments")),
        reposts: optionalMetric(value("reposts")),
        date: value("date") || "",
        videoUrl: value("videoUrl") || "",
        coverUrl: value("coverUrl") || "",
        thumbUrl: value("thumbUrl") || "",
        carouselImages: normalizeImages(value("carouselImages"))
      };
    }
    function getCurrentIdentity(url = env.location?.href || "") {
      const shortcode = codeFromUrl(url);
      if (!shortcode) return null;
      const post = getPost(shortcode) || { shortcode };
      return {
        shortcode,
        mediaId: post.mediaId || "",
        ownerId: post.ownerId || "",
        username: post.username || "",
        mediaType: post.mediaType || inferTypeFromUrl(url),
        productType: post.productType || "",
        canonicalUrl: post.canonicalUrl || stripQuery2(url),
        parentMediaId: "",
        childMediaId: "",
        slideIndex: null,
        state: post.mediaType || post.mediaId ? "IDENTIFIED" : "DETECTED"
      };
    }
    function getSnapshots(shortcode) {
      const list = readStore(SNAP_KEY)[shortcode];
      if (!Array.isArray(list)) return [];
      return list.map((entry) => ({ t: Number(entry?.t), v: Number(entry?.v) })).filter((entry) => Number.isFinite(entry.t) && entry.t > 0 && Number.isFinite(entry.v) && entry.v > 0);
    }
    function getAccountPosts(username) {
      const owner = String(username || "").toLowerCase();
      if (!owner) return [];
      return Object.values(readStore(POST_KEY)).filter((entry) => entry && String(entry.owner || "").toLowerCase() === owner).map((entry) => ({
        code: String(entry.code || ""),
        owner,
        views: Number(entry.views),
        t: Number(entry.t)
      })).filter((entry) => entry.code && Number.isFinite(entry.views) && entry.views > 0 && Number.isFinite(entry.t) && entry.t > 0);
    }
    function createChangeTracker(listener, { delayMs = 360 } = {}) {
      if (typeof listener !== "function") return { schedule() {
      }, checkNow() {
      }, destroy() {
      } };
      const last = new Map(WATCH_KEYS.map((key) => [key, readRaw(key)]));
      let timer2 = 0;
      let destroyed = false;
      let pendingReason = "";
      const checkNow = (reason = pendingReason || "check") => {
        if (destroyed) return false;
        if (timer2) {
          (env.clearTimeout || clearTimeout)(timer2);
          timer2 = 0;
        }
        pendingReason = "";
        const changedKeys = [];
        for (const key of WATCH_KEYS) {
          const raw = readRaw(key);
          if (raw === last.get(key)) continue;
          last.set(key, raw);
          changedKeys.push(key);
        }
        if (!changedKeys.length) return false;
        listener({ reason, changedKeys });
        return true;
      };
      const schedule = (reason = "activity") => {
        if (destroyed) return;
        pendingReason = reason;
        if (timer2) return;
        const setTimer = env.setTimeout || setTimeout;
        timer2 = setTimer(() => {
          timer2 = 0;
          checkNow(pendingReason || reason);
        }, Math.max(0, Number(delayMs) || 0));
      };
      const onStorage = (event) => {
        if (event?.key && !WATCH_KEYS.includes(event.key)) return;
        checkNow("storage");
      };
      const onFocus = () => schedule("focus");
      const onPageShow = () => schedule("pageshow");
      env.addEventListener?.("storage", onStorage, true);
      env.addEventListener?.("focus", onFocus, true);
      env.addEventListener?.("pageshow", onPageShow, true);
      const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        if (timer2) (env.clearTimeout || clearTimeout)(timer2);
        timer2 = 0;
        env.removeEventListener?.("storage", onStorage, true);
        env.removeEventListener?.("focus", onFocus, true);
        env.removeEventListener?.("pageshow", onPageShow, true);
      };
      return { schedule, checkNow, destroy };
    }
    return {
      getItem,
      getPost,
      getCurrentIdentity,
      getSnapshots,
      getAccountPosts,
      createChangeTracker,
      codeFromUrl
    };
  }
  function codeFromUrl(url) {
    const match = String(url || "").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
  }
  function fieldValue(item, key) {
    const field = item?.fields?.[key];
    if (field && (field.status === "verified" || field.status === "conflict")) return field.value;
    return item?.[key] ?? null;
  }
  function optionalMetric(value) {
    return value == null || value === "" ? void 0 : value;
  }
  function normalizeImages(value) {
    return Array.isArray(value) ? value.filter((url) => /^https?:/i.test(String(url || ""))) : [];
  }
  function inferTypeFromUrl(url) {
    return /\/(?:reel|reels)\//.test(String(url || "")) ? "REEL" : "";
  }
  function stripQuery2(url) {
    try {
      const parsed = new URL(String(url || ""));
      parsed.search = "";
      parsed.hash = "";
      return parsed.href;
    } catch {
      return String(url || "").split("?")[0].split("#")[0];
    }
  }

  // src/core/clipboard.js
  async function copyText(text, { env = globalThis, doc = env.document, capabilities: capabilities2 } = {}) {
    const value = String(text || "");
    if (!value) return false;
    if (capabilities2?.clipboard && env.navigator?.clipboard?.writeText) {
      try {
        await env.navigator.clipboard.writeText(value);
        return true;
      } catch {
      }
    }
    if (!doc?.body || typeof doc.createElement !== "function") return false;
    let textarea = null;
    try {
      textarea = doc.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute?.("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      doc.body.appendChild(textarea);
      textarea.select?.();
      textarea.setSelectionRange?.(0, value.length);
      return doc.execCommand?.("copy") !== false;
    } catch {
      return false;
    } finally {
      textarea?.remove?.();
    }
  }

  // src/ui/toast.js
  var TOAST_ID = "ri32-toast";
  var timer = 0;
  function showToast(doc, text, duration = 2400) {
    if (!doc?.documentElement || !text) return;
    const old = doc.getElementById(TOAST_ID);
    if (old) old.remove();
    if (timer) clearTimeout(timer);
    const toast = doc.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = String(text);
    doc.documentElement.appendChild(toast);
    timer = setTimeout(() => {
      timer = 0;
      toast.remove();
    }, duration);
  }
  function showResult(doc, result2) {
    if (!result2 || result2.code === "cancelled") return;
    showToast(doc, result2.message || (result2.ok ? "완료했습니다." : "작업을 완료하지 못했습니다."));
  }

  // src/ui/grid.js
  var MENU_ID = "ri32-grid-menu";
  function mountGridActions({ app: app2, adapter, downloads: downloads2, capabilities: capabilities2, doc = globalThis.document, env = globalThis } = {}) {
    if (!doc?.documentElement || !adapter || !downloads2) throw new Error("Grid actions require document, adapter and Download Manager");
    let destroyed = false;
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("click", onClick, true);
    env.addEventListener?.("scroll", closeMenu, true);
    env.addEventListener?.("resize", closeMenu, true);
    const unsubscribeRoute = app2?.on?.(EVENTS.ROUTE_CHANGED, closeMenu) || (() => {
    });
    function onPointerDown(event) {
      const mediaButton = event.target?.closest?.(".ri3-grid-media");
      if (mediaButton) {
        event.stopImmediatePropagation();
        return;
      }
      const menu = doc.getElementById(MENU_ID);
      if (menu && !menu.contains(event.target)) closeMenu();
    }
    function onClick(event) {
      const mediaButton = event.target?.closest?.(".ri3-grid-media");
      if (!mediaButton) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const anchor = mediaButton.closest('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
      if (!anchor) return;
      openMenu(anchor, mediaButton);
    }
    function openMenu(anchor, trigger) {
      const shortcode = anchor.dataset.ri315Code || adapter.codeFromUrl(anchor.href);
      if (!shortcode) return;
      const existing = doc.getElementById(MENU_ID);
      if (existing?.dataset.code === shortcode) {
        closeMenu();
        return;
      }
      closeMenu();
      doc.getElementById("ri3-grid-menu")?.remove();
      const post = adapter.getPost(shortcode) || { shortcode };
      const media = resolveGridCardMedia({ anchor, post, shortcode });
      const menu = doc.createElement("div");
      menu.id = MENU_ID;
      menu.dataset.code = shortcode;
      menu.setAttribute("role", "menu");
      if (media.type === "REEL" || media.type === "VIDEO") {
        addButton(menu, media.videoUrl ? "영상 다운로드" : "영상 준비중", !!media.videoUrl, () => downloadSingle({
          kind: "video",
          shortcode,
          url: media.videoUrl
        }));
        addButton(menu, media.imageUrl ? "썸네일 다운로드" : "썸네일 준비중", !!media.imageUrl, () => downloadSingle({
          kind: "cover",
          shortcode,
          url: media.imageUrl
        }));
      } else if (media.type === "CAROUSEL") {
        const count = media.carouselImages.length;
        addButton(menu, count ? `전체 이미지 다운로드 (${count})` : "전체 이미지 준비중", count > 0, () => downloadCarousel(shortcode, media.carouselImages));
        addButton(menu, media.imageUrl ? "대표 이미지 다운로드" : "대표 이미지 준비중", !!media.imageUrl, () => downloadSingle({
          kind: "photo",
          shortcode,
          url: media.imageUrl
        }));
      } else {
        addButton(menu, media.imageUrl ? "이미지 다운로드" : "이미지 준비중", !!media.imageUrl, () => downloadSingle({
          kind: "photo",
          shortcode,
          url: media.imageUrl
        }));
      }
      addButton(menu, "링크 복사", !!media.pageUrl, async () => {
        const ok = await copyText(media.pageUrl, { env, doc, capabilities: capabilities2 });
        showToast(doc, ok ? "링크를 복사했습니다." : "링크 복사에 실패했습니다.");
      });
      doc.documentElement.appendChild(menu);
      positionMenu(menu, trigger);
    }
    function addButton(menu, label, enabled, action) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = !enabled;
      if (enabled) button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        try {
          await action();
        } catch (error) {
          console.warn("[RI] grid action failed", error);
          showToast(doc, "작업을 완료하지 못했습니다.");
        }
      });
      menu.appendChild(button);
    }
    async function downloadSingle(request) {
      showToast(doc, "저장 준비 중…");
      const result2 = await downloads2.download(request);
      showResult(doc, result2);
      return result2;
    }
    async function downloadCarousel(shortcode, images) {
      const requests = images.map((url, index) => ({
        kind: "carousel-slide",
        shortcode,
        url,
        slideIndex: index + 1
      }));
      showToast(doc, `캐러셀 ${requests.length}장 저장 준비 중…`);
      const result2 = await downloads2.downloadBatch(requests);
      showResult(doc, result2);
      return result2;
    }
    function positionMenu(menu, trigger) {
      const rect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const width = env.innerWidth || doc.documentElement.clientWidth;
      const height = env.innerHeight || doc.documentElement.clientHeight;
      const left = Math.max(6, Math.min(width - menuRect.width - 6, rect.left));
      let top = rect.bottom + 6;
      if (top + menuRect.height > height - 8) top = Math.max(8, rect.top - menuRect.height - 6);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
    function closeMenu() {
      doc.getElementById(MENU_ID)?.remove();
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      closeMenu();
      unsubscribeRoute();
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("click", onClick, true);
      env.removeEventListener?.("scroll", closeMenu, true);
      env.removeEventListener?.("resize", closeMenu, true);
    }
    if (app2?.adapters) app2.adapters.gridActions = { closeMenu };
    return { closeMenu, destroy };
  }

  // src/ui/styles.js
  var STYLE_ID = "ri32-style";
  function injectStyles(doc = globalThis.document) {
    if (!doc?.documentElement || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }
  var CSS = `
#ri3-tool,#ri3-panel{display:none!important}
#ri32-tool{
  position:fixed;right:12px;bottom:max(88px,calc(env(safe-area-inset-bottom) + 78px));z-index:2147483605;
  width:36px;height:36px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:50%;
  background:rgba(12,12,12,.72);color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(0,0,0,.32);-webkit-tap-highlight-color:transparent
}
#ri32-tool[aria-expanded="true"]{background:rgba(38,38,38,.96)}
#ri32-panel{
  position:fixed;right:8px;bottom:max(132px,calc(env(safe-area-inset-bottom) + 122px));z-index:2147483646;
  width:min(70vw,270px);max-height:min(64vh,540px);overflow:hidden;border:1px solid rgba(255,255,255,.13);
  border-radius:15px;background:rgba(16,16,16,.94);color:#fff;box-shadow:0 12px 34px rgba(0,0,0,.40);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif
}
.ri32-head{min-height:42px;display:flex;align-items:center;gap:7px;padding:0 8px 0 11px;border-bottom:1px solid rgba(255,255,255,.08)}
.ri32-head strong{flex:1;font-size:12px}.ri32-version{font-size:8px;opacity:.48}
.ri32-close{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:19px}
.ri32-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.07)}
.ri32-tabs::-webkit-scrollbar{display:none}
.ri32-tab{flex:0 0 auto;height:35px;padding:0 9px;border:0;border-bottom:2px solid transparent;background:transparent;color:rgba(255,255,255,.58);font:650 10px/1 sans-serif}
.ri32-tab[aria-selected="true"]{color:#fff;border-bottom-color:#fff}
.ri32-body{max-height:calc(min(64vh,540px) - 130px);overflow-y:auto;padding:10px}
.ri32-empty{min-height:78px;display:grid;place-items:center;color:rgba(255,255,255,.52);font-size:10px;line-height:1.45;text-align:center}
.ri32-section+.ri32-section{margin-top:13px}.ri32-section-title{margin-bottom:7px;font-size:10.5px;font-weight:750}
.ri32-options{display:grid;gap:6px}.ri32-option{min-height:38px;display:flex;align-items:center;gap:8px;padding:0 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.035);color:#fff;text-align:left;font-size:10px}
.ri32-option[aria-pressed="true"]{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.09)}.ri32-option:disabled{opacity:.38}
.ri32-dot{width:9px;height:9px;border:1px solid rgba(255,255,255,.5);border-radius:50%}.ri32-option[aria-pressed="true"] .ri32-dot{background:#fff}
.ri32-setting-row{display:flex;align-items:center;gap:8px;min-height:32px;font-size:10px}.ri32-setting-row span:first-child{flex:1;opacity:.62}.ri32-setting-row strong{font-size:10px;text-align:right}
.ri32-action{min-height:34px;padding:0 10px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.06);color:#fff;font-size:10px}
.ri32-media-action{width:100%;margin-top:6px;text-align:left}.ri32-note{margin-top:7px;color:rgba(255,255,255,.46);font-size:9px;line-height:1.45}
.ri32-update-shortcut{display:block;width:calc(100% - 20px);min-height:42px;margin:0 10px 10px;padding:0 12px;border:1px solid rgba(255,255,255,.24);border-radius:10px;background:rgba(255,255,255,.11);color:#fff;font:750 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}
.ri32-update-shortcut:active{background:rgba(255,255,255,.19)}
#ri32-grid-menu{position:fixed;z-index:2147483646;min-width:150px;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(18,18,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-grid-menu button{height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}
#ri32-grid-menu button:active{background:rgba(255,255,255,.12)}#ri32-grid-menu button:disabled{opacity:.38}
#ri32-toast{position:fixed;left:50%;bottom:max(134px,calc(env(safe-area-inset-bottom) + 124px));transform:translateX(-50%);z-index:2147483647;max-width:82vw;padding:8px 12px;border-radius:16px;background:rgba(20,20,20,.94);color:#fff;font:650 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;white-space:normal}
`;

  // src/ui/ri-primitives.js
  function createSection(body, title, doc = globalThis.document) {
    if (!body || !doc) return null;
    const section = doc.createElement("section");
    section.className = "ri32-section";
    const heading = doc.createElement("div");
    heading.className = "ri32-section-title";
    heading.textContent = title;
    section.appendChild(heading);
    body.appendChild(section);
    return section;
  }
  function addRow(parent, label, value, doc = globalThis.document) {
    if (!parent || !doc) return null;
    const row = doc.createElement("div");
    row.className = "ri32-setting-row";
    const left = doc.createElement("span");
    const right = doc.createElement("strong");
    left.textContent = label;
    right.textContent = value ?? "—";
    row.append(left, right);
    parent.appendChild(row);
    return row;
  }
  function addAction(parent, label, action, {
    doc = globalThis.document,
    className = "ri32-action",
    disabled = false
  } = {}) {
    if (!parent || !doc) return null;
    const button = doc.createElement("button");
    button.type = "button";
    button.className = className;
    button.disabled = !!disabled;
    button.textContent = label;
    if (typeof action === "function") button.addEventListener("click", () => void action());
    parent.appendChild(button);
    return button;
  }
  function renderEmpty(body, text, doc = globalThis.document) {
    if (!body || !doc) return null;
    const empty = doc.createElement("div");
    empty.className = "ri32-empty";
    empty.textContent = text;
    body.appendChild(empty);
    return empty;
  }

  // src/ui/ri-summary.js
  var COUNT_FORMATTER = new Intl.NumberFormat("ko-KR");
  function renderRiSummary({ body, post, metrics: metrics2, doc = globalThis.document } = {}) {
    if (!body || !doc) return;
    if (!post?.shortcode) return renderEmpty(body, "현재 콘텐츠가 선택되지 않았습니다.", doc);
    const derived = metrics2?.summarize?.(post) || {};
    const section = createSection(body, "현재 콘텐츠", doc);
    addRow(section, "계정", post.username ? `@${post.username}` : "—", doc);
    addRow(section, "Shortcode", post.shortcode, doc);
    addRow(section, "유형", post.mediaType || "확인 중", doc);
    addRow(section, "조회수", countLabel(post.views), doc);
    addRow(section, "좋아요", countLabel(post.likes), doc);
    addRow(section, "댓글", countLabel(post.comments), doc);
    addRow(section, "리포스트", countLabel(post.reposts), doc);
    addRow(section, "ER", percentLabel(derived.engagementRate), doc);
    addRow(section, "24h", percentLabel(derived.growth24h, { sign: true }), doc);
    addRow(section, "계정 대비", multipleLabel(derived.accountMultiple), doc);
    addRow(section, "게시일", post.date || "—", doc);
    const note = doc.createElement("div");
    note.className = "ri32-note";
    note.textContent = "ER은 검증된 조회수·좋아요·댓글·리포스트가 모두 있을 때만 계산합니다. 24h는 실제 18~32시간 snapshot, 계정 대비는 최근 비교 표본 5개 이상일 때만 표시합니다.";
    section.appendChild(note);
  }
  function countLabel(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return "—";
    return COUNT_FORMATTER.format(number);
  }
  function percentLabel(value, { sign = false } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const digits = Math.abs(number) >= 10 ? 1 : 2;
    const text = number.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
    return `${sign && number >= 0 ? "+" : ""}${text}%`;
  }
  function multipleLabel(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "—";
    const digits = number >= 10 ? 1 : 2;
    return `×${number.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")}`;
  }

  // src/ui/ri-panel.js
  var TABS = [
    ["summary", "요약"],
    ["content", "콘텐츠"],
    ["comments", "댓글"],
    ["analysis", "분석"],
    ["media", "미디어"],
    ["settings", "설정"]
  ];
  function mountRiPanel({ app: app2, settings: settings2, capabilities: capabilities2, downloads: downloads2, metrics: metrics2, adapter, version = "", doc = globalThis.document, env = globalThis } = {}) {
    if (!doc?.documentElement || !settings2) throw new Error("RI Panel requires document and Settings Store");
    injectStyles(doc);
    let open = false;
    let activeTab = "summary";
    let settingsState = settings2.getState();
    let destroyed = false;
    let button = doc.getElementById("ri32-tool");
    let panel = doc.getElementById("ri32-panel");
    doc.getElementById("ri3-panel")?.remove();
    if (!button) {
      button = doc.createElement("button");
      button.id = "ri32-tool";
      button.type = "button";
      button.setAttribute("aria-label", "리서치 도구");
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = researchIcon();
      doc.documentElement.appendChild(button);
    }
    const unsubscribeSettings = settings2.subscribe((next) => {
      settingsState = next;
      if (open && activeTab === "settings") renderBody();
    });
    const unsubscribeRoute = app2?.on?.(EVENTS.ROUTE_CHANGED, scheduleContextRender) || (() => {
    });
    const unsubscribeIdentity = app2?.on?.(EVENTS.IDENTITY_CHANGED, scheduleContextRender) || (() => {
    });
    const unsubscribeStore = app2?.on?.(EVENTS.STORE_CHANGED, scheduleContextRender) || (() => {
    });
    button.addEventListener("click", toggle);
    function toggle() {
      if (open) closePanel();
      else openPanel();
    }
    function openPanel() {
      if (destroyed || open) return;
      open = true;
      syncCurrentIdentity();
      button.setAttribute("aria-expanded", "true");
      ensurePanel();
      renderTabs();
      renderBody();
    }
    function closePanel() {
      if (!open) return;
      open = false;
      button.setAttribute("aria-expanded", "false");
      panel?.remove();
      panel = null;
    }
    function scheduleContextRender() {
      if (!open || activeTab === "settings") return;
      if (app2?.scheduleRender) {
        app2.scheduleRender("ri32-panel-context", () => {
          if (open && activeTab !== "settings") renderBody();
        });
        return;
      }
      renderBody();
    }
    function ensurePanel() {
      panel = doc.getElementById("ri32-panel");
      if (panel) return;
      panel = doc.createElement("aside");
      panel.id = "ri32-panel";
      panel.innerHTML = [
        '<div class="ri32-head">',
        "<strong>Instagram Research</strong>",
        `<span class="ri32-version">v${escapeHtml(version || app2?.version || "")}</span>`,
        '<button type="button" class="ri32-close" aria-label="닫기">×</button>',
        "</div>",
        '<div class="ri32-tabs" role="tablist"></div>',
        '<div class="ri32-body"></div>',
        '<button type="button" class="ri32-update-shortcut">업데이트 바로가기</button>'
      ].join("");
      panel.querySelector(".ri32-close").addEventListener("click", closePanel);
      panel.querySelector(".ri32-update-shortcut").addEventListener("click", openUpdateShortcut);
      doc.documentElement.appendChild(panel);
    }
    function renderTabs() {
      const tabs = panel?.querySelector(".ri32-tabs");
      if (!tabs) return;
      tabs.replaceChildren();
      for (const [key, label] of TABS) {
        const tab = doc.createElement("button");
        tab.type = "button";
        tab.className = "ri32-tab";
        tab.dataset.tab = key;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(activeTab === key));
        tab.textContent = label;
        tab.addEventListener("click", () => {
          if (activeTab === key) return;
          activeTab = key;
          syncCurrentIdentity();
          renderTabs();
          renderBody();
        });
        tabs.appendChild(tab);
      }
    }
    function renderBody() {
      const body = panel?.querySelector(".ri32-body");
      if (!body) return;
      body.replaceChildren();
      if (activeTab === "settings") return renderSettings(body);
      const post = currentPost();
      if (activeTab === "summary") return renderSummary(body, post);
      if (activeTab === "media") return renderMedia(body, post);
      renderPlaceholder(body, post);
    }
    function renderSummary(body, post) {
      renderRiSummary({ body, post, metrics: metrics2, doc });
    }
    function renderMedia(body, post) {
      if (!post?.shortcode) return renderEmpty2(body, "현재 콘텐츠가 선택되지 않았습니다.");
      const section = createSection2(body, "미디어");
      const type = String(post.mediaType || "").toUpperCase();
      let actionCount = 0;
      if ((type === "REEL" || type === "VIDEO") && post.videoUrl) {
        addAction2(section, "영상 다운로드", () => save({ kind: "video", shortcode: post.shortcode, url: post.videoUrl }));
        actionCount += 1;
      }
      if ((type === "REEL" || type === "VIDEO") && (post.coverUrl || post.thumbUrl)) {
        const url = post.coverUrl || post.thumbUrl;
        addAction2(section, "썸네일 다운로드", () => save({ kind: "cover", shortcode: post.shortcode, url }));
        actionCount += 1;
      }
      if (type === "PHOTO" && (post.coverUrl || post.thumbUrl)) {
        const url = post.coverUrl || post.thumbUrl;
        addAction2(section, "이미지 다운로드", () => save({ kind: "photo", shortcode: post.shortcode, url }));
        actionCount += 1;
      }
      if (type === "CAROUSEL" && post.carouselImages?.length) {
        addAction2(section, `전체 이미지 다운로드 (${post.carouselImages.length})`, () => saveBatch(post));
        actionCount += 1;
      }
      addAction2(section, "링크 복사", () => copyCurrentLink(post));
      if (!actionCount) {
        const note = doc.createElement("div");
        note.className = "ri32-note";
        note.textContent = "원본 미디어 주소는 아직 확보되지 않았습니다.";
        section.appendChild(note);
      }
    }
    function renderPlaceholder(body, post) {
      const label = tabLabel(activeTab);
      renderEmpty2(body, post?.shortcode ? `${post.shortcode} · ${label} 데이터 연결 준비 중` : `${label} · 현재 콘텐츠 연결 준비 중`);
    }
    function renderSettings(body) {
      const section = createSection2(body, "저장 방식");
      const options = doc.createElement("div");
      options.className = "ri32-options";
      addModeOption(options, "directory", "지정 폴더", !!capabilities2?.directoryPicker);
      addModeOption(options, "default", "기본 Downloads", true);
      addModeOption(options, "prompt", "매번 선택", !!(capabilities2?.saveFilePicker || capabilities2?.directoryPicker));
      section.appendChild(options);
      const folder = createSection2(body, "저장 폴더");
      addRow2(folder, "현재 폴더", settingsState.directoryName || "선택 안 됨");
      addRow2(folder, "권한", permissionLabel(settingsState.directoryPermission));
      const action = doc.createElement("button");
      action.type = "button";
      action.className = "ri32-action";
      action.disabled = !capabilities2?.directoryPicker;
      action.textContent = settingsState.directoryHandle ? "폴더 변경" : "폴더 선택";
      action.addEventListener("click", async () => {
        action.disabled = true;
        const result2 = await settings2.selectDirectory();
        settingsState = settings2.getState();
        renderBody();
        if (result2.ok) showToast(doc, `저장 폴더: ${result2.folderName || "선택 완료"}`);
        else if (result2.code !== "cancelled") showToast(doc, result2.message || "폴더를 선택하지 못했습니다.");
      });
      folder.appendChild(action);
      const note = doc.createElement("div");
      note.className = "ri32-note";
      note.textContent = "영상 · 썸네일 · 사진 · 캐러셀 전체에 같은 저장 정책을 적용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 몰래 전환하지 않습니다.";
      folder.appendChild(note);
    }
    function addModeOption(parent, mode, label, enabled) {
      const option = doc.createElement("button");
      option.type = "button";
      option.className = "ri32-option";
      option.disabled = !enabled;
      option.setAttribute("aria-pressed", String(settingsState.downloadMode === mode));
      option.innerHTML = '<span class="ri32-dot"></span><span></span>';
      option.lastElementChild.textContent = label;
      option.addEventListener("click", async () => {
        if (mode === "directory" && !settingsState.directoryHandle) {
          const result2 = await settings2.selectDirectory();
          if (!result2.ok && result2.code !== "cancelled") showToast(doc, result2.message || "폴더를 선택하지 못했습니다.");
          return;
        }
        settings2.setDownloadMode(mode);
        showToast(doc, `저장 방식: ${label}`);
      });
      parent.appendChild(option);
    }
    async function save(request) {
      if (!downloads2) return;
      showToast(doc, "저장 준비 중…");
      showResult(doc, await downloads2.download(request));
    }
    async function saveBatch(post) {
      const requests = post.carouselImages.map((url, index) => ({
        kind: "carousel-slide",
        shortcode: post.shortcode,
        url,
        slideIndex: index + 1
      }));
      showToast(doc, `캐러셀 ${requests.length}장 저장 준비 중…`);
      showResult(doc, await downloads2.downloadBatch(requests));
    }
    async function copyCurrentLink(post) {
      const text = post.canonicalUrl || `https://www.instagram.com/${post.mediaType === "REEL" ? "reel" : "p"}/${post.shortcode}/`;
      const ok = await copyText(text, { env, doc, capabilities: capabilities2 });
      showToast(doc, ok ? "링크를 복사했습니다." : "링크 복사에 실패했습니다.");
    }
    function openUpdateShortcut() {
      const url = updateInstallUrl(Date.now());
      if (typeof env.open === "function") {
        env.open(url, "_blank");
        return;
      }
      if (env.location) env.location.href = url;
    }
    function syncCurrentIdentity() {
      const identity = adapter?.getCurrentIdentity?.() || null;
      app2?.setCurrentIdentity?.(identity);
      return identity;
    }
    function currentPost() {
      const identity = app2?.getCurrentIdentity?.() || syncCurrentIdentity();
      return identity?.shortcode ? adapter?.getPost?.(identity.shortcode) || identity : null;
    }
    function createSection2(body, title) {
      const section = doc.createElement("section");
      section.className = "ri32-section";
      const heading = doc.createElement("div");
      heading.className = "ri32-section-title";
      heading.textContent = title;
      section.appendChild(heading);
      body.appendChild(section);
      return section;
    }
    function addRow2(parent, label, value) {
      const row = doc.createElement("div");
      row.className = "ri32-setting-row";
      const left = doc.createElement("span");
      const right = doc.createElement("strong");
      left.textContent = label;
      right.textContent = value ?? "—";
      row.append(left, right);
      parent.appendChild(row);
    }
    function addAction2(parent, label, action) {
      const button2 = doc.createElement("button");
      button2.type = "button";
      button2.className = "ri32-action ri32-media-action";
      button2.textContent = label;
      button2.addEventListener("click", () => void action());
      parent.appendChild(button2);
    }
    function renderEmpty2(body, text) {
      const empty = doc.createElement("div");
      empty.className = "ri32-empty";
      empty.textContent = text;
      body.appendChild(empty);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSettings();
      unsubscribeRoute();
      unsubscribeIdentity();
      unsubscribeStore();
      button?.removeEventListener("click", toggle);
      panel?.remove();
      button?.remove();
      panel = null;
      button = null;
    }
    return { open: openPanel, close: closePanel, destroy, getState: () => ({ open, activeTab }) };
  }
  function tabLabel(key) {
    return TABS.find(([tab]) => tab === key)?.[1] || key;
  }
  function permissionLabel(permission) {
    if (permission === "granted") return "허용됨";
    if (permission === "prompt") return "확인 필요";
    if (permission === "denied") return "거부됨";
    return "사용 불가";
  }
  function researchIcon() {
    return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';
  }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  // src/legacy-runtime.js
  (function() {
    "use strict";
    var VERSION2 = "3.1.6";
    var UPDATE_URL2 = "https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js";
    var CACHE_KEY2 = "ri311:items:v1";
    var SNAP_KEY2 = "ri311:snap:v1";
    var POST_KEY2 = "ri311:posts:v1";
    var SOURCE_RANK = { legacy: 1, permalink: 2, dom: 3, embedded: 4, network: 5 };
    var METRIC_FIELDS = { views: 1, likes: 1, comments: 1, reposts: 1 };
    var VIEW_KEYS = ["play_count", "ig_play_count", "video_play_count", "video_view_count", "view_count", "clips_play_count", "reel_view_count", "media_view_count", "views", "plays"];
    var items = readStore(CACHE_KEY2, {});
    var videoMap = /* @__PURE__ */ Object.create(null);
    var posterMap = /* @__PURE__ */ Object.create(null);
    var pending = /* @__PURE__ */ Object.create(null);
    var queue = [];
    var activeRequests = 0;
    var storeWriteTimer = 0;
    var refreshTimer = 0;
    var seenScripts = /* @__PURE__ */ new WeakSet();
    var lastEmbeddedScan = 0;
    var lastHistorySignature = "";
    var panelOpen = false;
    var panelContext = null;
    var currentContextKey = "";
    var appBannerCacheAt = 0;
    var appBannerTop = Infinity;
    var downloadDirectoryHandle = null;
    function readStore(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function writeStore(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
      }
    }
    function scheduleStoreWrite() {
      if (storeWriteTimer) return;
      storeWriteTimer = setTimeout(function() {
        storeWriteTimer = 0;
        writeStore(CACHE_KEY2, items);
      }, 300);
    }
    function codeFromUrl2(url) {
      var m = String(url || "").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
      return m ? m[1] : "";
    }
    function isReelUrl(url) {
      return /\/(?:reel|reels)\/[A-Za-z0-9_-]+/.test(String(url || ""));
    }
    function normalizeUrl(url) {
      if (!url || /^blob:/i.test(url)) return "";
      try {
        var u = new URL(String(url).replace(/\\u0026/g, "&").replace(/\\\//g, "/"), location.href);
        return u.hostname + u.pathname;
      } catch (e) {
        return "";
      }
    }
    function parseCount(text) {
      var s = String(text || "").replace(/[▶♥●↻,\s]/g, "");
      var m = s.match(/^([0-9]+(?:\.[0-9]+)?)(만|천|억|K|M|B|k|m|b)?$/);
      var n, unit;
      if (!m) return null;
      n = Number(m[1]);
      unit = m[2] || "";
      if (unit === "천" || /[Kk]/.test(unit)) n *= 1e3;
      else if (unit === "만") n *= 1e4;
      else if (unit === "억") n *= 1e8;
      else if (/[Mm]/.test(unit)) n *= 1e6;
      else if (/[Bb]/.test(unit)) n *= 1e9;
      return Math.round(n);
    }
    function fmt(n) {
      n = Number(n);
      if (!isFinite(n) || n <= 0) return "";
      if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
      if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
      return String(Math.round(n));
    }
    function fmtCountOrDash(value) {
      if (value == null || value === "" || !isFinite(Number(value))) return "-";
      if (Number(value) === 0) return "0";
      return fmt(value) || "-";
    }
    function fmtPercent(n) {
      n = Number(n);
      if (!isFinite(n)) return "";
      return (Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/0+$/, "").replace(/\.$/, "") + "%";
    }
    function fmtMultiple(n) {
      n = Number(n);
      if (!isFinite(n) || n <= 0) return "";
      return "×" + n.toFixed(n >= 10 ? 1 : 2).replace(/0+$/, "").replace(/\.$/, "");
    }
    function visible(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    }
    function sourceRank(source) {
      return SOURCE_RANK[source] || 0;
    }
    function fieldValue2(item, key) {
      var f = item && item.fields && item.fields[key];
      if (f && (f.status === "verified" || f.status === "conflict")) return f.value;
      return item && item[key] != null ? item[key] : null;
    }
    function markConflict(item, key, oldField, incoming, source) {
      item.conflicts = item.conflicts || {};
      item.conflicts[key] = { previous: oldField.value, incoming, source, at: Date.now() };
      item.fields[key] = {
        value: oldField.value,
        source: oldField.source,
        confidence: oldField.confidence,
        status: "conflict",
        updatedAt: Date.now()
      };
      item[key] = oldField.value;
      return true;
    }
    function setField(item, key, value, source, confidence) {
      var old, newRank, oldRank, a, b, age;
      if (value == null || value === "") return false;
      item.fields = item.fields || {};
      old = item.fields[key] || null;
      newRank = sourceRank(source);
      oldRank = old ? sourceRank(old.source) : -1;
      if (old && (old.status === "verified" || old.status === "conflict") && String(old.value) !== String(value)) {
        if (newRank < oldRank) return false;
        if (METRIC_FIELDS[key]) {
          a = Number(old.value);
          b = Number(value);
          age = Date.now() - Number(old.updatedAt || 0);
          if (a > 0 && (b < a && a - b > Math.max(5, a * 0.02) || age < 12e4 && a > 100 && b > a * 20)) return markConflict(item, key, old, value, source);
        } else if (key !== "videoUrl" && key !== "thumbUrl" && key !== "carouselImages" && !(key === "mediaType" && old.value === "VIDEO" && value === "REEL") && newRank <= oldRank) {
          return markConflict(item, key, old, value, source);
        }
      }
      if (old && String(old.value) === String(value) && newRank <= oldRank && old.status === "verified") return false;
      item.fields[key] = {
        value,
        source: source || "dom",
        confidence: confidence || (newRank >= 4 ? "high" : "medium"),
        status: "verified",
        updatedAt: Date.now()
      };
      item[key] = value;
      if (item.conflicts) delete item.conflicts[key];
      return true;
    }
    function saveItem(code, patch, source, confidence) {
      var item, keys, i, key, changed = false;
      if (!code) return null;
      item = items[code] || { code, fields: {}, conflicts: {} };
      patch = patch || {};
      if (!patch.mediaType && isReelUrl(patch.pageUrl || patch.canonicalUrl || "")) patch.mediaType = "REEL";
      keys = ["views", "likes", "comments", "reposts", "date", "owner", "videoUrl", "thumbUrl", "carouselImages", "mediaId", "ownerId", "mediaType", "productType", "canonicalUrl"];
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (patch[key] != null && patch[key] !== "" && setField(item, key, patch[key], source, confidence)) changed = true;
      }
      if (patch.pageUrl) item.pageUrl = patch.pageUrl;
      if (patch.fetched) item.fetched = patch.fetched;
      item.seen = Date.now();
      item.identity = {
        shortcode: code,
        mediaId: fieldValue2(item, "mediaId") || "",
        ownerId: fieldValue2(item, "ownerId") || "",
        username: fieldValue2(item, "owner") || "",
        mediaType: fieldValue2(item, "mediaType") || "",
        productType: fieldValue2(item, "productType") || "",
        canonicalUrl: fieldValue2(item, "canonicalUrl") || item.pageUrl || "",
        state: fieldValue2(item, "mediaType") && fieldValue2(item, "owner") ? "IDENTIFIED" : "IDENTIFYING"
      };
      items[code] = item;
      if (changed) {
        scheduleStoreWrite();
        recordSnapshot(code, fieldValue2(item, "views"));
        recordPost(item);
        scheduleRefresh();
      }
      return item;
    }
    function recordSnapshot(code, views) {
      var store, arr, last, now = Date.now();
      views = Number(views);
      if (!code || !views) return;
      store = readStore(SNAP_KEY2, {});
      arr = Array.isArray(store[code]) ? store[code] : [];
      last = arr.length ? arr[arr.length - 1] : null;
      if (!last || now - Number(last.t || 0) >= 18e5 || Number(last.v) !== views) arr.push({ t: now, v: views });
      arr = arr.filter(function(x) {
        return now - Number(x.t || 0) <= 12096e5;
      }).slice(-80);
      store[code] = arr;
      writeStore(SNAP_KEY2, store);
    }
    function growth24h(code, views) {
      var arr = readStore(SNAP_KEY2, {})[code] || [];
      var now = Date.now(), best = null, bestDelta = Infinity, i, age, delta;
      views = Number(views);
      if (!code || !views) return null;
      for (i = 0; i < arr.length; i++) {
        age = now - Number(arr[i].t || 0);
        if (age < 648e5 || age > 1152e5) continue;
        delta = Math.abs(age - 864e5);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = arr[i];
        }
      }
      if (!best || !Number(best.v) || views < Number(best.v)) return null;
      return (views - Number(best.v)) / Number(best.v) * 100;
    }
    function recordPost(item) {
      var owner, views, store, keys;
      if (!item || !item.code) return;
      owner = String(fieldValue2(item, "owner") || "").toLowerCase();
      views = Number(fieldValue2(item, "views"));
      if (!owner || !views) return;
      store = readStore(POST_KEY2, {});
      store[item.code] = { code: item.code, owner, views, t: Date.now() };
      keys = Object.keys(store);
      if (keys.length > 500) {
        keys.sort(function(a, b) {
          return Number(store[b].t || 0) - Number(store[a].t || 0);
        });
        keys.slice(500).forEach(function(k) {
          delete store[k];
        });
      }
      writeStore(POST_KEY2, store);
    }
    function accountMultiple(code, owner, views) {
      var store, list = [], vals, mid, median;
      owner = String(owner || "").toLowerCase();
      views = Number(views);
      if (!owner || !views) return null;
      store = readStore(POST_KEY2, {});
      Object.keys(store).forEach(function(k) {
        var d = store[k];
        if (k !== code && d && String(d.owner || "").toLowerCase() === owner && Number(d.views)) list.push(d);
      });
      list.sort(function(a, b) {
        return Number(b.t || 0) - Number(a.t || 0);
      });
      list = list.slice(0, 20);
      if (list.length < 5) return null;
      vals = list.map(function(x) {
        return Number(x.views);
      }).sort(function(a, b) {
        return a - b;
      });
      mid = Math.floor(vals.length / 2);
      median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
      return median ? views / median : null;
    }
    function engagement(views, likes, comments, reposts) {
      if (!Number(views) || !(Number(likes) || Number(comments) || Number(reposts))) return null;
      return (Number(likes || 0) + Number(comments || 0) + Number(reposts || 0)) / Number(views) * 100;
    }
    function detectMediaType(obj) {
      var mt = Number(obj && (obj.media_type != null ? obj.media_type : obj.mediaType));
      var pt = String(obj && (obj.product_type || obj.productType) || "").toLowerCase();
      if (/reel|clips/.test(pt)) return "REEL";
      if (mt === 8 || obj && Array.isArray(obj.carousel_media)) return "CAROUSEL";
      if (mt === 2 || obj && (obj.video_versions || obj.video_url)) return "VIDEO";
      if (mt === 1) return "PHOTO";
      return "";
    }
    function bestImageFromMedia(obj) {
      var best = "", bestScore = -1, candidates = [], i, c, url, w, h;
      if (!obj || typeof obj !== "object") return "";
      if (obj.image_versions2 && Array.isArray(obj.image_versions2.candidates)) candidates = candidates.concat(obj.image_versions2.candidates);
      if (Array.isArray(obj.display_resources)) candidates = candidates.concat(obj.display_resources);
      for (i = 0; i < candidates.length; i++) {
        c = candidates[i] || {};
        url = c.url || c.src || "";
        w = Number(c.width || c.config_width || 0);
        h = Number(c.height || c.config_height || 0);
        if (url && (w * h > bestScore || !best)) {
          best = url;
          bestScore = w * h;
        }
      }
      return best || obj.display_url || obj.thumbnail_src || obj.thumbnail_url || obj.image_url || "";
    }
    function carouselImagesFromMedia(obj) {
      var out = [], seen = /* @__PURE__ */ Object.create(null), slides = obj && obj.carousel_media;
      if (!Array.isArray(slides)) return out;
      slides.forEach(function(slide) {
        var url = bestImageFromMedia(slide), key = normalizeUrl(url) || url;
        if (url && !seen[key]) {
          seen[key] = 1;
          out.push(url);
        }
      });
      return out;
    }
    function directNumber(obj, keys) {
      var i;
      if (!obj || typeof obj !== "object") return null;
      for (i = 0; i < keys.length; i++) if (obj[keys[i]] != null && isFinite(Number(obj[keys[i]]))) return Number(obj[keys[i]]);
      return null;
    }
    function sameMediaNumber(obj, keys, code, depth) {
      var n, names, i, child, childCode;
      if (!obj || typeof obj !== "object" || depth > 2) return null;
      n = directNumber(obj, keys);
      if (n != null) return n;
      names = Object.keys(obj);
      for (i = 0; i < names.length && i < 80; i++) {
        child = obj[names[i]];
        if (!child || typeof child !== "object" || Array.isArray(child)) continue;
        childCode = child.code || child.shortcode || child.short_code || "";
        if (childCode && childCode !== code) continue;
        n = sameMediaNumber(child, keys, code, depth + 1);
        if (n != null) return n;
      }
      return null;
    }
    function collectUrls(obj, code, videos, images, depth) {
      if (!obj || typeof obj !== "object" || depth > 3) return;
      Object.keys(obj).slice(0, 130).forEach(function(key) {
        var value = obj[key], childCode;
        if (typeof value === "string" && /^https?:/i.test(value)) {
          if (/^(video_url|video_src|playback_url)$/i.test(key) || /\.mp4(?:\?|$)/i.test(value)) videos.push(value);
          else if (/image|thumbnail|display|poster|image_url|src/i.test(key) && !/\.mp4/i.test(value)) images.push(value);
        } else if (value && typeof value === "object") {
          childCode = value.code || value.shortcode || value.short_code || "";
          if (!childCode || childCode === code) collectUrls(value, code, videos, images, depth + 1);
        }
      });
    }
    function rememberObject(obj, source) {
      var code, patch = {}, n, user, videos = [], images = [], i, key, type, directThumb, carouselImages;
      if (!obj || typeof obj !== "object") return;
      code = obj.code || obj.shortcode || obj.short_code;
      if (!code || typeof code !== "string" || code.length < 5 || code.length > 40) return;
      n = sameMediaNumber(obj, VIEW_KEYS, code, 0);
      if (n != null) patch.views = n;
      n = sameMediaNumber(obj, ["like_count", "likes_count"], code, 0);
      if (n != null) patch.likes = n;
      n = sameMediaNumber(obj, ["comment_count", "comments_count"], code, 0);
      if (n != null) patch.comments = n;
      n = sameMediaNumber(obj, ["reshare_count", "repost_count", "reposts_count"], code, 0);
      if (n != null) patch.reposts = n;
      n = sameMediaNumber(obj, ["taken_at", "taken_at_timestamp"], code, 0);
      if (n) {
        try {
          patch.date = new Date(n * 1e3).toISOString().slice(0, 10);
        } catch (e) {
        }
      }
      user = obj.user || obj.owner || obj.owner_user;
      if (user && user.username) patch.owner = String(user.username).toLowerCase();
      if (obj.pk || obj.id || obj.media_id) patch.mediaId = String(obj.pk || obj.id || obj.media_id);
      if (obj.user_id || obj.owner_id || user && (user.pk || user.id)) patch.ownerId = String(obj.user_id || obj.owner_id || user.pk || user.id);
      type = detectMediaType(obj);
      if (type) patch.mediaType = type;
      if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);
      directThumb = bestImageFromMedia(obj);
      if (directThumb) patch.thumbUrl = directThumb;
      carouselImages = carouselImagesFromMedia(obj);
      if (carouselImages.length) patch.carouselImages = carouselImages;
      collectUrls(obj, code, videos, images, 0);
      for (i = 0; i < videos.length; i++) {
        key = normalizeUrl(videos[i]);
        if (key) videoMap[key] = code;
        if (!patch.videoUrl) patch.videoUrl = videos[i];
      }
      for (i = 0; i < images.length; i++) {
        key = normalizeUrl(images[i]);
        if (key) posterMap[key] = code;
        if (!patch.thumbUrl) patch.thumbUrl = images[i];
      }
      saveItem(code, patch, source || "embedded", source === "network" ? "high" : "medium");
    }
    function walkJson(obj, depth, state, source) {
      if (!obj || typeof obj !== "object" || depth > 10 || state.count > 3e4) return;
      state.count++;
      rememberObject(obj, source);
      Object.keys(obj).slice(0, 180).forEach(function(key) {
        var value = obj[key];
        if (value && typeof value === "object") walkJson(value, depth + 1, state, source);
      });
    }
    function scanJsonText(text, source) {
      if (!text || text.length > 12e6) return;
      try {
        walkJson(JSON.parse(String(text).replace(/^for\s*\(;;\);\s*/, "")), 0, { count: 0 }, source || "embedded");
      } catch (e) {
      }
    }
    function hookNetwork() {
      var originalFetch = window.fetch;
      var XHR = window.XMLHttpRequest;
      if (originalFetch && !originalFetch.__ri315) {
        window.fetch = function() {
          return originalFetch.apply(this, arguments).then(function(response) {
            try {
              var url = response.url || "";
              var ct = response.headers && response.headers.get ? response.headers.get("content-type") || "" : "";
              if (/json/i.test(ct) || /graphql|api|clips|reels|media/i.test(url)) response.clone().text().then(function(text) {
                scanJsonText(text, "network");
              }).catch(function() {
              });
            } catch (e) {
            }
            return response;
          });
        };
        window.fetch.__ri315 = true;
      }
      if (XHR && !XHR.prototype.__ri315) {
        var originalOpen = XHR.prototype.open;
        var originalSend = XHR.prototype.send;
        XHR.prototype.open = function() {
          this.__ri315url = arguments[1] || "";
          return originalOpen.apply(this, arguments);
        };
        XHR.prototype.send = function() {
          this.addEventListener("load", function() {
            try {
              var ct = this.getResponseHeader("content-type") || "";
              if ((/json/i.test(ct) || /graphql|api|clips|reels|media/i.test(this.__ri315url || "")) && typeof this.responseText === "string") scanJsonText(this.responseText, "network");
            } catch (e) {
            }
          });
          return originalSend.apply(this, arguments);
        };
        XHR.prototype.__ri315 = true;
      }
    }
    function scanEmbedded(force) {
      var now = Date.now(), signature, scripts, i, text;
      if (!force && now - lastEmbeddedScan < 700) return;
      lastEmbeddedScan = now;
      signature = location.href;
      try {
        signature += "|" + Object.keys(history.state || {}).slice(0, 12).join(",");
      } catch (e) {
      }
      if (force || signature !== lastHistorySignature) {
        lastHistorySignature = signature;
        try {
          if (history.state) walkJson(history.state, 0, { count: 0 }, "embedded");
        } catch (e) {
        }
      }
      scripts = document.scripts || [];
      for (i = 0; i < scripts.length && i < 320; i++) {
        if (seenScripts.has(scripts[i])) continue;
        seenScripts.add(scripts[i]);
        text = scripts[i].textContent || "";
        if (text && (scripts[i].type === "application/json" || /"(?:code|shortcode|media_type|play_count|view_count)"/.test(text))) scanJsonText(text, "embedded");
      }
    }
    function nearMetric(text, code, keys) {
      var p = text.indexOf(code), area, i, m;
      if (p < 0) return null;
      area = text.slice(Math.max(0, p - 18e3), Math.min(text.length, p + 3e4));
      for (i = 0; i < keys.length; i++) {
        m = area.match(new RegExp('["\\\\]?' + keys[i] + '["\\\\]?\\s*:\\s*["\\\\]?([0-9]+)', "i"));
        if (m) return Number(m[1]);
      }
      return null;
    }
    function scanPermalinkJson(html) {
      try {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var scripts = doc.querySelectorAll('script[type="application/json"],script:not([src])');
        var i, text;
        for (i = 0; i < scripts.length && i < 220; i++) {
          text = scripts[i].textContent || "";
          if (text && (scripts[i].type === "application/json" || /"(?:carousel_media|shortcode|media_type|video_versions|image_versions2)"/.test(text))) scanJsonText(text, "permalink");
        }
      } catch (e) {
      }
    }
    function parsePermalink(html, url) {
      var code = codeFromUrl2(url), patch = { pageUrl: url, canonicalUrl: url }, doc, meta, desc = "", m, n, hasVideo = false;
      try {
        doc = new DOMParser().parseFromString(html, "text/html");
        meta = doc.querySelector('meta[name="description"],meta[property="og:description"]');
        desc = meta ? meta.getAttribute("content") || "" : "";
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i);
        if (m) patch.likes = parseCount(m[1]);
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i);
        if (m) patch.comments = parseCount(m[1]);
        meta = doc.querySelector('meta[property="og:image"]');
        if (meta) patch.thumbUrl = meta.getAttribute("content") || "";
        meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]');
        if (meta && meta.getAttribute("content")) {
          patch.videoUrl = meta.getAttribute("content");
          hasVideo = true;
        }
      } catch (e) {
      }
      if (isReelUrl(url)) patch.mediaType = "REEL";
      else if (hasVideo) patch.mediaType = "VIDEO";
      if (patch.mediaType === "REEL" || patch.mediaType === "VIDEO") patch.views = nearMetric(html, code, VIEW_KEYS);
      if (patch.likes == null) patch.likes = nearMetric(html, code, ["like_count", "likes_count"]);
      if (patch.comments == null) patch.comments = nearMetric(html, code, ["comment_count", "comments_count"]);
      patch.reposts = nearMetric(html, code, ["reshare_count", "repost_count", "reposts_count"]);
      n = nearMetric(html, code, ["taken_at", "taken_at_timestamp"]);
      if (n) {
        try {
          patch.date = new Date(n * 1e3).toISOString().slice(0, 10);
        } catch (e) {
        }
      }
      return patch;
    }
    function enqueue(url, callback) {
      var code = codeFromUrl2(url);
      if (!code) return;
      if (items[code] && Date.now() - Number(items[code].fetched || 0) < 3e5) {
        if (callback) callback(items[code]);
        return;
      }
      if (pending[code]) {
        if (callback) pending[code].push(callback);
        return;
      }
      pending[code] = callback ? [callback] : [];
      queue.push({ url, code });
      pumpQueue();
    }
    function finishPending(code, data) {
      var callbacks = pending[code] || [];
      delete pending[code];
      callbacks.forEach(function(fn) {
        try {
          fn(data);
        } catch (e) {
        }
      });
    }
    function pumpQueue() {
      while (activeRequests < 2 && queue.length) {
        var job = queue.shift();
        var xhr = new XMLHttpRequest();
        activeRequests++;
        (function(job2, xhr2) {
          xhr2.open("GET", job2.url, true);
          xhr2.withCredentials = true;
          xhr2.onreadystatechange = function() {
            if (xhr2.readyState !== 4) return;
            activeRequests--;
            if (xhr2.status >= 200 && xhr2.status < 400) {
              scanPermalinkJson(xhr2.responseText || "");
              var patch = parsePermalink(xhr2.responseText || "", job2.url);
              patch.fetched = Date.now();
              saveItem(job2.code, patch, "permalink", "medium");
            }
            finishPending(job2.code, items[job2.code] || null);
            pumpQueue();
          };
          try {
            xhr2.send();
          } catch (e) {
            activeRequests--;
            finishPending(job2.code, items[job2.code] || null);
            pumpQueue();
          }
        })(job, xhr);
      }
    }
    function appBannerBoundary() {
      var now = Date.now(), elements, i, r, text;
      if (now - appBannerCacheAt < 500) return appBannerTop;
      appBannerCacheAt = now;
      appBannerTop = Infinity;
      elements = document.querySelectorAll('button,a,[role="button"]');
      for (i = 0; i < elements.length && i < 700; i++) {
        if (!visible(elements[i])) continue;
        text = (elements[i].textContent || "").trim();
        if (!/^(앱 사용|앱에서 열기|Use app|Open app)$/i.test(text)) continue;
        r = elements[i].getBoundingClientRect();
        if (r.top > innerHeight * 0.5) appBannerTop = Math.min(appBannerTop, r.top - 8);
      }
      return appBannerTop;
    }
    function gridSafe(anchor) {
      var r = anchor.getBoundingClientRect(), boundary = appBannerBoundary();
      if (isFinite(boundary) && r.top < boundary && r.bottom > boundary) return false;
      return r.bottom > 145 && r.top < innerHeight - 110;
    }
    function openUrl(url) {
      if (!url) return;
      var a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    function showToast2(text) {
      var old = document.getElementById("ri3-toast");
      if (old) old.remove();
      var toast = document.createElement("div");
      toast.id = "ri3-toast";
      toast.textContent = text;
      document.documentElement.appendChild(toast);
      setTimeout(function() {
        if (toast.parentNode) toast.remove();
      }, 2200);
    }
    function directDownload(url, filename) {
      if (!url) return Promise.resolve(false);
      try {
        var a = document.createElement("a");
        a.href = url;
        a.download = filename || "Instagram_media";
        a.target = "_blank";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return Promise.resolve(true);
      } catch (e) {
        return Promise.resolve(false);
      }
    }
    function extensionFromUrl2(url, fallback) {
      var clean = String(url || "").split("?")[0];
      var m = clean.match(/\.([A-Za-z0-9]{2,5})$/);
      return m ? "." + m[1].toLowerCase() : fallback;
    }
    function fetchMediaBlob(url) {
      return fetch(url, { credentials: "omit" }).then(function(response) {
        if (!response.ok) throw new Error("download");
        return response.blob();
      });
    }
    function saveBlobToSelectedDirectory(blob, filename) {
      if (!downloadDirectoryHandle) return Promise.reject(new Error("no-directory"));
      return downloadDirectoryHandle.getFileHandle(filename, { create: true }).then(function(fileHandle) {
        return fileHandle.createWritable();
      }).then(function(writable) {
        return writable.write(blob).then(function() {
          return writable.close();
        });
      });
    }
    function downloadMedia(url, filename) {
      if (!url) return Promise.resolve(false);
      filename = filename || "Instagram_media";
      if (downloadDirectoryHandle) {
        return fetchMediaBlob(url).then(function(blob) {
          return saveBlobToSelectedDirectory(blob, filename);
        }).then(function() {
          return true;
        }).catch(function() {
          showToast2("선택 폴더 저장 실패 · 기본 다운로드로 전환");
          return directDownload(url, filename);
        });
      }
      return fetchMediaBlob(url).then(function(blob) {
        var objectUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() {
          URL.revokeObjectURL(objectUrl);
        }, 2500);
        return true;
      }).catch(function() {
        return directDownload(url, filename);
      });
    }
    function supportsDirectoryPicker() {
      return typeof window.showDirectoryPicker === "function";
    }
    function chooseDownloadDirectory() {
      if (!supportsDirectoryPicker()) {
        showToast2("이 브라우저는 저장 폴더 선택을 지원하지 않습니다");
        return Promise.resolve(false);
      }
      return window.showDirectoryPicker({ mode: "readwrite" }).then(function(handle) {
        downloadDirectoryHandle = handle;
        showToast2("선택한 폴더로 저장합니다");
        return true;
      }).catch(function() {
        return false;
      });
    }
    function downloadCarousel(images, code) {
      var list = Array.isArray(images) ? images.filter(Boolean) : [];
      var chain = Promise.resolve();
      list.forEach(function(url, index) {
        chain = chain.then(function() {
          var n = String(index + 1).padStart(2, "0");
          return downloadMedia(url, "Instagram_" + code + "_slide_" + n + extensionFromUrl2(url, ".jpg"));
        }).then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 180);
          });
        });
      });
      return chain;
    }
    function copyText2(text) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function() {
        });
        return;
      }
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      } catch (e) {
      }
    }
    function mediaActionIcon() {
      return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 18h14"/></svg>';
    }
    function cardDomType(anchor) {
      var text = "", nodes, i;
      if (!anchor) return "";
      if (anchor.querySelector("video")) return "VIDEO";
      nodes = anchor.querySelectorAll("svg[aria-label],svg[title],[aria-label],[title]");
      for (i = 0; i < nodes.length && i < 30; i++) text += " " + (nodes[i].getAttribute("aria-label") || "") + " " + (nodes[i].getAttribute("title") || "");
      text = text.toLowerCase();
      if (/reel|릴스/.test(text)) return "REEL";
      if (/video|동영상|비디오|play|재생/.test(text)) return "VIDEO";
      if (/carousel|multiple|여러|슬라이드/.test(text)) return "CAROUSEL";
      return "";
    }
    function effectiveCardType(anchor, data) {
      var stored = String(fieldValue2(data, "mediaType") || "").toUpperCase();
      var domType = cardDomType(anchor);
      if (stored === "REEL" || stored === "VIDEO" || stored === "PHOTO" || stored === "CAROUSEL") return stored;
      if (isReelUrl(anchor && anchor.href)) return "REEL";
      if (domType) return domType;
      return /\/p\//.test(String(anchor && anchor.href || "")) ? "POST" : "";
    }
    function isVideoCard(anchor, data) {
      var type = effectiveCardType(anchor, data);
      return type === "REEL" || type === "VIDEO";
    }
    function bestDomImageUrl2(anchor) {
      var img = anchor && anchor.querySelector ? anchor.querySelector("img") : null;
      var srcset, best = "", bestWidth = -1;
      if (!img) return "";
      srcset = img.getAttribute("srcset") || "";
      if (srcset) {
        srcset.split(",").forEach(function(part) {
          var p = part.trim(), m = p.match(/^(.*)\s+(\d+(?:\.\d+)?)(w|x)$/), score;
          if (!m) return;
          score = Number(m[2]);
          if (m[3] === "x") score *= 1e4;
          if (score > bestWidth) {
            bestWidth = score;
            best = m[1].trim();
          }
        });
      }
      return best || img.currentSrc || img.src || "";
    }
    function cardImageUrl(anchor, data) {
      return bestDomImageUrl2(anchor) || fieldValue2(data, "thumbUrl") || "";
    }
    function closeGridMenu() {
      var menu = document.getElementById("ri3-grid-menu");
      if (menu) menu.remove();
    }
    function addGridMenuButton(menu, text, enabled, fn) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.disabled = !enabled;
      if (enabled) button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeGridMenu();
        fn();
      });
      menu.appendChild(button);
    }
    function openGridMenu(anchor, code) {
      var existing = document.getElementById("ri3-grid-menu");
      if (existing && existing.dataset.code === code) {
        closeGridMenu();
        return;
      }
      closeGridMenu();
      var data = items[code] || { code, fields: {} };
      var type = effectiveCardType(anchor, data);
      var videoCard = type === "REEL" || type === "VIDEO";
      var imageUrl = cardImageUrl(anchor, data);
      var videoUrl = fieldValue2(data, "videoUrl") || "";
      var carouselImages = fieldValue2(data, "carouselImages");
      var pageUrl = (anchor.href || "").split("?")[0] || "https://www.instagram.com/" + (videoCard ? "reel/" : "p/") + code + "/";
      var trigger = anchor.querySelector(".ri3-grid-media");
      var rect = trigger ? trigger.getBoundingClientRect() : anchor.getBoundingClientRect();
      var menu = document.createElement("div");
      menu.id = "ri3-grid-menu";
      menu.dataset.code = code;
      menu.setAttribute("role", "menu");
      if (videoCard) {
        addGridMenuButton(menu, videoUrl ? "영상 다운로드" : "영상 준비중", !!videoUrl, function() {
          downloadMedia(videoUrl, "Instagram_" + code + "_video" + extensionFromUrl2(videoUrl, ".mp4"));
        });
        addGridMenuButton(menu, "썸네일 다운로드", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_thumb" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      } else if (type === "CAROUSEL") {
        addGridMenuButton(menu, Array.isArray(carouselImages) && carouselImages.length ? "전체 이미지 다운로드 (" + carouselImages.length + ")" : "전체 이미지 준비중", Array.isArray(carouselImages) && carouselImages.length > 0, function() {
          downloadCarousel(carouselImages, code);
        });
        addGridMenuButton(menu, "대표 이미지 다운로드", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_cover" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      } else {
        addGridMenuButton(menu, "이미지 다운로드", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_image" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      }
      if (supportsDirectoryPicker()) {
        addGridMenuButton(menu, downloadDirectoryHandle ? "저장 폴더 변경" : "저장 폴더 선택", true, chooseDownloadDirectory);
      } else {
        addGridMenuButton(menu, "저장 폴더: 브라우저 기본", false, function() {
        });
      }
      addGridMenuButton(menu, "링크 복사", !!pageUrl, function() {
        copyText2(pageUrl);
      });
      document.documentElement.appendChild(menu);
      var menuRect = menu.getBoundingClientRect();
      var left = Math.max(6, Math.min(innerWidth - menuRect.width - 6, rect.left));
      var top = rect.bottom + 6;
      if (top + menuRect.height > innerHeight - 8) top = Math.max(8, rect.top - menuRect.height - 6);
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }
    function ensureGridCard(anchor, code) {
      var box, actions, mediaButton;
      if (anchor.dataset.ri315Code !== code) {
        anchor.dataset.ri315Code = code;
        anchor.dataset.ri315Render = "";
      }
      if (anchor.dataset.ri315Ready === "1" && anchor.querySelector(".ri3-grid-box") && anchor.querySelector(".ri3-grid-actions")) return;
      anchor.dataset.ri315Ready = "1";
      anchor.style.position = anchor.style.position || "relative";
      Array.prototype.slice.call(anchor.querySelectorAll(".ri3-grid-box,.ri3-grid-actions")).forEach(function(el) {
        el.remove();
      });
      box = document.createElement("div");
      box.className = "ri3-grid-box";
      box.innerHTML = '<div class="ri3-grid-row1"><span></span><span></span><span></span><span></span></div><div class="ri3-grid-row2"><span></span><span></span><span></span><span></span></div>';
      anchor.appendChild(box);
      actions = document.createElement("div");
      actions.className = "ri3-grid-actions";
      mediaButton = document.createElement("button");
      mediaButton.type = "button";
      mediaButton.className = "ri3-grid-media";
      mediaButton.setAttribute("aria-label", "미디어 저장 메뉴");
      mediaButton.setAttribute("title", "미디어 저장 메뉴");
      mediaButton.innerHTML = mediaActionIcon();
      mediaButton.addEventListener("pointerdown", function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      mediaButton.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        openGridMenu(anchor, anchor.dataset.ri315Code || code);
      }, true);
      actions.appendChild(mediaButton);
      anchor.appendChild(actions);
    }
    function setGridSlots(row, values) {
      var spans = row ? row.children : [], i;
      for (i = 0; i < 4; i++) if (spans[i] && spans[i].textContent !== values[i]) spans[i].textContent = values[i];
    }
    function renderGridCard(anchor, data) {
      var row1 = anchor.querySelector(".ri3-grid-row1");
      var row2 = anchor.querySelector(".ri3-grid-row2");
      var views = fieldValue2(data, "views");
      var likes = fieldValue2(data, "likes");
      var comments = fieldValue2(data, "comments");
      var reposts = fieldValue2(data, "reposts");
      var date = fieldValue2(data, "date");
      var videoCard = isVideoCard(anchor, data);
      var type = effectiveCardType(anchor, data);
      var er = videoCard ? engagement(views, likes, comments, reposts) : null;
      var growth = videoCard && views ? growth24h(data.code, views) : null;
      var multiple = videoCard && views ? accountMultiple(data.code, fieldValue2(data, "owner"), views) : null;
      var line1, line2, key, actions, safe;
      if (!row1 || !row2) return;
      line1 = [
        "▶" + (videoCard && Number(views) > 0 ? fmtCountOrDash(views) : "-"),
        "♥" + fmtCountOrDash(likes),
        "●" + fmtCountOrDash(comments),
        "↻" + fmtCountOrDash(reposts)
      ];
      line2 = [
        er != null ? fmtPercent(er) : "-",
        growth != null ? (growth >= 0 ? "+" : "") + fmtPercent(growth) : "-",
        multiple != null ? fmtMultiple(multiple) : "-",
        date ? String(date).slice(5).replace("-", "/") : "-"
      ];
      key = [type, views, likes, comments, reposts, date, er, growth, multiple].join("|");
      if (anchor.dataset.ri315Render !== key) {
        setGridSlots(row1, line1);
        setGridSlots(row2, line2);
        anchor.dataset.ri315Render = key;
      }
      actions = anchor.querySelector(".ri3-grid-actions");
      safe = gridSafe(anchor);
      if (anchor.querySelector(".ri3-grid-box")) anchor.querySelector(".ri3-grid-box").style.visibility = safe ? "visible" : "hidden";
      if (actions) actions.style.visibility = safe ? "visible" : "hidden";
    }
    function scanGrid() {
      var anchors, i, anchor, code, data, url;
      if (/^\/(?:reel|reels|p)\//.test(location.pathname)) return;
      anchors = document.querySelectorAll('main a[href*="/reel/"],main a[href*="/reels/"],main a[href*="/p/"]');
      for (i = 0; i < anchors.length; i++) {
        anchor = anchors[i];
        if (!visible(anchor) && !gridSafe(anchor)) continue;
        code = codeFromUrl2(anchor.href);
        if (!code) continue;
        ensureGridCard(anchor, code);
        data = items[code] || { code, fields: {} };
        renderGridCard(anchor, data);
        if (!data.fetched || Date.now() - Number(data.fetched || 0) > 3e5) {
          url = anchor.href.split("?")[0];
          enqueue(url, /* @__PURE__ */ (function(target, expectedCode) {
            return function(d) {
              if (codeFromUrl2(target.href) !== expectedCode) return;
              renderGridCard(target, d || { code: expectedCode, fields: {} });
            };
          })(anchor, code));
        }
      }
    }
    function activeVideo() {
      var videos = document.querySelectorAll("video"), best = null, bestScore = -Infinity, i, r, w, h, area, centerY, score;
      for (i = 0; i < videos.length; i++) {
        r = videos[i].getBoundingClientRect();
        w = Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left));
        h = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
        area = w * h;
        if (area < innerWidth * innerHeight * 0.2) continue;
        centerY = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
        score = area - Math.abs(centerY - innerHeight / 2) * innerWidth * 1.5 + (!videos[i].paused ? innerWidth * innerHeight * 0.2 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = videos[i];
        }
      }
      return best;
    }
    function controlLabel(el) {
      var svg = el && el.querySelector ? el.querySelector("svg[aria-label],svg[title]") : null;
      return [
        el && el.getAttribute && el.getAttribute("aria-label") || "",
        el && el.getAttribute && el.getAttribute("title") || "",
        svg && svg.getAttribute("aria-label") || "",
        svg && svg.getAttribute("title") || "",
        el && el.textContent || ""
      ].join(" ").toLowerCase();
    }
    function rightRailControls() {
      var elements = document.querySelectorAll('button,[role="button"],a'), out = [], i, r, text;
      for (i = 0; i < elements.length; i++) {
        if (!visible(elements[i])) continue;
        r = elements[i].getBoundingClientRect();
        if (r.left < innerWidth * 0.66 || r.top < innerHeight * 0.18 || r.bottom > innerHeight * 0.92 || r.width > 120 || r.height > 120) continue;
        text = controlLabel(elements[i]);
        if (/좋아요|\blike\b|댓글|comment|리포스트|repost|reshare|공유|share|send|더\s*보기|more|options/.test(text)) out.push({ el: elements[i], r, text });
      }
      return out.sort(function(a, b) {
        return a.r.top - b.r.top;
      });
    }
    function nativeMetrics() {
      var controls = rightRailControls(), out = { likes: null, comments: null, reposts: null };
      controls.forEach(function(control) {
        var node = control.el.closest && control.el.closest('button,[role="button"],a') || control.el;
        var text = node.parentElement && node.parentElement.textContent || node.textContent || "";
        var m = text.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:만|천|억|K|M|B|k|m|b)?)/);
        var n = m ? parseCount(m[1]) : null;
        if (n == null) return;
        if (out.likes == null && /좋아요|\blike\b/.test(control.text)) out.likes = n;
        else if (out.comments == null && /댓글|comment/.test(control.text)) out.comments = n;
        else if (out.reposts == null && /리포스트|repost|reshare/.test(control.text)) out.reposts = n;
      });
      return out;
    }
    function visibleUsername() {
      var links = document.querySelectorAll('a[href^="/"]'), i, m, r;
      for (i = 0; i < links.length; i++) {
        m = (links[i].getAttribute("href") || "").match(/^\/([A-Za-z0-9._]+)\/?$/);
        if (!m || /^(accounts|explore|reels|reel|p|direct|stories)$/i.test(m[1]) || !visible(links[i])) continue;
        r = links[i].getBoundingClientRect();
        if (r.top > innerHeight * 0.5 && r.left < innerWidth * 0.72) return m[1].toLowerCase();
      }
      return "";
    }
    function mappedCode(video) {
      var urls = [video.currentSrc || "", video.src || "", video.poster || ""], i, key;
      for (i = 0; i < urls.length; i++) {
        key = normalizeUrl(urls[i]);
        if (key && (videoMap[key] || posterMap[key])) return videoMap[key] || posterMap[key];
      }
      return "";
    }
    function reelContext() {
      var video = activeVideo(), r, code = "", metrics2, owner, candidates = [], keys;
      if (!video) return null;
      r = video.getBoundingClientRect();
      if (Math.min(innerHeight, r.bottom) - Math.max(0, r.top) < innerHeight * 0.55) return null;
      if (isReelUrl(location.href)) code = codeFromUrl2(location.href);
      if (!code) code = mappedCode(video);
      metrics2 = nativeMetrics();
      owner = visibleUsername();
      if (!code) {
        keys = Object.keys(items);
        keys.forEach(function(key) {
          var d = items[key], score = 0, likes = fieldValue2(d, "likes"), comments = fieldValue2(d, "comments");
          if (owner && fieldValue2(d, "owner") === owner) score += 10;
          if (metrics2.likes != null && likes != null && Math.abs(metrics2.likes - likes) <= Math.max(2, metrics2.likes * 0.04)) score += 8;
          if (metrics2.comments != null && comments != null && Math.abs(metrics2.comments - comments) <= Math.max(2, metrics2.comments * 0.04)) score += 8;
          if (score >= 18) candidates.push({ code: key, score });
        });
        candidates.sort(function(a, b) {
          return b.score - a.score;
        });
        if (candidates[0]) code = candidates[0].code;
      }
      if (code) saveItem(code, {
        owner: owner || void 0,
        mediaType: "REEL",
        pageUrl: "https://www.instagram.com/reel/" + code + "/",
        canonicalUrl: "https://www.instagram.com/reel/" + code + "/"
      }, "dom", "high");
      return { video, code: code || "", native: metrics2, owner, status: code ? "IDENTIFIED" : "IDENTIFYING" };
    }
    function ensureOverlay() {
      var box = document.getElementById("ri3-reels-overlay");
      if (!box) {
        box = document.createElement("div");
        box.id = "ri3-reels-overlay";
        document.documentElement.appendChild(box);
      }
      return box;
    }
    function renderReelOverlay(ctx) {
      var box = ensureOverlay(), data, views, er, growth, multiple, lines = [], key;
      if (!ctx || !ctx.code) {
        box.style.display = "none";
        return;
      }
      data = items[ctx.code] || {};
      views = fieldValue2(data, "views");
      er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
      growth = views ? growth24h(ctx.code, views) : null;
      multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue2(data, "owner"), views) : null;
      if (views) lines.push("▶ " + fmt(views));
      if (er != null) lines.push("ER " + fmtPercent(er));
      if (growth != null) lines.push("24h " + (growth >= 0 ? "+" : "") + fmtPercent(growth));
      if (multiple != null) lines.push(fmtMultiple(multiple));
      if (fieldValue2(data, "date")) lines.push(String(fieldValue2(data, "date")).slice(5).replace("-", "/"));
      key = lines.join("|");
      if (box.dataset.ri315Render !== key) {
        box.innerHTML = "";
        lines.forEach(function(text) {
          var row = document.createElement("div");
          row.textContent = text;
          box.appendChild(row);
        });
        box.dataset.ri315Render = key;
      }
      box.style.display = lines.length ? "flex" : "none";
    }
    function moreButton() {
      var controls = rightRailControls(), i;
      for (i = controls.length - 1; i >= 0; i--) if (/더\s*보기|more|options/.test(controls[i].text)) return controls[i].el;
      return null;
    }
    function ensureTool(ctx) {
      var button = document.getElementById("ri3-tool"), more, r;
      if (!ctx) {
        if (button) button.remove();
        closePanel();
        return;
      }
      if (!button) {
        button = document.createElement("button");
        button.id = "ri3-tool";
        button.type = "button";
        button.setAttribute("aria-label", "리서치 도구");
        button.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';
        button.addEventListener("click", function() {
          panelOpen ? closePanel() : openPanel(reelContext());
        });
        document.documentElement.appendChild(button);
      }
      more = moreButton();
      if (more) {
        r = more.getBoundingClientRect();
        button.style.left = Math.max(4, Math.min(innerWidth - 40, r.left + r.width / 2 - 17)) + "px";
        button.style.top = Math.min(innerHeight - 44, r.bottom + 4) + "px";
        button.style.right = "auto";
        button.style.bottom = "auto";
      } else {
        button.style.left = "auto";
        button.style.top = "auto";
        button.style.right = "12px";
        button.style.bottom = "74px";
      }
    }
    function closePanel() {
      var panel = document.getElementById("ri3-panel");
      if (panel) panel.remove();
      panelOpen = false;
      panelContext = null;
    }
    function panelRow(parent, label, value) {
      var row = document.createElement("div");
      row.className = "ri3-panel-row";
      row.innerHTML = "<span></span><strong></strong>";
      row.children[0].textContent = label;
      row.children[1].textContent = value || "—";
      parent.appendChild(row);
    }
    function renderPanel(ctx) {
      var panel = document.getElementById("ri3-panel"), body, data, views, er, growth, multiple, media = "";
      if (!panel || !ctx) return;
      body = panel.querySelector(".ri3-panel-body");
      data = ctx.code ? items[ctx.code] || {} : {};
      views = fieldValue2(data, "views");
      er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
      growth = views ? growth24h(ctx.code, views) : null;
      multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue2(data, "owner"), views) : null;
      if (ctx.video && isFinite(ctx.video.duration) && ctx.video.duration > 0) media = ctx.video.duration.toFixed(1) + "초";
      if (ctx.video && ctx.video.videoWidth && ctx.video.videoHeight) media += (media ? " · " : "") + ctx.video.videoWidth + "×" + ctx.video.videoHeight;
      body.innerHTML = "";
      if (!ctx.code) panelRow(body, "상태", "현재 릴스 식별 중");
      panelRow(body, "조회수", views ? fmt(views) : "확인 중");
      panelRow(body, "좋아요", ctx.native.likes != null ? fmt(ctx.native.likes) : "—");
      panelRow(body, "댓글", ctx.native.comments != null ? fmt(ctx.native.comments) : "—");
      panelRow(body, "리포스트", ctx.native.reposts != null ? fmt(ctx.native.reposts) : "—");
      panelRow(body, "ER", er != null ? fmtPercent(er) : "—");
      panelRow(body, "24h", growth != null ? (growth >= 0 ? "+" : "") + fmtPercent(growth) : "—");
      panelRow(body, "계정 대비", multiple != null ? fmtMultiple(multiple) : "—");
      panelRow(body, "게시일", fieldValue2(data, "date") ? String(fieldValue2(data, "date")).slice(5).replace("-", "/") : "—");
      panelRow(body, "영상", media || "—");
    }
    function openPanel(ctx) {
      var panel, actions, entries;
      if (!ctx) return;
      closePanel();
      panelOpen = true;
      panelContext = ctx;
      panel = document.createElement("aside");
      panel.id = "ri3-panel";
      panel.innerHTML = '<div class="ri3-panel-head"><b>리서치 상세</b><span>v' + VERSION2 + '</span></div><div class="ri3-panel-body"></div><div class="ri3-panel-actions"></div><button class="ri3-panel-close">× 닫기</button>';
      document.documentElement.appendChild(panel);
      actions = panel.querySelector(".ri3-panel-actions");
      entries = [
        ["순수 영상", function() {
          var latest = reelContext() || panelContext;
          var data = latest && latest.code ? items[latest.code] || {} : {};
          var url = latest && latest.video && (latest.video.currentSrc || latest.video.src) || fieldValue2(data, "videoUrl") || "";
          if (/^blob:/i.test(url)) url = fieldValue2(data, "videoUrl") || "";
          openUrl(url);
        }],
        ["썸네일", function() {
          var latest = reelContext() || panelContext;
          var data = latest && latest.code ? items[latest.code] || {} : {};
          openUrl(fieldValue2(data, "thumbUrl") || latest && latest.video && latest.video.poster || "");
        }],
        ["링크 복사", function() {
          var latest = reelContext() || panelContext;
          var text = latest && latest.code ? "https://www.instagram.com/reel/" + latest.code + "/" : location.href;
          copyText2(text);
        }],
        ["새 버전", function() {
          window.open(UPDATE_URL2 + "?ri=" + Date.now(), "_blank");
        }]
      ];
      entries.forEach(function(entry) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = entry[0];
        button.addEventListener("click", entry[1]);
        actions.appendChild(button);
      });
      panel.querySelector(".ri3-panel-close").addEventListener("click", closePanel);
      renderPanel(ctx);
    }
    function injectStyle() {
      if (document.getElementById("ri3-style")) return;
      var style = document.createElement("style");
      style.id = "ri3-style";
      style.textContent = [
        '[id^="ri22"],#ri-tool,#ri-panel,#ri-detail-metrics{display:none!important}',
        ".ri3-grid-box{position:absolute;left:0;right:0;bottom:0;z-index:8;pointer-events:none;display:flex;flex-direction:column;gap:3px;padding:20px 5px 5px;box-sizing:border-box;background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.50))}",
        ".ri3-grid-row1,.ri3-grid-row2{display:grid;width:100%;grid-template-columns:30% 24% 23% 23%;align-items:center;white-space:nowrap;overflow:hidden}",
        ".ri3-grid-row1>span,.ri3-grid-row2>span{min-width:0;overflow:hidden;text-overflow:clip;text-align:center}",
        ".ri3-grid-row1>span:first-child,.ri3-grid-row2>span:first-child{text-align:left}.ri3-grid-row1>span:last-child,.ri3-grid-row2>span:last-child{text-align:right}",
        '.ri3-grid-row1{color:#fff;font:780 9.6px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.46px;text-shadow:0 1px 2px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.78)}',
        '.ri3-grid-row2{color:#111;font:820 9.2px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.42px;-webkit-text-stroke:.6px rgba(255,255,255,.98);paint-order:stroke fill;text-shadow:0 0 2px #fff}',
        ".ri3-grid-actions{position:absolute;left:5px;top:5px;z-index:9;display:flex;visibility:visible}",
        ".ri3-grid-actions button{width:28px;height:28px;padding:0;border:1px solid rgba(255,255,255,.38);border-radius:50%;background:rgba(0,0,0,.30);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent}",
        '#ri3-grid-menu{position:fixed;z-index:2147483646;min-width:148px;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(18,18,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
        '#ri3-grid-menu button{height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}',
        "#ri3-grid-menu button:active{background:rgba(255,255,255,.12)}#ri3-grid-menu button:disabled{opacity:.38}",
        '#ri3-toast{position:fixed;left:50%;bottom:126px;transform:translateX(-50%);z-index:2147483647;max-width:80vw;padding:8px 12px;border-radius:16px;background:rgba(20,20,20,.92);color:#fff;font:650 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}',
        '#ri3-reels-overlay{position:fixed;right:60px;top:clamp(112px,16vh,170px);z-index:2147483600;width:74px;display:none;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;pointer-events:none;color:#fff;font:760 12px/1.08 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.72)}',
        "#ri3-tool{position:fixed;z-index:2147483602;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.12);color:#fff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}",
        '#ri3-panel{position:fixed;right:10px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));z-index:2147483647;width:min(46vw,190px);max-height:69vh;overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:rgba(14,14,14,.97);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
        ".ri3-panel-head{display:flex;align-items:center;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08)}.ri3-panel-head b{font-size:12px;flex:1}.ri3-panel-head span{font-size:8px;opacity:.5}",
        ".ri3-panel-row{display:flex;min-height:27px;align-items:center;font-size:10px}.ri3-panel-row span{flex:1;opacity:.65}.ri3-panel-row strong{font-size:11px}",
        ".ri3-panel-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-top:8px}.ri3-panel-actions button,.ri3-panel-close{min-height:38px;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.06);color:#fff}.ri3-panel-close{width:100%;margin-top:7px}"
      ].join("");
      (document.head || document.documentElement).appendChild(style);
    }
    function run() {
      var ctx, key;
      refreshTimer = 0;
      injectStyle();
      scanEmbedded(false);
      scanGrid();
      ctx = reelContext();
      key = ctx ? (ctx.code || "unknown") + "|" + (ctx.owner || "") : "";
      if (key !== currentContextKey) {
        currentContextKey = key;
        if (panelOpen && panelContext && panelContext.code && ctx && ctx.code && panelContext.code !== ctx.code) closePanel();
      }
      renderReelOverlay(ctx);
      ensureTool(ctx);
      if (panelOpen) {
        panelContext = ctx || panelContext;
        renderPanel(panelContext);
      }
    }
    function scheduleRefresh() {
      if (!refreshTimer) refreshTimer = setTimeout(run, 100);
    }
    function hookHistory() {
      var originalPush = history.pushState;
      var originalReplace = history.replaceState;
      if (!originalPush.__ri315) {
        history.pushState = function() {
          var result2 = originalPush.apply(this, arguments);
          closeGridMenu();
          lastHistorySignature = "";
          scanEmbedded(true);
          scheduleRefresh();
          return result2;
        };
        history.pushState.__ri315 = true;
      }
      if (!originalReplace.__ri315) {
        history.replaceState = function() {
          var result2 = originalReplace.apply(this, arguments);
          closeGridMenu();
          lastHistorySignature = "";
          scanEmbedded(true);
          scheduleRefresh();
          return result2;
        };
        history.replaceState.__ri315 = true;
      }
      addEventListener("popstate", function() {
        closeGridMenu();
        lastHistorySignature = "";
        scanEmbedded(true);
        scheduleRefresh();
      }, true);
    }
    function startObservers() {
      new MutationObserver(scheduleRefresh).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["href", "src", "poster", "aria-label", "title"]
      });
      addEventListener("scroll", function() {
        closeGridMenu();
        scheduleRefresh();
      }, true);
      addEventListener("resize", function() {
        closeGridMenu();
        scheduleRefresh();
      }, true);
      document.addEventListener("play", scheduleRefresh, true);
      document.addEventListener("loadedmetadata", scheduleRefresh, true);
      document.addEventListener("pointerdown", function(e) {
        var menu = document.getElementById("ri3-grid-menu");
        if (!menu) return;
        if (menu.contains(e.target)) return;
        if (e.target && e.target.closest && e.target.closest(".ri3-grid-media")) return;
        closeGridMenu();
      }, true);
    }
    var injectStyle315 = injectStyle;
    var downloadMedia315 = downloadMedia;
    var downloadLocationNoticeShown316 = false;
    var carouselSlidesFromMedia316 = function(obj) {
      var edges;
      if (!obj || typeof obj !== "object") return [];
      if (Array.isArray(obj.carousel_media)) return obj.carousel_media;
      if (Array.isArray(obj.carouselMedia)) return obj.carouselMedia;
      edges = obj.edge_sidecar_to_children && obj.edge_sidecar_to_children.edges;
      if (Array.isArray(edges)) return edges.map(function(edge) {
        return edge && (edge.node || edge);
      }).filter(Boolean);
      return [];
    };
    detectMediaType = function(obj) {
      var mt = Number(obj && (obj.media_type != null ? obj.media_type : obj.mediaType));
      var pt = String(obj && (obj.product_type || obj.productType) || "").toLowerCase();
      if (/reel|clips/.test(pt)) return "REEL";
      if (mt === 8 || carouselSlidesFromMedia316(obj).length) return "CAROUSEL";
      if (mt === 2 || obj && (obj.video_versions || obj.video_url)) return "VIDEO";
      if (mt === 1) return "PHOTO";
      return "";
    };
    carouselImagesFromMedia = function(obj) {
      var out = [], seen = /* @__PURE__ */ Object.create(null), slides = carouselSlidesFromMedia316(obj);
      slides.forEach(function(slide) {
        var url = bestImageFromMedia(slide), key = normalizeUrl(url) || url;
        if (url && !seen[key]) {
          seen[key] = 1;
          out.push(url);
        }
      });
      return out;
    };
    saveItem = function(code, patch, source, confidence) {
      var item, keys, i, key, changed = false;
      if (!code) return null;
      item = items[code] || { code, fields: {}, conflicts: {} };
      patch = patch || {};
      if (!patch.mediaType && isReelUrl(patch.pageUrl || patch.canonicalUrl || "")) patch.mediaType = "REEL";
      keys = ["views", "likes", "comments", "reposts", "date", "owner", "videoUrl", "thumbUrl", "coverUrl", "carouselImages", "mediaId", "ownerId", "mediaType", "productType", "canonicalUrl"];
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (patch[key] != null && patch[key] !== "" && setField(item, key, patch[key], source, confidence)) changed = true;
      }
      if (patch.pageUrl) item.pageUrl = patch.pageUrl;
      if (patch.fetched) item.fetched = patch.fetched;
      item.seen = Date.now();
      item.identity = {
        shortcode: code,
        mediaId: fieldValue2(item, "mediaId") || "",
        ownerId: fieldValue2(item, "ownerId") || "",
        username: fieldValue2(item, "owner") || "",
        mediaType: fieldValue2(item, "mediaType") || "",
        productType: fieldValue2(item, "productType") || "",
        canonicalUrl: fieldValue2(item, "canonicalUrl") || item.pageUrl || "",
        state: fieldValue2(item, "mediaType") && fieldValue2(item, "owner") ? "IDENTIFIED" : "IDENTIFYING"
      };
      items[code] = item;
      if (changed) {
        scheduleStoreWrite();
        recordSnapshot(code, fieldValue2(item, "views"));
        recordPost(item);
        scheduleRefresh();
      }
      return item;
    };
    rememberObject = function(obj, source) {
      var code, patch = {}, n, user, videos = [], images = [], i, key, type, directCover, carouselImages;
      if (!obj || typeof obj !== "object") return;
      code = obj.code || obj.shortcode || obj.short_code;
      if (!code || typeof code !== "string" || code.length < 5 || code.length > 40) return;
      n = sameMediaNumber(obj, VIEW_KEYS, code, 0);
      if (n != null) patch.views = n;
      n = sameMediaNumber(obj, ["like_count", "likes_count"], code, 0);
      if (n != null) patch.likes = n;
      n = sameMediaNumber(obj, ["comment_count", "comments_count"], code, 0);
      if (n != null) patch.comments = n;
      n = sameMediaNumber(obj, ["reshare_count", "repost_count", "reposts_count"], code, 0);
      if (n != null) patch.reposts = n;
      n = sameMediaNumber(obj, ["taken_at", "taken_at_timestamp"], code, 0);
      if (n) {
        try {
          patch.date = new Date(n * 1e3).toISOString().slice(0, 10);
        } catch (e) {
        }
      }
      user = obj.user || obj.owner || obj.owner_user;
      if (user && user.username) patch.owner = String(user.username).toLowerCase();
      if (obj.pk || obj.id || obj.media_id) patch.mediaId = String(obj.pk || obj.id || obj.media_id);
      if (obj.user_id || obj.owner_id || user && (user.pk || user.id)) patch.ownerId = String(obj.user_id || obj.owner_id || user.pk || user.id);
      type = detectMediaType(obj);
      if (type) patch.mediaType = type;
      if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);
      directCover = bestImageFromMedia(obj);
      if (directCover) {
        patch.coverUrl = directCover;
        patch.thumbUrl = directCover;
        key = normalizeUrl(directCover);
        if (key) posterMap[key] = code;
      }
      carouselImages = carouselImagesFromMedia(obj);
      if (carouselImages.length) patch.carouselImages = carouselImages;
      collectUrls(obj, code, videos, images, 0);
      for (i = 0; i < videos.length; i++) {
        key = normalizeUrl(videos[i]);
        if (key) videoMap[key] = code;
        if (!patch.videoUrl) patch.videoUrl = videos[i];
      }
      for (i = 0; i < images.length; i++) {
        key = normalizeUrl(images[i]);
        if (key) posterMap[key] = code;
      }
      saveItem(code, patch, source || "embedded", source === "network" ? "high" : "medium");
    };
    parsePermalink = function(html, url) {
      var code = codeFromUrl2(url), patch = { pageUrl: url, canonicalUrl: url }, doc, meta, desc = "", m, n, hasVideo = false;
      try {
        doc = new DOMParser().parseFromString(html, "text/html");
        meta = doc.querySelector('meta[name="description"],meta[property="og:description"]');
        desc = meta ? meta.getAttribute("content") || "" : "";
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i);
        if (m) patch.likes = parseCount(m[1]);
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i);
        if (m) patch.comments = parseCount(m[1]);
        meta = doc.querySelector('meta[property="og:image"]');
        if (meta && meta.getAttribute("content")) {
          patch.coverUrl = meta.getAttribute("content");
          patch.thumbUrl = patch.coverUrl;
        }
        meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]');
        if (meta && meta.getAttribute("content")) {
          patch.videoUrl = meta.getAttribute("content");
          hasVideo = true;
        }
      } catch (e) {
      }
      if (isReelUrl(url)) patch.mediaType = "REEL";
      else if (hasVideo) patch.mediaType = "VIDEO";
      if (patch.mediaType === "REEL" || patch.mediaType === "VIDEO") patch.views = nearMetric(html, code, VIEW_KEYS);
      if (patch.likes == null) patch.likes = nearMetric(html, code, ["like_count", "likes_count"]);
      if (patch.comments == null) patch.comments = nearMetric(html, code, ["comment_count", "comments_count"]);
      patch.reposts = nearMetric(html, code, ["reshare_count", "repost_count", "reposts_count"]);
      n = nearMetric(html, code, ["taken_at", "taken_at_timestamp"]);
      if (n) {
        try {
          patch.date = new Date(n * 1e3).toISOString().slice(0, 10);
        } catch (e) {
        }
      }
      return patch;
    };
    scanPermalinkJson = function(html) {
      try {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var scripts = doc.querySelectorAll('script[type="application/json"],script:not([src])');
        var i, text;
        for (i = 0; i < scripts.length && i < 220; i++) {
          text = scripts[i].textContent || "";
          if (text && (scripts[i].type === "application/json" || /"(?:carousel_media|edge_sidecar_to_children|shortcode|media_type|video_versions|image_versions2)"/.test(text))) scanJsonText(text, "permalink");
        }
      } catch (e) {
      }
    };
    var bestSrcFromImg316 = function(img) {
      var srcset = img && img.getAttribute ? img.getAttribute("srcset") || "" : "";
      var best = "", bestWidth = -1;
      if (srcset) {
        srcset.split(",").forEach(function(part) {
          var p = part.trim(), m = p.match(/^(.*)\s+(\d+(?:\.\d+)?)(w|x)$/), score;
          if (!m) return;
          score = Number(m[2]);
          if (m[3] === "x") score *= 1e4;
          if (score > bestWidth) {
            bestWidth = score;
            best = m[1].trim();
          }
        });
      }
      return best || img && (img.currentSrc || img.src) || "";
    };
    bestDomImageUrl2 = function(anchor) {
      var imgs, ar, anchorArea, best = "", bestScore = -1, i, img, r, iw, ih, overlap, coverage, label, score, url;
      if (!anchor || !anchor.querySelectorAll) return "";
      ar = anchor.getBoundingClientRect();
      anchorArea = Math.max(1, ar.width * ar.height);
      imgs = anchor.querySelectorAll("img");
      for (i = 0; i < imgs.length; i++) {
        img = imgs[i];
        r = img.getBoundingClientRect();
        iw = Math.max(0, Math.min(ar.right, r.right) - Math.max(ar.left, r.left));
        ih = Math.max(0, Math.min(ar.bottom, r.bottom) - Math.max(ar.top, r.top));
        overlap = iw * ih;
        if (!overlap) continue;
        coverage = overlap / anchorArea;
        if (r.width < ar.width * 0.62 || r.height < ar.height * 0.62 || coverage < 0.38) continue;
        label = [img.alt || "", img.getAttribute("aria-label") || "", img.getAttribute("title") || ""].join(" ").toLowerCase();
        if (/music|audio|album|avatar|profile|음악|음원|오디오|앨범|프로필/.test(label) && coverage < 0.8) continue;
        url = bestSrcFromImg316(img);
        if (!url) continue;
        score = coverage * 1e6 + overlap;
        if (r.width >= ar.width * 0.9 && r.height >= ar.height * 0.9) score += 1e6;
        if (score > bestScore) {
          bestScore = score;
          best = url;
        }
      }
      return best;
    };
    cardImageUrl = function(anchor, data) {
      return bestDomImageUrl2(anchor) || fieldValue2(data, "coverUrl") || fieldValue2(data, "thumbUrl") || "";
    };
    downloadMedia = function(url, filename) {
      if (!supportsDirectoryPicker() && !downloadLocationNoticeShown316) {
        downloadLocationNoticeShown316 = true;
        showToast2("Android Edge: 폴더 지정 불가 · 기본 Downloads에 저장");
      }
      return downloadMedia315(url, filename);
    };
    downloadCarousel = function(images, code) {
      var list = Array.isArray(images) ? images.filter(Boolean) : [];
      var chain = Promise.resolve();
      if (!list.length) {
        showToast2("캐러셀 이미지가 아직 확보되지 않았습니다");
        return chain;
      }
      showToast2("캐러셀 " + list.length + "장 저장 시작");
      list.forEach(function(url, index) {
        chain = chain.then(function() {
          var n = String(index + 1).padStart(2, "0");
          showToast2("캐러셀 " + (index + 1) + "/" + list.length + " 저장 중");
          return downloadMedia(url, "Instagram_" + code + "_slide_" + n + extensionFromUrl2(url, ".jpg"));
        }).then(function() {
          return new Promise(function(resolve) {
            setTimeout(resolve, 420);
          });
        });
      });
      return chain.then(function() {
        showToast2("캐러셀 " + list.length + "장 저장 요청 완료");
      });
    };
    supportsDirectoryPicker = function() {
      return typeof window.showDirectoryPicker === "function";
    };
    chooseDownloadDirectory = function() {
      if (!supportsDirectoryPicker()) {
        showToast2("Android Edge에서는 폴더 선택 API를 사용할 수 없습니다");
        return Promise.resolve(false);
      }
      return window.showDirectoryPicker({ mode: "readwrite" }).then(function(handle) {
        downloadDirectoryHandle = handle;
        showToast2("선택한 폴더로 저장합니다");
        return true;
      }).catch(function() {
        return false;
      });
    };
    openGridMenu = function(anchor, code) {
      var existing = document.getElementById("ri3-grid-menu");
      if (existing && existing.dataset.code === code) {
        closeGridMenu();
        return;
      }
      closeGridMenu();
      var data = items[code] || { code, fields: {} };
      var type = effectiveCardType(anchor, data);
      var videoCard = type === "REEL" || type === "VIDEO";
      var imageUrl = cardImageUrl(anchor, data);
      var videoUrl = fieldValue2(data, "videoUrl") || "";
      var carouselImages = fieldValue2(data, "carouselImages");
      var pageUrl = (anchor.href || "").split("?")[0] || "https://www.instagram.com/" + (videoCard ? "reel/" : "p/") + code + "/";
      var trigger = anchor.querySelector(".ri3-grid-media");
      var rect = trigger ? trigger.getBoundingClientRect() : anchor.getBoundingClientRect();
      var menu = document.createElement("div");
      menu.id = "ri3-grid-menu";
      menu.dataset.code = code;
      menu.setAttribute("role", "menu");
      if (videoCard) {
        addGridMenuButton(menu, videoUrl ? "영상 다운로드" : "영상 준비중", !!videoUrl, function() {
          downloadMedia(videoUrl, "Instagram_" + code + "_video" + extensionFromUrl2(videoUrl, ".mp4"));
        });
        addGridMenuButton(menu, imageUrl ? "썸네일 다운로드" : "썸네일 준비중", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_thumb" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      } else if (type === "CAROUSEL") {
        addGridMenuButton(menu, Array.isArray(carouselImages) && carouselImages.length ? "전체 이미지 다운로드 (" + carouselImages.length + ")" : "전체 이미지 준비중", Array.isArray(carouselImages) && carouselImages.length > 0, function() {
          downloadCarousel(carouselImages, code);
        });
        addGridMenuButton(menu, "대표 이미지 다운로드", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_cover" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      } else {
        addGridMenuButton(menu, "이미지 다운로드", !!imageUrl, function() {
          downloadMedia(imageUrl, "Instagram_" + code + "_image" + extensionFromUrl2(imageUrl, ".jpg"));
        });
      }
      if (supportsDirectoryPicker()) addGridMenuButton(menu, downloadDirectoryHandle ? "저장 폴더 변경" : "저장 폴더 선택", true, chooseDownloadDirectory);
      else addGridMenuButton(menu, "저장 위치: 기본 Downloads", false, function() {
      });
      addGridMenuButton(menu, "링크 복사", !!pageUrl, function() {
        copyText2(pageUrl);
      });
      document.documentElement.appendChild(menu);
      var menuRect = menu.getBoundingClientRect();
      var left = Math.max(6, Math.min(innerWidth - menuRect.width - 6, rect.left));
      var top = rect.bottom + 6;
      if (top + menuRect.height > innerHeight - 8) top = Math.max(8, rect.top - menuRect.height - 6);
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    };
    injectStyle = function() {
      injectStyle315();
      if (document.getElementById("ri3-style-316")) return;
      var style = document.createElement("style");
      style.id = "ri3-style-316";
      style.textContent = [
        ".ri3-grid-row1,.ri3-grid-row2{position:relative!important;display:block!important;width:100%!important;height:10px!important;overflow:hidden!important;white-space:nowrap!important}",
        ".ri3-grid-row1>span,.ri3-grid-row2>span{position:absolute!important;top:0!important;height:10px!important;line-height:10px!important;min-width:0!important;overflow:hidden!important;text-align:center!important;font-variant-numeric:tabular-nums!important}",
        ".ri3-grid-row1>span:nth-child(1){left:0!important;width:32%!important}.ri3-grid-row1>span:nth-child(2){left:32%!important;width:27%!important}.ri3-grid-row1>span:nth-child(3){left:59%!important;width:20%!important}.ri3-grid-row1>span:nth-child(4){left:79%!important;width:21%!important}",
        ".ri3-grid-row2>span:nth-child(1){left:0!important;width:26%!important}.ri3-grid-row2>span:nth-child(2){left:26%!important;width:25%!important}.ri3-grid-row2>span:nth-child(3){left:51%!important;width:24%!important}.ri3-grid-row2>span:nth-child(4){left:75%!important;width:25%!important}"
      ].join("");
      (document.head || document.documentElement).appendChild(style);
    };
    hookNetwork();
    hookHistory();
    injectStyle();
    startObservers();
    scanEmbedded(true);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleRefresh, { once: true });
    else scheduleRefresh();
  })();

  // src/main.js
  var app = createApp({ version: VERSION });
  var capabilities = detectCapabilities(globalThis);
  var settings = createSettingsStore({
    env: globalThis,
    capabilities,
    onChange(state) {
      app.emit(EVENTS.SETTINGS_CHANGED, state);
    }
  });
  var downloads = createDownloadManager({
    env: globalThis,
    capabilities,
    settings,
    onChange(state) {
      app.emit(EVENTS.DOWNLOAD_CHANGED, state);
    }
  });
  var legacyStore = createLegacyStoreAdapter({ env: globalThis });
  var metrics = createMetricsEngine({ history: legacyStore });
  var storeTracker = legacyStore.createChangeTracker((change) => {
    app.setCurrentIdentity(legacyStore.getCurrentIdentity());
    app.emit(EVENTS.STORE_CHANGED, change);
  });
  app.services = { capabilities, settings, downloads, metrics };
  app.adapters.legacyStore = legacyStore;
  var stopRouteTracking = app.startRouteTracking({
    env: globalThis,
    resolveIdentity(url) {
      return legacyStore.getCurrentIdentity(url);
    },
    onActivity(reason) {
      storeTracker.schedule(reason);
    }
  });
  var grid = mountGridActions({ app, adapter: legacyStore, downloads, capabilities, doc: document, env: globalThis });
  var riPanel = mountRiPanel({
    app,
    settings,
    capabilities,
    downloads,
    metrics,
    adapter: legacyStore,
    version: VERSION,
    doc: document,
    env: globalThis
  });
  app.adapters.stopRouteTracking = stopRouteTracking;
  app.adapters.stopStoreTracking = () => storeTracker.destroy();
  app.adapters.grid = grid;
  app.adapters.riPanel = riPanel;
  void settings.init().catch((error) => {
    console.warn("[RI] settings initialization failed", error);
  });
})();
