// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      3.2.14
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==
// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Source: reels-inspector/src/*
// Build version: 3.2.14

(() => {
  // src/version.js
  var VERSION = "3.2.14";
  var UPDATE_URL = "https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js";
  function updateInstallUrl(cacheBust = Date.now()) {
    const value = Number(cacheBust);
    const stamp = Number.isFinite(value) ? Math.trunc(value) : Date.now();
    return `${UPDATE_URL}?ri=${stamp}`;
  }

  // src/core/activity.js
  var VALID_STATES = /* @__PURE__ */ new Set(["running", "success", "error"]);
  function createActivityStore({ now = () => Date.now(), maxItems = 24 } = {}) {
    const listeners = /* @__PURE__ */ new Set();
    const items = /* @__PURE__ */ new Map();
    function apply(event) {
      const id = String(event?.id || "").trim();
      if (!id) return getState();
      if (event?.remove) {
        const previous2 = items.get(id) || null;
        if (!items.delete(id)) return getState();
        publish({ type: "removed", id, previous: previous2, event: { id, remove: true } });
        return getState();
      }
      if (!VALID_STATES.has(event?.state)) return getState();
      const previous = items.get(id) || null;
      const next = normalizeActivity(event, previous, now());
      if (sameActivity(previous, next)) return getState();
      items.set(id, next);
      prune(maxItems);
      publish({ type: previous ? "updated" : "added", activity: next, previous, event: next });
      return getState();
    }
    function dismiss(id) {
      return apply({ id, remove: true });
    }
    function getState() {
      const activities = [...items.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      return Object.freeze({
        activities: Object.freeze(activities),
        visible: selectVisible(activities)
      });
    }
    function getVisible() {
      return getState().visible;
    }
    function subscribe(listener) {
      if (typeof listener !== "function") return () => {
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
    function publish(change) {
      const state = getState();
      for (const listener of [...listeners]) {
        try {
          listener({ ...change, state });
        } catch (error) {
          console.warn("[RI] activity listener failed", error);
        }
      }
    }
    function prune(limit) {
      const cap = Math.max(4, Number(limit) || 24);
      if (items.size <= cap) return;
      const settled = [...items.values()].filter((item) => item.state !== "running").sort((a, b) => a.updatedAt - b.updatedAt);
      for (const item of settled) {
        if (items.size <= cap) break;
        items.delete(item.id);
      }
    }
    return { apply, dismiss, getState, getVisible, subscribe };
  }
  function normalizeActivity(event, previous, timestamp) {
    const state = event.state;
    const progress = normalizeProgress(event.progress ?? previous?.progress);
    const updatedAt = Number.isFinite(timestamp) ? Number(timestamp) : Date.now();
    const startedAt = Number.isFinite(previous?.startedAt) ? previous.startedAt : Number.isFinite(event.startedAt) ? Number(event.startedAt) : updatedAt;
    return Object.freeze({
      id: String(event.id),
      kind: String(event.kind || previous?.kind || "activity"),
      state,
      label: String(event.label ?? previous?.label ?? ""),
      progress,
      message: String(event.message ?? previous?.message ?? ""),
      code: event.code == null ? previous?.code ?? null : String(event.code),
      persistent: Boolean(event.persistent),
      silent: Boolean(event.silent),
      action: event.action == null ? null : String(event.action),
      actionLabel: event.actionLabel == null ? null : String(event.actionLabel),
      startedAt,
      updatedAt
    });
  }
  function normalizeProgress(progress) {
    const current = Number(progress?.current);
    const total = Number(progress?.total);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
    return Object.freeze({
      current: Math.max(0, Math.min(total, Math.trunc(current))),
      total: Math.max(1, Math.trunc(total))
    });
  }
  function selectVisible(activities) {
    return activities.find((item) => item.state === "error" && item.persistent) || activities.find((item) => item.state === "running") || null;
  }
  function sameActivity(previous, next) {
    if (!previous) return false;
    return previous.id === next.id && previous.kind === next.kind && previous.state === next.state && previous.label === next.label && previous.message === next.message && previous.code === next.code && previous.persistent === next.persistent && previous.silent === next.silent && previous.action === next.action && previous.actionLabel === next.actionLabel && sameProgress(previous.progress, next.progress);
  }
  function sameProgress(a, b) {
    if (!a || !b) return a === b;
    return a.current === b.current && a.total === b.total;
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
      startRouteTracking({ env = globalThis, resolveIdentity, resolveActivityIdentity, onActivity } = {}) {
        stopRouteTracking2?.();
        if (destroyed) return () => {
        };
        const doc = env.document;
        let stopped = false;
        let queued = false;
        let lastHref = "";
        let pendingReason = "init";
        const sync = () => {
          queued = false;
          if (stopped || destroyed) return;
          const reason = pendingReason;
          pendingReason = "";
          const href = String(env.location?.href || "");
          const hrefChanged = href !== lastHref;
          if (hrefChanged) {
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
            return;
          }
          if (reason && typeof resolveActivityIdentity === "function") {
            try {
              const nextIdentity = resolveActivityIdentity(href, reason);
              if (nextIdentity !== void 0) app2.setCurrentIdentity(nextIdentity || null);
            } catch (error) {
              console.warn("[RI] activity identity sync failed", error);
            }
          }
        };
        const schedule = (reason = "activity") => {
          if (stopped || destroyed) return;
          pendingReason = reason;
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

  // src/data/identity.js
  var MEDIA_TYPES = /* @__PURE__ */ new Set(["REEL", "VIDEO", "PHOTO", "CAROUSEL"]);
  function shortcodeFromUrl(url) {
    const match = String(url || "").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
  }
  function mediaTypeFromUrl(url) {
    const value = String(url || "");
    if (/\/(?:reel|reels)\//.test(value)) return "REEL";
    return "";
  }
  function mediaUrlKey(url) {
    const text = String(url || "");
    if (!text || /^blob:/i.test(text)) return "";
    try {
      const parsed = new URL(text.replace(/\\u0026/g, "&").replace(/\\\//g, "/"), "https://www.instagram.com/");
      return [parsed.hostname, parsed.pathname].join("");
    } catch {
      return "";
    }
  }
  function canonicalizeInstagramUrl(url, baseUrl = "https://www.instagram.com/") {
    if (!url) return "";
    try {
      const parsed = new URL(String(url), baseUrl);
      parsed.search = "";
      parsed.hash = "";
      return parsed.href;
    } catch {
      return String(url).split("?")[0].split("#")[0];
    }
  }
  function normalizeIdentity(input = {}, fallbackUrl = "") {
    const sourceUrl = input.canonicalUrl || input.pageUrl || fallbackUrl || "";
    const shortcode = cleanShortcode(input.shortcode) || shortcodeFromUrl(sourceUrl);
    if (!shortcode) return null;
    const mediaId = cleanScalar(input.mediaId);
    const ownerId = cleanScalar(input.ownerId);
    const username2 = cleanUsername(input.username || input.owner);
    const mediaType = normalizeMediaType(input.mediaType) || mediaTypeFromUrl(sourceUrl);
    const canonicalUrl = canonicalizeInstagramUrl(sourceUrl);
    const productType = cleanScalar(input.productType);
    const parentMediaId = cleanScalar(input.parentMediaId);
    const childMediaId = cleanScalar(input.childMediaId);
    const slideIndex = Number.isInteger(Number(input.slideIndex)) && Number(input.slideIndex) >= 0 ? Number(input.slideIndex) : null;
    return {
      shortcode,
      mediaId,
      ownerId,
      username: username2,
      mediaType,
      productType,
      canonicalUrl,
      parentMediaId,
      childMediaId,
      slideIndex,
      state: identityState({ shortcode, mediaId, username: username2, mediaType })
    };
  }
  function identityKey2(identity) {
    if (!identity?.shortcode) return "";
    return [
      identity.shortcode,
      identity.mediaId || "",
      identity.parentMediaId || "",
      identity.childMediaId || "",
      identity.slideIndex ?? ""
    ].join("|");
  }
  function identityState(identity) {
    if (identity.mediaId || identity.username && identity.mediaType) return "IDENTIFIED";
    if (identity.username || identity.mediaType) return "IDENTIFYING";
    return "DETECTED";
  }
  function normalizeMediaType(value) {
    const type = String(value || "").toUpperCase();
    return MEDIA_TYPES.has(type) ? type : "";
  }
  function cleanShortcode(value) {
    const code = String(value || "").replace(/[^A-Za-z0-9_-]/g, "");
    return code;
  }
  function cleanUsername(value) {
    return String(value || "").trim().replace(/^@/, "");
  }
  function cleanScalar(value) {
    return value == null ? "" : String(value).trim();
  }

  // src/data/extractor.js
  var VIEW_KEYS = [
    "play_count",
    "ig_play_count",
    "video_play_count",
    "video_view_count",
    "view_count",
    "clips_play_count",
    "reel_view_count",
    "media_view_count",
    "views",
    "plays"
  ];
  var LIKE_KEYS = ["like_count", "likes_count", "likes", "likeCount"];
  var COMMENT_KEYS = ["comment_count", "comments_count", "comments", "commentCount"];
  var REPOST_KEYS = ["repost_count", "reshare_count", "reposts_count", "reposts", "repostCount"];
  function extractInstagramMedia(input, { pageUrl = "" } = {}) {
    const media = unwrapMedia(input);
    if (!media) return null;
    const shortcode = cleanShortcode2(media.code || media.shortcode || media.short_code);
    if (!shortcode) return null;
    const user = media.user || media.owner || media.owner_user || {};
    const mediaType = detectMediaType(media);
    const evidence = collectMediaEvidence(media, shortcode);
    const coverUrl = bestImageFromMedia(media) || evidence.imageUrls[0] || "";
    const videoUrl = bestVideoUrl(media, evidence.videoUrls);
    const canonicalUrl = media.permalink || media.canonical_url || pageUrl || "";
    const patch = compact({
      mediaId: scalar(media.pk || media.id || media.media_id),
      ownerId: scalar(user.pk || user.id || media.user_id || media.owner_id),
      owner: username(user.username || media.owner_username),
      mediaType,
      productType: scalar(media.product_type || media.productType),
      canonicalUrl,
      pageUrl,
      views: metricFromMediaTree(media, VIEW_KEYS, shortcode),
      likes: metricFromMediaTree(media, LIKE_KEYS, shortcode),
      comments: metricFromMediaTree(media, COMMENT_KEYS, shortcode),
      reposts: metricFromMediaTree(media, REPOST_KEYS, shortcode),
      date: extractDate(media, shortcode),
      videoUrl,
      coverUrl,
      thumbUrl: coverUrl,
      carouselImages: carouselImagesFromMedia(media)
    });
    const identity = normalizeIdentity({
      shortcode,
      mediaId: patch.mediaId,
      ownerId: patch.ownerId,
      username: patch.owner,
      mediaType: patch.mediaType,
      productType: patch.productType,
      canonicalUrl: patch.canonicalUrl
    }, pageUrl);
    return {
      shortcode: identity?.shortcode || shortcode,
      identity,
      patch,
      evidence
    };
  }
  function detectMediaType(media) {
    const mt = Number(media?.media_type ?? media?.mediaType);
    const productType = String(media?.product_type || media?.productType || "").toLowerCase();
    if (/reel|clips/.test(productType)) return "REEL";
    if (mt === 8 || carouselSlides(media).length) return "CAROUSEL";
    if (mt === 2 || media?.video_versions || media?.video_url || media?.video_src) return "VIDEO";
    if (mt === 1) return "PHOTO";
    return "";
  }
  function bestImageFromMedia(media) {
    if (!media || typeof media !== "object") return "";
    const candidates = [
      ...Array.isArray(media.image_versions2?.candidates) ? media.image_versions2.candidates : [],
      ...Array.isArray(media.display_resources) ? media.display_resources : []
    ];
    let best = "";
    let bestScore = -1;
    for (const candidate of candidates) {
      const url = candidate?.url || candidate?.src || "";
      const width = Number(candidate?.width || candidate?.config_width || 0);
      const height = Number(candidate?.height || candidate?.config_height || 0);
      const score = width * height;
      if (url && (score > bestScore || !best)) {
        best = url;
        bestScore = score;
      }
    }
    return best || media.display_url || media.thumbnail_src || media.thumbnail_url || media.image_url || "";
  }
  function carouselImagesFromMedia(media) {
    const out = [];
    for (const slide of carouselSlides(media)) {
      const url = bestImageFromMedia(slide) || collectMediaEvidence(slide, "").imageUrls[0] || "";
      if (url) out.push(url);
    }
    return out;
  }
  function collectMediaEvidence(media, shortcode = "") {
    const videoUrls = [];
    const imageUrls = [];
    const seenVideo = /* @__PURE__ */ new Set();
    const seenImage = /* @__PURE__ */ new Set();
    const stack = [{ value: media, depth: 0 }];
    while (stack.length) {
      const current = stack.pop();
      if (!current?.value || typeof current.value !== "object" || current.depth > 3) continue;
      for (const [key, value] of Object.entries(current.value).slice(0, 130)) {
        if (typeof value === "string" && /^https?:/i.test(value)) {
          const videoLike = /^(video_url|video_src|playback_url)$/i.test(key) || /\.mp4(?:\?|$)/i.test(value);
          const imageLike = /image|thumbnail|display|poster|image_url|src/i.test(key) && !/\.mp4/i.test(value);
          if (videoLike) addUnique(videoUrls, seenVideo, value);
          else if (imageLike) addUnique(imageUrls, seenImage, value);
          continue;
        }
        if (!value || typeof value !== "object") continue;
        const childCode = cleanShortcode2(value.code || value.shortcode || value.short_code);
        if (shortcode && childCode && childCode !== shortcode) continue;
        stack.push({ value, depth: current.depth + 1 });
      }
    }
    return { videoUrls, imageUrls };
  }
  function bestVideoUrl(media, evidenceUrls = []) {
    const versions = Array.isArray(media?.video_versions) ? media.video_versions : [];
    let best = "";
    let bestScore = -1;
    for (const version of versions) {
      const url = version?.url || "";
      const score = Number(version?.width || 0) * Number(version?.height || 0);
      if (url && (score > bestScore || !best)) {
        best = url;
        bestScore = score;
      }
    }
    return best || media?.video_url || media?.video_src || evidenceUrls[0] || "";
  }
  function metricFromMediaTree(media, keys, shortcode) {
    const stack = [{ value: media, depth: 0 }];
    while (stack.length) {
      const current = stack.shift();
      const value = current?.value;
      if (!value || typeof value !== "object" || current.depth > 2) continue;
      const direct = firstMetric(value, keys);
      if (direct !== void 0) return direct;
      for (const child of Object.values(value).slice(0, 80)) {
        if (!child || typeof child !== "object" || Array.isArray(child)) continue;
        const childCode = cleanShortcode2(child.code || child.shortcode || child.short_code);
        if (childCode && childCode !== shortcode) continue;
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
    return void 0;
  }
  function firstMetric(media, keys) {
    for (const key of keys) {
      if (media?.[key] == null || media?.[key] === "") continue;
      const value = Number(media[key]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return void 0;
  }
  function extractDate(media, shortcode) {
    if (typeof media?.date === "string" && media.date) return media.date;
    const takenAt = metricFromMediaTree(media, ["taken_at", "taken_at_timestamp", "takenAt"], shortcode);
    if (!Number.isFinite(takenAt) || takenAt <= 0) return void 0;
    try {
      return new Date(takenAt * 1e3).toISOString().slice(0, 10);
    } catch {
      return void 0;
    }
  }
  function carouselSlides(media) {
    if (Array.isArray(media?.carousel_media)) return media.carousel_media;
    if (Array.isArray(media?.carouselMedia)) return media.carouselMedia;
    const edges = media?.edge_sidecar_to_children?.edges;
    return Array.isArray(edges) ? edges.map((edge) => edge?.node || edge).filter(Boolean) : [];
  }
  function unwrapMedia(input) {
    if (!input || typeof input !== "object") return null;
    return input.media || input.item || input.node || input;
  }
  function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => {
      if (item === void 0 || item === null || item === "") return false;
      return !Array.isArray(item) || item.length > 0;
    }));
  }
  function addUnique(out, seen, value) {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  }
  function cleanShortcode2(value) {
    return String(value || "").replace(/[^A-Za-z0-9_-]/g, "");
  }
  function username(value) {
    return String(value || "").trim().replace(/^@/, "").toLowerCase();
  }
  function scalar(value) {
    return value == null ? "" : String(value).trim();
  }

  // src/data/permalink-extractor.js
  var VIEW_KEYS2 = [
    "play_count",
    "ig_play_count",
    "video_play_count",
    "video_view_count",
    "view_count",
    "clips_play_count",
    "reel_view_count",
    "media_view_count",
    "views",
    "plays"
  ];
  var LIKE_KEYS2 = ["like_count", "likes_count"];
  var COMMENT_KEYS2 = ["comment_count", "comments_count"];
  var REPOST_KEYS2 = ["reshare_count", "repost_count", "reposts_count"];
  var DATE_KEYS = ["taken_at", "taken_at_timestamp"];
  function extractPermalinkHtml(html, { pageUrl = "", fetched } = {}) {
    const source = String(html || "");
    const shortcode = shortcodeFromUrl(pageUrl);
    if (!shortcode) return null;
    const meta = extractMeta(source);
    const description = meta.description || meta["og:description"] || "";
    const videoUrl = meta["og:video:secure_url"] || meta["og:video"] || "";
    const coverUrl = meta["og:image"] || "";
    const reel = /\/(?:reel|reels)\//i.test(pageUrl);
    const takenAt = nearMetric(source, shortcode, DATE_KEYS);
    const patch = compact2({
      pageUrl,
      canonicalUrl: pageUrl,
      mediaType: reel ? "REEL" : videoUrl ? "VIDEO" : void 0,
      views: reel || videoUrl ? nearMetric(source, shortcode, VIEW_KEYS2) : void 0,
      likes: descriptionMetric(description, "likes") ?? nearMetric(source, shortcode, LIKE_KEYS2),
      comments: descriptionMetric(description, "comments") ?? nearMetric(source, shortcode, COMMENT_KEYS2),
      reposts: nearMetric(source, shortcode, REPOST_KEYS2),
      date: unixDate(takenAt),
      videoUrl,
      coverUrl,
      thumbUrl: coverUrl,
      fetched: Number.isFinite(Number(fetched)) ? Number(fetched) : void 0
    });
    return { shortcode, patch };
  }
  function nearMetric(html, shortcode, keys) {
    const source = String(html || "");
    const code = String(shortcode || "");
    const position = source.indexOf(code);
    if (!code || position < 0) return void 0;
    const area = source.slice(Math.max(0, position - 18e3), Math.min(source.length, position + 3e4));
    for (const key of keys || []) {
      const match = area.match(new RegExp('["\\\\]?' + escapeRegExp(key) + '["\\\\]?\\s*:\\s*["\\\\]?([0-9]+)', "i"));
      if (match) return Number(match[1]);
    }
    return void 0;
  }
  function extractMeta(html) {
    const output = {};
    const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
    for (const tag of tags) {
      const attrs = extractAttributes(tag);
      const key = String(attrs.property || attrs.name || "").toLowerCase();
      if (!key || output[key]) continue;
      output[key] = decodeAttribute(attrs.content || "");
    }
    return output;
  }
  function extractAttributes(tag) {
    const output = {};
    const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match;
    while (match = pattern.exec(tag)) {
      output[String(match[1] || "").toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    return output;
  }
  function descriptionMetric(description, label) {
    const match = String(description || "").match(new RegExp("([\\d.,]+\\s*[KkMmBb]?)\\s+" + label + "?", "i"));
    return match ? parseCount(match[1]) : void 0;
  }
  function parseCount(text) {
    const source = String(text || "").replace(/[\s,]/g, "");
    const match = source.match(/^([0-9]+(?:\.[0-9]+)?)([KMBkmb])?$/);
    if (!match) return void 0;
    let value = Number(match[1]);
    if (!Number.isFinite(value) || value < 0) return void 0;
    const unit = match[2] || "";
    if (/k/i.test(unit)) value *= 1e3;
    else if (/m/i.test(unit)) value *= 1e6;
    else if (/b/i.test(unit)) value *= 1e9;
    return Math.round(value);
  }
  function unixDate(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return void 0;
    try {
      return new Date(timestamp * 1e3).toISOString().slice(0, 10);
    } catch {
      return void 0;
    }
  }
  function decodeAttribute(value) {
    return String(value || "").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  }
  function compact2(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== void 0 && item !== null && item !== ""));
  }
  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // src/data/media-model.js
  function buildMediaList(post = {}) {
    const type = String(post.mediaType || "").toUpperCase();
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const add = (kind, url, extra = {}) => {
      const value = cleanUrl(url);
      const key = mediaUrlKey(value) || value;
      const identity = kind === "carousel-slide" ? `${kind}|${extra.slideIndex}` : `${kind}|${key}`;
      if (!value || seen.has(identity)) return;
      seen.add(identity);
      out.push(Object.freeze({ kind, url: value, ...extra }));
    };
    if (type === "REEL" || type === "VIDEO") {
      add("video", post.videoUrl);
      add("cover", post.coverUrl || post.thumbUrl);
    } else if (type === "PHOTO") {
      add("photo", post.coverUrl || post.thumbUrl);
    } else if (type === "CAROUSEL") {
      const images = Array.isArray(post.carouselImages) ? post.carouselImages : [];
      images.forEach((url, index) => add("carousel-slide", url, { slideIndex: index }));
    }
    return Object.freeze(out);
  }
  function cleanUrl(url) {
    const value = String(url || "").trim();
    return /^https?:/i.test(value) ? value : "";
  }

  // src/store/verified-store.js
  var SOURCE_RANK = Object.freeze({ legacy: 1, permalink: 2, dom: 3, embedded: 4, network: 5 });
  var METRIC_FIELDS = /* @__PURE__ */ new Set(["views", "likes", "comments", "reposts"]);
  var REPLACEABLE_FIELDS = /* @__PURE__ */ new Set(["videoUrl", "coverUrl", "thumbUrl", "carouselImages"]);
  var FIELDS = [
    "views",
    "likes",
    "comments",
    "reposts",
    "date",
    "owner",
    "videoUrl",
    "coverUrl",
    "thumbUrl",
    "carouselImages",
    "mediaId",
    "ownerId",
    "mediaType",
    "productType",
    "canonicalUrl"
  ];
  function createVerifiedStore({ initialItems = {}, now = () => Date.now(), onChange } = {}) {
    let items = clone(initialItems) || {};
    function getItem(shortcode) {
      const item = items[shortcode];
      return item ? clone(item) : null;
    }
    function getPost(shortcode) {
      if (!shortcode) return null;
      const item = items[shortcode];
      if (!item) return { shortcode, media: [] };
      const read = (key) => fieldValue(item, key);
      const post = { shortcode };
      post.mediaId = read("mediaId") || "";
      post.ownerId = read("ownerId") || "";
      post.username = read("owner") || "";
      post.mediaType = String(read("mediaType") || "").toUpperCase();
      post.productType = read("productType") || "";
      post.canonicalUrl = read("canonicalUrl") || item.pageUrl || "";
      post.views = optional(read("views"));
      post.likes = optional(read("likes"));
      post.comments = optional(read("comments"));
      post.reposts = optional(read("reposts"));
      post.date = read("date") || "";
      post.videoUrl = read("videoUrl") || "";
      post.coverUrl = read("coverUrl") || "";
      post.thumbUrl = read("thumbUrl") || "";
      const carouselImages = read("carouselImages");
      post.carouselImages = Array.isArray(carouselImages) ? [...carouselImages] : [];
      post.media = buildMediaList(post);
      return post;
    }
    function getIdentity(shortcode) {
      const post = getPost(shortcode);
      if (!post?.shortcode) return null;
      return normalizeIdentity(post, post.canonicalUrl);
    }
    function upsert(shortcode, patch = {}, { source = "dom", confidence } = {}) {
      const code = cleanShortcode3(shortcode);
      if (!code) return { item: null, changed: false };
      const item = items[code] || { code, fields: {}, conflicts: {} };
      let changed = false;
      const nextPatch = { ...patch };
      if (!nextPatch.mediaType && /\/(?:reel|reels)\//.test(String(nextPatch.pageUrl || nextPatch.canonicalUrl || ""))) {
        nextPatch.mediaType = "REEL";
      }
      for (const key of FIELDS) {
        if (!hasValue(nextPatch[key])) continue;
        if (setField(item, key, nextPatch[key], source, confidence)) changed = true;
      }
      if (nextPatch.pageUrl) item.pageUrl = nextPatch.pageUrl;
      if (nextPatch.fetched) item.fetched = nextPatch.fetched;
      item.seen = now();
      item.identity = buildIdentity(code, item);
      items[code] = item;
      if (changed && typeof onChange === "function") {
        onChange({ shortcode: code, item: clone(item) });
      }
      return { item: clone(item), changed };
    }
    function replaceSnapshot(nextItems = {}) {
      items = clone(nextItems) || {};
      return snapshot();
    }
    function snapshot() {
      return clone(items);
    }
    function setField(item, key, value, source, confidence) {
      item.fields || (item.fields = {});
      const old = item.fields[key] || null;
      const newRank = sourceRank(source);
      const oldRank = old ? sourceRank(old.source) : -1;
      if (old && isVerified(old) && !sameValue(old.value, value)) {
        if (newRank < oldRank) return false;
        if (METRIC_FIELDS.has(key) && metricConflict(old, value, now())) {
          return markConflict(item, key, old, value, source, now());
        }
        const videoToReel = key === "mediaType" && old.value === "VIDEO" && value === "REEL";
        if (!METRIC_FIELDS.has(key) && !REPLACEABLE_FIELDS.has(key) && !videoToReel && newRank <= oldRank) {
          return markConflict(item, key, old, value, source, now());
        }
      }
      if (old && sameValue(old.value, value) && newRank <= oldRank && old.status === "verified") return false;
      item.fields[key] = {
        value: clone(value),
        source: source || "dom",
        confidence: confidence || (newRank >= 4 ? "high" : "medium"),
        status: "verified",
        updatedAt: now()
      };
      item[key] = clone(value);
      if (item.conflicts) delete item.conflicts[key];
      return true;
    }
    return { getItem, getPost, getIdentity, upsert, replaceSnapshot, snapshot };
  }
  function sourceRank(source) {
    return SOURCE_RANK[source] || 0;
  }
  function fieldValue(item, key) {
    const field = item?.fields?.[key];
    if (field && isVerified(field)) return field.value;
    return item?.[key] ?? null;
  }
  function buildIdentity(code, item) {
    return normalizeIdentity({
      shortcode: code,
      mediaId: fieldValue(item, "mediaId"),
      ownerId: fieldValue(item, "ownerId"),
      username: fieldValue(item, "owner"),
      mediaType: fieldValue(item, "mediaType"),
      productType: fieldValue(item, "productType"),
      canonicalUrl: fieldValue(item, "canonicalUrl") || item.pageUrl || ""
    });
  }
  function markConflict(item, key, oldField, incoming, source, timestamp) {
    item.conflicts || (item.conflicts = {});
    item.conflicts[key] = {
      previous: clone(oldField.value),
      incoming: clone(incoming),
      source,
      at: timestamp
    };
    item.fields[key] = {
      value: clone(oldField.value),
      source: oldField.source,
      confidence: oldField.confidence,
      status: "conflict",
      updatedAt: timestamp
    };
    item[key] = clone(oldField.value);
    return true;
  }
  function metricConflict(oldField, incoming, timestamp) {
    const previous = Number(oldField.value);
    const next = Number(incoming);
    const age = timestamp - Number(oldField.updatedAt || 0);
    if (!(previous > 0) || !Number.isFinite(next)) return false;
    if (next < previous && previous - next > Math.max(5, previous * 0.02)) return true;
    return age < 12e4 && previous > 100 && next > previous * 20;
  }
  function sameValue(left, right) {
    if (Array.isArray(left) || Array.isArray(right)) return JSON.stringify(left) === JSON.stringify(right);
    return String(left) === String(right);
  }
  function isVerified(field) {
    return field?.status === "verified" || field?.status === "conflict";
  }
  function optional(value) {
    return value == null || value === "" ? void 0 : value;
  }
  function hasValue(value) {
    return value !== void 0 && value !== null && value !== "";
  }
  function cleanShortcode3(value) {
    return String(value || "").replace(/[^A-Za-z0-9_-]/g, "");
  }
  function clone(value) {
    if (value === void 0) return void 0;
    return JSON.parse(JSON.stringify(value));
  }

  // src/data/engine.js
  function createDataEngine({ legacyAdapter, history: history3, persistence, now = () => Date.now(), onChange } = {}) {
    const initialItems = persistence?.load?.() || legacyAdapter?.getItemsSnapshot?.() || {};
    const verified = createVerifiedStore({ initialItems, now });
    function syncLegacy() {
      const snapshot = legacyAdapter?.getItemsSnapshot?.();
      if (!snapshot) return verified.snapshot();
      return verified.replaceSnapshot(snapshot);
    }
    function getIdentityFromUrl(url = "") {
      const shortcode = shortcodeFromUrl(url);
      if (!shortcode) return null;
      const post = verified.getPost(shortcode) || { shortcode };
      return normalizeIdentity({ ...post, shortcode }, url);
    }
    function findPostByMediaUrls(urls) {
      const targets = new Set((Array.isArray(urls) ? urls : [urls]).map(mediaUrlKey).filter(Boolean));
      if (!targets.size) return null;
      let best = null;
      let bestScore = 0;
      const snapshot = verified.snapshot();
      for (const shortcode of Object.keys(snapshot)) {
        const post = verified.getPost(shortcode);
        if (!post) continue;
        const candidates = [
          [post.videoUrl, 4],
          [post.coverUrl, 3],
          [post.thumbUrl, 2],
          ...(post.carouselImages || []).map((url) => [url, 1])
        ];
        let score = 0;
        for (const [url, weight] of candidates) {
          const key = mediaUrlKey(url);
          if (key && targets.has(key)) score = Math.max(score, weight);
        }
        if (score <= bestScore) continue;
        bestScore = score;
        best = post;
        if (score === 4) break;
      }
      return best;
    }
    function applyPatch(shortcode, patch = {}, { source = "dom", confidence } = {}) {
      const result2 = verified.upsert(shortcode, patch, { source, confidence });
      if (!result2.item) return null;
      const post = verified.getPost(shortcode);
      const identity = verified.getIdentity(shortcode);
      if (result2.changed) {
        history3?.record?.(post);
        persistence?.schedule?.(verified.snapshot());
        if (typeof onChange === "function") onChange({ shortcode, identity, post, item: result2.item });
      }
      return { identity, post, item: result2.item, changed: result2.changed };
    }
    function ingestPatch(shortcode, patch = {}, options = {}) {
      return applyPatch(shortcode, patch, options);
    }
    function ingest(input, { pageUrl = "", source = "network", confidence } = {}) {
      const extracted = extractInstagramMedia(input, { pageUrl });
      if (!extracted?.shortcode) return null;
      const result2 = applyPatch(extracted.shortcode, extracted.patch, { source, confidence });
      return result2 ? { ...result2, evidence: extracted.evidence } : null;
    }
    function ingestPermalink(html, { pageUrl = "", source = "permalink", confidence = "medium", fetched = now() } = {}) {
      const extracted = extractPermalinkHtml(html, { pageUrl, fetched });
      if (!extracted?.shortcode) return null;
      return applyPatch(extracted.shortcode, extracted.patch, { source, confidence });
    }
    function flush() {
      return persistence?.flush?.(verified.snapshot()) ?? false;
    }
    function destroy() {
      flush();
      persistence?.destroy?.();
    }
    return {
      getPost: verified.getPost,
      getIdentity: verified.getIdentity,
      getIdentityFromUrl,
      findPostByMediaUrls,
      getItem: verified.getItem,
      getSnapshots: history3?.getSnapshots,
      getAccountPosts: history3?.getAccountPosts,
      syncLegacy,
      ingest,
      ingestPermalink,
      ingestPatch,
      flush,
      destroy,
      snapshot: verified.snapshot
    };
  }

  // src/store/settings-store.js
  var STORAGE_KEY = "ri32:settings:v2";
  var LEGACY_STORAGE_KEY = "ri32:settings:v1";
  var DB_NAME = "ri32";
  var DB_VERSION = 1;
  var HANDLE_STORE = "handles";
  var LEGACY_DIRECTORY_KEY = "download-directory";
  var POLICY_KEYS = ["video", "image", "carousel"];
  var MODES = /* @__PURE__ */ new Set(["default", "directory", "prompt"]);
  function createSettingsStore({ env = globalThis, capabilities: capabilities2, onChange } = {}) {
    const listeners = /* @__PURE__ */ new Set();
    let state = {
      downloadPolicies: createPolicies(capabilities2),
      schemaVersion: 2
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
      if (capabilities2?.indexedDB) {
        try {
          await restoreDirectoryHandles(env.indexedDB, { migrateLegacy: !!legacy });
        } catch (error) {
          console.warn("[RI] directory handle restore failed", error);
        }
      }
      for (const key of POLICY_KEYS) normalizeDirectoryState(state.downloadPolicies[key], capabilities2);
      persistScalarState();
      notify();
      return getState();
    }
    function setDownloadMode(profileKey, mode) {
      if (mode === void 0 && MODES.has(profileKey)) {
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
      if (!capabilities2?.directoryPicker || typeof env.showDirectoryPicker !== "function") {
        return { ok: false, code: "unsupported", message: "폴더 선택을 지원하지 않는 환경입니다." };
      }
      try {
        const handle = await env.showDirectoryPicker({ mode: "readwrite" });
        const permission = await requestHandlePermission(handle);
        if (permission !== "granted") {
          policy.directoryPermission = permission;
          notify();
          return { ok: false, code: "permission-denied", message: "저장 폴더 쓰기 권한이 필요합니다." };
        }
        for (const key of targetKeys) {
          const target = getPolicy(key);
          target.directoryHandle = handle;
          target.directoryName = handle.name || null;
          target.directoryPermission = permission;
          target.downloadMode = "directory";
        }
        persistScalarState();
        if (capabilities2?.indexedDB) {
          try {
            for (const key of targetKeys) await writeHandle(env.indexedDB, handleKey(key), handle);
          } catch (error) {
            console.warn("[RI] directory handle persistence failed", error);
          }
        }
        notify();
        return { ok: true, code: "selected", folderName: policy.directoryName, profileKey: profileKey || "all" };
      } catch (error) {
        if (error?.name === "AbortError") return { ok: false, code: "cancelled", message: "폴더 선택을 취소했습니다." };
        return { ok: false, code: "picker-failed", message: "폴더를 선택하지 못했습니다.", error };
      }
    }
    async function clearDirectory(profileKey) {
      const policy = getPolicy(profileKey);
      policy.directoryHandle = null;
      policy.directoryName = null;
      policy.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
      if (policy.downloadMode === "directory") policy.downloadMode = "default";
      persistScalarState();
      if (capabilities2?.indexedDB) {
        try {
          await deleteHandle(env.indexedDB, handleKey(profileKey));
        } catch (error) {
          console.warn("[RI] directory handle delete failed", error);
        }
      }
      notify();
      return getState();
    }
    async function refreshDirectoryPermission(profileKey, { request = false } = {}) {
      const policy = getPolicy(profileKey);
      if (!policy.directoryHandle) {
        policy.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
        notify();
        return policy.directoryPermission;
      }
      policy.directoryPermission = request ? await requestHandlePermission(policy.directoryHandle) : await queryHandlePermission(policy.directoryHandle);
      notify();
      return policy.directoryPermission;
    }
    function subscribe(listener) {
      if (typeof listener !== "function") return () => {
      };
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
        try {
          env.localStorage?.removeItem?.(LEGACY_STORAGE_KEY);
        } catch {
        }
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
  function createPolicies(capabilities2) {
    return Object.fromEntries(POLICY_KEYS.map((key) => [key, {
      downloadMode: "default",
      directoryName: null,
      directoryHandle: null,
      directoryPermission: capabilities2?.directoryPicker ? "prompt" : "unavailable"
    }]));
  }
  function applyScalarPolicy(policy, persisted) {
    if (MODES.has(persisted?.downloadMode)) policy.downloadMode = persisted.downloadMode;
    if (typeof persisted?.directoryName === "string") policy.directoryName = persisted.directoryName || null;
  }
  function normalizeDirectoryState(policy, capabilities2) {
    if (policy.downloadMode === "directory" && !policy.directoryHandle) {
      policy.directoryPermission = capabilities2?.directoryPicker ? "prompt" : "unavailable";
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
  function readHandle(indexedDB, key) {
    return withHandleStore(indexedDB, "readonly", (store) => store.get(key));
  }
  function writeHandle(indexedDB, key, handle) {
    return withHandleStore(indexedDB, "readwrite", (store) => store.put(handle, key));
  }
  function deleteHandle(indexedDB, key) {
    return withHandleStore(indexedDB, "readwrite", (store) => store.delete(key));
  }

  // src/store/history-store.js
  var SNAP_KEY = "ri311:snap:v1";
  var POST_KEY = "ri311:posts:v1";
  var HISTORY_STORAGE_KEYS = Object.freeze({ snapshots: SNAP_KEY, posts: POST_KEY });
  var SNAPSHOT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1e3;
  var SNAPSHOT_MIN_GAP_MS = 30 * 60 * 1e3;
  var SNAPSHOT_LIMIT = 80;
  var ACCOUNT_POST_LIMIT = 500;
  function createHistoryStore({ env = globalThis, now = () => Date.now() } = {}) {
    function getSnapshots(shortcode) {
      const list = readStore(env.localStorage, SNAP_KEY)[String(shortcode || "")];
      if (!Array.isArray(list)) return [];
      return list.map(normalizeSnapshot).filter(Boolean);
    }
    function getAccountPosts(username2) {
      const owner = String(username2 || "").toLowerCase();
      if (!owner) return [];
      return Object.values(readStore(env.localStorage, POST_KEY)).map(normalizeAccountPost).filter((entry) => entry && entry.owner === owner);
    }
    function record(post) {
      if (!post?.shortcode) return false;
      const snapshotChanged = recordSnapshot(post.shortcode, post.views);
      const accountChanged = recordAccountPost(post);
      return snapshotChanged || accountChanged;
    }
    function recordSnapshot(shortcode, views) {
      const code = cleanCode(shortcode);
      const value = positiveNumber(views);
      if (!code || value == null) return false;
      const timestamp = safeNow(now);
      const store = readStore(env.localStorage, SNAP_KEY);
      let list = Array.isArray(store[code]) ? store[code].map(normalizeSnapshot).filter(Boolean) : [];
      const last = list.at(-1) || null;
      if (last && timestamp - last.t < SNAPSHOT_MIN_GAP_MS && last.v === value) return false;
      list.push({ t: timestamp, v: value });
      list = list.filter((entry) => timestamp - entry.t <= SNAPSHOT_MAX_AGE_MS).slice(-SNAPSHOT_LIMIT);
      store[code] = list;
      return writeStore(env.localStorage, SNAP_KEY, store);
    }
    function recordAccountPost(post) {
      const code = cleanCode(post?.shortcode);
      const owner = String(post?.username || post?.owner || "").toLowerCase();
      const views = positiveNumber(post?.views);
      if (!code || !owner || views == null) return false;
      const store = readStore(env.localStorage, POST_KEY);
      store[code] = { code, owner, views, t: safeNow(now) };
      const keys = Object.keys(store);
      if (keys.length > ACCOUNT_POST_LIMIT) {
        keys.sort((a, b) => Number(store[b]?.t || 0) - Number(store[a]?.t || 0));
        keys.slice(ACCOUNT_POST_LIMIT).forEach((key) => delete store[key]);
      }
      return writeStore(env.localStorage, POST_KEY, store);
    }
    return { getSnapshots, getAccountPosts, record, recordSnapshot, recordAccountPost };
  }
  function readStore(storage, key) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function writeStore(storage, key, value) {
    try {
      storage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
  function normalizeSnapshot(entry) {
    const t = Number(entry?.t);
    const v = positiveNumber(entry?.v);
    return Number.isFinite(t) && t > 0 && v != null ? { t, v } : null;
  }
  function normalizeAccountPost(entry) {
    const code = cleanCode(entry?.code);
    const owner = String(entry?.owner || "").toLowerCase();
    const views = positiveNumber(entry?.views);
    const t = Number(entry?.t);
    return code && owner && views != null && Number.isFinite(t) && t > 0 ? { code, owner, views, t } : null;
  }
  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }
  function cleanCode(value) {
    return String(value || "").replace(/[^A-Za-z0-9_-]/g, "");
  }
  function safeNow(now) {
    const value = Number(now());
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }

  // src/store/verified-cache-store.js
  var VERIFIED_CACHE_KEY = "ri311:items:v1";
  function createVerifiedCacheStore({ env = globalThis, delayMs = 300 } = {}) {
    let timer2 = 0;
    let pending = null;
    let destroyed = false;
    function load() {
      try {
        const parsed = JSON.parse(env.localStorage?.getItem?.(VERIFIED_CACHE_KEY) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    function schedule(items) {
      if (destroyed) return false;
      pending = clone2(items) || {};
      const delay = Math.max(0, Number(delayMs) || 0);
      if (!delay) return flush();
      if (timer2) return true;
      const setTimer = env.setTimeout || setTimeout;
      timer2 = setTimer(() => {
        timer2 = 0;
        flush();
      }, delay);
      return true;
    }
    function flush(items) {
      if (items !== void 0) pending = clone2(items) || {};
      if (pending == null) return false;
      const next = pending;
      pending = null;
      try {
        env.localStorage?.setItem?.(VERIFIED_CACHE_KEY, JSON.stringify(next));
        return true;
      } catch {
        pending = next;
        return false;
      }
    }
    function destroy() {
      if (destroyed) return;
      if (timer2) (env.clearTimeout || clearTimeout)(timer2);
      timer2 = 0;
      flush();
      destroyed = true;
    }
    return { load, schedule, flush, destroy };
  }
  function clone2(value) {
    if (value === void 0) return void 0;
    return JSON.parse(JSON.stringify(value));
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
    let activitySeq = 0;
    async function download(request, destinationOverride = null) {
      const activityId = nextActivityId();
      const normalized = normalizeRequest(request);
      const label = downloadLabel(normalized.ok ? normalized.request.kind : request?.kind);
      emitActivity(runningActivity(activityId, label, null, "저장 준비 중…"));
      if (!normalized.ok) {
        emitResultActivity(activityId, label, normalized.result);
        return normalized.result;
      }
      const destination = destinationOverride || await resolveDestination(false, normalized.request.kind);
      if (!destination.ok) {
        emitResultActivity(activityId, label, destination.result);
        return destination.result;
      }
      emitActivity(runningActivity(activityId, label, null, "파일 저장 중…"));
      const result2 = await runJob(normalized.request, destination);
      emitResultActivity(activityId, label, result2);
      return result2;
    }
    async function downloadBatch(requests) {
      const normalizedRequests = [];
      for (const request of Array.isArray(requests) ? requests : []) {
        const normalized = normalizeRequest(request);
        if (!normalized.ok) return normalized.result;
        normalizedRequests.push(normalized.request);
      }
      if (!normalizedRequests.length) return { ok: false, code: "invalid-media", message: "다운로드할 파일이 없습니다." };
      const total = normalizedRequests.length;
      const activityId = nextActivityId("download-batch");
      const label = `캐러셀 ${total}장 저장`;
      emitActivity(runningActivity(activityId, label, { current: 0, total }, `${total}장 저장 준비 중…`));
      const destination = await resolveDestination(true, normalizedRequests[0].kind);
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
        code: failed ? "batch-partial" : "saved",
        failedCode: failed?.code || null,
        failedCount: failedResults.length,
        successCount,
        destinationMode: destination.mode,
        folderName: destination.folderName || null,
        results,
        message: failed ? `${successCount}/${results.length}개 저장, ${failedResults.length}개 실패했습니다.` : `${results.length}개 파일 저장을 요청했습니다.`
      };
      emitResultActivity(activityId, label, batchResult, { current: total, total }, failed);
      return batchResult;
    }
    async function resolveDestination(batch, kind) {
      const policy = resolveDownloadPolicy(settings2.getState(), kind);
      const mode = policy.downloadMode || "default";
      if (mode === "default") return { ok: true, mode: "default", folderName: null };
      if (mode === "directory") {
        const handle = policy.directoryHandle;
        if (!handle) {
          return failure("permission-denied", "저장 폴더를 다시 연결해야 합니다.", mode, policy.directoryName);
        }
        const permission = await requestHandlePermission(handle);
        if (permission !== "granted") {
          return failure("permission-denied", "저장 폴더 쓰기 권한이 필요합니다.", mode, policy.directoryName);
        }
        return { ok: true, mode, handle, folderName: handle.name || policy.directoryName || null };
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
      try {
        if (destination.mode === "default") return await saveBrowserDefault(request);
        if (destination.mode === "prompt-file") return await saveWithFilePicker(request);
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
    function emitActivity(activity2) {
      if (typeof onChange === "function") onChange({ activeJobs, activity: activity2 });
    }
    function emitResultActivity(activityId, label, downloadResult, progress = null, failedResult = null) {
      if (downloadResult?.code === "cancelled") {
        emitActivity({ id: activityId, kind: "download", remove: true });
        return;
      }
      if (downloadResult?.ok) {
        emitActivity({
          id: activityId,
          kind: "download",
          state: "success",
          label,
          progress,
          code: downloadResult.code || "saved",
          message: downloadResult.message || "저장을 완료했습니다."
        });
        return;
      }
      const feedback = failureFeedback(failedResult || downloadResult);
      const failedMessage = failedResult?.message && failedResult.message !== downloadResult?.message ? `${downloadResult?.message || "저장하지 못했습니다."} ${failedResult.message}` : downloadResult?.message || failedResult?.message || "저장하지 못했습니다.";
      emitActivity({
        id: activityId,
        kind: "download",
        state: "error",
        label,
        progress,
        code: downloadResult?.failedCode || downloadResult?.code || failedResult?.code || "download-failed",
        message: failedMessage,
        persistent: feedback.persistent,
        action: feedback.action,
        actionLabel: feedback.actionLabel
      });
    }
    function nextActivityId(prefix = "download") {
      activitySeq += 1;
      return `${prefix}:${activitySeq}`;
    }
    return { download, downloadBatch };
  }
  function resolveDownloadPolicy(state, kind) {
    const profileKey = profileKeyForKind(kind);
    const policy = profileKey ? state?.downloadPolicies?.[profileKey] : null;
    if (policy) return policy;
    if (state && ("downloadMode" in state || "directoryHandle" in state)) return state;
    return { downloadMode: "default", directoryHandle: null, directoryName: null };
  }
  function profileKeyForKind(kind) {
    if (kind === "video") return "video";
    if (kind === "cover" || kind === "photo") return "image";
    if (kind === "carousel-slide") return "carousel";
    return null;
  }
  function runningActivity(id, label, progress, message) {
    return { id, kind: "download", state: "running", label, progress, message };
  }
  function failureFeedback(downloadResult) {
    const code = downloadResult?.code || "";
    const mode = downloadResult?.destinationMode || "";
    const directoryWriteFailure = code === "write-failed" && (mode === "directory" || mode === "prompt-directory");
    const needsSettings = code === "permission-denied" || code === "unsupported" || code === "picker-failed" || directoryWriteFailure;
    return needsSettings ? { persistent: true, action: "open-settings", actionLabel: "설정 열기" } : { persistent: false, action: null, actionLabel: null };
  }
  function downloadLabel(kind) {
    if (kind === "video") return "영상 저장";
    if (kind === "cover") return "썸네일 저장";
    if (kind === "photo") return "이미지 저장";
    if (kind === "carousel-slide") return "캐러셀 이미지 저장";
    if (kind === "export") return "내보내기";
    return "미디어 저장";
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
  function createMetricsEngine({ history: history3, now = () => Date.now() } = {}) {
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
          snapshots: history3?.getSnapshots?.(post.shortcode) || [],
          now: now()
        });
        const accountMultiple = calculateAccountMultiple({
          shortcode: post.shortcode,
          username: post.username,
          views: post.views,
          posts: history3?.getAccountPosts?.(post.username) || []
        });
        return { engagementRate, growth24h, accountMultiple };
      }
    };
  }
  function calculateEngagementRate({ views, likes, comments, reposts, requireComplete = true } = {}) {
    const viewCount = positiveNumber2(views);
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
    const current = positiveNumber2(views);
    if (current == null || !Array.isArray(snapshots)) return void 0;
    let best = null;
    let bestDelta = Infinity;
    const targetAge = 24 * 60 * 60 * 1e3;
    for (const snapshot of snapshots) {
      const timestamp = positiveNumber2(snapshot?.t);
      const previous = positiveNumber2(snapshot?.v);
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
  function calculateAccountMultiple({ shortcode, username: username2, views, posts, maxRecent = 20, minSamples = 5 } = {}) {
    const current = positiveNumber2(views);
    const owner = String(username2 || "").toLowerCase();
    if (current == null || !owner || !Array.isArray(posts)) return void 0;
    const samples = posts.filter((entry) => entry && String(entry.code || "") !== String(shortcode || "")).filter((entry) => String(entry.owner || "").toLowerCase() === owner).map((entry) => ({ views: positiveNumber2(entry.views), t: Number(entry.t) })).filter((entry) => entry.views != null && Number.isFinite(entry.t)).sort((a, b) => b.t - a.t).slice(0, Math.max(1, Number(maxRecent) || 20));
    if (samples.length < Math.max(1, Number(minSamples) || 5)) return void 0;
    const values = samples.map((entry) => entry.views).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    return median > 0 ? current / median : void 0;
  }
  function emptySummary() {
    return { engagementRate: void 0, growth24h: void 0, accountMultiple: void 0 };
  }
  function positiveNumber2(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : void 0;
  }
  function nonNegativeNumber(value) {
    if (value == null || value === "") return void 0;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : void 0;
  }

  // src/migration/capture-handoff.js
  var LEGACY_CAPTURE_HOOK = "__RI32_CAPTURE_PATCH__";
  var LEGACY_RAW_CAPTURE_HOOK = "__RI32_CAPTURE_RAW__";
  var LEGACY_PERMALINK_CAPTURE_HOOK = "__RI32_CAPTURE_PERMALINK__";
  function installLegacyCaptureHandoff({ env = globalThis, data: data2 } = {}) {
    const previousPatch = env[LEGACY_CAPTURE_HOOK];
    const previousRaw = env[LEGACY_RAW_CAPTURE_HOOK];
    const previousPermalink = env[LEGACY_PERMALINK_CAPTURE_HOOK];
    env[LEGACY_CAPTURE_HOOK] = (capture = {}) => {
      if (!data2?.ingestPatch) return null;
      return data2.ingestPatch(capture.shortcode, capture.patch, {
        source: capture.source || "embedded",
        confidence: capture.confidence
      });
    };
    env[LEGACY_RAW_CAPTURE_HOOK] = (capture = {}) => {
      if (!data2?.ingest) return null;
      return data2.ingest(capture.input, {
        pageUrl: capture.pageUrl || "",
        source: capture.source || "embedded",
        confidence: capture.confidence
      });
    };
    env[LEGACY_PERMALINK_CAPTURE_HOOK] = (capture = {}) => {
      if (!data2?.ingestPermalink) return null;
      return data2.ingestPermalink(capture.html || "", {
        pageUrl: capture.pageUrl || "",
        source: capture.source || "permalink",
        confidence: capture.confidence,
        fetched: capture.fetched
      });
    };
    return () => {
      restore(env, LEGACY_CAPTURE_HOOK, previousPatch);
      restore(env, LEGACY_RAW_CAPTURE_HOOK, previousRaw);
      restore(env, LEGACY_PERMALINK_CAPTURE_HOOK, previousPermalink);
    };
  }
  function restore(env, key, previous) {
    if (previous === void 0) delete env[key];
    else env[key] = previous;
  }

  // src/migration/legacy-store-adapter.js
  var CACHE_KEY = "ri311:items:v1";
  var WATCH_KEYS = [CACHE_KEY, HISTORY_STORAGE_KEYS.snapshots, HISTORY_STORAGE_KEYS.posts];
  function createLegacyStoreAdapter({ env = globalThis, history: history3 = createHistoryStore({ env }) } = {}) {
    function readStore2(key) {
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
    function getItemsSnapshot() {
      return readStore2(CACHE_KEY);
    }
    function getItem(shortcode) {
      if (!shortcode) return null;
      return readStore2(CACHE_KEY)[shortcode] || null;
    }
    function getPost(shortcode) {
      const item = getItem(shortcode);
      if (!item) return shortcode ? { shortcode } : null;
      const value = (key) => fieldValue2(item, key);
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
    function findPostByMediaUrls(urls) {
      const targets = new Set((Array.isArray(urls) ? urls : [urls]).map(normalizeMediaUrl).filter(Boolean));
      if (!targets.size) return null;
      const store = readStore2(CACHE_KEY);
      let best = null;
      let bestScore = 0;
      for (const [shortcode, item] of Object.entries(store)) {
        if (!item || !shortcode) continue;
        const candidates = [
          [fieldValue2(item, "videoUrl"), 4],
          [fieldValue2(item, "coverUrl"), 3],
          [fieldValue2(item, "thumbUrl"), 2]
        ];
        let score = 0;
        for (const [url, weight] of candidates) {
          const key = normalizeMediaUrl(url);
          if (key && targets.has(key)) score = Math.max(score, weight);
        }
        if (score <= bestScore) continue;
        bestScore = score;
        best = getPost(shortcode);
        if (score === 4) break;
      }
      return best;
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
      getItemsSnapshot,
      getPost,
      getCurrentIdentity,
      findPostByMediaUrls,
      getSnapshots: history3.getSnapshots,
      getAccountPosts: history3.getAccountPosts,
      createChangeTracker,
      codeFromUrl
    };
  }
  function codeFromUrl(url) {
    const match = String(url || "").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
  }
  function fieldValue2(item, key) {
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
  function normalizeMediaUrl(url) {
    if (!url || /^blob:/i.test(String(url))) return "";
    try {
      const parsed = new URL(String(url), "https://www.instagram.com/");
      return `${parsed.hostname}${parsed.pathname}`;
    } catch {
      return "";
    }
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

  // src/migration/legacy-renderer-handoff.js
  var LEGACY_RENDER_VIEW_HOOK = "__RI32_RENDER_VIEW__";
  function installLegacyRendererHandoff({ env = globalThis, data: data2, metrics: metrics2 } = {}) {
    const previous = env[LEGACY_RENDER_VIEW_HOOK];
    function getView(shortcode, liveMetrics = {}) {
      if (!shortcode) return null;
      const stored = data2?.getPost?.(shortcode) || null;
      if (!stored) return null;
      const post = {
        ...stored,
        shortcode,
        likes: liveMetric(liveMetrics.likes, stored.likes),
        comments: liveMetric(liveMetrics.comments, stored.comments),
        reposts: liveMetric(liveMetrics.reposts, stored.reposts)
      };
      return {
        post,
        derived: metrics2?.summarize?.(post) || {
          engagementRate: void 0,
          growth24h: void 0,
          accountMultiple: void 0
        }
      };
    }
    env[LEGACY_RENDER_VIEW_HOOK] = getView;
    function destroy() {
      if (previous === void 0) delete env[LEGACY_RENDER_VIEW_HOOK];
      else env[LEGACY_RENDER_VIEW_HOOK] = previous;
    }
    return { getView, destroy };
  }
  function liveMetric(nativeValue, storedValue) {
    return nativeValue == null ? storedValue : nativeValue;
  }

  // src/migration/reel-context-adapter.js
  var METRIC_PATTERNS = Object.freeze({
    likes: /좋아요|\blikes?\b/i,
    comments: /댓글|\bcomments?\b/i,
    reposts: /리포스트|재게시|\breposts?\b|\breshare\b/i
  });
  var PROFILE_RESERVED = /* @__PURE__ */ new Set(["accounts", "explore", "reels", "reel", "p", "direct", "stories"]);
  function createReelContextAdapter({ store, doc = globalThis.document, env = globalThis } = {}) {
    if (!store) throw new Error("Reel Context Adapter requires store adapter");
    function getCurrent() {
      const video = selectActiveVideo(doc, env);
      if (!video) return null;
      const viewport = viewportSize(env, doc);
      const videoRect = safeRect(video);
      if (!videoRect || visibleHeight(videoRect, viewport.height) < viewport.height * 0.45) return null;
      const root = findScopedRoot(video, viewport, env) || video.parentElement || doc;
      const native = readNativeMetrics(root, env);
      const username2 = readUsername(root, videoRect, viewport, env);
      const scopedCode = scopedShortcode(root, env);
      const mediaPost = store.findPostByMediaUrls?.(mediaUrls(video)) || null;
      const mediaCode = mediaPost?.shortcode || "";
      const urlCode = exactReelCode(env.location?.href || "");
      const resolved = resolveReelShortcode({ scopedCode, mediaCode, urlCode });
      const shortcode = resolved.shortcode;
      const post = shortcode ? store.getPost?.(shortcode) || null : null;
      const identity = shortcode ? toIdentity(post, {
        shortcode,
        username: username2 || post?.username || "",
        canonicalUrl: post?.canonicalUrl || canonicalReelUrl(shortcode),
        source: resolved.source
      }) : null;
      return {
        video,
        shortcode,
        identity,
        identitySource: resolved.source,
        username: username2 || post?.username || "",
        native,
        post
      };
    }
    function resolveActivityIdentity() {
      return getCurrent()?.identity || void 0;
    }
    return { getCurrent, resolveActivityIdentity };
  }
  function resolveReelShortcode({ scopedCode = "", mediaCode = "", urlCode = "" } = {}) {
    if (scopedCode) return { shortcode: String(scopedCode), source: "scoped-link" };
    if (mediaCode) return { shortcode: String(mediaCode), source: "media-map" };
    if (urlCode) return { shortcode: String(urlCode), source: "route" };
    return { shortcode: "", source: "unresolved" };
  }
  function parseMetricCount(text) {
    const source = String(text || "").replace(/\u00a0/g, " ");
    const match = source.match(/((?:[0-9]{1,3}(?:,[0-9]{3})+)|(?:[0-9]+(?:[.,][0-9]+)?))\s*(억|만|천|[KMBkmb])?/);
    if (!match) return void 0;
    const raw = match[1];
    const unit = match[2] || "";
    let normalized = raw;
    if (/^[0-9]{1,3}(?:,[0-9]{3})+$/.test(raw)) normalized = raw.replaceAll(",", "");
    else if (raw.includes(",") && !raw.includes(".")) normalized = raw.replace(",", ".");
    else normalized = raw.replaceAll(",", "");
    let number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return void 0;
    if (unit === "천" || /k/i.test(unit)) number *= 1e3;
    else if (unit === "만") number *= 1e4;
    else if (unit === "억") number *= 1e8;
    else if (/m/i.test(unit)) number *= 1e6;
    else if (/b/i.test(unit)) number *= 1e9;
    return Math.round(number);
  }
  function selectActiveVideo(doc, env) {
    const videos = [...doc?.querySelectorAll?.("video") || []];
    const viewport = viewportSize(env, doc);
    let best = null;
    let bestScore = -Infinity;
    for (const video of videos) {
      const rect = safeRect(video);
      if (!rect) continue;
      const width = visibleWidth(rect, viewport.width);
      const height = visibleHeight(rect, viewport.height);
      const area = width * height;
      if (area < viewport.width * viewport.height * 0.18) continue;
      const center = (Math.max(0, rect.top) + Math.min(viewport.height, rect.bottom)) / 2;
      const playingBonus = video.paused === false ? viewport.width * viewport.height * 0.18 : 0;
      const score = area - Math.abs(center - viewport.height / 2) * viewport.width * 1.3 + playingBonus;
      if (score > bestScore) {
        best = video;
        bestScore = score;
      }
    }
    return best;
  }
  function findScopedRoot(video, viewport, env) {
    let current = video?.parentElement || null;
    let articleFallback = null;
    for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
      const rect = safeRect(current);
      if (!rect) continue;
      if (String(current.tagName || "").toLowerCase() === "article") articleFallback = current;
      if (rect.width < viewport.width * 0.5 || rect.height < viewport.height * 0.42) continue;
      const recognized = recognizedControls(current, env, 180);
      if (recognized >= 2) return current;
    }
    return articleFallback;
  }
  function recognizedControls(root, env, limit) {
    let count = 0;
    const controls = root?.querySelectorAll?.('button,[role="button"],a') || [];
    for (let index = 0; index < controls.length && index < limit; index += 1) {
      const control = controls[index];
      if (!isVisible(control, env)) continue;
      const label = controlLabel(control);
      if (Object.values(METRIC_PATTERNS).some((pattern) => pattern.test(label))) count += 1;
    }
    return count;
  }
  function readNativeMetrics(root, env) {
    const output = { likes: void 0, comments: void 0, reposts: void 0 };
    const controls = root?.querySelectorAll?.('button,[role="button"],a') || [];
    for (let index = 0; index < controls.length && index < 240; index += 1) {
      const control = controls[index];
      if (!isVisible(control, env)) continue;
      const label = controlLabel(control);
      const key = metricKey(label);
      if (!key || output[key] != null) continue;
      const value = metricValue(control, root, label);
      if (value != null) output[key] = value;
    }
    return output;
  }
  function metricKey(label) {
    for (const [key, pattern] of Object.entries(METRIC_PATTERNS)) if (pattern.test(label)) return key;
    return "";
  }
  function metricValue(control, root, label) {
    const fromLabel = parseMetricCount(label);
    if (fromLabel != null) return fromLabel;
    let current = control;
    for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
      const text = String(current.textContent || "").trim();
      if (text.length && text.length <= 90) {
        const value = parseMetricCount(text);
        if (value != null) return value;
      }
      if (current === root) break;
    }
    return void 0;
  }
  function readUsername(root, videoRect, viewport, env) {
    const links = root?.querySelectorAll?.('a[href^="/"]') || [];
    let best = null;
    let bestScore = -Infinity;
    for (let index = 0; index < links.length && index < 180; index += 1) {
      const link = links[index];
      if (!isVisible(link, env)) continue;
      const match = String(link.getAttribute?.("href") || "").match(/^\/([A-Za-z0-9._]+)\/?$/);
      if (!match || PROFILE_RESERVED.has(match[1].toLowerCase())) continue;
      const rect = safeRect(link);
      if (!rect) continue;
      const lowerHalf = rect.top >= Math.max(videoRect.top, 0) + Math.max(0, videoRect.height) * 0.45;
      const leftBias = Math.max(0, viewport.width - rect.left);
      const score = (lowerHalf ? 1e5 : 0) + leftBias - Math.abs(rect.bottom - Math.min(viewport.height, videoRect.bottom));
      if (score > bestScore) {
        best = match[1].toLowerCase();
        bestScore = score;
      }
    }
    return best || "";
  }
  function scopedShortcode(root, env) {
    const anchors = root?.querySelectorAll?.('a[href*="/reel/"],a[href*="/reels/"]') || [];
    for (let index = 0; index < anchors.length && index < 120; index += 1) {
      const anchor = anchors[index];
      if (!isVisible(anchor, env)) continue;
      const code = shortcodeFromUrl(anchor.href || anchor.getAttribute?.("href")) || exactReelCode(anchor.href || anchor.getAttribute?.("href"));
      if (code) return code;
    }
    return "";
  }
  function mediaUrls(video) {
    return [video?.currentSrc, video?.src, video?.poster].map((value) => String(value || "")).filter((value) => /^https?:/i.test(value));
  }
  function exactReelCode(url) {
    const match = String(url || "").match(/\/(?:reel|reels)\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
    return match ? match[1] : "";
  }
  function toIdentity(post, fallback) {
    return {
      shortcode: fallback.shortcode,
      mediaId: post?.mediaId || "",
      ownerId: post?.ownerId || "",
      username: fallback.username || "",
      mediaType: post?.mediaType || "REEL",
      productType: post?.productType || "",
      canonicalUrl: fallback.canonicalUrl,
      parentMediaId: "",
      childMediaId: "",
      slideIndex: null,
      state: post?.mediaId || post?.username ? "IDENTIFIED" : "DETECTED",
      source: fallback.source
    };
  }
  function canonicalReelUrl(shortcode) {
    return shortcode ? `https://www.instagram.com/reel/${shortcode}/` : "";
  }
  function controlLabel(element) {
    const svg = element?.querySelector?.("svg[aria-label],svg[title]");
    return [
      element?.getAttribute?.("aria-label") || "",
      element?.getAttribute?.("title") || "",
      svg?.getAttribute?.("aria-label") || "",
      svg?.getAttribute?.("title") || "",
      element?.textContent || ""
    ].join(" ").trim();
  }
  function isVisible(element, env) {
    const rect = safeRect(element);
    if (!rect || rect.width <= 2 || rect.height <= 2) return false;
    const height = Number(env.innerHeight || env.visualViewport?.height || 0);
    return rect.bottom > 0 && (!height || rect.top < height);
  }
  function safeRect(element) {
    try {
      const rect = element?.getBoundingClientRect?.();
      if (!rect) return null;
      const top = Number(rect.top) || 0;
      const right = Number(rect.right) || 0;
      const bottom = Number(rect.bottom) || 0;
      const left = Number(rect.left) || 0;
      const width = Number(rect.width) || 0;
      const height = Number(rect.height) || 0;
      return { top, right, bottom, left, width, height };
    } catch {
      return null;
    }
  }
  function viewportSize(env, doc) {
    return {
      width: Number(env.visualViewport?.width || env.innerWidth || doc?.documentElement?.clientWidth || 0),
      height: Number(env.visualViewport?.height || env.innerHeight || doc?.documentElement?.clientHeight || 0)
    };
  }
  function visibleWidth(rect, viewportWidth) {
    return Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
  }
  function visibleHeight(rect, viewportHeight) {
    return Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
  }

  // src/migration/reel-context-handoff.js
  var LEGACY_REEL_CONTEXT_HOOK = "__RI32_REEL_CONTEXT__";
  function installLegacyReelContextHandoff({ env = globalThis, reelContext: reelContext2, data: data2 } = {}) {
    const previous = env[LEGACY_REEL_CONTEXT_HOOK];
    let lastEnrichmentKey = "";
    function getCurrent() {
      const current = reelContext2?.getCurrent?.() || null;
      if (!current) return null;
      const shortcode = current.shortcode || current.identity?.shortcode || "";
      if (!shortcode) return { ...current, status: "IDENTIFYING" };
      const username2 = current.username || current.identity?.username || "";
      const canonicalUrl = current.post?.canonicalUrl || current.identity?.canonicalUrl || `https://www.instagram.com/reel/${shortcode}/`;
      const enrichmentKey = `${shortcode}|${username2}|${canonicalUrl}`;
      let enriched = null;
      if (enrichmentKey !== lastEnrichmentKey) {
        lastEnrichmentKey = enrichmentKey;
        enriched = data2?.ingestPatch?.(shortcode, {
          owner: username2 || void 0,
          mediaType: "REEL",
          pageUrl: canonicalUrl,
          canonicalUrl
        }, { source: "dom", confidence: "high" }) || null;
      }
      const post = enriched?.post || data2?.getPost?.(shortcode) || current.post || null;
      const identity = enriched?.identity || data2?.getIdentity?.(shortcode) || current.identity || null;
      return {
        ...current,
        shortcode,
        username: username2 || post?.username || identity?.username || "",
        post,
        identity,
        status: "IDENTIFIED"
      };
    }
    env[LEGACY_REEL_CONTEXT_HOOK] = getCurrent;
    function destroy() {
      if (previous === void 0) delete env[LEGACY_REEL_CONTEXT_HOOK];
      else env[LEGACY_REEL_CONTEXT_HOOK] = previous;
    }
    return { getCurrent, destroy };
  }

  // src/ui/toast.js
  var TOAST_ID = "ri32-toast";
  var DEDUPE_WINDOW_MS = 1400;
  var timer = 0;
  var lastText = "";
  var lastShownAt = 0;
  function showToast(doc, text, duration = 2400) {
    if (!doc?.documentElement || !text) return false;
    const value = String(text);
    const now = Date.now();
    const old = doc.getElementById(TOAST_ID);
    if (old && value === lastText && now - lastShownAt < DEDUPE_WINDOW_MS) return false;
    if (old) old.remove();
    if (timer) clearTimeout(timer);
    const toast = doc.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = value;
    doc.documentElement.appendChild(toast);
    lastText = value;
    lastShownAt = now;
    timer = setTimeout(() => {
      timer = 0;
      toast.remove();
    }, duration);
    return true;
  }
  function showResult(doc, result2) {
    if (!result2 || result2.code === "cancelled") return false;
    return showToast(doc, result2.message || (result2.ok ? "완료했습니다." : "작업을 완료하지 못했습니다."));
  }

  // src/ui/activity-indicator.js
  var ACTIVITY_ID = "ri32-activity";
  function mountActivityIndicator({
    activity: activity2,
    workspace: workspace2,
    doc = globalThis.document,
    onAction
  } = {}) {
    if (!activity2 || !doc?.documentElement) throw new Error("Activity Indicator requires activity store and document");
    let destroyed = false;
    let node = null;
    let labelNode = null;
    let messageNode = null;
    let progressNode = null;
    let progressBar = null;
    let actionButton = null;
    let dismissButton = null;
    const unsubscribeActivity = activity2.subscribe((change) => {
      const item = change.activity || null;
      if (item?.state === "success") {
        if (!item.silent) showToast(doc, item.message || `${item.label || "작업"}을 완료했습니다.`);
        activity2.dismiss(item.id);
        return;
      }
      if (item?.state === "error" && !item.persistent) {
        if (!item.silent) showToast(doc, item.message || `${item.label || "작업"}을 완료하지 못했습니다.`);
        activity2.dismiss(item.id);
        return;
      }
      render();
    });
    const unsubscribeWorkspace = workspace2?.subscribe?.(() => render()) || (() => {
    });
    render();
    function render() {
      if (destroyed) return;
      const item = activity2.getVisible();
      if (!item) {
        node?.remove();
        return;
      }
      ensureNode();
      node.dataset.state = item.state;
      node.setAttribute("role", item.state === "error" ? "alert" : "status");
      node.setAttribute("aria-live", item.state === "error" ? "assertive" : "polite");
      labelNode.textContent = item.label || (item.kind === "download" ? "저장" : "작업");
      messageNode.textContent = item.message || progressMessage(item);
      const progress = item.progress;
      progressNode.hidden = !progress || item.state !== "running";
      if (progress && progressBar) {
        const ratio = Math.max(0, Math.min(1, progress.current / progress.total));
        progressBar.style.width = `${Math.round(ratio * 100)}%`;
        progressNode.setAttribute("aria-valuemin", "0");
        progressNode.setAttribute("aria-valuemax", String(progress.total));
        progressNode.setAttribute("aria-valuenow", String(progress.current));
      }
      const actionable = item.state === "error" && !!item.action;
      actionButton.hidden = !actionable;
      actionButton.textContent = item.actionLabel || "확인";
      dismissButton.hidden = item.state !== "error";
      const embeddedHost = workspace2?.getState?.().open ? doc.querySelector("#ri32-panel .ri32-activity-host") : null;
      node.dataset.embedded = embeddedHost ? "true" : "false";
      (embeddedHost || doc.documentElement).appendChild(node);
    }
    function ensureNode() {
      if (node) return;
      node = doc.createElement("div");
      node.id = ACTIVITY_ID;
      node.innerHTML = [
        '<div class="ri32-activity-copy">',
        "<strong></strong>",
        '<span class="ri32-activity-message"></span>',
        '<div class="ri32-activity-progress" role="progressbar"><span></span></div>',
        "</div>",
        '<button type="button" class="ri32-activity-action" hidden></button>',
        '<button type="button" class="ri32-activity-dismiss" aria-label="알림 닫기" hidden>×</button>'
      ].join("");
      labelNode = node.querySelector(".ri32-activity-copy strong");
      messageNode = node.querySelector(".ri32-activity-message");
      progressNode = node.querySelector(".ri32-activity-progress");
      progressBar = progressNode?.firstElementChild || null;
      actionButton = node.querySelector(".ri32-activity-action");
      dismissButton = node.querySelector(".ri32-activity-dismiss");
      actionButton?.addEventListener("click", handleAction);
      dismissButton?.addEventListener("click", handleDismiss);
    }
    function handleAction() {
      const item = activity2.getVisible();
      if (!item?.action) return;
      onAction?.(item);
      render();
    }
    function handleDismiss() {
      const item = activity2.getVisible();
      if (item?.state === "error") activity2.dismiss(item.id);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeActivity();
      unsubscribeWorkspace();
      actionButton?.removeEventListener("click", handleAction);
      dismissButton?.removeEventListener("click", handleDismiss);
      node?.remove();
      node = null;
    }
    return { render, destroy };
  }
  function progressMessage(item) {
    const progress = item?.progress;
    if (!progress) return item?.state === "running" ? "진행 중…" : "";
    return `${progress.current}/${progress.total} 진행 중`;
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

  // src/ui/grid.js
  var MENU_ID = "ri32-grid-menu";
  function mountGridActions({ app: app2, data: data2, downloads: downloads2, capabilities: capabilities2, doc = globalThis.document, env = globalThis } = {}) {
    if (!doc?.documentElement || !data2 || !downloads2) throw new Error("Grid actions require document, Data Engine and Download Manager");
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
      const shortcode = anchor.dataset.ri315Code || shortcodeFromUrl(anchor.href);
      if (!shortcode) return;
      const existing = doc.getElementById(MENU_ID);
      if (existing?.dataset.code === shortcode) {
        closeMenu();
        return;
      }
      closeMenu();
      doc.getElementById("ri3-grid-menu")?.remove();
      const post = data2.getPost(shortcode) || { shortcode };
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
      return downloads2.download(request);
    }
    async function downloadCarousel(shortcode, images) {
      const requests = images.map((url, index) => ({
        kind: "carousel-slide",
        shortcode,
        url,
        slideIndex: index + 1
      }));
      return downloads2.downloadBatch(requests);
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

  // src/ui/layout.js
  var OWN_ID_PREFIX = "ri32-";
  function computeLayoutSnapshot({
    viewportWidth = 0,
    viewportHeight = 0,
    safeBottom = 0,
    bottomBlockers = [],
    rightBlockers = [],
    keyboardVisible = false
  } = {}) {
    const width = positive(viewportWidth);
    const height = positive(viewportHeight);
    const safe = Math.max(0, Number(safeBottom) || 0);
    const baseBottom = Math.max(88, safe + 78);
    const bottomTop = lowestBlockerTop(bottomBlockers, height);
    const blockedHeight = bottomTop == null ? 0 : Math.max(0, height - bottomTop);
    const launcherBottom = Math.max(baseBottom, blockedHeight + 12);
    const rightInset = widestRightInset(rightBlockers, width);
    const launcherRight = Math.max(12, rightInset ? rightInset + 10 : 12);
    const panelBottom = launcherBottom + 44;
    const feedbackBottom = Math.max(panelBottom + 2, blockedHeight + 14);
    const availableHeight = Math.max(240, height - safe - 16);
    return Object.freeze({
      viewportWidth: width,
      viewportHeight: height,
      safeBottom: safe,
      keyboardVisible: !!keyboardVisible,
      launcherAnchor: Object.freeze({ right: launcherRight, bottom: launcherBottom }),
      reelOverlayLane: Object.freeze({ right: Math.max(60, launcherRight + 40) }),
      sheetMetrics: Object.freeze({
        compactHeight: Math.round(clamp(availableHeight * 0.52, 260, availableHeight * 0.62)),
        expandedHeight: Math.round(clamp(availableHeight * 0.82, 420, availableHeight * 0.9)),
        maxHeight: Math.round(availableHeight)
      }),
      feedbackAnchor: Object.freeze({ bottom: feedbackBottom })
    });
  }
  function createLayoutManager({ app: app2, doc = globalThis.document, env = globalThis } = {}) {
    let snapshot = computeLayoutSnapshot();
    let scheduled = false;
    let destroyed = false;
    const listeners = /* @__PURE__ */ new Set();
    const cleanups = [];
    function measure() {
      if (destroyed) return snapshot;
      const viewport = viewportSize2(env, doc);
      const candidates = blockerCandidates(doc);
      const bottomBlockers = [];
      const rightBlockers = [];
      for (const element of candidates) {
        const rect = visibleFixedRect(element, env, viewport);
        if (!rect) continue;
        if (isBottomBlocker(rect, viewport)) bottomBlockers.push(rect);
        if (isRightBlocker(rect, viewport)) rightBlockers.push(rect);
      }
      const next = computeLayoutSnapshot({
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        safeBottom: measureSafeBottom(doc, env),
        bottomBlockers,
        rightBlockers,
        keyboardVisible: isKeyboardVisible(env, viewport.height)
      });
      const changed = layoutKey(next) !== layoutKey(snapshot);
      snapshot = next;
      applyCssVariables(doc, snapshot);
      if (changed) for (const listener of [...listeners]) listener(snapshot);
      return snapshot;
    }
    function schedule() {
      if (destroyed || scheduled) return;
      scheduled = true;
      const raf = env.requestAnimationFrame || ((fn) => (env.setTimeout || setTimeout)(fn, 16));
      raf(() => {
        scheduled = false;
        measure();
      });
    }
    function listen(target, eventName) {
      if (!target?.addEventListener) return;
      target.addEventListener(eventName, schedule, true);
      cleanups.push(() => target.removeEventListener?.(eventName, schedule, true));
    }
    listen(env, "resize");
    listen(env, "orientationchange");
    listen(env.visualViewport, "resize");
    listen(env.visualViewport, "scroll");
    const offRoute = app2?.on?.("route:changed", schedule) || (() => {
    });
    cleanups.push(offRoute);
    measure();
    return {
      getSnapshot() {
        return snapshot;
      },
      measure,
      schedule,
      subscribe(listener) {
        if (typeof listener !== "function") return () => {
        };
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const cleanup of cleanups.splice(0)) cleanup();
        listeners.clear();
      }
    };
  }
  function viewportSize2(env, doc) {
    const visual = env.visualViewport;
    return {
      width: positive(visual?.width || env.innerWidth || doc?.documentElement?.clientWidth),
      height: positive(visual?.height || env.innerHeight || doc?.documentElement?.clientHeight)
    };
  }
  function blockerCandidates(doc) {
    const result2 = /* @__PURE__ */ new Set();
    for (const element of doc?.body?.children || []) result2.add(element);
    for (const selector of ["nav", '[role="navigation"]']) {
      for (const element of doc?.querySelectorAll?.(selector) || []) result2.add(element);
    }
    return [...result2].filter((element) => !String(element?.id || "").startsWith(OWN_ID_PREFIX));
  }
  function visibleFixedRect(element, env, viewport) {
    if (!element?.getBoundingClientRect) return null;
    const style = env.getComputedStyle?.(element);
    if (!style || style.position !== "fixed" && style.position !== "sticky") return null;
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width < 20 || rect.height < 20) return null;
    if (rect.bottom <= 0 || rect.top >= viewport.height || rect.right <= 0 || rect.left >= viewport.width) return null;
    return normalizeRect(rect);
  }
  function isBottomBlocker(rect, viewport) {
    return rect.bottom >= viewport.height - 6 && rect.width >= viewport.width * 0.38 && rect.height <= viewport.height * 0.38;
  }
  function isRightBlocker(rect, viewport) {
    return rect.right >= viewport.width - 6 && rect.left >= viewport.width * 0.62 && rect.height >= 80;
  }
  function lowestBlockerTop(blockers, viewportHeight) {
    let top = null;
    for (const rect of blockers || []) {
      const value = Number(rect?.top);
      if (!Number.isFinite(value) || value < 0 || value > viewportHeight) continue;
      top = top == null ? value : Math.min(top, value);
    }
    return top;
  }
  function widestRightInset(blockers, viewportWidth) {
    let inset = 0;
    for (const rect of blockers || []) {
      const left = Number(rect?.left);
      if (!Number.isFinite(left) || left < 0 || left > viewportWidth) continue;
      inset = Math.max(inset, viewportWidth - left);
    }
    return inset;
  }
  function measureSafeBottom(doc, env) {
    if (!doc?.documentElement || !doc.createElement || !env.getComputedStyle) return 0;
    const probe = doc.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:-9999px;bottom:0;padding-bottom:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden";
    doc.documentElement.appendChild(probe);
    const value = Number.parseFloat(env.getComputedStyle(probe).paddingBottom) || 0;
    probe.remove();
    return value;
  }
  function isKeyboardVisible(env, viewportHeight) {
    const innerHeight2 = positive(env.innerHeight);
    if (!innerHeight2 || !viewportHeight) return false;
    return innerHeight2 - viewportHeight > Math.max(120, innerHeight2 * 0.18);
  }
  function applyCssVariables(doc, snapshot) {
    const style = doc?.documentElement?.style;
    if (!style?.setProperty) return;
    style.setProperty("--ri-launcher-right", `${snapshot.launcherAnchor.right}px`);
    style.setProperty("--ri-launcher-bottom", `${snapshot.launcherAnchor.bottom}px`);
    style.setProperty("--ri-panel-bottom", `${snapshot.launcherAnchor.bottom + 44}px`);
    style.setProperty("--ri-reel-overlay-right", `${snapshot.reelOverlayLane.right}px`);
    style.setProperty("--ri-feedback-bottom", `${snapshot.feedbackAnchor.bottom}px`);
    style.setProperty("--ri-sheet-compact-height", `${snapshot.sheetMetrics.compactHeight}px`);
    style.setProperty("--ri-sheet-expanded-height", `${snapshot.sheetMetrics.expandedHeight}px`);
  }
  function layoutKey(snapshot) {
    return [
      snapshot.viewportWidth,
      snapshot.viewportHeight,
      snapshot.safeBottom,
      snapshot.keyboardVisible ? 1 : 0,
      snapshot.launcherAnchor.right,
      snapshot.launcherAnchor.bottom,
      snapshot.reelOverlayLane.right,
      snapshot.sheetMetrics.compactHeight,
      snapshot.sheetMetrics.expandedHeight,
      snapshot.feedbackAnchor.bottom
    ].join("|");
  }
  function normalizeRect(rect) {
    return {
      top: Number(rect.top) || 0,
      right: Number(rect.right) || 0,
      bottom: Number(rect.bottom) || 0,
      left: Number(rect.left) || 0,
      width: Number(rect.width) || 0,
      height: Number(rect.height) || 0
    };
  }
  function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }
  function clamp(value, min, max) {
    if (max < min) return Math.max(0, max);
    return Math.min(Math.max(value, min), max);
  }

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

  // src/ui/ri-settings.js
  var SAVE_GROUPS = [
    ["video", "영상"],
    ["image", "사진 · 표지"],
    ["carousel", "슬라이드"]
  ];
  function renderRiSettings({
    body,
    settings: settings2,
    settingsState,
    capabilities: capabilities2,
    doc = globalThis.document
  } = {}) {
    if (!body || !settings2 || !doc) return;
    const state = settingsState || settings2.getState();
    for (const [profileKey, label] of SAVE_GROUPS) {
      renderSaveGroup(profileKey, label, state.downloadPolicies?.[profileKey]);
    }
    const note = doc.createElement("div");
    note.className = "ri32-note";
    note.textContent = "미디어 유형별로 저장 정책을 독립 적용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 몰래 전환하지 않습니다.";
    body.appendChild(note);
    function renderSaveGroup(profileKey, label, policy = {}) {
      const section = createSection(body, `${label} 저장`, doc);
      const options = doc.createElement("div");
      options.className = "ri32-options";
      addModeOption(options, profileKey, policy, "directory", "지정 폴더", !!capabilities2?.directoryPicker);
      addModeOption(options, profileKey, policy, "default", "기본 Downloads", true);
      addModeOption(options, profileKey, policy, "prompt", "매번 선택", !!(capabilities2?.saveFilePicker || capabilities2?.directoryPicker));
      section.appendChild(options);
      addRow(section, "현재 폴더", policy.directoryName || "선택 안 됨", doc);
      addRow(section, "권한", permissionLabel(policy.directoryPermission), doc);
      const action = addAction(section, policy.directoryHandle ? "폴더 변경" : "폴더 선택", async () => {
        action.disabled = true;
        try {
          const result2 = await settings2.selectDirectory(profileKey);
          if (result2.ok) showToast(doc, `${label} 저장 폴더: ${result2.folderName || "선택 완료"}`);
          else if (result2.code !== "cancelled") showToast(doc, result2.message || "폴더를 선택하지 못했습니다.");
        } finally {
          if (action.isConnected) action.disabled = !capabilities2?.directoryPicker;
        }
      }, { doc, className: "ri32-action", disabled: !capabilities2?.directoryPicker });
    }
    function addModeOption(parent, profileKey, policy, mode, label, enabled) {
      const option = doc.createElement("button");
      option.type = "button";
      option.className = "ri32-option";
      option.disabled = !enabled;
      option.setAttribute("aria-pressed", String(policy.downloadMode === mode));
      option.innerHTML = '<span class="ri32-dot"></span><span></span>';
      option.lastElementChild.textContent = label;
      option.addEventListener("click", async () => {
        if (mode === "directory" && !policy.directoryHandle) {
          const result2 = await settings2.selectDirectory(profileKey);
          if (!result2.ok && result2.code !== "cancelled") showToast(doc, result2.message || "폴더를 선택하지 못했습니다.");
          return;
        }
        settings2.setDownloadMode(profileKey, mode);
        showToast(doc, `${SAVE_GROUPS.find(([key]) => key === profileKey)?.[1] || "미디어"} 저장 방식: ${label}`);
      });
      parent.appendChild(option);
    }
  }
  function permissionLabel(permission) {
    if (permission === "granted") return "허용됨";
    if (permission === "prompt") return "확인 필요";
    if (permission === "denied") return "거부됨";
    return "사용 불가";
  }

  // src/ui/research-workspace.js
  function createResearchWorkspaceView({
    doc = globalThis.document,
    version = "",
    launcherId = "ri32-tool",
    onClose,
    onToggleDetent,
    onSelectTab,
    onUpdate
  } = {}) {
    if (!doc?.documentElement) throw new Error("Research Workspace requires document");
    let scrim = null;
    let panel = null;
    let title = null;
    let mediaType = null;
    let versionNode = null;
    let detentButton = null;
    let tabsNode = null;
    let body = null;
    let updateButton = null;
    let lastState = null;
    const tabButtons = /* @__PURE__ */ new Map();
    function mount(tabs = []) {
      if (panel) return panel;
      scrim = doc.createElement("div");
      scrim.id = "ri32-scrim";
      scrim.hidden = true;
      scrim.setAttribute("aria-hidden", "true");
      panel = doc.createElement("aside");
      panel.id = "ri32-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Instagram Research");
      panel.innerHTML = [
        '<div class="ri32-grabber" aria-hidden="true"><span></span></div>',
        '<div class="ri32-head">',
        '<div class="ri32-context"><strong></strong><span class="ri32-media-type"></span></div>',
        '<span class="ri32-version"></span>',
        '<button type="button" class="ri32-detent"></button>',
        '<button type="button" class="ri32-close" aria-label="닫기">×</button>',
        "</div>",
        '<div class="ri32-tabs" role="tablist"></div>',
        '<div class="ri32-activity-host"></div>',
        '<div class="ri32-body"></div>',
        '<div class="ri32-footer"><button type="button" class="ri32-update-shortcut">업데이트 바로가기</button></div>'
      ].join("");
      title = panel.querySelector(".ri32-context strong");
      mediaType = panel.querySelector(".ri32-media-type");
      versionNode = panel.querySelector(".ri32-version");
      detentButton = panel.querySelector(".ri32-detent");
      tabsNode = panel.querySelector(".ri32-tabs");
      body = panel.querySelector(".ri32-body");
      updateButton = panel.querySelector(".ri32-update-shortcut");
      panel.querySelector(".ri32-close")?.addEventListener("click", handleClose);
      detentButton?.addEventListener("click", handleToggleDetent);
      updateButton?.addEventListener("click", handleUpdate);
      scrim.addEventListener("pointerdown", handleScrimPointerDown, true);
      doc.addEventListener("pointerdown", handleDocumentPointerDown, true);
      createTabs(tabs);
      doc.documentElement.append(scrim, panel);
      return panel;
    }
    function sync({ state, context, tabs = [] } = {}) {
      mount(tabs);
      lastState = state || lastState;
      const current = lastState || {};
      const contentMode = current.mode === "content";
      const expanded = current.detent === "expanded";
      panel.dataset.detent = current.detent || "compact";
      panel.dataset.mode = current.mode || "global";
      panel.dataset.contextEpoch = String(current.contextEpoch ?? 0);
      panel.setAttribute("aria-modal", String(expanded));
      if (title) title.textContent = contentMode ? contentTitle(context) : "RI Research";
      if (mediaType) {
        mediaType.textContent = contentMode ? String(context?.mediaType || "") : "";
        mediaType.hidden = !mediaType.textContent;
      }
      if (versionNode) versionNode.textContent = version ? `v${version}` : "";
      if (detentButton) {
        detentButton.textContent = expanded ? "축소" : "확장";
        detentButton.setAttribute("aria-label", expanded ? "리서치 시트 축소" : "리서치 시트 확장");
      }
      if (tabsNode) tabsNode.hidden = !contentMode;
      if (contentMode) {
        if (!tabButtons.size) createTabs(tabs);
        for (const [key, button] of tabButtons) {
          const selected = key === current.activeTab;
          button.setAttribute("aria-selected", String(selected));
          button.tabIndex = selected ? 0 : -1;
          if (selected) ensureTabVisible(button);
        }
      }
      if (scrim) scrim.hidden = !expanded;
    }
    function createTabs(tabs) {
      if (!tabsNode || tabButtons.size) return;
      for (const [key, label] of tabs) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "ri32-tab";
        button.dataset.tab = key;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", "false");
        button.tabIndex = -1;
        button.textContent = label;
        button.addEventListener("click", () => onSelectTab?.(key));
        tabButtons.set(key, button);
        tabsNode.appendChild(button);
      }
    }
    function getBody() {
      return body;
    }
    function resetScroll() {
      if (body) body.scrollTop = 0;
    }
    function destroy() {
      doc.removeEventListener("pointerdown", handleDocumentPointerDown, true);
      panel?.querySelector(".ri32-close")?.removeEventListener("click", handleClose);
      detentButton?.removeEventListener("click", handleToggleDetent);
      updateButton?.removeEventListener("click", handleUpdate);
      scrim?.removeEventListener("pointerdown", handleScrimPointerDown, true);
      scrim?.remove();
      panel?.remove();
      scrim = null;
      panel = null;
      title = null;
      mediaType = null;
      versionNode = null;
      detentButton = null;
      tabsNode = null;
      body = null;
      updateButton = null;
      tabButtons.clear();
      lastState = null;
    }
    function handleClose() {
      onClose?.();
    }
    function handleToggleDetent() {
      onToggleDetent?.();
    }
    function handleUpdate() {
      onUpdate?.();
    }
    function handleScrimPointerDown(event) {
      if (event.target === scrim) onClose?.();
    }
    function handleDocumentPointerDown(event) {
      if (!lastState?.open || lastState.detent !== "compact") return;
      const target = event.target;
      if (panel?.contains(target)) return;
      if (doc.getElementById(launcherId)?.contains(target)) return;
      onClose?.();
    }
    return { mount, sync, getBody, resetScroll, destroy };
  }
  function contentTitle(context) {
    const username2 = String(context?.username || "").replace(/^@/, "").trim();
    return username2 ? `RI · @${username2}` : "RI · 콘텐츠";
  }
  function ensureTabVisible(button) {
    if (typeof button?.scrollIntoView !== "function") return;
    try {
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {
    }
  }

  // src/ui/workspace-state.js
  var VALID_DETENTS = /* @__PURE__ */ new Set(["closed", "compact", "expanded"]);
  var VALID_MODES = /* @__PURE__ */ new Set(["content", "global"]);
  function createWorkspaceState({ initialTab = "summary" } = {}) {
    let state = freezeState({
      open: false,
      detent: "closed",
      mode: "global",
      activeTab: initialTab,
      contextKey: "",
      contextEpoch: 0
    });
    const listeners = /* @__PURE__ */ new Set();
    function commit(patch, reason) {
      const next = normalizeState({ ...state, ...patch });
      if (sameState(state, next)) return state;
      const previous = state;
      state = freezeState(next);
      for (const listener of [...listeners]) listener({ previous, current: state, reason });
      return state;
    }
    return {
      getState() {
        return state;
      },
      subscribe(listener) {
        if (typeof listener !== "function") return () => {
        };
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      open() {
        return commit({ open: true, detent: "compact" }, "open");
      },
      close() {
        return commit({ open: false, detent: "closed" }, "close");
      },
      toggle() {
        return state.open ? this.close() : this.open();
      },
      expand() {
        if (!state.open) return commit({ open: true, detent: "expanded" }, "expand");
        return commit({ detent: "expanded" }, "expand");
      },
      collapse() {
        if (!state.open) return commit({ open: true, detent: "compact" }, "collapse");
        return commit({ detent: "compact" }, "collapse");
      },
      setActiveTab(activeTab) {
        if (!activeTab) return state;
        return commit({ activeTab: String(activeTab) }, "tab");
      },
      rebindContext(identity) {
        const contextKey = identityKey3(identity);
        const mode = contextKey ? "content" : "global";
        if (contextKey === state.contextKey && mode === state.mode) return state;
        return commit({
          mode,
          contextKey,
          contextEpoch: state.contextEpoch + 1
        }, "context");
      }
    };
  }
  function normalizeState(input) {
    const detent = VALID_DETENTS.has(input.detent) ? input.detent : "closed";
    const open = detent !== "closed" && !!input.open;
    return {
      open,
      detent: open ? detent : "closed",
      mode: VALID_MODES.has(input.mode) ? input.mode : "global",
      activeTab: String(input.activeTab || "summary"),
      contextKey: String(input.contextKey || ""),
      contextEpoch: Number.isFinite(Number(input.contextEpoch)) ? Number(input.contextEpoch) : 0
    };
  }
  function identityKey3(identity) {
    if (!identity?.shortcode) return "";
    return [
      identity.shortcode,
      identity.mediaId || "",
      identity.childMediaId || "",
      identity.slideIndex ?? ""
    ].join("|");
  }
  function sameState(a, b) {
    return a.open === b.open && a.detent === b.detent && a.mode === b.mode && a.activeTab === b.activeTab && a.contextKey === b.contextKey && a.contextEpoch === b.contextEpoch;
  }
  function freezeState(value) {
    return Object.freeze({ ...value });
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
  position:fixed;right:var(--ri-launcher-right,12px);bottom:var(--ri-launcher-bottom,max(88px,calc(env(safe-area-inset-bottom) + 78px)));z-index:2147483645;
  width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;
  display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation
}
#ri32-tool::before{
  content:"";position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.12);
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));pointer-events:none
}
#ri32-tool svg{position:relative;z-index:1;width:21px;height:21px;pointer-events:none}
#ri32-tool[aria-expanded="true"]::before{background:rgba(0,0,0,.20)}
#ri32-tool:focus-visible{outline:2px solid rgba(255,255,255,.88);outline-offset:1px}
#ri32-reel-overlay{position:fixed;right:var(--ri-reel-overlay-right,60px);top:clamp(112px,16vh,170px);z-index:2147483600;width:74px;display:none;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;pointer-events:none;color:#fff;font:760 12px/1.08 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.72);font-variant-numeric:tabular-nums}
#ri32-scrim{position:fixed;inset:0;z-index:2147483644;background:rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent}
#ri32-scrim[hidden]{display:none!important}
#ri32-panel{
  position:fixed;left:8px;right:8px;bottom:max(6px,env(safe-area-inset-bottom));z-index:2147483646;
  width:auto;height:var(--ri-sheet-compact-height,52vh);max-height:var(--ri-sheet-compact-height,62vh);overflow:hidden;
  border:1px solid rgba(255,255,255,.13);border-radius:20px 20px 14px 14px;background:rgba(16,16,16,.96);color:#fff;
  box-shadow:0 -10px 36px rgba(0,0,0,.38);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  display:flex;flex-direction:column;overscroll-behavior:contain;transition:height .18s ease,max-height .18s ease
}
#ri32-panel[data-detent="expanded"]{height:var(--ri-sheet-expanded-height,82vh);max-height:var(--ri-sheet-expanded-height,90vh)}
.ri32-grabber{height:18px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;touch-action:none}
.ri32-grabber span{display:block;width:34px;height:4px;border-radius:99px;background:rgba(255,255,255,.25)}
.ri32-head{min-height:48px;display:flex;align-items:center;gap:7px;padding:0 6px 0 12px;border-bottom:1px solid rgba(255,255,255,.08);flex:0 0 auto}
.ri32-context{min-width:0;display:flex;align-items:center;gap:6px;flex:1}.ri32-context strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.ri32-media-type{flex:0 0 auto;padding:3px 6px;border-radius:7px;background:rgba(255,255,255,.08);font-size:9px;font-weight:700;opacity:.72}.ri32-media-type[hidden]{display:none}
.ri32-version{flex:0 0 auto;font-size:9px;opacity:.45}.ri32-detent,.ri32-close{height:40px;min-width:40px;border:0;border-radius:10px;background:transparent;color:#fff;-webkit-tap-highlight-color:transparent}
.ri32-detent{padding:0 7px;font:700 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:rgba(255,255,255,.72)}
.ri32-close{width:40px;padding:0;font-size:21px}.ri32-detent:active,.ri32-close:active{background:rgba(255,255,255,.08)}
.ri32-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto;padding:0 4px;scroll-behavior:smooth}
.ri32-tabs[hidden]{display:none}.ri32-tabs::-webkit-scrollbar{display:none}
.ri32-tab{flex:0 0 auto;height:44px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:rgba(255,255,255,.58);font:700 11px/1 sans-serif;-webkit-tap-highlight-color:transparent}
.ri32-tab[aria-selected="true"]{color:#fff;border-bottom-color:#fff}.ri32-tab:focus-visible{outline:1px solid rgba(255,255,255,.65);outline-offset:-3px}
.ri32-activity-host{flex:0 0 auto;padding:0 10px}.ri32-activity-host:empty{display:none}
.ri32-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 12px 18px;-webkit-overflow-scrolling:touch}
.ri32-footer{flex:0 0 auto;padding:8px 10px 10px;border-top:1px solid rgba(255,255,255,.07);background:rgba(16,16,16,.98)}
.ri32-empty{min-height:100px;display:grid;place-items:center;color:rgba(255,255,255,.55);font-size:12px;line-height:1.5;text-align:center;padding:12px}
.ri32-section+.ri32-section{margin-top:16px}.ri32-section-title{margin-bottom:9px;font-size:12px;font-weight:760}
.ri32-options{display:grid;gap:7px}.ri32-option{min-height:44px;display:flex;align-items:center;gap:9px;padding:0 11px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.035);color:#fff;text-align:left;font-size:12px}
.ri32-option[aria-pressed="true"]{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.09)}.ri32-option:disabled{opacity:.38}
.ri32-dot{width:10px;height:10px;border:1px solid rgba(255,255,255,.5);border-radius:50%}.ri32-option[aria-pressed="true"] .ri32-dot{background:#fff}
.ri32-setting-row{display:flex;align-items:center;gap:8px;min-height:38px;font-size:12px}.ri32-setting-row span:first-child{flex:1;opacity:.62}.ri32-setting-row strong{font-size:12px;text-align:right}
.ri32-action{min-height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.06);color:#fff;font-size:12px;-webkit-tap-highlight-color:transparent}
.ri32-media-action{width:100%;margin-top:7px;text-align:left}.ri32-note{margin-top:8px;color:rgba(255,255,255,.52);font-size:11px;line-height:1.5}.ri32-home-note{margin-top:0;font-size:12px;color:rgba(255,255,255,.62)}
.ri32-update-shortcut{display:block;width:100%;min-height:46px;margin:0;padding:0 12px;border:1px solid rgba(255,255,255,.24);border-radius:11px;background:rgba(255,255,255,.11);color:#fff;font:760 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}
.ri32-update-shortcut:active{background:rgba(255,255,255,.19)}
#ri32-grid-menu{position:fixed;z-index:2147483646;min-width:150px;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(18,18,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-grid-menu button{height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}
#ri32-grid-menu button:active{background:rgba(255,255,255,.12)}#ri32-grid-menu button:disabled{opacity:.38}
#ri32-activity{position:fixed;left:10px;right:10px;bottom:var(--ri-feedback-bottom,max(134px,calc(env(safe-area-inset-bottom) + 124px)));z-index:2147483647;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:9px 9px 9px 11px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(20,20,20,.96);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.32);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
#ri32-activity[data-embedded="true"]{position:static;left:auto;right:auto;bottom:auto;margin:8px 0 0;box-shadow:none;background:rgba(255,255,255,.055)}
#ri32-activity[data-state="error"]{border-color:rgba(255,255,255,.34)}
.ri32-activity-copy{min-width:0;display:grid;gap:3px}.ri32-activity-copy strong{font-size:11px;line-height:1.2}.ri32-activity-message{min-width:0;font-size:11px;line-height:1.35;color:rgba(255,255,255,.68)}
.ri32-activity-progress{height:3px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.12)}.ri32-activity-progress[hidden]{display:none}.ri32-activity-progress span{display:block;width:0;height:100%;border-radius:inherit;background:rgba(255,255,255,.72);transition:width .16s ease}
.ri32-activity-action,.ri32-activity-dismiss{border:0;border-radius:9px;background:rgba(255,255,255,.1);color:#fff;-webkit-tap-highlight-color:transparent}.ri32-activity-action{min-height:40px;padding:0 11px;font:720 11px/1 sans-serif}.ri32-activity-dismiss{width:40px;height:40px;padding:0;font-size:19px}.ri32-activity-action[hidden],.ri32-activity-dismiss[hidden]{display:none}
#ri32-toast{position:fixed;left:50%;bottom:var(--ri-feedback-bottom,max(134px,calc(env(safe-area-inset-bottom) + 124px)));transform:translateX(-50%);z-index:2147483647;max-width:82vw;padding:8px 12px;border-radius:16px;background:rgba(20,20,20,.94);color:#fff;font:650 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;white-space:normal}
@media (prefers-reduced-motion:reduce){#ri32-panel{transition:none}.ri32-tabs{scroll-behavior:auto}.ri32-activity-progress span{transition:none}}
`;

  // src/ui/metric-format.js
  var COUNT_FORMATTER = new Intl.NumberFormat("ko-KR");
  function countLabel(value, { missing = "—" } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return missing;
    return COUNT_FORMATTER.format(number);
  }
  function compactCountLabel(value, { missing = "" } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return missing;
    if (number >= 1e8) return `${trimFixed(number / 1e8, 1)}억`;
    if (number >= 1e4) return `${trimFixed(number / 1e4, 1)}만`;
    if (number >= 1e3) return `${trimFixed(number / 1e3, 1)}K`;
    return String(Math.round(number));
  }
  function percentLabel(value, { sign = false, missing = "—" } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) return missing;
    const digits = Math.abs(number) >= 10 ? 1 : 2;
    const prefix = sign && number >= 0 ? "+" : "";
    return `${prefix}${trimFixed(number, digits)}%`;
  }
  function multipleLabel(value, { missing = "—" } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return missing;
    return `×${trimFixed(number, number >= 10 ? 1 : 2)}`;
  }
  function shortDateLabel(value, { missing = "" } = {}) {
    const text = String(value || "").trim();
    const match = text.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})/);
    if (match) return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}`;
    const slash = text.match(/^(?:\d{4}\/)?(\d{1,2})\/(\d{1,2})/);
    if (slash) return `${slash[1].padStart(2, "0")}/${slash[2].padStart(2, "0")}`;
    return missing;
  }
  function trimFixed(value, digits) {
    return Number(value).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  }

  // src/ui/ri-summary.js
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

  // src/ui/ri-panel.js
  var TABS = [
    ["summary", "요약"],
    ["content", "콘텐츠"],
    ["comments", "댓글"],
    ["analysis", "분석"],
    ["media", "미디어"],
    ["settings", "설정"]
  ];
  function mountRiPanel({
    app: app2,
    settings: settings2,
    capabilities: capabilities2,
    downloads: downloads2,
    metrics: metrics2,
    data: data2,
    workspace: workspace2 = createWorkspaceState(),
    layout: layout2,
    version = "",
    doc = globalThis.document,
    env = globalThis
  } = {}) {
    if (!doc?.documentElement || !settings2) throw new Error("RI Panel requires document and Settings Store");
    injectStyles(doc);
    let settingsState = settings2.getState();
    let destroyed = false;
    let button = doc.getElementById("ri32-tool");
    let workspaceView = null;
    doc.getElementById("ri3-panel")?.remove();
    doc.getElementById("ri32-panel")?.remove();
    doc.getElementById("ri32-scrim")?.remove();
    if (!button) {
      button = doc.createElement("button");
      button.id = "ri32-tool";
      button.type = "button";
      button.setAttribute("aria-label", "리서치 도구");
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = researchIcon();
      doc.documentElement.appendChild(button);
    }
    workspace2.rebindContext(currentIdentity());
    layout2?.schedule?.();
    const unsubscribeSettings = settings2.subscribe((next) => {
      settingsState = next;
      const state = workspace2.getState();
      if (state.open && (state.mode === "global" || state.activeTab === "settings")) renderBody();
    });
    const unsubscribeRoute = app2?.on?.(EVENTS.ROUTE_CHANGED, scheduleContextRender) || (() => {
    });
    const unsubscribeIdentity = app2?.on?.(EVENTS.IDENTITY_CHANGED, scheduleContextRender) || (() => {
    });
    const unsubscribeStore = app2?.on?.(EVENTS.STORE_CHANGED, scheduleContextRender) || (() => {
    });
    const unsubscribeWorkspace = workspace2.subscribe(({ current }) => {
      button?.setAttribute("aria-expanded", String(current.open));
      if (workspaceView && current.open) syncWorkspaceView();
    });
    button.addEventListener("click", toggle);
    function toggle() {
      if (isOpen()) closePanel();
      else openPanel();
    }
    function openPanel() {
      if (destroyed || isOpen()) return;
      workspace2.rebindContext(currentIdentity());
      ensureWorkspaceView();
      workspace2.open();
      syncWorkspaceView();
      renderBody();
      layout2?.schedule?.();
    }
    function openSettings() {
      if (destroyed) return;
      workspace2.rebindContext(currentIdentity());
      workspace2.setActiveTab("settings");
      ensureWorkspaceView();
      if (!isOpen()) workspace2.open();
      syncWorkspaceView();
      workspaceView?.resetScroll();
      renderBody();
      layout2?.schedule?.();
    }
    function closePanel() {
      if (!isOpen()) return;
      workspace2.close();
      workspaceView?.destroy();
      workspaceView = null;
      layout2?.schedule?.();
    }
    function toggleDetent() {
      const state = workspace2.getState();
      if (state.detent === "expanded") workspace2.collapse();
      else workspace2.expand();
      layout2?.schedule?.();
    }
    function selectTab(key) {
      if (workspace2.getState().activeTab === key) return;
      workspace2.setActiveTab(key);
      workspaceView?.resetScroll();
      syncWorkspaceView();
      renderBody();
    }
    function scheduleContextRender() {
      const previousEpoch = workspace2.getState().contextEpoch;
      const next = workspace2.rebindContext(currentIdentity());
      const contextChanged = next.contextEpoch !== previousEpoch;
      layout2?.schedule?.();
      if (!isOpen()) return;
      const render = () => {
        if (!isOpen()) return;
        ensureWorkspaceView();
        syncWorkspaceView();
        if (contextChanged) workspaceView?.resetScroll();
        renderBody();
      };
      if (app2?.scheduleRender) app2.scheduleRender("ri32-panel-context", render);
      else render();
    }
    function ensureWorkspaceView() {
      if (workspaceView) return workspaceView;
      workspaceView = createResearchWorkspaceView({
        doc,
        version: version || app2?.version || "",
        onClose: closePanel,
        onToggleDetent: toggleDetent,
        onSelectTab: selectTab,
        onUpdate: openUpdateShortcut
      });
      workspaceView.mount(TABS);
      return workspaceView;
    }
    function syncWorkspaceView() {
      workspaceView?.sync({
        state: workspace2.getState(),
        context: currentPost(),
        tabs: TABS
      });
    }
    function renderBody() {
      const body = workspaceView?.getBody();
      if (!body) return;
      body.replaceChildren();
      const state = workspace2.getState();
      if (state.mode === "global") {
        renderGlobalHome(body);
        renderSettings(body);
        return;
      }
      const post = currentPost();
      if (state.activeTab === "settings") return renderSettings(body);
      if (state.activeTab === "summary") return renderRiSummary({ body, post, metrics: metrics2, doc });
      if (state.activeTab === "media") return renderMedia(body, post);
      renderPlaceholder(body, post, state.activeTab);
    }
    function renderGlobalHome(body) {
      const section = createSection(body, "RI Home", doc);
      const note = doc.createElement("div");
      note.className = "ri32-note ri32-home-note";
      note.textContent = "현재 화면에서 특정 콘텐츠가 선택되지 않았습니다. Reel·사진·영상·캐러셀 상세를 열면 콘텐츠 리서치 6탭이 연결됩니다.";
      section.appendChild(note);
    }
    function renderMedia(body, post) {
      if (!post?.shortcode) return renderEmpty(body, "현재 콘텐츠가 선택되지 않았습니다.", doc);
      const section = createSection(body, "미디어", doc);
      const type = String(post.mediaType || "").toUpperCase();
      let actionCount = 0;
      if ((type === "REEL" || type === "VIDEO") && post.videoUrl) {
        addMediaAction(section, "영상 다운로드", () => save({ kind: "video", shortcode: post.shortcode, url: post.videoUrl }));
        actionCount += 1;
      }
      if ((type === "REEL" || type === "VIDEO") && (post.coverUrl || post.thumbUrl)) {
        const url = post.coverUrl || post.thumbUrl;
        addMediaAction(section, "썸네일 다운로드", () => save({ kind: "cover", shortcode: post.shortcode, url }));
        actionCount += 1;
      }
      if (type === "PHOTO" && (post.coverUrl || post.thumbUrl)) {
        const url = post.coverUrl || post.thumbUrl;
        addMediaAction(section, "이미지 다운로드", () => save({ kind: "photo", shortcode: post.shortcode, url }));
        actionCount += 1;
      }
      if (type === "CAROUSEL" && post.carouselImages?.length) {
        addMediaAction(section, `전체 이미지 다운로드 (${post.carouselImages.length})`, () => saveBatch(post));
        actionCount += 1;
      }
      addMediaAction(section, "링크 복사", () => copyCurrentLink(post));
      if (!actionCount) {
        const note = doc.createElement("div");
        note.className = "ri32-note";
        note.textContent = "원본 미디어 주소는 아직 확보되지 않았습니다.";
        section.appendChild(note);
      }
    }
    function renderPlaceholder(body, post, tab) {
      const label = tabLabel(tab);
      renderEmpty(body, post?.shortcode ? `${label} 데이터 연결 준비 중` : `${label} · 현재 콘텐츠 연결 준비 중`, doc);
    }
    function renderSettings(body) {
      return renderRiSettings({ body, settings: settings2, settingsState, capabilities: capabilities2, doc });
    }
    function addMediaAction(parent, label, action) {
      return addAction(parent, label, action, { doc, className: "ri32-action ri32-media-action" });
    }
    async function save(request) {
      if (!downloads2) return null;
      return downloads2.download(request);
    }
    async function saveBatch(post) {
      const requests = post.carouselImages.map((url, index) => ({
        kind: "carousel-slide",
        shortcode: post.shortcode,
        url,
        slideIndex: index + 1
      }));
      return downloads2?.downloadBatch(requests);
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
    function currentIdentity() {
      return app2?.getCurrentIdentity?.() || data2?.getIdentityFromUrl?.(env.location?.href || "") || null;
    }
    function currentPost() {
      const identity = currentIdentity();
      return identity?.shortcode ? data2?.getPost?.(identity.shortcode) || identity : null;
    }
    function isOpen() {
      return workspace2.getState().open;
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeSettings();
      unsubscribeRoute();
      unsubscribeIdentity();
      unsubscribeStore();
      unsubscribeWorkspace();
      button?.removeEventListener("click", toggle);
      workspaceView?.destroy();
      button?.remove();
      workspaceView = null;
      button = null;
    }
    return {
      open: openPanel,
      openSettings,
      close: closePanel,
      destroy,
      getState: () => workspace2.getState()
    };
  }
  function tabLabel(key) {
    return TABS.find(([tab]) => tab === key)?.[1] || key;
  }
  function researchIcon() {
    return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';
  }

  // src/legacy-runtime.js
  (function() {
    "use strict";
    var VERSION2 = "3.1.6";
    var UPDATE_URL2 = "https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js";
    var CACHE_KEY2 = "ri311:items:v1";
    var SNAP_KEY2 = "ri311:snap:v1";
    var POST_KEY2 = "ri311:posts:v1";
    var SOURCE_RANK2 = { legacy: 1, permalink: 2, dom: 3, embedded: 4, network: 5 };
    var METRIC_FIELDS2 = { views: 1, likes: 1, comments: 1, reposts: 1 };
    var VIEW_KEYS3 = ["play_count", "ig_play_count", "video_play_count", "video_view_count", "view_count", "clips_play_count", "reel_view_count", "media_view_count", "views", "plays"];
    var items = readStore2(CACHE_KEY2, {});
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
    function readStore2(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function writeStore2(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
      }
    }
    function scheduleStoreWrite() {
      if (storeWriteTimer) return;
      storeWriteTimer = setTimeout(function() {
        storeWriteTimer = 0;
        writeStore2(CACHE_KEY2, items);
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
    function parseCount2(text) {
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
    function sourceRank2(source) {
      return SOURCE_RANK2[source] || 0;
    }
    function fieldValue3(item, key) {
      var f = item && item.fields && item.fields[key];
      if (f && (f.status === "verified" || f.status === "conflict")) return f.value;
      return item && item[key] != null ? item[key] : null;
    }
    function markConflict2(item, key, oldField, incoming, source) {
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
      newRank = sourceRank2(source);
      oldRank = old ? sourceRank2(old.source) : -1;
      if (old && (old.status === "verified" || old.status === "conflict") && String(old.value) !== String(value)) {
        if (newRank < oldRank) return false;
        if (METRIC_FIELDS2[key]) {
          a = Number(old.value);
          b = Number(value);
          age = Date.now() - Number(old.updatedAt || 0);
          if (a > 0 && (b < a && a - b > Math.max(5, a * 0.02) || age < 12e4 && a > 100 && b > a * 20)) return markConflict2(item, key, old, value, source);
        } else if (key !== "videoUrl" && key !== "thumbUrl" && key !== "carouselImages" && !(key === "mediaType" && old.value === "VIDEO" && value === "REEL") && newRank <= oldRank) {
          return markConflict2(item, key, old, value, source);
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
        mediaId: fieldValue3(item, "mediaId") || "",
        ownerId: fieldValue3(item, "ownerId") || "",
        username: fieldValue3(item, "owner") || "",
        mediaType: fieldValue3(item, "mediaType") || "",
        productType: fieldValue3(item, "productType") || "",
        canonicalUrl: fieldValue3(item, "canonicalUrl") || item.pageUrl || "",
        state: fieldValue3(item, "mediaType") && fieldValue3(item, "owner") ? "IDENTIFIED" : "IDENTIFYING"
      };
      items[code] = item;
      if (changed) {
        scheduleStoreWrite();
        recordSnapshot(code, fieldValue3(item, "views"));
        recordPost(item);
        scheduleRefresh();
      }
      return item;
    }
    function recordSnapshot(code, views) {
      var store, arr, last, now = Date.now();
      views = Number(views);
      if (!code || !views) return;
      store = readStore2(SNAP_KEY2, {});
      arr = Array.isArray(store[code]) ? store[code] : [];
      last = arr.length ? arr[arr.length - 1] : null;
      if (!last || now - Number(last.t || 0) >= 18e5 || Number(last.v) !== views) arr.push({ t: now, v: views });
      arr = arr.filter(function(x) {
        return now - Number(x.t || 0) <= 12096e5;
      }).slice(-80);
      store[code] = arr;
      writeStore2(SNAP_KEY2, store);
    }
    function growth24h(code, views) {
      var arr = readStore2(SNAP_KEY2, {})[code] || [];
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
      owner = String(fieldValue3(item, "owner") || "").toLowerCase();
      views = Number(fieldValue3(item, "views"));
      if (!owner || !views) return;
      store = readStore2(POST_KEY2, {});
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
      writeStore2(POST_KEY2, store);
    }
    function accountMultiple(code, owner, views) {
      var store, list = [], vals, mid, median;
      owner = String(owner || "").toLowerCase();
      views = Number(views);
      if (!owner || !views) return null;
      store = readStore2(POST_KEY2, {});
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
    function detectMediaType2(obj) {
      var mt = Number(obj && (obj.media_type != null ? obj.media_type : obj.mediaType));
      var pt = String(obj && (obj.product_type || obj.productType) || "").toLowerCase();
      if (/reel|clips/.test(pt)) return "REEL";
      if (mt === 8 || obj && Array.isArray(obj.carousel_media)) return "CAROUSEL";
      if (mt === 2 || obj && (obj.video_versions || obj.video_url)) return "VIDEO";
      if (mt === 1) return "PHOTO";
      return "";
    }
    function bestImageFromMedia2(obj) {
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
    function carouselImagesFromMedia2(obj) {
      var out = [], seen = /* @__PURE__ */ Object.create(null), slides = obj && obj.carousel_media;
      if (!Array.isArray(slides)) return out;
      slides.forEach(function(slide) {
        var url = bestImageFromMedia2(slide), key = normalizeUrl(url) || url;
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
      n = sameMediaNumber(obj, VIEW_KEYS3, code, 0);
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
      type = detectMediaType2(obj);
      if (type) patch.mediaType = type;
      if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);
      directThumb = bestImageFromMedia2(obj);
      if (directThumb) patch.thumbUrl = directThumb;
      carouselImages = carouselImagesFromMedia2(obj);
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
    function nearMetric2(text, code, keys) {
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
        if (m) patch.likes = parseCount2(m[1]);
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i);
        if (m) patch.comments = parseCount2(m[1]);
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
      if (patch.mediaType === "REEL" || patch.mediaType === "VIDEO") patch.views = nearMetric2(html, code, VIEW_KEYS3);
      if (patch.likes == null) patch.likes = nearMetric2(html, code, ["like_count", "likes_count"]);
      if (patch.comments == null) patch.comments = nearMetric2(html, code, ["comment_count", "comments_count"]);
      patch.reposts = nearMetric2(html, code, ["reshare_count", "repost_count", "reposts_count"]);
      n = nearMetric2(html, code, ["taken_at", "taken_at_timestamp"]);
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
    function finishPending(code, data2) {
      var callbacks = pending[code] || [];
      delete pending[code];
      callbacks.forEach(function(fn) {
        try {
          fn(data2);
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
              var html = xhr2.responseText || "", fetched = Date.now(), captured = null, patch;
              scanPermalinkJson(html);
              if (typeof window.__RI32_CAPTURE_PERMALINK__ === "function") {
                try {
                  captured = window.__RI32_CAPTURE_PERMALINK__({
                    html,
                    pageUrl: job2.url,
                    source: "permalink",
                    confidence: "medium",
                    fetched
                  });
                  if (captured && captured.item) {
                    items[job2.code] = captured.item;
                    if (captured.changed) scheduleRefresh();
                  }
                } catch (e) {
                }
              }
              if (!captured || !captured.item) {
                patch = parsePermalink(html, job2.url);
                patch.fetched = fetched;
                saveItem(job2.code, patch, "permalink", "medium");
              }
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
    function effectiveCardType(anchor, data2) {
      var stored = String(fieldValue3(data2, "mediaType") || "").toUpperCase();
      var domType = cardDomType(anchor);
      if (stored === "REEL" || stored === "VIDEO" || stored === "PHOTO" || stored === "CAROUSEL") return stored;
      if (isReelUrl(anchor && anchor.href)) return "REEL";
      if (domType) return domType;
      return /\/p\//.test(String(anchor && anchor.href || "")) ? "POST" : "";
    }
    function isVideoCard(anchor, data2) {
      var type = effectiveCardType(anchor, data2);
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
    function cardImageUrl(anchor, data2) {
      return bestDomImageUrl2(anchor) || fieldValue3(data2, "thumbUrl") || "";
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
      var data2 = items[code] || { code, fields: {} };
      var type = effectiveCardType(anchor, data2);
      var videoCard = type === "REEL" || type === "VIDEO";
      var imageUrl = cardImageUrl(anchor, data2);
      var videoUrl = fieldValue3(data2, "videoUrl") || "";
      var carouselImages = fieldValue3(data2, "carouselImages");
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
    function renderGridCard(anchor, data2) {
      var row1 = anchor.querySelector(".ri3-grid-row1");
      var row2 = anchor.querySelector(".ri3-grid-row2");
      var code = data2 && (data2.code || data2.shortcode) || anchor.dataset.ri315Code || codeFromUrl2(anchor.href);
      var modern = null, summary = null;
      if (code && typeof window.__RI32_RENDER_VIEW__ === "function") {
        try {
          modern = window.__RI32_RENDER_VIEW__(code);
          if (modern && modern.post) data2 = modern.post;
          if (modern && modern.derived) summary = modern.derived;
        } catch (e) {
        }
      }
      var views = fieldValue3(data2, "views");
      var likes = fieldValue3(data2, "likes");
      var comments = fieldValue3(data2, "comments");
      var reposts = fieldValue3(data2, "reposts");
      var date = fieldValue3(data2, "date");
      var videoCard = isVideoCard(anchor, data2);
      var type = effectiveCardType(anchor, data2);
      var er = videoCard ? summary ? summary.engagementRate : engagement(views, likes, comments, reposts) : null;
      var growth = videoCard && views ? summary ? summary.growth24h : growth24h(code, views) : null;
      var multiple = videoCard && views ? summary ? summary.accountMultiple : accountMultiple(code, fieldValue3(data2, "owner"), views) : null;
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
      var anchors, i, anchor, code, data2, url;
      if (/^\/(?:reel|reels|p)\//.test(location.pathname)) return;
      anchors = document.querySelectorAll('main a[href*="/reel/"],main a[href*="/reels/"],main a[href*="/p/"]');
      for (i = 0; i < anchors.length; i++) {
        anchor = anchors[i];
        if (!visible(anchor) && !gridSafe(anchor)) continue;
        code = codeFromUrl2(anchor.href);
        if (!code) continue;
        ensureGridCard(anchor, code);
        data2 = items[code] || { code, fields: {} };
        renderGridCard(anchor, data2);
        if (!data2.fetched || Date.now() - Number(data2.fetched || 0) > 3e5) {
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
    function controlLabel2(el) {
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
        text = controlLabel2(elements[i]);
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
        var n = m ? parseCount2(m[1]) : null;
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
    function reelContext2() {
      var bridged, video, r, code = "", metrics2, owner, candidates = [], keys;
      if (typeof window.__RI32_REEL_CONTEXT__ === "function") {
        try {
          bridged = window.__RI32_REEL_CONTEXT__();
          if (bridged && bridged.video) {
            return {
              video: bridged.video,
              code: bridged.shortcode || bridged.identity && bridged.identity.shortcode || "",
              native: bridged.native || { likes: null, comments: null, reposts: null },
              owner: bridged.username || bridged.identity && bridged.identity.username || "",
              status: bridged.status || (bridged.shortcode || bridged.identity && bridged.identity.shortcode ? "IDENTIFIED" : "IDENTIFYING")
            };
          }
        } catch (e) {
        }
      }
      video = activeVideo();
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
          var d = items[key], score = 0, likes = fieldValue3(d, "likes"), comments = fieldValue3(d, "comments");
          if (owner && fieldValue3(d, "owner") === owner) score += 10;
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
      var box = ensureOverlay(), data2, modern = null, summary = null, views, er, growth, multiple, lines = [], key;
      if (!ctx || !ctx.code) {
        box.style.display = "none";
        return;
      }
      if (typeof window.__RI32_RENDER_VIEW__ === "function") {
        try {
          modern = window.__RI32_RENDER_VIEW__(ctx.code, ctx.native || {});
          if (modern && modern.post) data2 = modern.post;
          if (modern && modern.derived) summary = modern.derived;
        } catch (e) {
        }
      }
      if (!data2) data2 = items[ctx.code] || {};
      views = fieldValue3(data2, "views");
      er = summary ? summary.engagementRate : engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
      growth = views ? summary ? summary.growth24h : growth24h(ctx.code, views) : null;
      multiple = views ? summary ? summary.accountMultiple : accountMultiple(ctx.code, ctx.owner || fieldValue3(data2, "owner"), views) : null;
      if (views) lines.push("▶ " + fmt(views));
      if (er != null) lines.push("ER " + fmtPercent(er));
      if (growth != null) lines.push("24h " + (growth >= 0 ? "+" : "") + fmtPercent(growth));
      if (multiple != null) lines.push(fmtMultiple(multiple));
      if (fieldValue3(data2, "date")) lines.push(String(fieldValue3(data2, "date")).slice(5).replace("-", "/"));
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
          panelOpen ? closePanel() : openPanel(reelContext2());
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
      var panel = document.getElementById("ri3-panel"), body, data2, views, er, growth, multiple, media = "";
      if (!panel || !ctx) return;
      body = panel.querySelector(".ri3-panel-body");
      data2 = ctx.code ? items[ctx.code] || {} : {};
      views = fieldValue3(data2, "views");
      er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
      growth = views ? growth24h(ctx.code, views) : null;
      multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue3(data2, "owner"), views) : null;
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
      panelRow(body, "게시일", fieldValue3(data2, "date") ? String(fieldValue3(data2, "date")).slice(5).replace("-", "/") : "—");
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
          var latest = reelContext2() || panelContext;
          var data2 = latest && latest.code ? items[latest.code] || {} : {};
          var url = latest && latest.video && (latest.video.currentSrc || latest.video.src) || fieldValue3(data2, "videoUrl") || "";
          if (/^blob:/i.test(url)) url = fieldValue3(data2, "videoUrl") || "";
          openUrl(url);
        }],
        ["썸네일", function() {
          var latest = reelContext2() || panelContext;
          var data2 = latest && latest.code ? items[latest.code] || {} : {};
          openUrl(fieldValue3(data2, "thumbUrl") || latest && latest.video && latest.video.poster || "");
        }],
        ["링크 복사", function() {
          var latest = reelContext2() || panelContext;
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
      ctx = reelContext2();
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
    detectMediaType2 = function(obj) {
      var mt = Number(obj && (obj.media_type != null ? obj.media_type : obj.mediaType));
      var pt = String(obj && (obj.product_type || obj.productType) || "").toLowerCase();
      if (/reel|clips/.test(pt)) return "REEL";
      if (mt === 8 || carouselSlidesFromMedia316(obj).length) return "CAROUSEL";
      if (mt === 2 || obj && (obj.video_versions || obj.video_url)) return "VIDEO";
      if (mt === 1) return "PHOTO";
      return "";
    };
    carouselImagesFromMedia2 = function(obj) {
      var out = [], seen = /* @__PURE__ */ Object.create(null), slides = carouselSlidesFromMedia316(obj);
      slides.forEach(function(slide) {
        var url = bestImageFromMedia2(slide), key = normalizeUrl(url) || url;
        if (url && !seen[key]) {
          seen[key] = 1;
          out.push(url);
        }
      });
      return out;
    };
    saveItem = function(code, patch, source, confidence) {
      var item, keys, i, key, changed = false, captured;
      if (!code) return null;
      if (typeof window.__RI32_CAPTURE_PATCH__ === "function") {
        try {
          captured = window.__RI32_CAPTURE_PATCH__({
            shortcode: code,
            patch: patch || {},
            source: source || "embedded",
            confidence
          });
          if (captured && captured.item) {
            items[code] = captured.item;
            if (captured.changed) scheduleRefresh();
            return items[code];
          }
        } catch (e) {
        }
      }
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
        mediaId: fieldValue3(item, "mediaId") || "",
        ownerId: fieldValue3(item, "ownerId") || "",
        username: fieldValue3(item, "owner") || "",
        mediaType: fieldValue3(item, "mediaType") || "",
        productType: fieldValue3(item, "productType") || "",
        canonicalUrl: fieldValue3(item, "canonicalUrl") || item.pageUrl || "",
        state: fieldValue3(item, "mediaType") && fieldValue3(item, "owner") ? "IDENTIFIED" : "IDENTIFYING"
      };
      items[code] = item;
      if (changed) {
        scheduleStoreWrite();
        recordSnapshot(code, fieldValue3(item, "views"));
        recordPost(item);
        scheduleRefresh();
      }
      return item;
    };
    rememberObject = function(obj, source) {
      var code, patch = {}, n, user, videos = [], images = [], i, key, type, directCover, carouselImages, captured, evidenceVideos, evidenceImages;
      if (!obj || typeof obj !== "object") return;
      code = obj.code || obj.shortcode || obj.short_code;
      if (!code || typeof code !== "string" || code.length < 5 || code.length > 40) return;
      if (typeof window.__RI32_CAPTURE_RAW__ === "function") {
        try {
          captured = window.__RI32_CAPTURE_RAW__({
            input: obj,
            pageUrl: codeFromUrl2(location.href) === code ? location.href : "",
            source: source || "embedded",
            confidence: source === "network" ? "high" : "medium"
          });
          if (captured && captured.item) {
            items[code] = captured.item;
            evidenceVideos = captured.evidence && captured.evidence.videoUrls || [];
            evidenceImages = captured.evidence && captured.evidence.imageUrls || [];
            for (i = 0; i < evidenceVideos.length; i++) {
              key = normalizeUrl(evidenceVideos[i]);
              if (key) videoMap[key] = code;
            }
            for (i = 0; i < evidenceImages.length; i++) {
              key = normalizeUrl(evidenceImages[i]);
              if (key) posterMap[key] = code;
            }
            if (captured.changed) scheduleRefresh();
            return;
          }
        } catch (e) {
        }
      }
      n = sameMediaNumber(obj, VIEW_KEYS3, code, 0);
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
      type = detectMediaType2(obj);
      if (type) patch.mediaType = type;
      if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);
      directCover = bestImageFromMedia2(obj);
      if (directCover) {
        patch.coverUrl = directCover;
        patch.thumbUrl = directCover;
        key = normalizeUrl(directCover);
        if (key) posterMap[key] = code;
      }
      carouselImages = carouselImagesFromMedia2(obj);
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
        if (m) patch.likes = parseCount2(m[1]);
        m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i);
        if (m) patch.comments = parseCount2(m[1]);
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
      if (patch.mediaType === "REEL" || patch.mediaType === "VIDEO") patch.views = nearMetric2(html, code, VIEW_KEYS3);
      if (patch.likes == null) patch.likes = nearMetric2(html, code, ["like_count", "likes_count"]);
      if (patch.comments == null) patch.comments = nearMetric2(html, code, ["comment_count", "comments_count"]);
      patch.reposts = nearMetric2(html, code, ["reshare_count", "repost_count", "reposts_count"]);
      n = nearMetric2(html, code, ["taken_at", "taken_at_timestamp"]);
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
    cardImageUrl = function(anchor, data2) {
      return bestDomImageUrl2(anchor) || fieldValue3(data2, "coverUrl") || fieldValue3(data2, "thumbUrl") || "";
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
      var data2 = items[code] || { code, fields: {} };
      var type = effectiveCardType(anchor, data2);
      var videoCard = type === "REEL" || type === "VIDEO";
      var imageUrl = cardImageUrl(anchor, data2);
      var videoUrl = fieldValue3(data2, "videoUrl") || "";
      var carouselImages = fieldValue3(data2, "carouselImages");
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
  var activity = createActivityStore();
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
    onChange(change) {
      if (change?.activity) activity.apply(change.activity);
      app.emit(EVENTS.DOWNLOAD_CHANGED, change);
    }
  });
  var history2 = createHistoryStore({ env: globalThis });
  var verifiedCache = createVerifiedCacheStore({ env: globalThis });
  var legacyStore = createLegacyStoreAdapter({ env: globalThis, history: history2 });
  var data = createDataEngine({
    legacyAdapter: legacyStore,
    history: history2,
    persistence: verifiedCache,
    onChange(change) {
      app.emit(EVENTS.STORE_CHANGED, {
        reason: "data-engine",
        changedKeys: [VERIFIED_CACHE_KEY],
        shortcode: change.shortcode
      });
    }
  });
  var stopCaptureHandoff = installLegacyCaptureHandoff({ env: globalThis, data });
  var reelContext = createReelContextAdapter({ store: data, doc: document, env: globalThis });
  var reelContextHandoff = installLegacyReelContextHandoff({ env: globalThis, reelContext, data });
  var metrics = createMetricsEngine({ history: history2 });
  var rendererHandoff = installLegacyRendererHandoff({ env: globalThis, data, metrics });
  var workspace = createWorkspaceState();
  var storeTracker = legacyStore.createChangeTracker((change) => {
    data.syncLegacy();
    const activeIdentity = reelContextHandoff.getCurrent()?.identity;
    app.setCurrentIdentity(activeIdentity === void 0 ? data.getIdentityFromUrl(globalThis.location?.href || "") : activeIdentity);
    app.emit(EVENTS.STORE_CHANGED, change);
  });
  app.services = { capabilities, settings, downloads, metrics, workspace, activity, history: history2, data };
  app.adapters.legacyStore = legacyStore;
  app.adapters.reelContext = reelContext;
  app.adapters.reelContextHandoff = reelContextHandoff;
  app.adapters.rendererHandoff = rendererHandoff;
  var stopRouteTracking = app.startRouteTracking({
    env: globalThis,
    resolveIdentity(url) {
      return reelContextHandoff.getCurrent()?.identity || data.getIdentityFromUrl(url);
    },
    resolveActivityIdentity() {
      return reelContextHandoff.getCurrent()?.identity || void 0;
    },
    onActivity(reason) {
      storeTracker.schedule(reason);
    }
  });
  var layout = createLayoutManager({ app, doc: document, env: globalThis });
  var grid = mountGridActions({ app, data, downloads, capabilities, doc: document, env: globalThis });
  var riPanel = mountRiPanel({
    app,
    settings,
    capabilities,
    downloads,
    metrics,
    data,
    workspace,
    layout,
    version: VERSION,
    doc: document,
    env: globalThis
  });
  var activityIndicator = mountActivityIndicator({
    activity,
    workspace,
    doc: document,
    onAction(item) {
      if (item.action === "open-settings") riPanel.openSettings();
    }
  });
  app.services.layout = layout;
  app.adapters.stopRouteTracking = stopRouteTracking;
  app.adapters.stopStoreTracking = () => storeTracker.destroy();
  app.adapters.stopCaptureHandoff = stopCaptureHandoff;
  app.adapters.stopReelContextHandoff = () => reelContextHandoff.destroy();
  app.adapters.stopRendererHandoff = () => rendererHandoff.destroy();
  app.adapters.stopData = () => data.destroy();
  app.adapters.stopLayout = () => layout.destroy();
  app.adapters.grid = grid;
  app.adapters.riPanel = riPanel;
  app.adapters.activityIndicator = activityIndicator;
  void settings.init().catch((error) => {
    console.warn("[RI] settings initialization failed", error);
  });
})();
