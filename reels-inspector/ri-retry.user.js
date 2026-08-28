// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      3.1.2
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '3.1.2';
    var UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';
    var CACHE_KEY = 'ri311:items:v1';
    var SNAP_KEY = 'ri311:snap:v1';
    var POST_KEY = 'ri311:posts:v1';
    var SOURCE_RANK = { legacy: 1, permalink: 2, dom: 3, embedded: 4, network: 5 };
    var METRIC_FIELDS = { views: 1, likes: 1, comments: 1, reposts: 1 };
    var VIEW_KEYS = ['play_count','ig_play_count','video_play_count','video_view_count','view_count','clips_play_count','reel_view_count','media_view_count','views','plays'];

    var items = readStore(CACHE_KEY, {});
    var videoMap = Object.create(null);
    var posterMap = Object.create(null);
    var pending = Object.create(null);
    var queue = [];
    var activeRequests = 0;
    var storeWriteTimer = 0;
    var refreshTimer = 0;
    var seenScripts = new WeakSet();
    var lastEmbeddedScan = 0;
    var lastHistorySignature = '';
    var panelOpen = false;
    var panelContext = null;
    var currentContextKey = '';
    var appBannerCacheAt = 0;
    var appBannerTop = Infinity;

    function readStore(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function writeStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function scheduleStoreWrite() {
        if (storeWriteTimer) return;
        storeWriteTimer = setTimeout(function () {
            storeWriteTimer = 0;
            writeStore(CACHE_KEY, items);
        }, 300);
    }

    function codeFromUrl(url) {
        var m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : '';
    }

    function isReelUrl(url) {
        return /\/(?:reel|reels)\/[A-Za-z0-9_-]+/.test(String(url || ''));
    }

    function normalizeUrl(url) {
        if (!url || /^blob:/i.test(url)) return '';
        try {
            var u = new URL(String(url).replace(/\\u0026/g, '&').replace(/\\\//g, '/'), location.href);
            return u.hostname + u.pathname;
        } catch (e) { return ''; }
    }

    function parseCount(text) {
        var s = String(text || '').replace(/[▶♥●↻,\s]/g, '');
        var m = s.match(/^([0-9]+(?:\.[0-9]+)?)(만|천|억|K|M|B|k|m|b)?$/);
        var n, unit;
        if (!m) return null;
        n = Number(m[1]);
        unit = m[2] || '';
        if (unit === '천' || /[Kk]/.test(unit)) n *= 1000;
        else if (unit === '만') n *= 10000;
        else if (unit === '억') n *= 100000000;
        else if (/[Mm]/.test(unit)) n *= 1000000;
        else if (/[Bb]/.test(unit)) n *= 1000000000;
        return Math.round(n);
    }

    function fmt(n) {
        n = Number(n);
        if (!isFinite(n) || n <= 0) return '';
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(Math.round(n));
    }

    function fmtPercent(n) {
        n = Number(n);
        if (!isFinite(n)) return '';
        return (Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/0+$/, '').replace(/\.$/, '') + '%';
    }

    function fmtMultiple(n) {
        n = Number(n);
        if (!isFinite(n) || n <= 0) return '';
        return '×' + n.toFixed(n >= 10 ? 1 : 2).replace(/0+$/, '').replace(/\.$/, '');
    }

    function visible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    }

    function sourceRank(source) {
        return SOURCE_RANK[source] || 0;
    }

    function fieldValue(item, key) {
        var f = item && item.fields && item.fields[key];
        if (f && (f.status === 'verified' || f.status === 'conflict')) return f.value;
        return item && item[key] != null ? item[key] : null;
    }

    function markConflict(item, key, oldField, incoming, source) {
        item.conflicts = item.conflicts || {};
        item.conflicts[key] = {
            previous: oldField.value,
            incoming: incoming,
            source: source,
            at: Date.now()
        };
        item.fields[key] = {
            value: oldField.value,
            source: oldField.source,
            confidence: oldField.confidence,
            status: 'conflict',
            updatedAt: Date.now()
        };
        item[key] = oldField.value;
        return true;
    }

    function setField(item, key, value, source, confidence) {
        var old, newRank, oldRank, a, b, age;
        if (value == null || value === '') return false;
        item.fields = item.fields || {};
        old = item.fields[key] || null;
        newRank = sourceRank(source);
        oldRank = old ? sourceRank(old.source) : -1;

        if (old && (old.status === 'verified' || old.status === 'conflict') && String(old.value) !== String(value)) {
            if (newRank < oldRank) return false;
            if (METRIC_FIELDS[key]) {
                a = Number(old.value);
                b = Number(value);
                age = Date.now() - Number(old.updatedAt || 0);
                if (a > 0 && ((b < a && a - b > Math.max(5, a * 0.02)) || (age < 120000 && a > 100 && b > a * 20))) {
                    return markConflict(item, key, old, value, source);
                }
            } else if (key !== 'videoUrl' && key !== 'thumbUrl' && !(key === 'mediaType' && old.value === 'VIDEO' && value === 'REEL') && newRank <= oldRank) {
                return markConflict(item, key, old, value, source);
            }
        }

        if (old && String(old.value) === String(value) && newRank <= oldRank && old.status === 'verified') return false;

        item.fields[key] = {
            value: value,
            source: source || 'dom',
            confidence: confidence || (newRank >= 4 ? 'high' : 'medium'),
            status: 'verified',
            updatedAt: Date.now()
        };
        item[key] = value;
        if (item.conflicts) delete item.conflicts[key];
        return true;
    }

    function saveItem(code, patch, source, confidence) {
        var item, keys, i, key, changed = false;
        if (!code) return null;
        item = items[code] || { code: code, fields: {}, conflicts: {} };
        patch = patch || {};
        if (!patch.mediaType && isReelUrl(patch.pageUrl || patch.canonicalUrl || '')) patch.mediaType = 'REEL';
        keys = ['views','likes','comments','reposts','date','owner','videoUrl','thumbUrl','mediaId','ownerId','mediaType','productType','canonicalUrl'];
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            if (patch[key] != null && patch[key] !== '' && setField(item, key, patch[key], source, confidence)) changed = true;
        }
        if (patch.pageUrl) item.pageUrl = patch.pageUrl;
        if (patch.fetched) item.fetched = patch.fetched;
        item.seen = Date.now();
        item.identity = {
            shortcode: code,
            mediaId: fieldValue(item, 'mediaId') || '',
            ownerId: fieldValue(item, 'ownerId') || '',
            username: fieldValue(item, 'owner') || '',
            mediaType: fieldValue(item, 'mediaType') || '',
            productType: fieldValue(item, 'productType') || '',
            canonicalUrl: fieldValue(item, 'canonicalUrl') || item.pageUrl || '',
            state: fieldValue(item, 'mediaType') && fieldValue(item, 'owner') ? 'IDENTIFIED' : 'IDENTIFYING'
        };
        items[code] = item;
        if (changed) {
            scheduleStoreWrite();
            recordSnapshot(code, fieldValue(item, 'views'));
            recordPost(item);
            scheduleRefresh();
        }
        return item;
    }

    function recordSnapshot(code, views) {
        var store, arr, last, now = Date.now();
        views = Number(views);
        if (!code || !views) return;
        store = readStore(SNAP_KEY, {});
        arr = Array.isArray(store[code]) ? store[code] : [];
        last = arr.length ? arr[arr.length - 1] : null;
        if (!last || now - Number(last.t || 0) >= 1800000 || Number(last.v) !== views) arr.push({ t: now, v: views });
        arr = arr.filter(function (x) { return now - Number(x.t || 0) <= 1209600000; }).slice(-80);
        store[code] = arr;
        writeStore(SNAP_KEY, store);
    }

    function growth24h(code, views) {
        var arr = readStore(SNAP_KEY, {})[code] || [];
        var now = Date.now(), best = null, bestDelta = Infinity, i, age, delta;
        views = Number(views);
        if (!code || !views) return null;
        for (i = 0; i < arr.length; i++) {
            age = now - Number(arr[i].t || 0);
            if (age < 64800000 || age > 115200000) continue;
            delta = Math.abs(age - 86400000);
            if (delta < bestDelta) { bestDelta = delta; best = arr[i]; }
        }
        if (!best || !Number(best.v) || views < Number(best.v)) return null;
        return (views - Number(best.v)) / Number(best.v) * 100;
    }

    function recordPost(item) {
        var owner, views, store, keys;
        if (!item || !item.code) return;
        owner = String(fieldValue(item, 'owner') || '').toLowerCase();
        views = Number(fieldValue(item, 'views'));
        if (!owner || !views) return;
        store = readStore(POST_KEY, {});
        store[item.code] = { code: item.code, owner: owner, views: views, t: Date.now() };
        keys = Object.keys(store);
        if (keys.length > 500) {
            keys.sort(function (a, b) { return Number(store[b].t || 0) - Number(store[a].t || 0); });
            keys.slice(500).forEach(function (k) { delete store[k]; });
        }
        writeStore(POST_KEY, store);
    }

    function accountMultiple(code, owner, views) {
        var store, list = [], keys, vals, mid, median;
        owner = String(owner || '').toLowerCase();
        views = Number(views);
        if (!owner || !views) return null;
        store = readStore(POST_KEY, {});
        keys = Object.keys(store);
        keys.forEach(function (k) {
            var d = store[k];
            if (k !== code && d && String(d.owner || '').toLowerCase() === owner && Number(d.views)) list.push(d);
        });
        list.sort(function (a, b) { return Number(b.t || 0) - Number(a.t || 0); });
        list = list.slice(0, 20);
        if (list.length < 5) return null;
        vals = list.map(function (x) { return Number(x.views); }).sort(function (a, b) { return a - b; });
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
        var pt = String(obj && (obj.product_type || obj.productType) || '').toLowerCase();
        if (/reel|clips/.test(pt)) return 'REEL';
        if (mt === 8 || (obj && Array.isArray(obj.carousel_media))) return 'CAROUSEL';
        if (mt === 2 || (obj && (obj.video_versions || obj.video_url))) return 'VIDEO';
        if (mt === 1) return 'PHOTO';
        return '';
    }

    function directNumber(obj, keys) {
        var i;
        if (!obj || typeof obj !== 'object') return null;
        for (i = 0; i < keys.length; i++) {
            if (obj[keys[i]] != null && isFinite(Number(obj[keys[i]]))) return Number(obj[keys[i]]);
        }
        return null;
    }

    function sameMediaNumber(obj, keys, code, depth) {
        var n, names, i, child, childCode;
        if (!obj || typeof obj !== 'object' || depth > 2) return null;
        n = directNumber(obj, keys);
        if (n != null) return n;
        names = Object.keys(obj);
        for (i = 0; i < names.length && i < 80; i++) {
            child = obj[names[i]];
            if (!child || typeof child !== 'object' || Array.isArray(child)) continue;
            childCode = child.code || child.shortcode || child.short_code || '';
            if (childCode && childCode !== code) continue;
            n = sameMediaNumber(child, keys, code, depth + 1);
            if (n != null) return n;
        }
        return null;
    }

    function collectUrls(obj, code, videos, images, depth) {
        if (!obj || typeof obj !== 'object' || depth > 3) return;
        Object.keys(obj).slice(0, 130).forEach(function (key) {
            var value = obj[key], childCode;
            if (typeof value === 'string' && /^https?:/i.test(value)) {
                if (/^(video_url|video_src|playback_url)$/i.test(key) || /\.mp4(?:\?|$)/i.test(value)) videos.push(value);
                else if (/image|thumbnail|display|poster|image_url|src/i.test(key) && !/\.mp4/i.test(value)) images.push(value);
            } else if (value && typeof value === 'object') {
                childCode = value.code || value.shortcode || value.short_code || '';
                if (!childCode || childCode === code) collectUrls(value, code, videos, images, depth + 1);
            }
        });
    }

    function rememberObject(obj, source) {
        var code, patch = {}, n, user, videos = [], images = [], i, key, type;
        if (!obj || typeof obj !== 'object') return;
        code = obj.code || obj.shortcode || obj.short_code;
        if (!code || typeof code !== 'string' || code.length < 5 || code.length > 40) return;

        n = sameMediaNumber(obj, VIEW_KEYS, code, 0); if (n != null) patch.views = n;
        n = sameMediaNumber(obj, ['like_count','likes_count'], code, 0); if (n != null) patch.likes = n;
        n = sameMediaNumber(obj, ['comment_count','comments_count'], code, 0); if (n != null) patch.comments = n;
        n = sameMediaNumber(obj, ['reshare_count','repost_count','reposts_count'], code, 0); if (n != null) patch.reposts = n;
        n = sameMediaNumber(obj, ['taken_at','taken_at_timestamp'], code, 0);
        if (n) { try { patch.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e) {} }

        user = obj.user || obj.owner || obj.owner_user;
        if (user && user.username) patch.owner = String(user.username).toLowerCase();
        if (obj.pk || obj.id || obj.media_id) patch.mediaId = String(obj.pk || obj.id || obj.media_id);
        if (obj.user_id || obj.owner_id || (user && (user.pk || user.id))) patch.ownerId = String(obj.user_id || obj.owner_id || user.pk || user.id);
        type = detectMediaType(obj); if (type) patch.mediaType = type;
        if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);

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
        saveItem(code, patch, source || 'embedded', source === 'network' ? 'high' : 'medium');
    }

    function walkJson(obj, depth, state, source) {
        if (!obj || typeof obj !== 'object' || depth > 10 || state.count > 30000) return;
        state.count++;
        rememberObject(obj, source);
        Object.keys(obj).slice(0, 180).forEach(function (key) {
            var value = obj[key];
            if (value && typeof value === 'object') walkJson(value, depth + 1, state, source);
        });
    }

    function scanJsonText(text, source) {
        if (!text || text.length > 12000000) return;
        try {
            walkJson(JSON.parse(String(text).replace(/^for\s*\(;;\);\s*/, '')), 0, { count: 0 }, source || 'embedded');
        } catch (e) {}
    }

    function hookNetwork() {
        var originalFetch = window.fetch;
        var XHR = window.XMLHttpRequest;
        if (originalFetch && !originalFetch.__ri312) {
            window.fetch = function () {
                return originalFetch.apply(this, arguments).then(function (response) {
                    try {
                        var url = response.url || '';
                        var ct = response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '';
                        if (/json/i.test(ct) || /graphql|api|clips|reels|media/i.test(url)) {
                            response.clone().text().then(function (text) { scanJsonText(text, 'network'); }).catch(function () {});
                        }
                    } catch (e) {}
                    return response;
                });
            };
            window.fetch.__ri312 = true;
        }
        if (XHR && !XHR.prototype.__ri312) {
            var originalOpen = XHR.prototype.open;
            var originalSend = XHR.prototype.send;
            XHR.prototype.open = function () {
                this.__ri312url = arguments[1] || '';
                return originalOpen.apply(this, arguments);
            };
            XHR.prototype.send = function () {
                this.addEventListener('load', function () {
                    try {
                        var ct = this.getResponseHeader('content-type') || '';
                        if ((/json/i.test(ct) || /graphql|api|clips|reels|media/i.test(this.__ri312url || '')) && typeof this.responseText === 'string') {
                            scanJsonText(this.responseText, 'network');
                        }
                    } catch (e) {}
                });
                return originalSend.apply(this, arguments);
            };
            XHR.prototype.__ri312 = true;
        }
    }

    function scanEmbedded(force) {
        var now = Date.now(), signature, scripts, i, text;
        if (!force && now - lastEmbeddedScan < 700) return;
        lastEmbeddedScan = now;
        signature = location.href;
        try { signature += '|' + Object.keys(history.state || {}).slice(0, 12).join(','); } catch (e) {}
        if (force || signature !== lastHistorySignature) {
            lastHistorySignature = signature;
            try { if (history.state) walkJson(history.state, 0, { count: 0 }, 'embedded'); } catch (e) {}
        }
        scripts = document.scripts || [];
        for (i = 0; i < scripts.length && i < 320; i++) {
            if (seenScripts.has(scripts[i])) continue;
            seenScripts.add(scripts[i]);
            text = scripts[i].textContent || '';
            if (text && (scripts[i].type === 'application/json' || /"(?:code|shortcode|media_type|play_count|view_count)"/.test(text))) scanJsonText(text, 'embedded');
        }
    }

    function nearMetric(text, code, keys) {
        var p = text.indexOf(code), area, i, m;
        if (p < 0) return null;
        area = text.slice(Math.max(0, p - 18000), Math.min(text.length, p + 30000));
        for (i = 0; i < keys.length; i++) {
            m = area.match(new RegExp('["\\\\]?' + keys[i] + '["\\\\]?\\s*:\\s*["\\\\]?([0-9]+)', 'i'));
            if (m) return Number(m[1]);
        }
        return null;
    }

    function parsePermalink(html, url) {
        var code = codeFromUrl(url), patch = { pageUrl: url, canonicalUrl: url }, doc, meta, desc = '', m, n, hasVideo = false;
        try {
            doc = new DOMParser().parseFromString(html, 'text/html');
            meta = doc.querySelector('meta[name="description"],meta[property="og:description"]');
            desc = meta ? (meta.getAttribute('content') || '') : '';
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i); if (m) patch.likes = parseCount(m[1]);
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i); if (m) patch.comments = parseCount(m[1]);
            meta = doc.querySelector('meta[property="og:image"]'); if (meta) patch.thumbUrl = meta.getAttribute('content') || '';
            meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]');
            if (meta && meta.getAttribute('content')) { patch.videoUrl = meta.getAttribute('content'); hasVideo = true; }
        } catch (e) {}

        if (isReelUrl(url)) patch.mediaType = 'REEL';
        else if (hasVideo) patch.mediaType = 'VIDEO';

        if (patch.mediaType === 'REEL' || patch.mediaType === 'VIDEO') patch.views = nearMetric(html, code, VIEW_KEYS);
        if (patch.likes == null) patch.likes = nearMetric(html, code, ['like_count','likes_count']);
        if (patch.comments == null) patch.comments = nearMetric(html, code, ['comment_count','comments_count']);
        patch.reposts = nearMetric(html, code, ['reshare_count','repost_count','reposts_count']);
        n = nearMetric(html, code, ['taken_at','taken_at_timestamp']);
        if (n) { try { patch.date = new Date(n * 1000).toISOString().slice(0,10); } catch (e) {} }
        return patch;
    }

    function enqueue(url, callback) {
        var code = codeFromUrl(url);
        if (!code) return;
        if (items[code] && Date.now() - Number(items[code].fetched || 0) < 300000) {
            if (callback) callback(items[code]);
            return;
        }
        if (pending[code]) {
            if (callback) pending[code].push(callback);
            return;
        }
        pending[code] = callback ? [callback] : [];
        queue.push({ url: url, code: code });
        pumpQueue();
    }

    function finishPending(code, data) {
        var callbacks = pending[code] || [];
        delete pending[code];
        callbacks.forEach(function (fn) { try { fn(data); } catch (e) {} });
    }

    function pumpQueue() {
        while (activeRequests < 2 && queue.length) {
            var job = queue.shift();
            var xhr = new XMLHttpRequest();
            activeRequests++;
            (function (job, xhr) {
                xhr.open('GET', job.url, true);
                xhr.withCredentials = true;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4) return;
                    activeRequests--;
                    if (xhr.status >= 200 && xhr.status < 400) {
                        var patch = parsePermalink(xhr.responseText || '', job.url);
                        patch.fetched = Date.now();
                        saveItem(job.code, patch, 'permalink', 'medium');
                    }
                    finishPending(job.code, items[job.code] || null);
                    pumpQueue();
                };
                try { xhr.send(); }
                catch (e) {
                    activeRequests--;
                    finishPending(job.code, items[job.code] || null);
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
            text = (elements[i].textContent || '').trim();
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

    function mediaIcon(video) {
        if (video) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>';
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M4 17l5-5 4 4 2-2 5 5"/></svg>';
    }

    function openUrl(url) {
        if (!url) return;
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function cardDomType(anchor) {
        var text = '', nodes, i;
        if (!anchor) return '';
        if (anchor.querySelector('video')) return 'VIDEO';
        nodes = anchor.querySelectorAll('svg[aria-label],svg[title],[aria-label],[title]');
        for (i = 0; i < nodes.length && i < 30; i++) {
            text += ' ' + (nodes[i].getAttribute('aria-label') || '') + ' ' + (nodes[i].getAttribute('title') || '');
        }
        text = text.toLowerCase();
        if (/reel|릴스/.test(text)) return 'REEL';
        if (/video|동영상|비디오|play|재생/.test(text)) return 'VIDEO';
        if (/carousel|multiple|여러|슬라이드/.test(text)) return 'CAROUSEL';
        return '';
    }

    function effectiveCardType(anchor, data) {
        var stored = String(fieldValue(data, 'mediaType') || '').toUpperCase();
        var domType = cardDomType(anchor);
        if (stored === 'REEL' || stored === 'VIDEO' || stored === 'PHOTO' || stored === 'CAROUSEL') return stored;
        if (isReelUrl(anchor && anchor.href)) return 'REEL';
        if (domType) return domType;
        return /\/p\//.test(String(anchor && anchor.href || '')) ? 'POST' : '';
    }

    function isVideoCard(anchor, data) {
        var type = effectiveCardType(anchor, data);
        return type === 'REEL' || type === 'VIDEO';
    }

    function ensureGridCard(anchor, code) {
        var box, actions, imageButton, videoButton;
        if (anchor.dataset.ri312Code !== code) {
            anchor.dataset.ri312Code = code;
            anchor.dataset.ri312Render = '';
        }
        if (anchor.dataset.ri312Ready === '1' && anchor.querySelector('.ri3-grid-box') && anchor.querySelector('.ri3-grid-actions')) return;
        anchor.dataset.ri312Ready = '1';
        anchor.style.position = anchor.style.position || 'relative';

        box = document.createElement('div');
        box.className = 'ri3-grid-box';
        box.innerHTML = '<div class="ri3-grid-row1"></div><div class="ri3-grid-row2"></div>';
        anchor.appendChild(box);

        actions = document.createElement('div');
        actions.className = 'ri3-grid-actions';
        imageButton = document.createElement('button');
        videoButton = document.createElement('button');
        imageButton.type = videoButton.type = 'button';
        imageButton.className = 'ri3-grid-image';
        videoButton.className = 'ri3-grid-video';
        imageButton.setAttribute('aria-label', '원본 이미지');
        videoButton.setAttribute('aria-label', '순수 영상');
        imageButton.innerHTML = mediaIcon(false);
        videoButton.innerHTML = mediaIcon(true);

        [imageButton, videoButton].forEach(function (button) {
            button.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
        });
        imageButton.addEventListener('click', function () {
            var d = items[anchor.dataset.ri312Code] || {};
            var img = anchor.querySelector('img');
            openUrl(fieldValue(d, 'thumbUrl') || (img && (img.currentSrc || img.src)) || '');
        });
        videoButton.addEventListener('click', function () {
            var d = items[anchor.dataset.ri312Code] || {};
            openUrl(fieldValue(d, 'videoUrl') || '');
        });
        actions.appendChild(imageButton);
        actions.appendChild(videoButton);
        anchor.appendChild(actions);
    }

    function renderGridCard(anchor, data) {
        var row1 = anchor.querySelector('.ri3-grid-row1');
        var row2 = anchor.querySelector('.ri3-grid-row2');
        var views = fieldValue(data, 'views');
        var likes = fieldValue(data, 'likes');
        var comments = fieldValue(data, 'comments');
        var reposts = fieldValue(data, 'reposts');
        var date = fieldValue(data, 'date');
        var videoCard = isVideoCard(anchor, data);
        var type = effectiveCardType(anchor, data);
        var er = videoCard ? engagement(views, likes, comments, reposts) : null;
        var growth = videoCard && views ? growth24h(data.code, views) : null;
        var multiple = videoCard && views ? accountMultiple(data.code, fieldValue(data, 'owner'), views) : null;
        var line1 = [], line2 = [], key, actions, videoButton, safe;
        if (!row1 || !row2) return;

        key = [type, views, likes, comments, reposts, date, er, growth, multiple].join('|');
        if (anchor.dataset.ri312Render !== key) {
            if (videoCard && views) line1.push('▶' + fmt(views));
            if (likes != null) line1.push('♥' + fmt(likes));
            if (comments != null) line1.push('●' + fmt(comments));
            if (reposts != null) line1.push('↻' + fmt(reposts));
            if (er != null) line2.push(fmtPercent(er));
            if (growth != null) line2.push((growth >= 0 ? '+' : '') + fmtPercent(growth));
            if (multiple != null) line2.push(fmtMultiple(multiple));
            if (date) line2.push(String(date).slice(5).replace('-', '/'));

            row1.textContent = line1.join(' ');
            row2.textContent = line2.join(' ');
            row1.style.display = line1.length ? 'flex' : 'none';
            row2.style.display = line2.length ? 'flex' : 'none';
            anchor.dataset.ri312Render = key;
        }

        actions = anchor.querySelector('.ri3-grid-actions');
        videoButton = anchor.querySelector('.ri3-grid-video');
        if (videoButton) videoButton.style.display = videoCard ? 'flex' : 'none';

        safe = gridSafe(anchor);
        if (anchor.querySelector('.ri3-grid-box')) anchor.querySelector('.ri3-grid-box').style.visibility = safe ? 'visible' : 'hidden';
        if (actions) actions.style.visibility = safe ? 'visible' : 'hidden';
    }

    function scanGrid() {
        var anchors, i, anchor, code, data, url;
        if (/^\/(?:reel|reels|p)\//.test(location.pathname)) return;
        anchors = document.querySelectorAll('main a[href*="/reel/"],main a[href*="/reels/"],main a[href*="/p/"]');
        for (i = 0; i < anchors.length; i++) {
            anchor = anchors[i];
            if (!visible(anchor) && !gridSafe(anchor)) continue;
            code = codeFromUrl(anchor.href);
            if (!code) continue;
            ensureGridCard(anchor, code);
            data = items[code] || { code: code, fields: {} };
            renderGridCard(anchor, data);
            if (!data.fetched || Date.now() - Number(data.fetched || 0) > 300000) {
                url = anchor.href.split('?')[0];
                enqueue(url, (function (target, expectedCode) {
                    return function (d) {
                        if (codeFromUrl(target.href) !== expectedCode) return;
                        renderGridCard(target, d || { code: expectedCode, fields: {} });
                    };
                })(anchor, code));
            }
        }
    }

    function activeVideo() {
        var videos = document.querySelectorAll('video'), best = null, bestScore = -Infinity, i, r, w, h, area, centerY, score;
        for (i = 0; i < videos.length; i++) {
            r = videos[i].getBoundingClientRect();
            w = Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left));
            h = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
            area = w * h;
            if (area < innerWidth * innerHeight * 0.20) continue;
            centerY = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
            score = area - Math.abs(centerY - innerHeight / 2) * innerWidth * 1.5 + (!videos[i].paused ? innerWidth * innerHeight * 0.20 : 0);
            if (score > bestScore) { bestScore = score; best = videos[i]; }
        }
        return best;
    }

    function controlLabel(el) {
        var svg = el && el.querySelector ? el.querySelector('svg[aria-label],svg[title]') : null;
        return [
            (el && el.getAttribute && el.getAttribute('aria-label')) || '',
            (el && el.getAttribute && el.getAttribute('title')) || '',
            (svg && svg.getAttribute('aria-label')) || '',
            (svg && svg.getAttribute('title')) || '',
            (el && el.textContent) || ''
        ].join(' ').toLowerCase();
    }

    function rightRailControls() {
        var elements = document.querySelectorAll('button,[role="button"],a'), out = [], i, r, text;
        for (i = 0; i < elements.length; i++) {
            if (!visible(elements[i])) continue;
            r = elements[i].getBoundingClientRect();
            if (r.left < innerWidth * 0.66 || r.top < innerHeight * 0.18 || r.bottom > innerHeight * 0.92 || r.width > 120 || r.height > 120) continue;
            text = controlLabel(elements[i]);
            if (/좋아요|\blike\b|댓글|comment|리포스트|repost|reshare|공유|share|send|더\s*보기|more|options/.test(text)) out.push({ el: elements[i], r: r, text: text });
        }
        return out.sort(function (a, b) { return a.r.top - b.r.top; });
    }

    function nativeMetrics() {
        var controls = rightRailControls(), out = { likes: null, comments: null, reposts: null };
        controls.forEach(function (control) {
            var node = control.el.closest && control.el.closest('button,[role="button"],a') || control.el;
            var text = (node.parentElement && node.parentElement.textContent) || node.textContent || '';
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
            m = (links[i].getAttribute('href') || '').match(/^\/([A-Za-z0-9._]+)\/?$/);
            if (!m || /^(accounts|explore|reels|reel|p|direct|stories)$/i.test(m[1]) || !visible(links[i])) continue;
            r = links[i].getBoundingClientRect();
            if (r.top > innerHeight * 0.5 && r.left < innerWidth * 0.72) return m[1].toLowerCase();
        }
        return '';
    }

    function mappedCode(video) {
        var urls = [video.currentSrc || '', video.src || '', video.poster || ''], i, key;
        for (i = 0; i < urls.length; i++) {
            key = normalizeUrl(urls[i]);
            if (key && (videoMap[key] || posterMap[key])) return videoMap[key] || posterMap[key];
        }
        return '';
    }

    function reelContext() {
        var video = activeVideo(), r, code = '', metrics, owner, candidates = [], keys;
        if (!video) return null;
        r = video.getBoundingClientRect();
        if (Math.min(innerHeight, r.bottom) - Math.max(0, r.top) < innerHeight * 0.55) return null;
        if (isReelUrl(location.href)) code = codeFromUrl(location.href);
        if (!code) code = mappedCode(video);
        metrics = nativeMetrics();
        owner = visibleUsername();
        if (!code) {
            keys = Object.keys(items);
            keys.forEach(function (key) {
                var d = items[key], score = 0, likes = fieldValue(d, 'likes'), comments = fieldValue(d, 'comments');
                if (owner && fieldValue(d, 'owner') === owner) score += 10;
                if (metrics.likes != null && likes != null && Math.abs(metrics.likes - likes) <= Math.max(2, metrics.likes * 0.04)) score += 8;
                if (metrics.comments != null && comments != null && Math.abs(metrics.comments - comments) <= Math.max(2, metrics.comments * 0.04)) score += 8;
                if (score >= 18) candidates.push({ code: key, score: score });
            });
            candidates.sort(function (a, b) { return b.score - a.score; });
            if (candidates[0]) code = candidates[0].code;
        }
        if (code) saveItem(code, {
            owner: owner || undefined,
            mediaType: 'REEL',
            pageUrl: 'https://www.instagram.com/reel/' + code + '/',
            canonicalUrl: 'https://www.instagram.com/reel/' + code + '/'
        }, 'dom', 'high');
        return { video: video, code: code || '', native: metrics, owner: owner, status: code ? 'IDENTIFIED' : 'IDENTIFYING' };
    }

    function ensureOverlay() {
        var box = document.getElementById('ri3-reels-overlay');
        if (!box) {
            box = document.createElement('div');
            box.id = 'ri3-reels-overlay';
            document.documentElement.appendChild(box);
        }
        return box;
    }

    function renderReelOverlay(ctx) {
        var box = ensureOverlay(), data, views, er, growth, multiple, lines = [], key;
        if (!ctx || !ctx.code) { box.style.display = 'none'; return; }
        data = items[ctx.code] || {};
        views = fieldValue(data, 'views');
        er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
        growth = views ? growth24h(ctx.code, views) : null;
        multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue(data, 'owner'), views) : null;
        if (views) lines.push('▶ ' + fmt(views));
        if (er != null) lines.push('ER ' + fmtPercent(er));
        if (growth != null) lines.push('24h ' + (growth >= 0 ? '+' : '') + fmtPercent(growth));
        if (multiple != null) lines.push(fmtMultiple(multiple));
        if (fieldValue(data, 'date')) lines.push(String(fieldValue(data, 'date')).slice(5).replace('-', '/'));
        key = lines.join('|');
        if (box.dataset.ri312Render !== key) {
            box.innerHTML = '';
            lines.forEach(function (text) { var row = document.createElement('div'); row.textContent = text; box.appendChild(row); });
            box.dataset.ri312Render = key;
        }
        box.style.display = lines.length ? 'flex' : 'none';
    }

    function moreButton() {
        var controls = rightRailControls(), i;
        for (i = controls.length - 1; i >= 0; i--) if (/더\s*보기|more|options/.test(controls[i].text)) return controls[i].el;
        return null;
    }

    function ensureTool(ctx) {
        var button = document.getElementById('ri3-tool'), more, r;
        if (!ctx) {
            if (button) button.remove();
            closePanel();
            return;
        }
        if (!button) {
            button = document.createElement('button');
            button.id = 'ri3-tool';
            button.type = 'button';
            button.setAttribute('aria-label', '리서치 도구');
            button.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';
            button.addEventListener('click', function () { panelOpen ? closePanel() : openPanel(reelContext()); });
            document.documentElement.appendChild(button);
        }
        more = moreButton();
        if (more) {
            r = more.getBoundingClientRect();
            button.style.left = Math.max(4, Math.min(innerWidth - 40, r.left + r.width / 2 - 17)) + 'px';
            button.style.top = Math.min(innerHeight - 44, r.bottom + 4) + 'px';
            button.style.right = 'auto';
            button.style.bottom = 'auto';
        } else {
            button.style.left = 'auto';
            button.style.top = 'auto';
            button.style.right = '12px';
            button.style.bottom = '74px';
        }
    }

    function closePanel() {
        var panel = document.getElementById('ri3-panel');
        if (panel) panel.remove();
        panelOpen = false;
        panelContext = null;
    }

    function panelRow(parent, label, value) {
        var row = document.createElement('div');
        row.className = 'ri3-panel-row';
        row.innerHTML = '<span></span><strong></strong>';
        row.children[0].textContent = label;
        row.children[1].textContent = value || '—';
        parent.appendChild(row);
    }

    function renderPanel(ctx) {
        var panel = document.getElementById('ri3-panel'), body, data, views, er, growth, multiple, media = '';
        if (!panel || !ctx) return;
        body = panel.querySelector('.ri3-panel-body');
        data = ctx.code ? (items[ctx.code] || {}) : {};
        views = fieldValue(data, 'views');
        er = engagement(views, ctx.native.likes, ctx.native.comments, ctx.native.reposts);
        growth = views ? growth24h(ctx.code, views) : null;
        multiple = views ? accountMultiple(ctx.code, ctx.owner || fieldValue(data, 'owner'), views) : null;
        if (ctx.video && isFinite(ctx.video.duration) && ctx.video.duration > 0) media = ctx.video.duration.toFixed(1) + '초';
        if (ctx.video && ctx.video.videoWidth && ctx.video.videoHeight) media += (media ? ' · ' : '') + ctx.video.videoWidth + '×' + ctx.video.videoHeight;
        body.innerHTML = '';
        if (!ctx.code) panelRow(body, '상태', '현재 릴스 식별 중');
        panelRow(body, '조회수', views ? fmt(views) : '확인 중');
        panelRow(body, '좋아요', ctx.native.likes != null ? fmt(ctx.native.likes) : '—');
        panelRow(body, '댓글', ctx.native.comments != null ? fmt(ctx.native.comments) : '—');
        panelRow(body, '리포스트', ctx.native.reposts != null ? fmt(ctx.native.reposts) : '—');
        panelRow(body, 'ER', er != null ? fmtPercent(er) : '—');
        panelRow(body, '24h', growth != null ? (growth >= 0 ? '+' : '') + fmtPercent(growth) : '—');
        panelRow(body, '계정 대비', multiple != null ? fmtMultiple(multiple) : '—');
        panelRow(body, '게시일', fieldValue(data, 'date') ? String(fieldValue(data, 'date')).slice(5).replace('-', '/') : '—');
        panelRow(body, '영상', media || '—');
    }

    function openPanel(ctx) {
        var panel, actions, entries;
        if (!ctx) return;
        closePanel();
        panelOpen = true;
        panelContext = ctx;
        panel = document.createElement('aside');
        panel.id = 'ri3-panel';
        panel.innerHTML = '<div class="ri3-panel-head"><b>리서치 상세</b><span>v' + VERSION + '</span></div><div class="ri3-panel-body"></div><div class="ri3-panel-actions"></div><button class="ri3-panel-close">× 닫기</button>';
        document.documentElement.appendChild(panel);
        actions = panel.querySelector('.ri3-panel-actions');
        entries = [
            ['순수 영상', function () {
                var latest = reelContext() || panelContext;
                var data = latest && latest.code ? (items[latest.code] || {}) : {};
                var url = (latest && latest.video && (latest.video.currentSrc || latest.video.src)) || fieldValue(data, 'videoUrl') || '';
                if (/^blob:/i.test(url)) url = fieldValue(data, 'videoUrl') || '';
                openUrl(url);
            }],
            ['썸네일', function () {
                var latest = reelContext() || panelContext;
                var data = latest && latest.code ? (items[latest.code] || {}) : {};
                openUrl(fieldValue(data, 'thumbUrl') || (latest && latest.video && latest.video.poster) || '');
            }],
            ['링크 복사', function () {
                var latest = reelContext() || panelContext;
                var text = latest && latest.code ? 'https://www.instagram.com/reel/' + latest.code + '/' : location.href;
                if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
            }],
            ['새 버전', function () { window.open(UPDATE_URL + '?ri=' + Date.now(), '_blank'); }]
        ];
        entries.forEach(function (entry) {
            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = entry[0];
            button.addEventListener('click', entry[1]);
            actions.appendChild(button);
        });
        panel.querySelector('.ri3-panel-close').addEventListener('click', closePanel);
        renderPanel(ctx);
    }

    function injectStyle() {
        if (document.getElementById('ri3-style')) return;
        var style = document.createElement('style');
        style.id = 'ri3-style';
        style.textContent = [
            '[id^="ri22"],#ri-tool,#ri-panel,#ri-detail-metrics{display:none!important}',
            '.ri3-grid-box{position:absolute;left:0;right:0;bottom:0;z-index:8;pointer-events:none;display:flex;flex-direction:column;gap:3px;padding:20px 5px 5px;box-sizing:border-box;background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.50))}',
            '.ri3-grid-row1,.ri3-grid-row2{display:none;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:clip}',
            '.ri3-grid-row1{color:#fff;font:780 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.42px;text-shadow:0 1px 2px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.78)}',
            '.ri3-grid-row2{color:#111;font:820 9.6px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.38px;-webkit-text-stroke:.6px rgba(255,255,255,.98);paint-order:stroke fill;text-shadow:0 0 2px #fff}',
            '.ri3-grid-actions{position:absolute;right:5px;top:5px;z-index:9;display:flex;flex-direction:column;gap:6px;visibility:visible}',
            '.ri3-grid-actions button{width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.28);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
            '#ri3-reels-overlay{position:fixed;right:60px;top:clamp(112px,16vh,170px);z-index:2147483600;width:74px;display:none;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;pointer-events:none;color:#fff;font:760 12px/1.08 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.72)}',
            '#ri3-tool{position:fixed;z-index:2147483602;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.12);color:#fff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}',
            '#ri3-panel{position:fixed;right:10px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));z-index:2147483647;width:min(46vw,190px);max-height:69vh;overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:rgba(14,14,14,.97);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
            '.ri3-panel-head{display:flex;align-items:center;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08)}.ri3-panel-head b{font-size:12px;flex:1}.ri3-panel-head span{font-size:8px;opacity:.5}',
            '.ri3-panel-row{display:flex;min-height:27px;align-items:center;font-size:10px}.ri3-panel-row span{flex:1;opacity:.65}.ri3-panel-row strong{font-size:11px}',
            '.ri3-panel-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-top:8px}.ri3-panel-actions button,.ri3-panel-close{min-height:38px;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.06);color:#fff}.ri3-panel-close{width:100%;margin-top:7px}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    function run() {
        var ctx, key;
        refreshTimer = 0;
        injectStyle();
        scanEmbedded(false);
        scanGrid();
        ctx = reelContext();
        key = ctx ? (ctx.code || 'unknown') + '|' + (ctx.owner || '') : '';
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
        history.pushState = function () {
            var result = originalPush.apply(this, arguments);
            lastHistorySignature = '';
            scanEmbedded(true);
            scheduleRefresh();
            return result;
        };
        history.replaceState = function () {
            var result = originalReplace.apply(this, arguments);
            lastHistorySignature = '';
            scanEmbedded(true);
            scheduleRefresh();
            return result;
        };
        addEventListener('popstate', function () { lastHistorySignature = ''; scanEmbedded(true); scheduleRefresh(); }, true);
    }

    function startObservers() {
        new MutationObserver(scheduleRefresh).observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['href','src','poster','aria-label','title']
        });
        addEventListener('scroll', scheduleRefresh, true);
        addEventListener('resize', scheduleRefresh, true);
        document.addEventListener('play', scheduleRefresh, true);
        document.addEventListener('loadedmetadata', scheduleRefresh, true);
    }

    hookNetwork();
    hookHistory();
    injectStyle();
    startObservers();
    scanEmbedded(true);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRefresh, { once: true });
    else scheduleRefresh();
})();
