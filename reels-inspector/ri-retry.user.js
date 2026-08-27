// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      2.1.1
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '2.1.1';
    var UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';
    var SNAP_KEY = 'ri:snapshots:v1';
    var POST_KEY = 'ri:posts:v1';
    var VIEW_KEYS = ['play_count','ig_play_count','video_play_count','video_view_count','view_count','view_count_fb','play_count_fb','view_count_ig','clips_play_count','video_views','media_view_count','reel_view_count','view_count_v2','plays','views'];
    var cache = {};
    var queue = [];
    var active = 0;
    var lastUrl = location.href;
    var scanTimer = null;

    function codeFromUrl(url) {
        var m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : '';
    }

    function detailPage() {
        return /^\/(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?/.test(location.pathname);
    }

    function visible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    }

    function nearViewport(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > -300 && r.top < innerHeight + 650;
    }

    function safeOverlayArea(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > 145 && r.top < innerHeight - 135;
    }

    function parseCount(text) {
        var s = String(text || '').replace(/,/g, '').replace(/\s+/g, '');
        var m = s.match(/^([0-9]+(?:\.[0-9]+)?)(만|천|억|K|M|B|k|m|b)?$/);
        var n, u;
        if (!m) return null;
        n = Number(m[1]);
        u = m[2] || '';
        if (u === '천' || u === 'K' || u === 'k') n *= 1000;
        else if (u === '만') n *= 10000;
        else if (u === '억') n *= 100000000;
        else if (u === 'M' || u === 'm') n *= 1000000;
        else if (u === 'B' || u === 'b') n *= 1000000000;
        return Math.round(n);
    }

    function fmt(n) {
        if (n === null || n === undefined || !isFinite(Number(n))) return '';
        n = Number(n);
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(Math.round(n));
    }

    function fmtPercent(n) {
        if (n === null || n === undefined || !isFinite(Number(n))) return '';
        n = Number(n);
        if (Math.abs(n) >= 100) return n.toFixed(0) + '%';
        if (Math.abs(n) >= 10) return n.toFixed(1).replace(/\.0$/, '') + '%';
        return n.toFixed(2).replace(/0$/, '').replace(/\.$/, '') + '%';
    }

    function fmtGrowth(n) {
        if (n === null || n === undefined || !isFinite(Number(n))) return '';
        return (Number(n) >= 0 ? '+' : '') + fmtPercent(n);
    }

    function fmtMultiple(n) {
        if (n === null || n === undefined || !isFinite(Number(n)) || Number(n) <= 0) return '';
        return '×' + Number(n).toFixed(1).replace(/\.0$/, '');
    }

    function labelled(text, labels) {
        var s = String(text || '');
        var i, re, m;
        for (i = 0; i < labels.length; i++) {
            re = new RegExp(labels[i] + '\\s*[:：]?\\s*([0-9][0-9.,]*\\s*(?:만|천|억|K|M|B|k|m|b)?)', 'i');
            m = s.match(re);
            if (m) return parseCount(m[1].replace(/\s+/g, ''));
            re = new RegExp('([0-9][0-9.,]*\\s*(?:만|천|억|K|M|B|k|m|b)?)\\s*' + labels[i], 'i');
            m = s.match(re);
            if (m) return parseCount(m[1].replace(/\s+/g, ''));
        }
        return null;
    }

    function hasLabel(text, labels) {
        var s = String(text || '').toLowerCase();
        var i;
        for (i = 0; i < labels.length; i++) {
            if (s.indexOf(String(labels[i]).toLowerCase()) !== -1) return true;
        }
        return false;
    }

    function singleCount(text) {
        var s = String(text || '').trim();
        if (!s || s.length > 28) return null;
        return parseCount(s.replace(/\s+/g, ''));
    }

    function cleanUrl(s) {
        return String(s || '')
            .replace(/\\u0026/g, '&')
            .replace(/\\u003d/g, '=')
            .replace(/\\\//g, '/')
            .replace(/&amp;/g, '&');
    }

    function literalDate(text) {
        var s = String(text || '');
        var map = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
        var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + '-' + m[2] + '-' + m[3];
        m = s.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/);
        if (m) return m[3] + '-' + map[m[1]] + '-' + ('0' + m[2]).slice(-2);
        return null;
    }

    function merge(a, b) {
        var out = {}, k;
        a = a || {};
        b = b || {};
        for (k in a) out[k] = a[k];
        for (k in b) {
            if (b[k] !== null && b[k] !== undefined && b[k] !== '') out[k] = b[k];
        }
        return out;
    }

    function readStore(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function writeStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function recordSnapshot(data) {
        var code = data && data.code;
        var views = Number(data && data.views);
        var now = Date.now();
        var store, arr, last;
        if (!code || !views || views <= 0) return;
        store = readStore(SNAP_KEY, {});
        arr = Array.isArray(store[code]) ? store[code] : [];
        last = arr.length ? arr[arr.length - 1] : null;
        if (!last || now - Number(last.t || 0) >= 30 * 60 * 1000 || Number(last.v) !== views) arr.push({t: now, v: views});
        arr = arr.filter(function (x) { return now - Number(x.t || 0) <= 14 * 24 * 60 * 60 * 1000; });
        if (arr.length > 80) arr = arr.slice(arr.length - 80);
        store[code] = arr;
        writeStore(SNAP_KEY, store);
    }

    function growth24h(data) {
        var code = data && data.code;
        var current = Number(data && data.views);
        var arr, now, target, best = null, bestDelta = Infinity, i, age, delta, old;
        if (!code || !current || current <= 0) return null;
        arr = readStore(SNAP_KEY, {})[code] || [];
        now = Date.now();
        target = 24 * 60 * 60 * 1000;
        for (i = 0; i < arr.length; i++) {
            age = now - Number(arr[i].t || 0);
            if (age < 18 * 60 * 60 * 1000 || age > 32 * 60 * 60 * 1000) continue;
            delta = Math.abs(age - target);
            if (delta < bestDelta) { bestDelta = delta; best = arr[i]; }
        }
        if (!best) return null;
        old = Number(best.v);
        if (!old || old <= 0 || current < old) return null;
        return ((current - old) / old) * 100;
    }

    function recordPost(data) {
        var code = data && data.code;
        var owner = String(data && data.owner || '').toLowerCase();
        var views = Number(data && data.views);
        var store, keys, i;
        if (!code || !owner || !views || views <= 0) return;
        store = readStore(POST_KEY, {});
        store[code] = {code: code, owner: owner, views: views, date: data.date || '', t: Date.now()};
        keys = Object.keys(store);
        if (keys.length > 500) {
            keys.sort(function (a, b) { return Number(store[b].t || 0) - Number(store[a].t || 0); });
            for (i = 500; i < keys.length; i++) delete store[keys[i]];
        }
        writeStore(POST_KEY, store);
    }

    function median(values) {
        var a = values.slice().sort(function (x, y) { return x - y; });
        var m;
        if (!a.length) return null;
        m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    }

    function accountMultiple(data) {
        var owner = String(data && data.owner || '').toLowerCase();
        var current = Number(data && data.views);
        var code = data && data.code;
        var store, list, keys, i, item, base;
        if (!owner || !current || current <= 0) return null;
        store = readStore(POST_KEY, {});
        list = [];
        keys = Object.keys(store);
        for (i = 0; i < keys.length; i++) {
            item = store[keys[i]];
            if (!item || item.code === code || item.owner !== owner || !Number(item.views)) continue;
            list.push(item);
        }
        list.sort(function (a, b) {
            var ad = a.date || '', bd = b.date || '';
            if (ad !== bd) return bd.localeCompare(ad);
            return Number(b.t || 0) - Number(a.t || 0);
        });
        list = list.slice(0, 20);
        if (list.length < 5) return null;
        base = median(list.map(function (x) { return Number(x.views); }));
        if (!base || base <= 0) return null;
        return current / base;
    }

    function engagementRate(data) {
        var views = Number(data && data.views);
        var likes = Number(data && data.likes || 0);
        var comments = Number(data && data.comments || 0);
        var reposts = Number(data && data.reposts || 0);
        if (!views || views <= 0) return null;
        if (!likes && !comments && !reposts) return null;
        return ((likes + comments + reposts) / views) * 100;
    }

    function recordData(data) {
        if (!data || !data.code) return;
        recordSnapshot(data);
        recordPost(data);
    }

    function areaNumber(area, keys) {
        var i, re, m;
        area = String(area || '');
        for (i = 0; i < keys.length; i++) {
            re = new RegExp('(?:["\\\\])?' + keys[i] + '(?:["\\\\])?\\s*:\\s*["\\\\]?([0-9]+)["\\\\]?', 'i');
            m = area.match(re);
            if (m) return Number(m[1]);
        }
        return null;
    }

    function areaString(area, keys) {
        var i, re, m;
        for (i = 0; i < keys.length; i++) {
            re = new RegExp('(?:["\\\\])?' + keys[i] + '(?:["\\\\])?\\s*:\\s*["\\\\]?(https?:[^"\\\\\\s]+)', 'i');
            m = String(area || '').match(re);
            if (m) return cleanUrl(m[1]);
        }
        return '';
    }

    function areaOwner(area) {
        var s = String(area || '').replace(/\\"/g, '"');
        var m = s.match(/"owner"\s*:\s*\{[\s\S]{0,5000}?"username"\s*:\s*"([A-Za-z0-9._]+)"/i);
        if (m) return m[1];
        m = s.match(/"user"\s*:\s*\{[\s\S]{0,4000}?"username"\s*:\s*"([A-Za-z0-9._]+)"/i);
        return m ? m[1] : '';
    }

    function htmlArea(html, code) {
        var p = code ? String(html || '').indexOf(code) : -1;
        return p >= 0 ? String(html).slice(Math.max(0, p - 120000), Math.min(String(html).length, p + 220000)) : String(html || '');
    }

    function parseHtml(html, url) {
        var code = codeFromUrl(url);
        var out = {code: code, pageUrl: url};
        var doc, meta, desc, titleText, m, n, area;
        try {
            doc = new DOMParser().parseFromString(html, 'text/html');
            meta = doc.querySelector('meta[name="description"],meta[property="og:description"]');
            desc = meta ? (meta.getAttribute('content') || '') : '';
            if (desc) {
                m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i); if (m) out.likes = parseCount(m[1].replace(/\s+/g, ''));
                m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i); if (m) out.comments = parseCount(m[1].replace(/\s+/g, ''));
                m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+(?:views?|plays?)/i); if (m) out.views = parseCount(m[1].replace(/\s+/g, ''));
                out.date = literalDate(desc);
            }
            meta = doc.querySelector('meta[property="og:title"],meta[name="twitter:title"]');
            titleText = meta ? (meta.getAttribute('content') || '') : (doc.title || '');
            m = titleText.match(/^@?([A-Za-z0-9._]+)\s+(?:on Instagram|• Instagram)/i); if (m) out.owner = m[1];
            meta = doc.querySelector('meta[property="og:image"]'); if (meta) out.thumbUrl = cleanUrl(meta.getAttribute('content') || '');
            meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]'); if (meta) out.videoUrl = cleanUrl(meta.getAttribute('content') || '');
        } catch (e) {}
        area = htmlArea(html, code);
        if (!out.owner) out.owner = areaOwner(area);
        if (out.likes === undefined) { n = areaNumber(area, ['like_count','likes_count']); if (n !== null) out.likes = n; }
        if (out.comments === undefined) { n = areaNumber(area, ['comment_count','comments_count']); if (n !== null) out.comments = n; }
        if (out.views === undefined) { n = areaNumber(area, VIEW_KEYS); if (n !== null) out.views = n; }
        n = areaNumber(area, ['reshare_count','repost_count','reposts_count']); if (n !== null) out.reposts = n;
        if (!out.date) {
            n = areaNumber(area, ['taken_at','taken_at_timestamp']);
            if (n !== null) try { out.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e2) {}
        }
        if (!out.videoUrl) out.videoUrl = areaString(area, ['video_url']);
        return out;
    }

    function pump() {
        var job;
        while (active < 2 && queue.length) {
            job = queue.shift(); active++;
            (function (j) { j.fn(function (value) { active--; j.resolve(value); pump(); }); })(job);
        }
    }

    function queued(fn) {
        return new Promise(function (resolve) { queue.push({fn: fn, resolve: resolve}); pump(); });
    }

    function loadPost(url) {
        var code = codeFromUrl(url);
        if (!code) return Promise.resolve({});
        if (cache[code] && cache[code].loaded) return Promise.resolve(cache[code]);
        if (cache[code] && cache[code].promise) return cache[code].promise;
        if (!cache[code]) cache[code] = {code: code, pageUrl: url};
        cache[code].promise = queued(function (done) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', String(url).split('?')[0], true);
            xhr.withCredentials = true;
            xhr.onreadystatechange = function () {
                var keep, parsed;
                if (xhr.readyState !== 4) return;
                keep = cache[code] && cache[code].promise;
                if (xhr.status >= 200 && xhr.status < 400) {
                    parsed = parseHtml(xhr.responseText || '', url);
                    cache[code] = merge(cache[code], parsed);
                    cache[code].loaded = true;
                    cache[code].promise = keep;
                    recordData(cache[code]);
                }
                cache[code].promise = null;
                refreshCode(code);
                schedule();
                done(cache[code]);
            };
            try { xhr.send(); } catch (e) { cache[code].promise = null; done(cache[code]); }
        });
        return cache[code].promise;
    }

    function updateFromObject(obj) {
        var code = obj && (obj.code || obj.shortcode || obj.short_code);
        var user = obj && (obj.user || obj.owner);
        var data, views;
        if (!code || typeof code !== 'string') return;
        views = null;
        for (var i = 0; i < VIEW_KEYS.length; i++) {
            if (obj[VIEW_KEYS[i]] !== undefined && obj[VIEW_KEYS[i]] !== null && isFinite(Number(obj[VIEW_KEYS[i]]))) { views = Number(obj[VIEW_KEYS[i]]); break; }
        }
        data = {
            code: code,
            owner: user && user.username || '',
            views: views,
            likes: obj.like_count || null,
            comments: obj.comment_count || null,
            reposts: obj.reshare_count || obj.repost_count || null,
            date: obj.taken_at ? new Date(Number(obj.taken_at) * 1000).toISOString().slice(0, 10) : null,
            videoUrl: obj.video_url || '',
            thumbUrl: obj.display_url || obj.thumbnail_src || ''
        };
        cache[code] = merge(cache[code], data);
        recordData(cache[code]);
        refreshCode(code);
    }

    function scanJsonObject(obj, depth, seen) {
        var keys, i, v;
        if (!obj || typeof obj !== 'object' || depth > 7) return;
        if (seen.indexOf(obj) !== -1) return;
        seen.push(obj);
        updateFromObject(obj);
        keys = Object.keys(obj);
        for (i = 0; i < keys.length && i < 120; i++) {
            v = obj[keys[i]];
            if (v && typeof v === 'object') scanJsonObject(v, depth + 1, seen);
        }
    }

    function scanJsonText(text) {
        var codes = Object.keys(cache);
        var found = {};
        var reCode = /"(?:code|shortcode|short_code)"\s*:\s*"([A-Za-z0-9_-]{5,32})"/g;
        var m, i, code, p, area, data, n;
        if (!text || text.length > 8000000) return;
        while ((m = reCode.exec(text)) && Object.keys(found).length < 100) found[m[1]] = true;
        for (i = 0; i < codes.length; i++) found[codes[i]] = true;
        codes = Object.keys(found);
        for (i = 0; i < codes.length; i++) {
            code = codes[i]; p = text.indexOf(code); if (p < 0) continue;
            area = text.slice(Math.max(0, p - 14000), Math.min(text.length, p + 30000));
            data = {code: code, owner: areaOwner(area)};
            n = areaNumber(area, VIEW_KEYS); if (n !== null) data.views = n;
            n = areaNumber(area, ['like_count','likes_count']); if (n !== null) data.likes = n;
            n = areaNumber(area, ['comment_count','comments_count']); if (n !== null) data.comments = n;
            n = areaNumber(area, ['reshare_count','repost_count','reposts_count']); if (n !== null) data.reposts = n;
            n = areaNumber(area, ['taken_at','taken_at_timestamp']); if (n !== null) try { data.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e) {}
            data.videoUrl = areaString(area, ['video_url']);
            cache[code] = merge(cache[code], data);
            recordData(cache[code]);
            refreshCode(code);
        }
        try { scanJsonObject(JSON.parse(text), 0, []); } catch (e2) {}
    }

    function installNetworkObserver() {
        var originalFetch = window.fetch;
        var OriginalXHR = window.XMLHttpRequest;
        if (originalFetch && !originalFetch.__riWrapped) {
            window.fetch = function () {
                return originalFetch.apply(this, arguments).then(function (res) {
                    try {
                        var ct = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
                        var u = res.url || '';
                        if (ct.indexOf('json') !== -1 || /graphql|api|ajax|clips|reels/i.test(u)) res.clone().text().then(scanJsonText).catch(function () {});
                    } catch (e) {}
                    return res;
                });
            };
            window.fetch.__riWrapped = true;
        }
        if (OriginalXHR && !OriginalXHR.prototype.__riWrapped) {
            var oldOpen = OriginalXHR.prototype.open;
            var oldSend = OriginalXHR.prototype.send;
            OriginalXHR.prototype.open = function () { this.__riUrl = arguments[1] || ''; return oldOpen.apply(this, arguments); };
            OriginalXHR.prototype.send = function () {
                this.addEventListener('load', function () {
                    try {
                        var ct = this.getResponseHeader('content-type') || '';
                        if ((ct.indexOf('json') !== -1 || /graphql|api|ajax|clips|reels/i.test(this.__riUrl || '')) && typeof this.responseText === 'string') scanJsonText(this.responseText);
                    } catch (e) {}
                });
                return oldSend.apply(this, arguments);
            };
            OriginalXHR.prototype.__riWrapped = true;
        }
    }

    function embeddedPageData(code) {
        var out = {code: code};
        var scripts = document.scripts || [];
        var i, text, p, area, n, owner;
        if (!code) return out;
        for (i = 0; i < scripts.length && i < 250; i++) {
            text = scripts[i].textContent || '';
            if (!text || text.length > 7000000) continue;
            p = text.indexOf(code);
            if (p < 0) continue;
            area = text.slice(Math.max(0, p - 50000), Math.min(text.length, p + 90000));
            if (out.views === undefined) { n = areaNumber(area, VIEW_KEYS); if (n !== null) out.views = n; }
            if (out.likes === undefined) { n = areaNumber(area, ['like_count','likes_count']); if (n !== null) out.likes = n; }
            if (out.comments === undefined) { n = areaNumber(area, ['comment_count','comments_count']); if (n !== null) out.comments = n; }
            if (out.reposts === undefined) { n = areaNumber(area, ['reshare_count','repost_count','reposts_count']); if (n !== null) out.reposts = n; }
            if (!out.date) {
                n = areaNumber(area, ['taken_at','taken_at_timestamp']);
                if (n !== null) try { out.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e) {}
            }
            if (!out.owner) { owner = areaOwner(area); if (owner) out.owner = owner; }
            if (!out.videoUrl) out.videoUrl = areaString(area, ['video_url']);
            if (out.views !== undefined && out.likes !== undefined && out.comments !== undefined && out.owner) break;
        }
        return out;
    }

    function mainVideo() {
        var list = document.getElementsByTagName('video');
        var best = null, bestArea = 0, i, r, area;
        for (i = 0; i < list.length; i++) {
            if (!visible(list[i])) continue;
            r = list[i].getBoundingClientRect();
            area = r.width * r.height;
            if (area > bestArea) { bestArea = area; best = list[i]; }
        }
        return best;
    }

    function rootFor(video) {
        var el = video, i;
        if (!el) return document.querySelector('main') || document.body;
        for (i = 0; i < 9 && el; i++) {
            if (el.tagName && el.tagName.toLowerCase() === 'article') return el;
            el = el.parentElement;
        }
        return document.querySelector('main') || document.body;
    }

    function numberAround(el) {
        var control = el.closest('button,[role="button"],a') || el;
        var list = [control.textContent || ''];
        var p = control.parentElement;
        var i, n;
        if (control.previousElementSibling) list.push(control.previousElementSibling.textContent || '');
        if (control.nextElementSibling) list.push(control.nextElementSibling.textContent || '');
        if (p) {
            if (p.previousElementSibling) list.push(p.previousElementSibling.textContent || '');
            if (p.nextElementSibling) list.push(p.nextElementSibling.textContent || '');
        }
        for (i = 0; i < list.length; i++) { n = singleCount(list[i]); if (n !== null) return n; }
        return null;
    }

    function controlMetric(root, labels) {
        var all = root.querySelectorAll('button,[role="button"],a,[aria-label],[title],svg');
        var i, el, aria, title, text, n;
        for (i = 0; i < all.length; i++) {
            el = all[i];
            aria = (el.getAttribute && el.getAttribute('aria-label') || '').trim();
            title = (el.getAttribute && el.getAttribute('title') || '').trim();
            text = (el.textContent || '').trim();
            if (!hasLabel(aria, labels) && !hasLabel(title, labels) && !hasLabel(text, labels)) continue;
            n = labelled(aria, labels); if (n !== null) return n;
            n = labelled(title, labels); if (n !== null) return n;
            n = labelled(text, labels); if (n !== null) return n;
            n = numberAround(el); if (n !== null) return n;
        }
        return null;
    }

    function currentDomData() {
        var v = mainVideo();
        var root = rootFor(v);
        var times = document.querySelectorAll('time[datetime]');
        var date = null, i;
        for (i = 0; i < times.length; i++) if (visible(times[i])) { date = times[i].getAttribute('datetime'); break; }
        return {
            views: controlMetric(root, ['조회수','views','plays','재생']),
            likes: controlMetric(root, ['좋아요','likes','like']),
            comments: controlMetric(root, ['댓글','comments','comment']),
            reposts: controlMetric(root, ['리포스트','reposts','repost']),
            date: date ? date.slice(0, 10) : null,
            videoUrl: v ? (v.currentSrc || v.src || '') : '',
            thumbUrl: v ? (v.poster || '') : '',
            duration: v && isFinite(v.duration) ? v.duration : null,
            width: v ? v.videoWidth : null,
            height: v ? v.videoHeight : null
        };
    }

    function currentData() {
        var code = codeFromUrl(location.href);
        var dom = currentDomData();
        var embedded;
        if (!code) return Promise.resolve(dom);
        embedded = embeddedPageData(code);
        cache[code] = merge(cache[code], dom);
        cache[code] = merge(cache[code], embedded);
        recordData(cache[code]);
        return loadPost(location.href).then(function (remote) {
            var out = merge(cache[code], remote);
            if (dom.videoUrl) out.videoUrl = dom.videoUrl;
            if (dom.thumbUrl) out.thumbUrl = dom.thumbUrl;
            if (dom.duration !== null) out.duration = dom.duration;
            if (dom.width) out.width = dom.width;
            if (dom.height) out.height = dom.height;
            cache[code] = merge(cache[code], out);
            recordData(cache[code]);
            return cache[code];
        });
    }

    function openUrl(url) {
        var a;
        if (!url) return;
        a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
    }

    function openUpdate() { window.open(UPDATE_URL + '?ri=' + Date.now(), '_blank'); }
    function copyText(text) { if (text && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {}); }

    function iconSvg(type, size) {
        var s = size || 20;
        var c = 'width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
        if (type === 'image') return '<svg ' + c + '><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>';
        if (type === 'video') return '<svg ' + c + '><rect x="3" y="5" width="14" height="14" rx="2"></rect><path d="M17 9l4-2v10l-4-2z"></path><path d="M8.5 9.2l4 2.8-4 2.8z" fill="currentColor" stroke="none"></path></svg>';
        if (type === 'research') return '<svg ' + c + '><path d="M4 19V13"></path><path d="M9 19V9"></path><path d="M14 19V5"></path><circle cx="17.5" cy="14.5" r="3.5"></circle><path d="M20 17l2 2"></path></svg>';
        if (type === 'link') return '<svg ' + c + '><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"></path></svg>';
        return '';
    }

    function findMoreControl() {
        var all = document.querySelectorAll('button,[role="button"],a');
        var best = null, bestScore = -1;
        var i, el, r, label, svg, score;
        for (i = 0; i < all.length; i++) {
            el = all[i]; if (!visible(el)) continue;
            r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 20 || r.width > 90 || r.height > 90 || r.right < innerWidth * 0.60) continue;
            svg = el.querySelector('svg[aria-label],svg[title]');
            label = [el.getAttribute('aria-label') || '', el.getAttribute('title') || '', svg && svg.getAttribute('aria-label') || '', svg && svg.getAttribute('title') || ''].join(' ').toLowerCase();
            if (!/(더\s*보기|옵션|more|options)/i.test(label)) continue;
            score = 0;
            if (r.right > innerWidth * 0.85) score += 3;
            if (r.top > innerHeight * 0.25) score += 2;
            if (r.bottom < innerHeight * 0.92) score += 1;
            if (score > bestScore) { bestScore = score; best = el; }
        }
        return best;
    }

    function positionTool() {
        var b = document.getElementById('ri-tool');
        var more, r, x, y;
        if (!b) return;
        more = findMoreControl();
        if (more) {
            r = more.getBoundingClientRect();
            x = Math.max(4, Math.min(innerWidth - 42, r.left + r.width / 2 - 18));
            y = Math.max(6, Math.min(innerHeight - 42, r.bottom + 4));
            b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto';
        } else {
            b.style.left = 'auto'; b.style.top = 'auto'; b.style.right = '12px'; b.style.bottom = '68px';
        }
    }

    function panelEl(tag, css, text) {
        var el = document.createElement(tag);
        if (css) el.style.cssText = css;
        if (text !== undefined && text !== null) el.textContent = text;
        return el;
    }

    function wingMetric(parent, id, label, hostId) {
        var row = panelEl('div', 'display:block;min-height:39px;padding:6px 0 5px;border-bottom:1px solid rgba(255,255,255,.075);');
        var lab = panelEl('div', 'font-size:9px;line-height:1.05;color:rgba(255,255,255,.52);white-space:nowrap;', label);
        var val = panelEl('div', 'margin-top:3px;font-size:12.5px;line-height:1.12;font-weight:700;color:#fff;white-space:normal;word-break:break-word;', '—');
        if (hostId) row.id = hostId;
        val.id = id;
        row.appendChild(lab); row.appendChild(val); parent.appendChild(row);
        return row;
    }

    function setTextOrHide(valueId, hostId, value) {
        var el = document.getElementById(valueId), host = document.getElementById(hostId);
        if (!el || !host) return;
        if (value === null || value === undefined || value === '') host.style.display = 'none';
        else { host.style.display = 'block'; el.textContent = value; }
    }

    function updatePanel(data) {
        var er = engagementRate(data), growth = growth24h(data), multiple = accountMultiple(data), media = '';
        setTextOrHide('ri-v-views', 'ri-row-views', fmt(data.views));
        setTextOrHide('ri-v-likes', 'ri-row-likes', fmt(data.likes));
        setTextOrHide('ri-v-comments', 'ri-row-comments', fmt(data.comments));
        setTextOrHide('ri-v-reposts', 'ri-row-reposts', fmt(data.reposts));
        setTextOrHide('ri-v-er', 'ri-row-er', er !== null ? fmtPercent(er) : '');
        setTextOrHide('ri-v-growth', 'ri-row-growth', growth !== null ? fmtGrowth(growth) : '');
        setTextOrHide('ri-v-multiple', 'ri-row-multiple', multiple !== null ? fmtMultiple(multiple) : '');
        setTextOrHide('ri-v-date', 'ri-row-date', data.date || '');
        if (data.duration !== null && data.duration !== undefined) media += Number(data.duration).toFixed(1) + '초';
        if (data.width && data.height) media += (media ? ' · ' : '') + data.width + '×' + data.height;
        setTextOrHide('ri-v-media', 'ri-row-media', media);
    }

    function wingAction(text, icon, fn) {
        var b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'width:100%;display:flex;align-items:center;gap:6px;min-height:33px;padding:0 3px;border:0;border-bottom:1px solid rgba(255,255,255,.075);background:transparent;color:#fff;font:600 10px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:left;';
        b.innerHTML = iconSvg(icon, 14) + '<span>' + text + '</span>';
        b.onclick = fn;
        return b;
    }

    function closePanel() {
        var panel = document.getElementById('ri-panel');
        if (panel) {
            panel.style.transform = 'translateX(100%)';
            setTimeout(function () { if (panel.parentNode) panel.remove(); syncTool(); }, 160);
        } else syncTool();
    }

    function openPanel() {
        var existing = document.getElementById('ri-panel');
        var tool = document.getElementById('ri-tool');
        var panel, header, title, version, close, content, metrics, actions, update;
        if (existing) return;
        if (tool) tool.remove();
        panel = document.createElement('aside');
        panel.id = 'ri-panel';
        panel.style.cssText = 'position:fixed;right:0;top:0;bottom:0;width:min(31vw,150px);z-index:2147483647;background:rgba(14,14,14,.99);color:#fff;border-left:1px solid rgba(255,255,255,.09);box-shadow:-5px 0 18px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow-y:auto;overscroll-behavior:contain;transform:translateX(100%);transition:transform .16s ease-out;padding-bottom:max(10px,env(safe-area-inset-bottom));';
        header = panelEl('div', 'position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:2px;height:40px;padding:0 5px 0 7px;background:rgba(14,14,14,.99);border-bottom:1px solid rgba(255,255,255,.08);');
        title = panelEl('div', 'min-width:0;flex:1;font-size:10.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', '리서치');
        version = panelEl('div', 'font-size:7px;color:rgba(255,255,255,.32);', 'v' + VERSION);
        close = panelEl('button', 'width:22px;height:22px;padding:0;border:0;background:transparent;color:#fff;font-size:18px;line-height:22px;', '×');
        close.type = 'button'; close.onclick = closePanel;
        header.appendChild(title); header.appendChild(version); header.appendChild(close); panel.appendChild(header);
        content = panelEl('div', 'padding:2px 7px 8px;');
        metrics = panelEl('div', 'padding:0 0 5px;');
        wingMetric(metrics, 'ri-v-views', '조회수', 'ri-row-views');
        wingMetric(metrics, 'ri-v-likes', '좋아요', 'ri-row-likes');
        wingMetric(metrics, 'ri-v-comments', '댓글', 'ri-row-comments');
        wingMetric(metrics, 'ri-v-reposts', '리포스트', 'ri-row-reposts');
        wingMetric(metrics, 'ri-v-er', 'ER', 'ri-row-er');
        wingMetric(metrics, 'ri-v-growth', '24시간', 'ri-row-growth');
        wingMetric(metrics, 'ri-v-multiple', '계정 대비', 'ri-row-multiple');
        wingMetric(metrics, 'ri-v-date', '게시일', 'ri-row-date');
        wingMetric(metrics, 'ri-v-media', '영상', 'ri-row-media');
        content.appendChild(metrics);
        actions = panelEl('div', 'margin-top:2px;border-top:1px solid rgba(255,255,255,.075);');
        actions.appendChild(wingAction('순수 영상', 'video', function () { currentData().then(function (d) { openUrl(d.videoUrl); }); }));
        actions.appendChild(wingAction('썸네일', 'image', function () { currentData().then(function (d) { openUrl(d.thumbUrl); }); }));
        actions.appendChild(wingAction('링크 복사', 'link', function () { copyText(location.href.split('?')[0]); }));
        content.appendChild(actions);
        update = panelEl('button', 'width:100%;margin-top:8px;height:27px;border:1px solid rgba(255,255,255,.10);border-radius:6px;background:transparent;color:rgba(255,255,255,.42);font:600 8px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;', '새 버전 설치');
        update.type = 'button'; update.onclick = openUpdate; content.appendChild(update);
        panel.appendChild(content); document.documentElement.appendChild(panel);
        requestAnimationFrame(function () { panel.style.transform = 'translateX(0)'; });
        currentData().then(updatePanel);
        setTimeout(function () { if (document.getElementById('ri-panel')) currentData().then(updatePanel); }, 700);
        setTimeout(function () { if (document.getElementById('ri-panel')) currentData().then(updatePanel); }, 1600);
        setTimeout(function () { if (document.getElementById('ri-panel')) currentData().then(updatePanel); }, 3200);
    }

    function syncTool() {
        var b = document.getElementById('ri-tool');
        if (document.getElementById('ri-panel')) { if (b) b.remove(); return; }
        if (!detailPage()) { if (b) b.remove(); return; }
        if (!b) {
            b = document.createElement('button');
            b.id = 'ri-tool'; b.type = 'button'; b.setAttribute('aria-label', '콘텐츠 리서치'); b.title = '콘텐츠 리서치';
            b.style.cssText = 'position:fixed;z-index:2147483600;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.08);color:#fff;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));touch-action:manipulation;';
            b.innerHTML = iconSvg('research', 21); b.onclick = openPanel; document.documentElement.appendChild(b);
        }
        positionTool();
    }

    function exactPostPath(a) { return /^\/(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?$/.test(a.pathname || ''); }

    function fixedAncestor(a) {
        var el = a, i, p;
        for (i = 0; i < 8 && el; i++) {
            p = getComputedStyle(el).position;
            if (p === 'fixed' || p === 'sticky') return true;
            if (el.tagName && el.tagName.toLowerCase() === 'main') break;
            el = el.parentElement;
        }
        return false;
    }

    function validGridAnchor(a) {
        var img, ar, ir;
        if (!a || !a.isConnected || !exactPostPath(a)) return false;
        if (!a.closest('main')) return false;
        if (a.closest('nav,header,[role="navigation"],[role="dialog"],#ri-panel')) return false;
        if (fixedAncestor(a)) return false;
        img = a.querySelector('img'); if (!img) return false;
        ar = a.getBoundingClientRect(); ir = img.getBoundingClientRect();
        if (ar.width < 80 || ar.height < 80 || ir.width < 80 || ir.height < 80) return false;
        if (ir.width < ar.width * 0.55) return false;
        return true;
    }

    function cardText(a) {
        var out = [a.textContent || '', a.getAttribute('aria-label') || '', a.getAttribute('title') || ''];
        var all = a.querySelectorAll('[aria-label],[title],img[alt]');
        var i, v;
        for (i = 0; i < all.length; i++) {
            v = all[i].getAttribute('aria-label'); if (v) out.push(v);
            v = all[i].getAttribute('title'); if (v) out.push(v);
            v = all[i].getAttribute('alt'); if (v) out.push(v);
        }
        return out.join(' ');
    }

    function cardData(a) {
        var code = codeFromUrl(a.href);
        var img = a.querySelector('img');
        var text = cardText(a);
        var nativeData = {
            code: code, pageUrl: a.href,
            views: labelled(text, ['조회수','views','plays','재생']),
            likes: labelled(text, ['좋아요','likes','like']),
            comments: labelled(text, ['댓글','comments','comment']),
            thumbUrl: img ? (img.currentSrc || img.src || '') : ''
        };
        cache[code] = merge(cache[code], nativeData);
        return cache[code];
    }

    function isVideoCard(a, data) {
        var text;
        if (/\/(?:reel|reels)\//.test(a.pathname || '')) return true;
        if (data && data.videoUrl) return true;
        text = cardText(a).toLowerCase();
        return /reel|video|동영상|릴스/.test(text);
    }

    function gridButton(type, title, fn, cls) {
        var b = document.createElement('button');
        b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); if (cls) b.className = cls;
        b.style.cssText = 'width:25px;height:25px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(0,0,0,.30);color:#fff;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        b.innerHTML = iconSvg(type, 15);
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }, true);
        return b;
    }

    function ensureVideoButton(a, data) {
        var actions = a.querySelector('.ri-actions');
        if (!actions || a.querySelector('.ri-vid') || !isVideoCard(a, data)) return;
        actions.appendChild(gridButton('video', '순수 영상 보기', function () { loadPost(a.href).then(function (d) { openUrl(d.videoUrl || a.href); }); }, 'ri-vid'));
    }

    function setGridSpan(span, value) {
        if (!span) return;
        if (value) { span.textContent = value; span.style.display = ''; }
        else { span.textContent = ''; span.style.display = 'none'; }
    }

    function paintCard(a) {
        var data = cardData(a);
        var primary = a.querySelector('.ri-primary');
        var secondary = a.querySelector('.ri-secondary');
        var grad = a.querySelector('.ri-gradient');
        var actions = a.querySelector('.ri-actions');
        var safe = safeOverlayArea(a);
        var er = engagementRate(data), growth = growth24h(data), multiple = accountMultiple(data);
        var hasPrimary, hasSecondary;
        if (!primary || !secondary || !grad) return;
        setGridSpan(primary.querySelector('.ri-p-view'), data.views !== null && data.views !== undefined ? '▶' + fmt(data.views) : '');
        setGridSpan(primary.querySelector('.ri-p-like'), data.likes !== null && data.likes !== undefined ? '♥' + fmt(data.likes) : '');
        setGridSpan(primary.querySelector('.ri-p-comment'), data.comments !== null && data.comments !== undefined ? '●' + fmt(data.comments) : '');
        setGridSpan(primary.querySelector('.ri-p-repost'), data.reposts !== null && data.reposts !== undefined ? '↻' + fmt(data.reposts) : '');
        setGridSpan(secondary.querySelector('.ri-s-er'), er !== null ? fmtPercent(er) : '');
        setGridSpan(secondary.querySelector('.ri-s-growth'), growth !== null ? fmtGrowth(growth) : '');
        setGridSpan(secondary.querySelector('.ri-s-multiple'), multiple !== null ? fmtMultiple(multiple) : '');
        setGridSpan(secondary.querySelector('.ri-s-date'), data.date ? String(data.date).slice(5).replace('-', '/') : '');
        hasPrimary = !!primary.textContent.trim(); hasSecondary = !!secondary.textContent.trim();
        primary.style.display = safe && hasPrimary ? 'flex' : 'none';
        secondary.style.display = safe && hasSecondary ? 'flex' : 'none';
        grad.style.display = safe && hasPrimary ? 'block' : 'none';
        if (actions) actions.style.display = safe ? 'flex' : 'none';
        ensureVideoButton(a, data);
    }

    function refreshCode(code) {
        var all = document.querySelectorAll('a[data-ri-code="' + code + '"]');
        var i;
        for (i = 0; i < all.length; i++) paintCard(all[i]);
        if (code === codeFromUrl(location.href) && document.getElementById('ri-panel')) currentData().then(updatePanel);
    }

    function renderCard(a) {
        var code, img, grad, stack, primary, secondary, actions;
        if (!validGridAnchor(a)) return;
        code = codeFromUrl(a.href); if (!code) return;
        if (a.getAttribute('data-ri') === '1' && a.querySelector('.ri-actions')) { paintCard(a); if (nearViewport(a)) loadPost(a.href); return; }
        a.setAttribute('data-ri', '1'); a.setAttribute('data-ri-code', code); a.style.position = 'relative'; img = a.querySelector('img');
        grad = document.createElement('div');
        grad.className = 'ri-gradient';
        grad.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:32%;z-index:35;background:linear-gradient(to top,rgba(0,0,0,.36) 0%,rgba(0,0,0,.10) 52%,rgba(0,0,0,0) 100%);pointer-events:none;display:none;';
        stack = document.createElement('div');
        stack.className = 'ri-bottom-stack';
        stack.style.cssText = 'position:absolute;left:3px;right:3px;bottom:4px;z-index:43;display:flex;flex-direction:column;gap:4px;pointer-events:none;';
        primary = document.createElement('div');
        primary.className = 'ri-primary';
        primary.style.cssText = 'min-width:0;display:none;align-items:center;justify-content:space-between;gap:0;color:#fff;font:750 9.8px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.55px;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.82);';
        primary.innerHTML = '<span class="ri-p-view"></span><span class="ri-p-like"></span><span class="ri-p-comment"></span><span class="ri-p-repost"></span>';
        secondary = document.createElement('div');
        secondary.className = 'ri-secondary';
        secondary.style.cssText = 'min-width:0;display:none;align-items:center;justify-content:space-between;gap:1px;color:#111;font:800 9.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.55px;white-space:nowrap;-webkit-text-stroke:.65px rgba(255,255,255,.98);paint-order:stroke fill;text-shadow:0 0 1px rgba(255,255,255,1),0 0 2px rgba(255,255,255,.95);';
        secondary.innerHTML = '<span class="ri-s-er"></span><span class="ri-s-growth"></span><span class="ri-s-multiple"></span><span class="ri-s-date"></span>';
        stack.appendChild(primary); stack.appendChild(secondary);
        actions = document.createElement('div');
        actions.className = 'ri-actions';
        actions.style.cssText = 'position:absolute;right:4px;top:4px;z-index:50;display:flex;flex-direction:column;gap:3px;';
        actions.appendChild(gridButton('image', '이미지 또는 썸네일 보기', function () { openUrl(img.currentSrc || img.src || ''); }, 'ri-img'));
        a.appendChild(grad); a.appendChild(stack); a.appendChild(actions);
        paintCard(a); if (nearViewport(a)) loadPost(a.href);
    }

    function cleanup() {
        var all = document.querySelectorAll('.ri-actions,.ri-bottom-stack,.ri-gradient,.ri-badges,.ri-metrics');
        var i, host;
        for (i = 0; i < all.length; i++) { host = all[i].parentElement; if (!host || !validGridAnchor(host) || detailPage()) all[i].remove(); }
        all = document.querySelectorAll('[data-ri="1"]');
        for (i = 0; i < all.length; i++) if (!validGridAnchor(all[i]) || detailPage()) { all[i].removeAttribute('data-ri'); all[i].removeAttribute('data-ri-code'); }
        all = ['ri-github-retry','ri-install-ok','ri-file-ok','ri-test-box','ri-update'];
        for (i = 0; i < all.length; i++) { host = document.getElementById(all[i]); if (host) host.remove(); }
    }

    function scan() {
        var all, candidates = [], i;
        cleanup(); syncTool(); if (detailPage()) return;
        all = document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
        for (i = 0; i < all.length; i++) if (validGridAnchor(all[i])) candidates.push(all[i]);
        if (candidates.length < 3) return;
        for (i = 0; i < candidates.length; i++) renderCard(candidates[i]);
    }

    function schedule() { clearTimeout(scanTimer); scanTimer = setTimeout(scan, 120); }

    function status() {
        var d = document.createElement('div');
        d.textContent = 'Reels Inspector ' + VERSION;
        d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483646;background:rgba(0,0,0,.70);color:#fff;padding:6px 9px;border-radius:8px;font:600 11px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;pointer-events:none;';
        (document.body || document.documentElement).appendChild(d);
        setTimeout(function () { if (d.parentNode) d.remove(); }, 1050);
    }

    function start() {
        var observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, {childList: true, subtree: true});
        addEventListener('scroll', schedule, true);
        addEventListener('resize', function () { positionTool(); schedule(); }, true);
        cleanup(); status(); scan();
        setInterval(function () {
            if (location.href !== lastUrl) { lastUrl = location.href; closePanel(); schedule(); }
            else { cleanup(); syncTool(); schedule(); }
        }, 800);
    }

    installNetworkObserver();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
