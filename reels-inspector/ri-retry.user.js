// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      3.1.0
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '3.1.0';
    var UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';
    var CACHE_KEY = 'ri31:items:v1';
    var SNAP_KEY = 'ri31:snapshots:v1';
    var POST_KEY = 'ri31:posts:v1';
    var VIEW_KEYS = ['play_count','ig_play_count','video_play_count','video_view_count','view_count','clips_play_count','reel_view_count','media_view_count','views','plays'];
    var FIELD_KEYS = ['views','likes','comments','reposts','date','owner','videoUrl','thumbUrl','mediaId','ownerId','mediaType','productType'];
    var SOURCE_RANK = {legacy:1, permalink:2, dom:3, embedded:4, network:5};

    var items = readStore(CACHE_KEY, {});
    var videoMap = {};
    var posterMap = {};
    var seenScripts = new WeakSet();
    var queue = [];
    var pending = Object.create(null);
    var activeRequests = 0;
    var writeTimer = null;
    var uiTimer = null;
    var mutationObserver = null;
    var currentCtxKey = '';
    var panelOpen = false;
    var currentPanelCtx = null;

    function readStore(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function writeStoreNow() {
        writeTimer = null;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch (e) {}
    }

    function scheduleStoreWrite() {
        if (writeTimer) return;
        writeTimer = setTimeout(writeStoreNow, 220);
    }

    function writeOtherStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function codeFromUrl(url) {
        var m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : '';
    }

    function isReelUrl(url) {
        return /\/(?:reel|reels)\//.test(String(url || ''));
    }

    function mediaTypeFromUrl(url) {
        if (isReelUrl(url)) return 'REEL';
        if (/\/p\//.test(String(url || ''))) return 'POST';
        return '';
    }

    function parseCount(text) {
        var s = String(text || '').replace(/[▶♥●↻]/g, '').replace(/,/g, '').replace(/\s+/g, '');
        var m = s.match(/^([0-9]+(?:\.[0-9]+)?)(만|천|억|K|M|B|k|m|b)?$/);
        var n, u;
        if (!m) return null;
        n = Number(m[1]); u = m[2] || '';
        if (u === '천' || /[Kk]/.test(u)) n *= 1000;
        else if (u === '만') n *= 10000;
        else if (u === '억') n *= 100000000;
        else if (/[Mm]/.test(u)) n *= 1000000;
        else if (/[Bb]/.test(u)) n *= 1000000000;
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
        if (Math.abs(n) >= 10) return n.toFixed(1).replace(/\.0$/, '') + '%';
        return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%';
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

    function safeGridArea(anchor) {
        if (!anchor) return false;
        var r = anchor.getBoundingClientRect();
        return r.bottom > 145 && r.top < innerHeight - 125;
    }

    function normUrl(url) {
        if (!url || /^blob:/i.test(url)) return '';
        try {
            var u = new URL(String(url).replace(/\\u0026/g, '&').replace(/\\\//g, '/'), location.href);
            return u.hostname + u.pathname;
        } catch (e) { return ''; }
    }

    function sourceRank(source) { return SOURCE_RANK[source] || 0; }

    function fieldValue(item, key) {
        if (!item) return null;
        if (item.fields && item.fields[key] && item.fields[key].status === 'verified') return item.fields[key].value;
        return item[key] !== undefined ? item[key] : null;
    }

    function sameValue(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        return String(a) === String(b);
    }

    function applyField(item, key, value, source, confidence, status) {
        var old, nextRank, oldRank;
        if (value === undefined || value === null || value === '') return false;
        if (!item.fields) item.fields = {};
        old = item.fields[key] || null;
        nextRank = sourceRank(source);
        oldRank = old ? sourceRank(old.source) : -1;
        if (old && old.status === 'verified') {
            if (nextRank < oldRank) return false;
            if (nextRank === oldRank && old.updatedAt && Date.now() - old.updatedAt < 1500 && !sameValue(old.value, value)) return false;
        }
        if (old && sameValue(old.value, value) && old.source === source && old.status === (status || 'verified')) return false;
        item.fields[key] = {
            value: value,
            source: source || 'legacy',
            confidence: confidence || (nextRank >= 4 ? 'high' : nextRank >= 2 ? 'medium' : 'low'),
            status: status || 'verified',
            updatedAt: Date.now()
        };
        item[key] = value;
        return true;
    }

    function normalizeIdentity(code, patch) {
        var out = patch || {};
        out.code = code;
        if (!out.mediaType) out.mediaType = mediaTypeFromUrl(out.pageUrl || '');
        if (out.mediaType === 'POST' && isReelUrl(out.pageUrl || '')) out.mediaType = 'REEL';
        return out;
    }

    function persistItem(code, patch, source, confidence) {
        var item, changed = false, i, key, keys;
        if (!code) return null;
        item = items[code] || {code:code, fields:{}, seen:0};
        patch = normalizeIdentity(code, patch || {});
        for (i = 0; i < FIELD_KEYS.length; i++) {
            key = FIELD_KEYS[i];
            if (patch[key] !== undefined && patch[key] !== null && patch[key] !== '') {
                if (applyField(item, key, patch[key], source || 'legacy', confidence, 'verified')) changed = true;
            }
        }
        if (patch.pageUrl && item.pageUrl !== patch.pageUrl) { item.pageUrl = patch.pageUrl; changed = true; }
        if (patch.fetched && item.fetched !== patch.fetched) { item.fetched = patch.fetched; changed = true; }
        item.seen = Date.now();
        items[code] = item;
        keys = Object.keys(items);
        if (keys.length > 600) {
            keys.sort(function (a,b) { return Number(items[b].seen || 0) - Number(items[a].seen || 0); });
            for (i = 600; i < keys.length; i++) delete items[keys[i]];
        }
        if (changed) {
            scheduleStoreWrite();
            if (fieldValue(item,'views')) recordSnapshot(code, fieldValue(item,'views'));
            if (fieldValue(item,'owner') && fieldValue(item,'views')) recordPost(item);
            scheduleRefresh();
        }
        return item;
    }

    function engagement(data) {
        var views = Number(data && data.views);
        var likes = Number(data && data.likes || 0);
        var comments = Number(data && data.comments || 0);
        var reposts = Number(data && data.reposts || 0);
        if (!views || (!likes && !comments && !reposts)) return null;
        return (likes + comments + reposts) / views * 100;
    }

    function recordSnapshot(code, views) {
        var store, arr, last, now = Date.now();
        views = Number(views);
        if (!code || !views) return;
        store = readStore(SNAP_KEY, {});
        arr = Array.isArray(store[code]) ? store[code] : [];
        last = arr.length ? arr[arr.length - 1] : null;
        if (!last || now - Number(last.t || 0) >= 30 * 60 * 1000 || Number(last.v) !== views) arr.push({t:now,v:views});
        arr = arr.filter(function (x) { return now - Number(x.t || 0) <= 14 * 86400000; });
        if (arr.length > 80) arr = arr.slice(-80);
        store[code] = arr; writeOtherStore(SNAP_KEY, store);
    }

    function growth24h(code, views) {
        var arr = readStore(SNAP_KEY, {})[code] || [];
        var now = Date.now(), best = null, bestDelta = Infinity, i, age, delta;
        views = Number(views); if (!code || !views) return null;
        for (i = 0; i < arr.length; i++) {
            age = now - Number(arr[i].t || 0);
            if (age < 18 * 3600000 || age > 32 * 3600000) continue;
            delta = Math.abs(age - 86400000);
            if (delta < bestDelta) { bestDelta = delta; best = arr[i]; }
        }
        if (!best || !Number(best.v) || views < Number(best.v)) return null;
        return (views - Number(best.v)) / Number(best.v) * 100;
    }

    function recordPost(item) {
        var store, keys, i, owner, views, date;
        if (!item || !item.code) return;
        owner = String(fieldValue(item,'owner') || '').toLowerCase();
        views = Number(fieldValue(item,'views')); date = fieldValue(item,'date') || '';
        if (!owner || !views) return;
        store = readStore(POST_KEY, {});
        store[item.code] = {code:item.code,owner:owner,views:views,date:date,t:Date.now()};
        keys = Object.keys(store);
        if (keys.length > 500) {
            keys.sort(function (a,b) { return Number(store[b].t || 0) - Number(store[a].t || 0); });
            for (i = 500; i < keys.length; i++) delete store[keys[i]];
        }
        writeOtherStore(POST_KEY, store);
    }

    function median(arr) {
        var a = arr.slice().sort(function (x,y) { return x-y; }), m;
        if (!a.length) return null; m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
    }

    function accountMultiple(data) {
        var owner = String(data && data.owner || '').toLowerCase();
        var views = Number(data && data.views), store, list = [], keys, i, d, base;
        if (!owner || !views) return null;
        store = readStore(POST_KEY, {}); keys = Object.keys(store);
        for (i = 0; i < keys.length; i++) {
            d = store[keys[i]];
            if (!d || d.code === data.code || String(d.owner || '').toLowerCase() !== owner || !Number(d.views)) continue;
            list.push(d);
        }
        list.sort(function (a,b) { return Number(b.t || 0) - Number(a.t || 0); });
        list = list.slice(0,20);
        if (list.length < 5) return null;
        base = median(list.map(function (x) { return Number(x.views); }));
        return base ? views / base : null;
    }

    function directNumber(obj, keys) {
        var i, k;
        if (!obj || typeof obj !== 'object') return null;
        for (i = 0; i < keys.length; i++) {
            k = keys[i];
            if (obj[k] !== undefined && obj[k] !== null && isFinite(Number(obj[k]))) return Number(obj[k]);
        }
        return null;
    }

    function sameMediaNumber(obj, keys, code, depth) {
        var n, ks, i, v, childCode;
        if (!obj || typeof obj !== 'object' || depth > 2) return null;
        n = directNumber(obj, keys); if (n !== null) return n;
        ks = Object.keys(obj);
        for (i = 0; i < ks.length && i < 80; i++) {
            v = obj[ks[i]];
            if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
            childCode = v.code || v.shortcode || v.short_code || '';
            if (childCode && childCode !== code) continue;
            n = sameMediaNumber(v, keys, code, depth + 1); if (n !== null) return n;
        }
        return null;
    }

    function detectMediaType(obj) {
        var mt = Number(obj && (obj.media_type != null ? obj.media_type : obj.mediaType));
        var pt = String(obj && (obj.product_type || obj.productType) || '').toLowerCase();
        if (/clips|reel/.test(pt)) return 'REEL';
        if (mt === 8) return 'CAROUSEL';
        if (mt === 2) return 'VIDEO';
        if (mt === 1) return 'PHOTO';
        return '';
    }

    function ownerFromObject(obj) {
        var owner = obj && (obj.user || obj.owner || obj.owner_user);
        if (owner && owner.username) return String(owner.username).toLowerCase();
        return '';
    }

    function collectUrls(obj, code, videos, images, depth) {
        var keys, i, k, v, childCode;
        if (!obj || typeof obj !== 'object' || depth > 3) return;
        keys = Object.keys(obj);
        for (i = 0; i < keys.length && i < 120; i++) {
            k = keys[i]; v = obj[k];
            if (typeof v === 'string' && /^https?:/i.test(v)) {
                if (/video_url|video_versions|playback|video_src|video_dash_manifest/i.test(k) || /\.mp4(?:\?|$)/i.test(v)) videos.push(v);
                else if (/image|thumbnail|display|poster|image_url|src/i.test(k)) images.push(v);
            } else if (v && typeof v === 'object') {
                childCode = v.code || v.shortcode || v.short_code || '';
                if (childCode && childCode !== code) continue;
                collectUrls(v, code, videos, images, depth + 1);
            }
        }
    }

    function rememberObject(obj, source) {
        var code, patch = {}, n, videos = [], images = [], i, key, mt, mediaId, ownerId, owner;
        if (!obj || typeof obj !== 'object') return;
        code = obj.code || obj.shortcode || obj.short_code;
        if (!code || typeof code !== 'string' || code.length < 5 || code.length > 40) return;
        n = sameMediaNumber(obj, VIEW_KEYS, code, 0); if (n !== null) patch.views = n;
        n = sameMediaNumber(obj, ['like_count','likes_count'], code, 0); if (n !== null) patch.likes = n;
        n = sameMediaNumber(obj, ['comment_count','comments_count'], code, 0); if (n !== null) patch.comments = n;
        n = sameMediaNumber(obj, ['reshare_count','repost_count','reposts_count'], code, 0); if (n !== null) patch.reposts = n;
        n = sameMediaNumber(obj, ['taken_at','taken_at_timestamp'], code, 0);
        if (n !== null) { try { patch.date = new Date(n * 1000).toISOString().slice(0,10); } catch (e) {} }
        owner = ownerFromObject(obj); if (owner) patch.owner = owner;
        mediaId = obj.pk || obj.id || obj.media_id || obj.mediaId; if (mediaId != null) patch.mediaId = String(mediaId);
        ownerId = obj.user_id || obj.owner_id || (obj.user && (obj.user.pk || obj.user.id)) || (obj.owner && (obj.owner.pk || obj.owner.id)); if (ownerId != null) patch.ownerId = String(ownerId);
        mt = detectMediaType(obj); if (mt) patch.mediaType = mt;
        if (obj.product_type || obj.productType) patch.productType = String(obj.product_type || obj.productType);
        collectUrls(obj, code, videos, images, 0);
        for (i = 0; i < videos.length; i++) { key = normUrl(videos[i]); if (key) videoMap[key] = code; if (!patch.videoUrl) patch.videoUrl = videos[i]; }
        for (i = 0; i < images.length; i++) { key = normUrl(images[i]); if (key) posterMap[key] = code; if (!patch.thumbUrl) patch.thumbUrl = images[i]; }
        persistItem(code, patch, source || 'embedded', source === 'network' ? 'high' : 'medium');
    }

    function walkJson(obj, depth, state, source) {
        var keys, i, v;
        if (!obj || typeof obj !== 'object' || depth > 11 || state.count > 42000) return;
        state.count++; rememberObject(obj, source);
        keys = Object.keys(obj);
        for (i = 0; i < keys.length && i < 220; i++) { v = obj[keys[i]]; if (v && typeof v === 'object') walkJson(v, depth + 1, state, source); }
    }

    function scanJsonText(text, source) {
        if (!text || text.length > 15000000) return;
        try { text = String(text).replace(/^for\s*\(;;\);\s*/, ''); walkJson(JSON.parse(text), 0, {count:0}, source || 'embedded'); } catch (e) {}
    }

    function hookNetwork() {
        var originalFetch = window.fetch, X = window.XMLHttpRequest;
        if (originalFetch && !originalFetch.__ri31) {
            window.fetch = function () {
                return originalFetch.apply(this, arguments).then(function (response) {
                    try {
                        var url = response.url || '', ct = response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '';
                        if (ct.indexOf('json') >= 0 || /graphql|api|ajax|clips|reels|media/i.test(url)) response.clone().text().then(function(t){scanJsonText(t,'network');}).catch(function(){});
                    } catch (e) {}
                    return response;
                });
            };
            window.fetch.__ri31 = true;
        }
        if (X && !X.prototype.__ri31) {
            var open0 = X.prototype.open, send0 = X.prototype.send;
            X.prototype.open = function () { this.__ri31url = arguments[1] || ''; return open0.apply(this, arguments); };
            X.prototype.send = function () {
                this.addEventListener('load', function () {
                    try {
                        var ct = this.getResponseHeader('content-type') || '';
                        if ((ct.indexOf('json') >= 0 || /graphql|api|ajax|clips|reels|media/i.test(this.__ri31url || '')) && typeof this.responseText === 'string') scanJsonText(this.responseText,'network');
                    } catch (e) {}
                });
                return send0.apply(this, arguments);
            };
            X.prototype.__ri31 = true;
        }
    }

    function scanEmbedded() {
        var scripts = document.scripts || [], i, text;
        try { if (history.state && typeof history.state === 'object') walkJson(history.state,0,{count:0},'embedded'); } catch (e) {}
        for (i = 0; i < scripts.length && i < 360; i++) {
            if (seenScripts.has(scripts[i])) continue;
            seenScripts.add(scripts[i]); text = scripts[i].textContent || '';
            if (text && (scripts[i].type === 'application/json' || /"(?:code|shortcode|video_versions|play_count|view_count)"/.test(text))) scanJsonText(text,'embedded');
        }
    }

    function literalDate(text) {
        var m = String(text || '').match(/(20\d{2})-(\d{2})-(\d{2})/);
        return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
    }

    function nearMetric(text, code, keys) {
        var pos = [], p = 0, i, k, start, end, area, re, m, best = null, bestD = Infinity, abs, d, guard;
        if (!text || !code || text.length > 12000000) return null;
        while ((p = text.indexOf(code, p)) >= 0 && pos.length < 30) { pos.push(p); p += code.length; }
        for (i = 0; i < pos.length; i++) {
            start = Math.max(0,pos[i]-26000); end = Math.min(text.length,pos[i]+42000); area = text.slice(start,end);
            for (k = 0; k < keys.length; k++) {
                re = new RegExp('(?:["\\\\])?' + keys[k] + '(?:["\\\\])?\\s*:\\s*["\\\\]?([0-9]+)["\\\\]?','ig'); guard = 0;
                while ((m = re.exec(area)) && guard++ < 20) { abs = start + m.index; d = Math.abs(abs-pos[i]); if (d < bestD) { bestD = d; best = Number(m[1]); } }
            }
        }
        return best;
    }

    function nearString(text, code, keys) {
        var p = text.indexOf(code), area, i, re, m;
        if (p < 0) return '';
        area = text.slice(Math.max(0,p-60000),Math.min(text.length,p+90000));
        for (i = 0; i < keys.length; i++) {
            re = new RegExp('(?:["\\\\])?' + keys[i] + '(?:["\\\\])?\\s*:\\s*["\\\\]?(https?:[^"\\\\\\s]+)','i');
            m = area.match(re); if (m) return String(m[1]).replace(/\\u0026/g,'&').replace(/\\\//g,'/');
        }
        return '';
    }

    function parsePermalink(html, url) {
        var code = codeFromUrl(url), out = {code:code,pageUrl:url,mediaType:mediaTypeFromUrl(url)}, doc, meta, desc, m, t;
        try {
            doc = new DOMParser().parseFromString(html,'text/html');
            meta = doc.querySelector('meta[name="description"],meta[property="og:description"]'); desc = meta ? (meta.getAttribute('content') || '') : '';
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i); if (m) out.likes = parseCount(m[1].replace(/\s+/g,''));
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i); if (m) out.comments = parseCount(m[1].replace(/\s+/g,''));
            out.date = literalDate(desc);
            meta = doc.querySelector('meta[property="og:image"]'); if (meta) out.thumbUrl = meta.getAttribute('content') || '';
            meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]'); if (meta) out.videoUrl = meta.getAttribute('content') || '';
        } catch (e) {}
        if (isReelUrl(url)) out.views = nearMetric(html,code,VIEW_KEYS);
        if (out.likes == null) out.likes = nearMetric(html,code,['like_count','likes_count']);
        if (out.comments == null) out.comments = nearMetric(html,code,['comment_count','comments_count']);
        out.reposts = nearMetric(html,code,['reshare_count','repost_count','reposts_count']);
        t = nearMetric(html,code,['taken_at','taken_at_timestamp']);
        if (!out.date && t) { try { out.date = new Date(t*1000).toISOString().slice(0,10); } catch (e) {} }
        if (!out.videoUrl) out.videoUrl = nearString(html,code,['video_url']);
        return out;
    }

    function enqueue(url, cb) {
        var code = codeFromUrl(url);
        if (!code) return;
        if (items[code] && Date.now() - Number(items[code].fetched || 0) < 5*60*1000) { if (cb) cb(items[code]); return; }
        if (pending[code]) { if (cb) pending[code].push(cb); return; }
        pending[code] = cb ? [cb] : [];
        queue.push({url:url,code:code}); pump();
    }

    function finishPending(code, data) {
        var list = pending[code] || [], i; delete pending[code];
        for (i = 0; i < list.length; i++) { try { list[i](data); } catch (e) {} }
    }

    function pump() {
        var job, x;
        while (activeRequests < 2 && queue.length) {
            job = queue.shift(); activeRequests++; x = new XMLHttpRequest();
            (function (j, req) {
                req.open('GET',j.url,true); req.withCredentials = true;
                req.onreadystatechange = function () {
                    var data;
                    if (req.readyState !== 4) return;
                    activeRequests--;
                    if (req.status >= 200 && req.status < 400) {
                        data = parsePermalink(req.responseText || '',j.url); data.fetched = Date.now();
                        persistItem(j.code,data,'permalink','medium'); finishPending(j.code,items[j.code]);
                    } else finishPending(j.code,items[j.code] || null);
                    pump();
                };
                try { req.send(); } catch (e) { activeRequests--; finishPending(j.code,items[j.code] || null); pump(); }
            })(job,x);
        }
    }

    function icon(type) {
        if (type === 'image') return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M4 17l5-5 4 4 2-2 5 5"/></svg>';
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>';
    }

    function openUrl(url) {
        if (!url) return;
        var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
    }

    function ensureGridCard(anchor, code) {
        var box, row1, row2, actions, imgBtn, vidBtn;
        if (anchor.dataset.ri31Code !== code) {
            anchor.dataset.ri31Code = code;
            anchor.dataset.ri31Render = '';
        }
        if (anchor.dataset.ri31Ready === '1' && anchor.querySelector('.ri3-grid-box')) return;
        anchor.dataset.ri31Ready = '1';
        anchor.style.position = anchor.style.position || 'relative';
        box = document.createElement('div'); box.className = 'ri3-grid-box';
        row1 = document.createElement('div'); row1.className = 'ri3-grid-row1';
        row2 = document.createElement('div'); row2.className = 'ri3-grid-row2';
        box.appendChild(row1); box.appendChild(row2); anchor.appendChild(box);
        actions = document.createElement('div'); actions.className = 'ri3-grid-actions';
        imgBtn = document.createElement('button'); imgBtn.type = 'button'; imgBtn.innerHTML = icon('image'); imgBtn.title = '이미지';
        vidBtn = document.createElement('button'); vidBtn.type = 'button'; vidBtn.innerHTML = icon('video'); vidBtn.title = '영상';
        [imgBtn,vidBtn].forEach(function (b) { b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();},true); });
        imgBtn.addEventListener('click',function(){var d=items[anchor.dataset.ri31Code]||{},im=anchor.querySelector('img');openUrl(fieldValue(d,'thumbUrl')||(im&&im.src)||'');});
        vidBtn.addEventListener('click',function(){var d=items[anchor.dataset.ri31Code]||{};openUrl(fieldValue(d,'videoUrl')||'');});
        actions.appendChild(imgBtn); actions.appendChild(vidBtn); anchor.appendChild(actions);
    }

    function gridRenderKey(anchor, data) {
        var reel = isReelUrl(anchor.href);
        return [reel?'R':'P',fieldValue(data,'views'),fieldValue(data,'likes'),fieldValue(data,'comments'),fieldValue(data,'reposts'),fieldValue(data,'date'),fieldValue(data,'owner')].join('|');
    }

    function renderGridCard(anchor, data) {
        var reel = isReelUrl(anchor.href), row1 = anchor.querySelector('.ri3-grid-row1'), row2 = anchor.querySelector('.ri3-grid-row2');
        var views = fieldValue(data,'views'), likes = fieldValue(data,'likes'), comments = fieldValue(data,'comments'), reposts = fieldValue(data,'reposts'), date = fieldValue(data,'date');
        var er = reel ? engagement({views:views,likes:likes,comments:comments,reposts:reposts}) : null;
        var g = reel && views ? growth24h(data.code,views) : null;
        var mul = reel && views ? accountMultiple({code:data.code,owner:fieldValue(data,'owner'),views:views}) : null;
        var a = [], b = [], key, actions, bs, show, box;
        if (!row1 || !row2) return;
        key = gridRenderKey(anchor,data) + '|' + er + '|' + g + '|' + mul;
        if (anchor.dataset.ri31Render !== key) {
            if (reel && views) a.push('▶'+fmt(views));
            if (likes != null) a.push('♥'+fmt(likes));
            if (comments != null) a.push('●'+fmt(comments));
            if (reposts != null) a.push('↻'+fmt(reposts));
            if (er != null) b.push(fmtPercent(er));
            if (g != null) b.push((g>=0?'+':'')+fmtPercent(g));
            if (mul != null) b.push(fmtMultiple(mul));
            if (date) b.push(String(date).slice(5).replace('-','/'));
            row1.textContent = a.join(' '); row2.textContent = b.join(' ');
            row1.style.display = a.length ? 'flex' : 'none'; row2.style.display = b.length ? 'flex' : 'none';
            actions = anchor.querySelector('.ri3-grid-actions');
            if (actions) { bs = actions.querySelectorAll('button'); if (bs[1]) bs[1].style.display = reel ? 'flex' : 'none'; }
            anchor.dataset.ri31Render = key;
        }
        actions = anchor.querySelector('.ri3-grid-actions'); box = anchor.querySelector('.ri3-grid-box'); show = safeGridArea(anchor);
        if (box) box.style.visibility = show ? 'visible' : 'hidden';
        if (actions) actions.style.visibility = show ? 'visible' : 'hidden';
    }

    function scanGrid() {
        var anchors, i, a, code, data, url;
        if (/^\/(?:reel|reels|p)\//.test(location.pathname)) return;
        anchors = document.querySelectorAll('main a[href*="/reel/"],main a[href*="/reels/"],main a[href*="/p/"]');
        for (i = 0; i < anchors.length; i++) {
            a = anchors[i]; if (!visible(a) && !safeGridArea(a)) continue;
            code = codeFromUrl(a.href); if (!code) continue;
            ensureGridCard(a,code); data = items[code] || {code:code,fields:{}};
            renderGridCard(a,data);
            if (!data.fetched || Date.now() - Number(data.fetched) > 5*60*1000) {
                url = a.href.split('?')[0];
                enqueue(url,(function(anchor,expectedCode){return function(d){if(codeFromUrl(anchor.href)!==expectedCode)return;renderGridCard(anchor,d||{code:expectedCode,fields:{}});};})(a,code));
            }
        }
    }

    function postHeaderVisible() {
        var es=document.querySelectorAll('h1,h2,header,div,span'),i,r,t;
        for(i=0;i<es.length&&i<1200;i++){if(!visible(es[i]))continue;r=es[i].getBoundingClientRect();if(r.top<0||r.top>115||r.height>85)continue;t=(es[i].textContent||'').trim();if(t==='게시물'||t==='Post')return true;}
        return false;
    }

    function activeVideo() {
        var vs=document.querySelectorAll('video'),best=null,scoreBest=-Infinity,i,r,w,h,area,cy,score;
        for(i=0;i<vs.length;i++){r=vs[i].getBoundingClientRect();w=Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.left));h=Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));area=w*h;if(area<innerWidth*innerHeight*.20)continue;cy=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2;score=area-Math.abs(cy-innerHeight/2)*innerWidth*1.5+(!vs[i].paused?innerWidth*innerHeight*.20:0);if(score>scoreBest){scoreBest=score;best=vs[i];}}
        return best;
    }

    function label(el) {
        var svg=el&&el.querySelector?el.querySelector('svg[aria-label],svg[title]'):null;
        return [(el&&el.getAttribute&&el.getAttribute('aria-label'))||'',(el&&el.getAttribute&&el.getAttribute('title'))||'',svg&&svg.getAttribute('aria-label')||'',svg&&svg.getAttribute('title')||'',el&&el.textContent||''].join(' ').toLowerCase();
    }

    function rightRailControls() {
        var es=document.querySelectorAll('button,[role="button"],a'),out=[],i,r,t;
        for(i=0;i<es.length;i++){if(!visible(es[i]))continue;r=es[i].getBoundingClientRect();if(r.left<innerWidth*.66||r.top<innerHeight*.18||r.bottom>innerHeight*.92||r.width>120||r.height>120)continue;t=label(es[i]);if(/좋아요|\blike\b|댓글|comment|리포스트|repost|reshare|공유|share|send|더\s*보기|more|options/.test(t))out.push({el:es[i],r:r,t:t});}
        return out.sort(function(a,b){return a.r.top-b.r.top;});
    }

    function isReelsFeed(video) {
        var r,h;if(!video||postHeaderVisible())return false;r=video.getBoundingClientRect();h=Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));if(h<innerHeight*.55)return false;if(/^\/reels(?:\/|$)/.test(location.pathname))return true;return rightRailControls().length>=3;
    }

    function reelRoot(video) {
        var e=video,best=video,i,r;for(i=0;i<14&&e;i++,e=e.parentElement){r=e.getBoundingClientRect();if(r.width>innerWidth*.55&&r.height>innerHeight*.55)best=e;if(r.width>innerWidth*.78&&r.height>innerHeight*.75)break;}return best||document.body;
    }

    function username(root) {
        var as=(root||document).querySelectorAll('a[href^="/"]'),bad={accounts:1,explore:1,reels:1,reel:1,p:1,direct:1,stories:1},best='',bestScore=-1,i,m,r,s;
        for(i=0;i<as.length;i++){m=(as[i].getAttribute('href')||'').match(/^\/([A-Za-z0-9._]+)\/?(?:\?.*)?$/);if(!m||bad[m[1].toLowerCase()]||!visible(as[i]))continue;r=as[i].getBoundingClientRect();if(r.top<innerHeight*.43)continue;s=(r.top>innerHeight*.55?4:0)+(r.left<innerWidth*.72?3:0)+((as[i].textContent||'').trim()?1:0);if(s>bestScore){bestScore=s;best=m[1].toLowerCase();}}
        return best;
    }

    function countFromControl(control) {
        var p,parts,i,m,n;if(!control)return null;p=control.el.closest?(control.el.closest('button,[role="button"],a')||control.el):control.el;parts=[p.textContent||''];if(p.parentElement)parts.push(p.parentElement.textContent||'');if(p.nextElementSibling)parts.push(p.nextElementSibling.textContent||'');if(p.previousElementSibling)parts.push(p.previousElementSibling.textContent||'');for(i=0;i<parts.length;i++){m=String(parts[i]).match(/(?:^|\s)([0-9]+(?:[.,][0-9]+)?\s*(?:만|천|억|K|M|B|k|m|b)?)(?:\s|$)/);if(m){n=parseCount(m[1]);if(n!=null)return n;}}return null;
    }

    function nativeMetrics() {
        var cs=rightRailControls(),out={likes:null,comments:null,reposts:null},i,n;
        for(i=0;i<cs.length;i++){n=countFromControl(cs[i]);if(n==null)continue;if(out.likes==null&&(/좋아요|\blike\b/.test(cs[i].t))){out.likes=n;continue;}if(out.comments==null&&(/댓글|comment/.test(cs[i].t))){out.comments=n;continue;}if(out.reposts==null&&(/리포스트|repost|reshare/.test(cs[i].t))){out.reposts=n;continue;}}
        return out;
    }

    function mappedCode(video) {
        var list=[video.currentSrc||'',video.src||'',video.poster||''],i,key,c;for(i=0;i<list.length;i++){key=normUrl(list[i]);if(key&&(c=videoMap[key]||posterMap[key]))return c;}return '';
    }

    function linkCode(video, root) {
        var c=/^\/reels\//.test(location.pathname)?codeFromUrl(location.href):'',as,i,r,vr;if(c)return c;as=root?root.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"]'):[];for(i=0;i<as.length;i++){c=codeFromUrl(as[i].href);if(c)return c;}vr=video&&video.getBoundingClientRect();as=document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"]');for(i=0;i<as.length;i++){r=as[i].getBoundingClientRect();if(vr&&(r.bottom<vr.top||r.top>vr.bottom))continue;c=codeFromUrl(as[i].href);if(c)return c;}return '';
    }

    function closeNum(a,b){if(a==null||b==null)return false;return Math.abs(Number(a)-Number(b))<=Math.max(2,Number(b)*.04);}

    function candidateCode(root,native) {
        var owner=username(root),ks=Object.keys(items),best='',bestScore=-99,i,d,sig,score,likes,comments,reposts;
        for(i=0;i<ks.length;i++){d=items[ks[i]]||{};sig=0;score=0;if(owner&&fieldValue(d,'owner')){if(owner!==String(fieldValue(d,'owner')).toLowerCase())continue;score+=12;sig++;}likes=fieldValue(d,'likes');comments=fieldValue(d,'comments');reposts=fieldValue(d,'reposts');if(native.likes&&likes){if(closeNum(native.likes,likes)){score+=8;sig++;}else score-=5;}if(native.comments&&comments){if(closeNum(native.comments,comments)){score+=8;sig++;}else score-=5;}if(native.reposts&&reposts){if(closeNum(native.reposts,reposts)){score+=5;sig++;}else score-=3;}if(d.seen&&Date.now()-d.seen<5*60*1000)score++;if(sig&&score>bestScore){bestScore=score;best=ks[i];}}
        return bestScore>=10?best:'';
    }

    function reelsContext() {
        var video=activeVideo(),root,native,code,owner;if(!video||!isReelsFeed(video))return null;root=reelRoot(video);native=nativeMetrics();code=linkCode(video,root)||mappedCode(video)||candidateCode(root,native);owner=username(root);if(code&&owner)persistItem(code,{owner:owner,mediaType:'REEL',pageUrl:'https://www.instagram.com/reel/'+code+'/'},'dom','high');return{video:video,root:root,native:native,code:code||'',owner:owner,status:code?'IDENTIFIED':'IDENTIFYING'};
    }

    function ensureOverlay(){var b=document.getElementById('ri3-reels-overlay');if(b)return b;b=document.createElement('div');b.id='ri3-reels-overlay';document.documentElement.appendChild(b);return b;}

    function renderReelsOverlay(ctx) {
        var b=ensureOverlay(),d,views,er,g,m,rows=[],key,n;
        if(!ctx||!ctx.code){b.style.display='none';b.dataset.ri31Render='';return;}
        d=items[ctx.code]||{};views=fieldValue(d,'views');n=ctx.native||{};
        if(views)rows.push('▶ '+fmt(views));
        er=views?engagement({views:views,likes:n.likes,comments:n.comments,reposts:n.reposts}):null;if(er!=null)rows.push('ER '+fmtPercent(er));
        g=views?growth24h(ctx.code,views):null;if(g!=null)rows.push('24h '+(g>=0?'+':'')+fmtPercent(g));
        m=views?accountMultiple({code:ctx.code,owner:ctx.owner||fieldValue(d,'owner'),views:views}):null;if(m!=null)rows.push(fmtMultiple(m));
        if(fieldValue(d,'date'))rows.push(String(fieldValue(d,'date')).slice(5).replace('-','/'));
        key=rows.join('|');if(b.dataset.ri31Render!==key){b.innerHTML='';rows.forEach(function(t){var r=document.createElement('div');r.textContent=t;b.appendChild(r);});b.dataset.ri31Render=key;}
        b.style.display=rows.length?'flex':'none';
    }

    function moreButton(){var cs=rightRailControls(),i;if(!cs.length)return null;for(i=cs.length-1;i>=0;i--)if(/더\s*보기|more|options/.test(cs[i].t))return cs[i].el;return null;}

    function ensureTool(ctx) {
        var b=document.getElementById('ri3-tool'),m,r;if(!ctx){if(b)b.remove();closePanel();return;}if(!b){b=document.createElement('button');b.id='ri3-tool';b.type='button';b.setAttribute('aria-label','리서치 도구');b.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V13M9 19V9M14 19V5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M20 17l2 2"/></svg>';b.onclick=function(){if(panelOpen)closePanel();else openPanel(reelsContext());};document.documentElement.appendChild(b);}m=moreButton();if(m){r=m.getBoundingClientRect();b.style.left=Math.max(4,Math.min(innerWidth-40,r.left+r.width/2-17))+'px';b.style.top=Math.min(innerHeight-44,r.bottom+4)+'px';b.style.right='auto';b.style.bottom='auto';}else{b.style.left='auto';b.style.top='auto';b.style.right='12px';b.style.bottom='74px';}
    }

    function closePanel(){var p=document.getElementById('ri3-panel');if(p)p.remove();panelOpen=false;currentPanelCtx=null;}
    function panelRow(parent,labelText,valueText){var r=document.createElement('div'),l=document.createElement('span'),v=document.createElement('strong');r.className='ri3-panel-row';l.textContent=labelText;v.textContent=valueText||'—';r.appendChild(l);r.appendChild(v);parent.appendChild(r);}

    function renderPanel(ctx) {
        var p=document.getElementById('ri3-panel'),body,d,n,views,er,g,m,media,key;
        if(!p||!ctx)return;body=p.querySelector('.ri3-panel-body');if(!body)return;d=ctx.code?(items[ctx.code]||{}):{};n=ctx.native||{};views=fieldValue(d,'views');
        er=views?engagement({views:views,likes:n.likes,comments:n.comments,reposts:n.reposts}):null;g=views?growth24h(ctx.code,views):null;m=views?accountMultiple({code:ctx.code,owner:ctx.owner||fieldValue(d,'owner'),views:views}):null;
        media='';if(ctx.video&&isFinite(ctx.video.duration)&&ctx.video.duration>0)media=ctx.video.duration.toFixed(1)+'초';if(ctx.video&&ctx.video.videoWidth&&ctx.video.videoHeight)media+=(media?' · ':'')+ctx.video.videoWidth+'×'+ctx.video.videoHeight;
        key=[ctx.code,views,n.likes,n.comments,n.reposts,er,g,m,fieldValue(d,'date'),media,ctx.status].join('|');if(body.dataset.ri31Render===key)return;body.dataset.ri31Render=key;body.innerHTML='';
        if(!ctx.code){panelRow(body,'상태','현재 릴스 식별 중');panelRow(body,'조회수','확인 중');panelRow(body,'좋아요',n.likes!=null?fmt(n.likes):'—');panelRow(body,'댓글',n.comments!=null?fmt(n.comments):'—');panelRow(body,'리포스트',n.reposts!=null?fmt(n.reposts):'—');panelRow(body,'영상',media||'—');return;}
        panelRow(body,'조회수',views?fmt(views):'확인 중');panelRow(body,'좋아요',n.likes!=null?fmt(n.likes):'—');panelRow(body,'댓글',n.comments!=null?fmt(n.comments):'—');panelRow(body,'리포스트',n.reposts!=null?fmt(n.reposts):'—');panelRow(body,'ER',er!=null?fmtPercent(er):'—');panelRow(body,'24h',g!=null?(g>=0?'+':'')+fmtPercent(g):'—');panelRow(body,'계정 대비',m!=null?fmtMultiple(m):'—');panelRow(body,'게시일',fieldValue(d,'date')?String(fieldValue(d,'date')).slice(5).replace('-','/'):'—');panelRow(body,'영상',media||'—');
    }

    function openPanel(ctx) {
        var p,head,body,actions,close;closePanel();if(!ctx)return;panelOpen=true;currentPanelCtx=ctx;p=document.createElement('aside');p.id='ri3-panel';head=document.createElement('div');head.className='ri3-panel-head';head.innerHTML='<b>리서치 상세</b><span>v'+VERSION+'</span>';p.appendChild(head);body=document.createElement('div');body.className='ri3-panel-body';p.appendChild(body);actions=document.createElement('div');actions.className='ri3-panel-actions';
        function action(text,fn){var b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;actions.appendChild(b);}
        action('순수 영상',function(){var latest=reelsContext()||currentPanelCtx,d=latest&&latest.code?(items[latest.code]||{}):{},u=(latest&&latest.video&&(latest.video.currentSrc||latest.video.src))||fieldValue(d,'videoUrl')||'';if(/^blob:/i.test(u))u=fieldValue(d,'videoUrl')||'';openUrl(u);});
        action('썸네일',function(){var latest=reelsContext()||currentPanelCtx,d=latest&&latest.code?(items[latest.code]||{}):{};openUrl(fieldValue(d,'thumbUrl')||(latest&&latest.video&&latest.video.poster)||'');});
        action('링크 복사',function(){var latest=reelsContext()||currentPanelCtx,t=latest&&latest.code?'https://www.instagram.com/reel/'+latest.code+'/':location.href;if(navigator.clipboard)navigator.clipboard.writeText(t).catch(function(){});});
        action('새 버전',function(){window.open(UPDATE_URL+'?ri='+Date.now(),'_blank');});
        p.appendChild(actions);close=document.createElement('button');close.type='button';close.className='ri3-panel-close';close.textContent='× 닫기';close.onclick=closePanel;p.appendChild(close);document.documentElement.appendChild(p);renderPanel(ctx);
    }

    function injectStyle() {
        if(document.getElementById('ri3-style'))return;
        var s=document.createElement('style');s.id='ri3-style';s.textContent='[id^="ri22"],#ri-tool,#ri-panel,#ri-detail-metrics{display:none!important}.ri3-grid-box{position:absolute;left:4px;right:4px;bottom:4px;z-index:8;pointer-events:none;display:flex;flex-direction:column;gap:3px;min-width:0}.ri3-grid-row1,.ri3-grid-row2{display:none;align-items:center;gap:3px;white-space:nowrap;overflow:hidden;text-overflow:clip}.ri3-grid-row1{color:#fff;font:780 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.42px;text-shadow:0 1px 2px rgba(0,0,0,.95),0 0 2px rgba(0,0,0,.65)}.ri3-grid-row2{color:#111;font:820 9.6px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.38px;-webkit-text-stroke:.6px rgba(255,255,255,.98);paint-order:stroke fill;text-shadow:0 0 2px #fff}.ri3-grid-actions{position:absolute;right:5px;top:5px;z-index:9;display:flex;flex-direction:column;gap:6px}.ri3-grid-actions button{width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.26);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.28)}#ri3-reels-overlay{position:fixed;right:60px;top:clamp(112px,16vh,170px);z-index:2147483600;width:74px;display:none;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;pointer-events:none;color:#fff;font:760 12px/1.08 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.72)}#ri3-tool{position:fixed;z-index:2147483602;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.12);color:#fff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}#ri3-panel{position:fixed;right:10px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));z-index:2147483647;width:min(46vw,190px);max-height:69vh;overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:rgba(14,14,14,.97);color:#fff;box-shadow:0 7px 22px rgba(0,0,0,.30);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.ri3-panel-head{display:flex;align-items:center;padding-bottom:8px;margin-bottom:5px;border-bottom:1px solid rgba(255,255,255,.08)}.ri3-panel-head b{font-size:12px;flex:1}.ri3-panel-head span{font-size:8px;opacity:.42}.ri3-panel-row{display:flex;align-items:center;min-height:27px;gap:5px;font-size:10px}.ri3-panel-row span{flex:1;color:rgba(255,255,255,.62)}.ri3-panel-row strong{font-size:11px;text-align:right}.ri3-panel-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-top:8px;margin-top:5px;border-top:1px solid rgba(255,255,255,.08)}.ri3-panel-actions button,.ri3-panel-close{min-height:38px;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.055);color:#fff;font:650 9.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.ri3-panel-close{width:100%;margin-top:7px;background:rgba(255,255,255,.09)}';
        (document.head||document.documentElement).appendChild(s);
    }

    function refreshNow() {
        var ctx,key;uiTimer=null;injectStyle();scanEmbedded();scanGrid();ctx=reelsContext();key=ctx?(ctx.code||'unknown')+'|'+(ctx.owner||''):'';if(key!==currentCtxKey){currentCtxKey=key;if(panelOpen&&currentPanelCtx&&currentPanelCtx.code&&ctx&&ctx.code&&currentPanelCtx.code!==ctx.code)closePanel();}renderReelsOverlay(ctx);ensureTool(ctx);if(panelOpen){currentPanelCtx=ctx||currentPanelCtx;renderPanel(currentPanelCtx);}
    }

    function scheduleRefresh() {
        if (uiTimer) return;
        uiTimer = setTimeout(refreshNow, 90);
    }

    function hookHistory() {
        var p=history.pushState,r=history.replaceState;
        if(!p.__ri31){history.pushState=function(){var x=p.apply(this,arguments);scheduleRefresh();return x;};history.pushState.__ri31=true;}
        if(!r.__ri31){history.replaceState=function(){var x=r.apply(this,arguments);scheduleRefresh();return x;};history.replaceState.__ri31=true;}
        addEventListener('popstate',scheduleRefresh,true);addEventListener('hashchange',scheduleRefresh,true);
    }

    function startObservers() {
        var root=document.documentElement||document;
        mutationObserver=new MutationObserver(function(){scheduleRefresh();});
        mutationObserver.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src','poster','aria-label']});
        addEventListener('scroll',scheduleRefresh,true);addEventListener('resize',scheduleRefresh,true);
        document.addEventListener('play',scheduleRefresh,true);document.addEventListener('loadedmetadata',scheduleRefresh,true);
    }

    hookNetwork();hookHistory();injectStyle();startObservers();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleRefresh,{once:true});else scheduleRefresh();
})();