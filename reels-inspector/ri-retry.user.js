// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      2.2.4
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @require      https://raw.githubusercontent.com/sunsee83/dev-lab/20c293c807f6a8129cbae5df19ff0b53e8ce7664/reels-inspector/ri-retry.user.js
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==
(function () {
    'use strict';

    var VER = '2.2.4';
    var GRID_KEY = 'ri2:grid:v1';
    var SNAP_KEY = 'ri2:snap:v1';
    var VIEW_KEYS = ['play_count','ig_play_count','video_play_count','video_view_count','view_count','view_count_fb','clips_play_count','reel_view_count','media_view_count','views','plays'];
    var ITEMS = {};
    var VIDEO_MAP = {};
    var POSTER_MAP = {};
    var currentCode = '';
    var lastPermalinkFetch = 0;
    var fetchBusy = false;

    function codeFromUrl(u) {
        var m = String(u || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : '';
    }

    function read(k, d) {
        try {
            var s = localStorage.getItem(k);
            return s ? JSON.parse(s) : d;
        } catch (e) { return d; }
    }

    function write(k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }

    function parseCount(s) {
        s = String(s || '').replace(/[▶♥●↻]/g, '').replace(/,/g, '').replace(/\s+/g, '');
        var m = s.match(/^([0-9]+(?:\.[0-9]+)?)(만|천|억|K|M|B|k|m|b)?$/);
        var n, u;
        if (!m) return null;
        n = Number(m[1]);
        u = m[2] || '';
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

    function pct(n) {
        n = Number(n);
        if (!isFinite(n)) return '';
        return (Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/0+$/, '').replace(/\.$/, '') + '%';
    }

    function normUrl(u) {
        if (!u || /^blob:/i.test(u)) return '';
        try {
            var x = new URL(String(u).replace(/\\u0026/g, '&').replace(/\\\//g, '/'), location.href);
            return x.hostname + x.pathname;
        } catch (e) { return ''; }
    }

    function visibleVideo() {
        var vs = document.querySelectorAll('video');
        var best = null, bestScore = -Infinity, i, r, visW, visH, area, cy, score;
        for (i = 0; i < vs.length; i++) {
            r = vs[i].getBoundingClientRect();
            visW = Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left));
            visH = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
            area = visW * visH;
            if (area < 20000) continue;
            cy = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
            score = area - Math.abs(cy - innerHeight / 2) * innerWidth * 1.5;
            if (!vs[i].paused) score += innerWidth * innerHeight * 0.12;
            if (score > bestScore) {
                bestScore = score;
                best = vs[i];
            }
        }
        return best;
    }

    function findRoot(v) {
        var e = v, i, r, best = v, buttons, hasActions;
        for (i = 0; i < 14 && e; i++, e = e.parentElement) {
            r = e.getBoundingClientRect();
            if (r.width > innerWidth * 0.55 && r.height > innerHeight * 0.45) best = e;
            if (e.querySelectorAll) {
                buttons = e.querySelectorAll('button,[role="button"],svg[aria-label]');
                hasActions = false;
                for (var j = 0; j < buttons.length && j < 180; j++) {
                    var s = ((buttons[j].getAttribute && buttons[j].getAttribute('aria-label')) || '').toLowerCase();
                    if (/like|좋아요|comment|댓글|repost|리포스트|share|공유/.test(s)) { hasActions = true; break; }
                }
                if (hasActions && r.width > innerWidth * 0.60 && r.height > innerHeight * 0.55) return e;
            }
        }
        return best || document.querySelector('main') || document.body;
    }

    function rootCode(root) {
        var urlCode = codeFromUrl(location.href);
        if (urlCode) return { code: urlCode, url: location.href.split('?')[0] };
        if (!root) return { code: '', url: '' };
        var as = root.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
        var i, c;
        for (i = 0; i < as.length; i++) {
            c = codeFromUrl(as[i].href);
            if (c) return { code: c, url: as[i].href.split('?')[0] };
        }
        return { code: '', url: '' };
    }

    function matchMappedCode(v) {
        if (!v) return '';
        var candidates = [v.currentSrc || '', v.src || '', v.poster || ''];
        var i, key, c;
        for (i = 0; i < candidates.length; i++) {
            key = normUrl(candidates[i]);
            if (!key) continue;
            c = VIDEO_MAP[key] || POSTER_MAP[key];
            if (c) return c;
        }
        return '';
    }

    function context() {
        var v = visibleVideo();
        if (!v) return null;
        var root = findRoot(v);
        var rc = rootCode(root);
        var c = rc.code || matchMappedCode(v);
        if (!c) return null;
        return {
            video: v,
            root: root,
            code: c,
            url: rc.url || ('https://www.instagram.com/reel/' + c + '/')
        };
    }

    function saveGrid(c, d) {
        if (!c || !d || !d.views) return;
        var s = read(GRID_KEY, {});
        d.t = Date.now();
        s[c] = Object.assign(s[c] || {}, d);
        write(GRID_KEY, s);
        recordSnap(c, d.views);
    }

    function recordSnap(c, v) {
        if (!c || !v) return;
        var s = read(SNAP_KEY, {}), a = Array.isArray(s[c]) ? s[c] : [], now = Date.now();
        var last = a.length ? a[a.length - 1] : null;
        if (!last || now - last.t > 1800000 || last.v !== v) a.push({ t: now, v: v });
        a = a.filter(function (x) { return now - x.t < 14 * 86400000; });
        if (a.length > 80) a = a.slice(-80);
        s[c] = a;
        write(SNAP_KEY, s);
    }

    function growth(c, v) {
        if (!c || !v) return null;
        var a = read(SNAP_KEY, {})[c] || [], now = Date.now(), best = null, bd = Infinity;
        a.forEach(function (x) {
            var age = now - x.t;
            if (age < 18 * 3600000 || age > 32 * 3600000) return;
            var d = Math.abs(age - 86400000);
            if (d < bd) { bd = d; best = x; }
        });
        if (!best || !best.v || v < best.v) return null;
        return (v - best.v) / best.v * 100;
    }

    function scanGrid() {
        var as = document.querySelectorAll('a[data-ri-code]');
        var i, a, c, v, l, cm, rp, dt;
        for (i = 0; i < as.length; i++) {
            a = as[i];
            c = a.getAttribute('data-ri-code') || codeFromUrl(a.href);
            v = parseCount((a.querySelector('.ri-p-view') || {}).textContent);
            if (!c || !v) continue;
            l = parseCount((a.querySelector('.ri-p-like') || {}).textContent);
            cm = parseCount((a.querySelector('.ri-p-comment') || {}).textContent);
            rp = parseCount((a.querySelector('.ri-p-repost') || {}).textContent);
            dt = ((a.querySelector('.ri-s-date') || {}).textContent || '').trim();
            saveGrid(c, { views: v, likes: l, comments: cm, reposts: rp, date: dt });
        }
    }

    function metricFromRoot(root, labels) {
        if (!root) return null;
        var es = root.querySelectorAll('button,[role="button"],a,[aria-label],[title],svg');
        var i, e, s, p, parts, j, m, n;
        for (i = 0; i < es.length; i++) {
            e = es[i];
            s = [e.getAttribute && e.getAttribute('aria-label') || '', e.getAttribute && e.getAttribute('title') || '', e.textContent || ''].join(' ').toLowerCase();
            if (!labels.some(function (x) { return s.indexOf(x.toLowerCase()) >= 0; })) continue;
            p = e.closest('button,[role="button"],a') || e.parentElement || e;
            parts = [p.textContent || ''];
            if (p.parentElement) parts.push(p.parentElement.textContent || '');
            if (p.nextElementSibling) parts.push(p.nextElementSibling.textContent || '');
            if (p.previousElementSibling) parts.push(p.previousElementSibling.textContent || '');
            for (j = 0; j < parts.length; j++) {
                m = String(parts[j]).match(/([0-9]+(?:[.,][0-9]+)?\s*(?:만|천|억|K|M|B|k|m|b)?)/);
                if (m) {
                    n = parseCount(m[1]);
                    if (n !== null) return n;
                }
            }
        }
        return null;
    }

    function dateFromRoot(root) {
        var ts = root ? root.querySelectorAll('time[datetime]') : [];
        var i, r;
        for (i = 0; i < ts.length; i++) {
            r = ts[i].getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight) {
                return (ts[i].getAttribute('datetime') || '').slice(5, 10).replace('-', '/');
            }
        }
        return '';
    }

    function firstNumber(obj, keys) {
        if (!obj) return null;
        for (var i = 0; i < keys.length; i++) {
            if (obj[keys[i]] !== undefined && obj[keys[i]] !== null && isFinite(Number(obj[keys[i]]))) return Number(obj[keys[i]]);
        }
        return null;
    }

    function rememberObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        var c = obj.code || obj.shortcode || obj.short_code;
        if (!c || typeof c !== 'string' || c.length < 5 || c.length > 40) return;
        var d = ITEMS[c] || { code: c };
        var n;
        n = firstNumber(obj, VIEW_KEYS); if (n !== null) d.views = n;
        n = firstNumber(obj, ['like_count','likes_count']); if (n !== null) d.likes = n;
        n = firstNumber(obj, ['comment_count','comments_count']); if (n !== null) d.comments = n;
        n = firstNumber(obj, ['reshare_count','repost_count','reposts_count']); if (n !== null) d.reposts = n;
        n = firstNumber(obj, ['taken_at','taken_at_timestamp']);
        if (n !== null) {
            try { d.date = new Date(n * 1000).toISOString().slice(5, 10).replace('-', '/'); } catch (e) {}
        }
        var urls = [];
        if (obj.video_url) urls.push(obj.video_url);
        if (Array.isArray(obj.video_versions)) obj.video_versions.forEach(function (x) { if (x && x.url) urls.push(x.url); });
        if (Array.isArray(obj.video_resources)) obj.video_resources.forEach(function (x) { if (x && (x.src || x.url)) urls.push(x.src || x.url); });
        urls.forEach(function (u) {
            var k = normUrl(u);
            if (k) VIDEO_MAP[k] = c;
        });
        var imgs = [];
        if (obj.display_url) imgs.push(obj.display_url);
        if (obj.thumbnail_src) imgs.push(obj.thumbnail_src);
        if (obj.image_versions2 && Array.isArray(obj.image_versions2.candidates)) obj.image_versions2.candidates.forEach(function (x) { if (x && x.url) imgs.push(x.url); });
        imgs.forEach(function (u) {
            var k = normUrl(u);
            if (k) POSTER_MAP[k] = c;
        });
        ITEMS[c] = d;
        if (d.views) saveGrid(c, d);
    }

    function walkJson(obj, depth, state) {
        if (!obj || typeof obj !== 'object' || depth > 10 || state.count > 30000) return;
        state.count++;
        rememberObject(obj);
        var ks = Object.keys(obj), i, v;
        for (i = 0; i < ks.length && i < 180; i++) {
            v = obj[ks[i]];
            if (v && typeof v === 'object') walkJson(v, depth + 1, state);
        }
    }

    function nearMetric(text, c, keys) {
        if (!text || !c || text.length > 10000000) return null;
        var positions = [], p = 0, i, k, st, en, a, re, m, g, abs, d, best = null, bd = Infinity;
        while ((p = text.indexOf(c, p)) >= 0 && positions.length < 25) { positions.push(p); p += c.length; }
        for (i = 0; i < positions.length; i++) {
            st = Math.max(0, positions[i] - 22000);
            en = Math.min(text.length, positions[i] + 36000);
            a = text.slice(st, en);
            for (k = 0; k < keys.length; k++) {
                re = new RegExp('(?:["\\\\])?' + keys[k] + '(?:["\\\\])?\\s*:\\s*["\\\\]?([0-9]+)["\\\\]?', 'ig');
                g = 0;
                while ((m = re.exec(a)) && g++ < 20) {
                    abs = st + m.index;
                    d = Math.abs(abs - positions[i]);
                    if (d < bd) { bd = d; best = Number(m[1]); }
                }
            }
        }
        return best;
    }

    function parseResponseForCode(text, c) {
        var d = {};
        d.views = nearMetric(text, c, VIEW_KEYS);
        d.likes = nearMetric(text, c, ['like_count','likes_count']);
        d.comments = nearMetric(text, c, ['comment_count','comments_count']);
        d.reposts = nearMetric(text, c, ['reshare_count','repost_count','reposts_count']);
        var t = nearMetric(text, c, ['taken_at','taken_at_timestamp']);
        if (t) {
            try { d.date = new Date(t * 1000).toISOString().slice(5, 10).replace('-', '/'); } catch (e) {}
        }
        return d;
    }

    function scanNetworkText(text) {
        if (!text || text.length > 12000000) return;
        try {
            walkJson(JSON.parse(text), 0, { count: 0 });
        } catch (e) {}
        if (currentCode) {
            var d = parseResponseForCode(text, currentCode);
            if (d.views || d.likes || d.comments || d.reposts) {
                ITEMS[currentCode] = Object.assign(ITEMS[currentCode] || {}, d);
                if (d.views) saveGrid(currentCode, d);
            }
        }
    }

    function hookNetwork() {
        var of = window.fetch, OX = window.XMLHttpRequest;
        if (of && !of.__ri224) {
            window.fetch = function () {
                return of.apply(this, arguments).then(function (r) {
                    try {
                        var u = r.url || '', ct = r.headers && r.headers.get ? (r.headers.get('content-type') || '') : '';
                        if (ct.indexOf('json') >= 0 || /graphql|api|ajax|clips|reels|media/i.test(u)) {
                            r.clone().text().then(scanNetworkText).catch(function () {});
                        }
                    } catch (e) {}
                    return r;
                });
            };
            window.fetch.__ri224 = true;
        }
        if (OX && !OX.prototype.__ri224) {
            var oo = OX.prototype.open, os = OX.prototype.send;
            OX.prototype.open = function () { this.__ri224url = arguments[1] || ''; return oo.apply(this, arguments); };
            OX.prototype.send = function () {
                this.addEventListener('load', function () {
                    try {
                        var ct = this.getResponseHeader('content-type') || '';
                        if ((ct.indexOf('json') >= 0 || /graphql|api|ajax|clips|reels|media/i.test(this.__ri224url || '')) && typeof this.responseText === 'string') {
                            scanNetworkText(this.responseText);
                        }
                    } catch (e) {}
                });
                return os.apply(this, arguments);
            };
            OX.prototype.__ri224 = true;
        }
    }

    function injectStyle() {
        var st = document.getElementById('ri224-style');
        if (st) return;
        st = document.createElement('style');
        st.id = 'ri224-style';
        st.textContent = '#ri-detail-metrics,#ri222-detail,#ri223-detail{display:none!important}#ri224-detail{background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}';
        (document.head || document.documentElement).appendChild(st);
    }

    function makeBox() {
        var b = document.getElementById('ri224-detail');
        if (b) return b;
        b = document.createElement('div');
        b.id = 'ri224-detail';
        b.style.cssText = 'position:fixed;right:58px;top:clamp(92px,14vh,145px);z-index:2147483599;width:76px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:none;flex-direction:column;align-items:flex-end;gap:8px;text-align:right;background:none!important;';
        [['views','조회수'],['er','ER'],['growth','24h'],['multiple','배수'],['date','게시일']].forEach(function (x) {
            var r = document.createElement('div'), v = document.createElement('div'), l = document.createElement('div');
            r.dataset.k = x[0];
            r.style.cssText = 'display:none;flex-direction:column;align-items:flex-end;gap:1px;background:none!important;';
            v.className = 'v';
            v.style.cssText = 'max-width:76px;white-space:nowrap;font:760 12.5px/1.05 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.2px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.98),0 0 2px rgba(0,0,0,.75);background:none!important;';
            l.textContent = x[1];
            l.style.cssText = 'font:650 8.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:rgba(255,255,255,.86);text-shadow:0 1px 3px rgba(0,0,0,.98);background:none!important;';
            r.appendChild(v); r.appendChild(l); b.appendChild(r);
        });
        document.documentElement.appendChild(b);
        return b;
    }

    function setVal(b, k, t) {
        var r = b.querySelector('[data-k="' + k + '"]'), v = r && r.querySelector('.v');
        if (!r || !v) return false;
        if (!t) { r.style.display = 'none'; v.textContent = ''; return false; }
        if (v.textContent !== t) v.textContent = t;
        r.style.display = 'flex';
        return true;
    }

    function render(ctx) {
        var old = document.getElementById('ri224-detail');
        if (!ctx) { if (old) old.style.display = 'none'; return; }
        var c = ctx.code;
        var grid = read(GRID_KEY, {})[c] || {};
        var n = ITEMS[c] || {};
        var views = n.views || grid.views || null;
        var likes = metricFromRoot(ctx.root, ['좋아요','likes','like']);
        var comments = metricFromRoot(ctx.root, ['댓글','comments','comment']);
        var reposts = metricFromRoot(ctx.root, ['리포스트','reposts','repost']);
        if (likes === null) likes = n.likes || grid.likes || null;
        if (comments === null) comments = n.comments || grid.comments || null;
        if (reposts === null) reposts = n.reposts || grid.reposts || null;
        var dt = dateFromRoot(ctx.root) || n.date || grid.date || '';
        var er = null, g = null, any = false, b = makeBox();
        if (views && (likes || comments || reposts)) er = ((likes || 0) + (comments || 0) + (reposts || 0)) / views * 100;
        if (views) g = growth(c, views);
        any = setVal(b, 'views', views ? fmt(views) : '') || any;
        any = setVal(b, 'er', er !== null ? 'ER ' + pct(er) : '') || any;
        any = setVal(b, 'growth', g !== null ? (g >= 0 ? '+' : '') + pct(g) : '') || any;
        setVal(b, 'multiple', '');
        any = setVal(b, 'date', dt) || any;
        b.style.display = any ? 'flex' : 'none';
        if (!views) fetchPermalink(ctx);
    }

    function fetchPermalink(ctx) {
        var now = Date.now();
        if (!ctx || !ctx.code || fetchBusy || now - lastPermalinkFetch < 6000) return;
        fetchBusy = true;
        lastPermalinkFetch = now;
        var x = new XMLHttpRequest();
        x.open('GET', ctx.url || ('https://www.instagram.com/reel/' + ctx.code + '/'), true);
        x.withCredentials = true;
        x.onreadystatechange = function () {
            if (x.readyState !== 4) return;
            fetchBusy = false;
            if (x.status >= 200 && x.status < 400) {
                scanNetworkText(x.responseText || '');
                var d = parseResponseForCode(x.responseText || '', ctx.code);
                if (d.views || d.likes || d.comments || d.reposts) {
                    ITEMS[ctx.code] = Object.assign(ITEMS[ctx.code] || {}, d);
                    if (d.views) saveGrid(ctx.code, d);
                }
            }
        };
        try { x.send(); } catch (e) { fetchBusy = false; }
    }

    function patchVersion() {
        var p = document.getElementById('ri-panel'), ds, i;
        if (p) {
            ds = p.querySelectorAll('div');
            for (i = 0; i < ds.length; i++) {
                if (/^v2\.2\.[0-9]+$/.test((ds[i].textContent || '').trim())) ds[i].textContent = 'v' + VER;
            }
        }
        document.querySelectorAll('div').forEach(function (d) {
            if (/^Reels Inspector 2\.2\.[0-9]+$/.test((d.textContent || '').trim())) d.textContent = 'Reels Inspector ' + VER;
        });
    }

    function tick() {
        injectStyle();
        scanGrid();
        var ctx = context();
        var c = ctx && ctx.code || '';
        if (c !== currentCode) {
            currentCode = c;
            fetchBusy = false;
            lastPermalinkFetch = 0;
        }
        patchVersion();
        render(ctx);
    }

    injectStyle();
    hookNetwork();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { tick(); setInterval(tick, 900); });
    } else {
        tick();
        setInterval(tick, 900);
    }
})();