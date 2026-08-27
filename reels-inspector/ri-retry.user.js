// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.8.0
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.8.0';
    var UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';
    var lastUrl = location.href;
    var scanTimer = null;
    var cache = {};
    var queue = [];
    var active = 0;

    function visible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight;
    }

    function nearViewport(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > -300 && r.top < window.innerHeight + 700;
    }

    function detailPage() {
        return /^\/(reel|reels|p)\/[A-Za-z0-9_-]+\/?/.test(location.pathname);
    }

    function codeFromUrl(url) {
        var m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : '';
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
        if (n === null || n === undefined) return '확인 불가';
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
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

    function literalDate(text) {
        var s = String(text || '');
        var map = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
        var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + '-' + m[2] + '-' + m[3];
        m = s.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/);
        if (m) return m[3] + '-' + map[m[1]] + '-' + ('0' + m[2]).slice(-2);
        return null;
    }

    function cleanUrl(s) {
        return String(s || '').replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\\//g, '/').replace(/&amp;/g, '&');
    }

    function numberFromHtml(html, keys, code) {
        var area = html;
        var i, p, re, m;
        if (code) {
            p = html.indexOf(code);
            if (p >= 0) area = html.slice(Math.max(0, p - 180000), Math.min(html.length, p + 280000));
        }
        for (i = 0; i < keys.length; i++) {
            re = new RegExp('["\\\']' + keys[i] + '["\\\']\\s*:\\s*(\\d+)', 'i');
            m = area.match(re);
            if (m) return Number(m[1]);
            re = new RegExp('\\\\"' + keys[i] + '\\\\"\\s*:\\s*(\\d+)', 'i');
            m = area.match(re);
            if (m) return Number(m[1]);
        }
        return null;
    }

    function stringFromHtml(html, keys, code) {
        var area = html;
        var i, p, re, m;
        if (code) {
            p = html.indexOf(code);
            if (p >= 0) area = html.slice(Math.max(0, p - 200000), Math.min(html.length, p + 320000));
        }
        for (i = 0; i < keys.length; i++) {
            re = new RegExp('["\\\']' + keys[i] + '["\\\']\\s*:\\s*["\\\'](https?:[^"\\\']+)["\\\']', 'i');
            m = area.match(re);
            if (m) return cleanUrl(m[1]);
        }
        return '';
    }

    function parseHtml(html, url) {
        var code = codeFromUrl(url);
        var out = { code: code, pageUrl: url };
        var doc, meta, desc, m, n, p, area;

        try {
            doc = new DOMParser().parseFromString(html, 'text/html');
            meta = doc.querySelector('meta[name="description"],meta[property="og:description"]');
            desc = meta ? (meta.getAttribute('content') || '') : '';
            if (desc) {
                m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i);
                if (m) out.likes = parseCount(m[1].replace(/\s+/g, ''));
                m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i);
                if (m) out.comments = parseCount(m[1].replace(/\s+/g, ''));
                out.date = literalDate(desc);
            }
            meta = doc.querySelector('meta[property="og:image"]');
            if (meta) out.thumbUrl = cleanUrl(meta.getAttribute('content') || '');
        } catch (e) {}

        n = numberFromHtml(html, ['like_count','likes_count'], code); if (n !== null) out.likes = n;
        n = numberFromHtml(html, ['comment_count','comments_count'], code); if (n !== null) out.comments = n;
        n = numberFromHtml(html, ['play_count','ig_play_count','video_view_count','view_count'], code); if (n !== null) out.views = n;
        n = numberFromHtml(html, ['reshare_count','repost_count','reposts_count'], code); if (n !== null) out.reposts = n;
        n = numberFromHtml(html, ['taken_at','taken_at_timestamp'], code);
        if (n !== null && !out.date) {
            try { out.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e2) {}
        }
        out.videoUrl = stringFromHtml(html, ['video_url'], code);
        if (!out.videoUrl) {
            p = code ? html.indexOf(code) : -1;
            area = p >= 0 ? html.slice(Math.max(0, p - 200000), Math.min(html.length, p + 350000)) : html;
            m = area.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4[^"'<>\s]*/i);
            if (m) out.videoUrl = cleanUrl(m[0]);
        }
        return out;
    }

    function merge(a, b) {
        var out = {}, k;
        a = a || {}; b = b || {};
        for (k in a) out[k] = a[k];
        for (k in b) {
            if (b[k] !== null && b[k] !== undefined && b[k] !== '') out[k] = b[k];
        }
        return out;
    }

    function pump() {
        var item;
        while (active < 2 && queue.length) {
            item = queue.shift();
            active++;
            (function (job) {
                job.fn(function (value) {
                    active--;
                    job.resolve(value);
                    pump();
                });
            })(item);
        }
    }

    function queued(fn) {
        return new Promise(function (resolve) {
            queue.push({ fn: fn, resolve: resolve });
            pump();
        });
    }

    function loadPost(url) {
        var code = codeFromUrl(url);
        if (!code) return Promise.resolve({});
        if (cache[code] && cache[code].loaded) return Promise.resolve(cache[code]);
        if (cache[code] && cache[code].promise) return cache[code].promise;
        if (!cache[code]) cache[code] = { code: code, pageUrl: url };

        cache[code].promise = queued(function (done) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', String(url).split('?')[0], true);
            xhr.withCredentials = true;
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                if (xhr.status >= 200 && xhr.status < 400) {
                    cache[code] = merge(cache[code], parseHtml(xhr.responseText || '', url));
                    cache[code].loaded = true;
                }
                cache[code].promise = null;
                refreshCard(code);
                done(cache[code]);
            };
            try { xhr.send(); } catch (e) { cache[code].promise = null; done(cache[code]); }
        });
        return cache[code].promise;
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

    function metric(root, labels) {
        var all = root.querySelectorAll('button,a,span,div');
        var i, n, p;
        for (i = 0; i < all.length; i++) {
            n = labelled(all[i].getAttribute('aria-label') || '', labels); if (n !== null) return n;
            n = labelled(all[i].getAttribute('title') || '', labels); if (n !== null) return n;
            n = labelled(all[i].textContent || '', labels); if (n !== null) return n;
            p = all[i].parentElement;
            if (p) { n = labelled(p.textContent || '', labels); if (n !== null) return n; }
        }
        return null;
    }

    function currentDomData() {
        var v = mainVideo();
        var root = rootFor(v);
        var times = document.querySelectorAll('time[datetime]');
        var date = null, i;
        for (i = 0; i < times.length; i++) {
            if (visible(times[i])) { date = times[i].getAttribute('datetime'); break; }
        }
        return {
            views: metric(root, ['조회수','views','plays','재생']),
            likes: metric(root, ['좋아요','likes','like']),
            comments: metric(root, ['댓글','comments','comment']),
            reposts: metric(root, ['리포스트','reposts','repost']),
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
        if (!code) return Promise.resolve(dom);
        cache[code] = merge(cache[code], dom);
        return loadPost(location.href).then(function (remote) {
            cache[code] = merge(remote, currentDomData());
            return cache[code];
        });
    }

    function row(panel, label, value, id) {
        var r = document.createElement('div');
        var l = document.createElement('span');
        var b = document.createElement('b');
        r.style.cssText = 'display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee;';
        l.textContent = label;
        b.textContent = value;
        if (id) b.id = id;
        r.appendChild(l);
        r.appendChild(b);
        panel.appendChild(r);
    }

    function openUrl(url) {
        var a;
        if (!url) return;
        a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function openUpdate() {
        openUrl(UPDATE_URL + '?t=' + Date.now());
    }

    function closePanel() {
        var bg = document.getElementById('ri-panel');
        if (bg) bg.remove();
        syncTool();
    }

    function updatePanel(data) {
        var x, info = '확인 불가';
        x = document.getElementById('ri-v-views'); if (x) x.textContent = fmt(data.views);
        x = document.getElementById('ri-v-likes'); if (x) x.textContent = fmt(data.likes);
        x = document.getElementById('ri-v-comments'); if (x) x.textContent = fmt(data.comments);
        x = document.getElementById('ri-v-reposts'); if (x) x.textContent = fmt(data.reposts);
        x = document.getElementById('ri-v-date'); if (x) x.textContent = data.date || '확인 불가';
        if (data.width && data.height) {
            info = data.width + '×' + data.height;
            if (data.duration !== null && data.duration !== undefined) info += ' · ' + Number(data.duration).toFixed(1) + '초';
        }
        x = document.getElementById('ri-v-video'); if (x) x.textContent = info;
    }

    function openPanel() {
        var tool = document.getElementById('ri-tool');
        var bg = document.createElement('div');
        var panel = document.createElement('div');
        var close = document.createElement('button');
        var title = document.createElement('b');
        var actions = document.createElement('div');
        var img = document.createElement('button');
        var vid = document.createElement('button');
        var update = document.createElement('button');
        var lastData = currentDomData();

        if (tool) tool.remove();
        bg.id = 'ri-panel';
        bg.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.4);';
        panel.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:#fff;color:#111;border-radius:18px 18px 0 0;padding:14px 14px 24px;font:14px system-ui;';
        close.textContent = '×';
        close.style.cssText = 'float:right;border:0;background:#eee;border-radius:999px;width:34px;height:34px;font-size:20px;';
        close.onclick = closePanel;
        title.textContent = 'Reels Inspector ' + VERSION;
        panel.appendChild(close);
        panel.appendChild(title);
        row(panel, '조회수', fmt(lastData.views), 'ri-v-views');
        row(panel, '좋아요', fmt(lastData.likes), 'ri-v-likes');
        row(panel, '댓글', fmt(lastData.comments), 'ri-v-comments');
        row(panel, '리포스트', fmt(lastData.reposts), 'ri-v-reposts');
        row(panel, '날짜', lastData.date || '확인 불가', 'ri-v-date');
        row(panel, '영상', '읽는 중…', 'ri-v-video');

        actions.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;';
        img.textContent = '썸네일 열기';
        vid.textContent = '영상 열기';
        img.style.cssText = vid.style.cssText = 'border:0;border-radius:11px;background:#111;color:#fff;padding:11px;font-weight:800;';
        img.onclick = function () { currentData().then(function (d) { openUrl(d.thumbUrl); }); };
        vid.onclick = function () { currentData().then(function (d) { openUrl(d.videoUrl); }); };
        actions.appendChild(img);
        actions.appendChild(vid);
        panel.appendChild(actions);

        update.textContent = '업데이트 확인';
        update.style.cssText = 'width:100%;margin-top:8px;border:0;border-radius:11px;background:#eee;color:#111;padding:11px;font-weight:800;';
        update.onclick = openUpdate;
        panel.appendChild(update);

        bg.appendChild(panel);
        document.documentElement.appendChild(bg);
        bg.onclick = function (e) { if (e.target === bg) closePanel(); };

        currentData().then(updatePanel);
        setTimeout(function () { if (document.getElementById('ri-panel')) currentData().then(updatePanel); }, 900);
        setTimeout(function () { if (document.getElementById('ri-panel')) currentData().then(updatePanel); }, 2200);
    }

    function syncTool() {
        var b = document.getElementById('ri-tool');
        if (document.getElementById('ri-panel')) { if (b) b.remove(); return; }
        if (!detailPage()) { if (b) b.remove(); return; }
        if (b) return;
        b = document.createElement('button');
        b.id = 'ri-tool';
        b.textContent = '도구';
        b.style.cssText = 'position:fixed;right:14px;bottom:90px;z-index:2147483600;border:0;border-radius:999px;background:#111;color:#fff;padding:11px 14px;font:800 13px system-ui;';
        b.onclick = openPanel;
        document.documentElement.appendChild(b);
    }

    function exactPostPath(a) {
        return /^\/(reel|reels|p)\/[A-Za-z0-9_-]+\/?$/.test(a.pathname || '');
    }

    function fixedAncestor(a) {
        var el = a, i, p;
        for (i = 0; i < 8 && el; i++) {
            p = window.getComputedStyle(el).position;
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
        img = a.querySelector('img');
        if (!img) return false;
        ar = a.getBoundingClientRect();
        ir = img.getBoundingClientRect();
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
        var text = cardText(a);
        var nativeData = {
            code: code,
            pageUrl: a.href,
            views: labelled(text, ['조회수','views','plays','재생']),
            likes: labelled(text, ['좋아요','likes','like']),
            comments: labelled(text, ['댓글','comments','comment']),
            thumbUrl: a.querySelector('img') ? (a.querySelector('img').currentSrc || a.querySelector('img').src || '') : ''
        };
        cache[code] = merge(cache[code], nativeData);
        return cache[code];
    }

    function gridButton(text, title, fn) {
        var b = document.createElement('button');
        b.textContent = text;
        b.title = title;
        b.style.cssText = 'min-width:34px;height:29px;padding:0 6px;border:0;border-radius:8px;background:rgba(0,0,0,.72);color:#fff;font:800 9px system-ui;';
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }, true);
        return b;
    }

    function paintCard(a) {
        var data = cardData(a);
        var box = a.querySelector('.ri-metrics');
        var lines = [], second = [];
        if (!box) return;
        if (data.views !== null && data.views !== undefined) lines.push('▶ ' + fmt(data.views));
        if (data.likes !== null && data.likes !== undefined) second.push('♥ ' + fmt(data.likes));
        if (data.comments !== null && data.comments !== undefined) second.push('💬 ' + fmt(data.comments));
        if (second.length) lines.push(second.join(' · '));
        if (data.date) lines.push(String(data.date).slice(5));
        box.textContent = lines.join('\n');
        box.style.display = lines.length ? 'block' : 'none';
    }

    function refreshCard(code) {
        var a = document.querySelector('a[data-ri-code="' + code + '"]');
        if (a) paintCard(a);
    }

    function renderCard(a) {
        var code, img, box, actions;
        if (!validGridAnchor(a)) return;
        code = codeFromUrl(a.href);
        if (!code) return;
        if (a.getAttribute('data-ri') === '1' && a.querySelector('.ri-actions')) {
            paintCard(a);
            return;
        }
        a.setAttribute('data-ri', '1');
        a.setAttribute('data-ri-code', code);
        a.style.position = 'relative';
        img = a.querySelector('img');

        box = document.createElement('div');
        box.className = 'ri-metrics';
        box.style.cssText = 'position:absolute;left:4px;bottom:4px;z-index:40;background:rgba(0,0,0,.68);color:#fff;border-radius:7px;padding:4px 6px;font:700 11px/1.3 system-ui;white-space:pre-line;pointer-events:none;display:none;';

        actions = document.createElement('div');
        actions.className = 'ri-actions';
        actions.style.cssText = 'position:absolute;right:4px;top:4px;z-index:50;display:flex;gap:3px;';
        actions.appendChild(gridButton('IMG', '이미지 열기', function () { openUrl(img.currentSrc || img.src || ''); }));
        if (/\/(reel|reels)\//.test(a.pathname || '')) {
            actions.appendChild(gridButton('VID', '영상 열기', function () {
                loadPost(a.href).then(function (d) { openUrl(d.videoUrl || a.href); });
            }));
        }

        a.appendChild(box);
        a.appendChild(actions);
        paintCard(a);
        if (nearViewport(a)) loadPost(a.href);
    }

    function cleanup() {
        var all = document.querySelectorAll('.ri-actions,.ri-metrics');
        var i, host;
        for (i = 0; i < all.length; i++) {
            host = all[i].parentElement;
            if (!host || !validGridAnchor(host) || detailPage()) all[i].remove();
        }
        all = document.querySelectorAll('[data-ri="1"]');
        for (i = 0; i < all.length; i++) {
            if (!validGridAnchor(all[i]) || detailPage()) {
                all[i].removeAttribute('data-ri');
                all[i].removeAttribute('data-ri-code');
            }
        }
        all = ['ri-github-retry','ri-install-ok','ri-file-ok','ri-test-box','ri-update'];
        for (i = 0; i < all.length; i++) {
            host = document.getElementById(all[i]);
            if (host) host.remove();
        }
    }

    function scan() {
        var all, candidates = [], i;
        cleanup();
        syncTool();
        if (detailPage()) return;
        all = document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
        for (i = 0; i < all.length; i++) if (validGridAnchor(all[i])) candidates.push(all[i]);
        if (candidates.length < 3) return;
        for (i = 0; i < candidates.length; i++) renderCard(candidates[i]);
    }

    function schedule() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scan, 180);
    }

    function status() {
        var d = document.createElement('div');
        d.textContent = 'RI ' + VERSION;
        d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483646;background:#111;color:#fff;padding:6px 9px;border-radius:8px;font:700 12px system-ui;pointer-events:none;';
        (document.body || document.documentElement).appendChild(d);
        setTimeout(function () { if (d.parentNode) d.remove(); }, 1200);
    }

    function start() {
        var observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, { childList:true, subtree:true });
        window.addEventListener('scroll', schedule, true);
        cleanup();
        status();
        scan();
        setInterval(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                closePanel();
                schedule();
            } else {
                cleanup();
                syncTool();
            }
        }, 900);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
