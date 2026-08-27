// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.8.5
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.8.5';
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
        return r.bottom > -350 && r.top < window.innerHeight + 700;
    }

    function safeOverlayArea(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > 145 && r.top < window.innerHeight - 135;
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

    function singleCount(text) {
        var s = String(text || '').trim();
        if (!s || s.length > 32) return null;
        s = s.replace(/\s+/g, '');
        return parseCount(s);
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

    function hasLabel(text, labels) {
        var s = String(text || '').toLowerCase();
        var i;
        for (i = 0; i < labels.length; i++) {
            if (s.indexOf(String(labels[i]).toLowerCase()) !== -1) return true;
        }
        return false;
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

    function numberFromHtml(html, keys, code) {
        var p = code ? html.indexOf(code) : -1;
        var area = p >= 0 ? html.slice(Math.max(0, p - 120000), Math.min(html.length, p + 200000)) : html;
        var i, re, m;
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
        var p = code ? html.indexOf(code) : -1;
        var area = p >= 0 ? html.slice(Math.max(0, p - 130000), Math.min(html.length, p + 230000)) : html;
        var i, re, m;
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
        var doc, meta, desc, m, n;

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
            meta = doc.querySelector('meta[property="og:video"],meta[property="og:video:secure_url"]');
            if (meta) out.videoUrl = cleanUrl(meta.getAttribute('content') || '');
        } catch (e) {}

        if (out.likes === undefined) {
            n = numberFromHtml(html, ['like_count','likes_count'], code);
            if (n !== null) out.likes = n;
        }

        if (out.comments === undefined) {
            n = numberFromHtml(html, ['comment_count','comments_count'], code);
            if (n !== null) out.comments = n;
        }

        n = numberFromHtml(html, ['play_count','ig_play_count','video_play_count','video_view_count','view_count','view_count_fb'], code);
        if (n !== null) out.views = n;

        n = numberFromHtml(html, ['reshare_count','repost_count','reposts_count'], code);
        if (n !== null) out.reposts = n;

        if (!out.date) {
            n = numberFromHtml(html, ['taken_at','taken_at_timestamp'], code);
            if (n !== null) {
                try { out.date = new Date(n * 1000).toISOString().slice(0, 10); } catch (e2) {}
            }
        }

        if (!out.videoUrl) out.videoUrl = stringFromHtml(html, ['video_url'], code);
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
            try { xhr.send(); }
            catch (e) {
                cache[code].promise = null;
                done(cache[code]);
            }
        });

        return cache[code].promise;
    }

    function scanJsonObject(obj, depth, seen) {
        var code, data, keys, i, v;
        if (!obj || typeof obj !== 'object' || depth > 5) return;
        if (seen.indexOf(obj) !== -1) return;
        seen.push(obj);

        code = obj.code || obj.shortcode || obj.short_code;
        if (code && typeof code === 'string') {
            data = {
                code: code,
                views: obj.play_count || obj.ig_play_count || obj.video_play_count || obj.video_view_count || obj.view_count || null,
                likes: obj.like_count || null,
                comments: obj.comment_count || null,
                reposts: obj.reshare_count || obj.repost_count || null,
                date: obj.taken_at ? new Date(Number(obj.taken_at) * 1000).toISOString().slice(0, 10) : null,
                videoUrl: obj.video_url || '',
                thumbUrl: obj.display_url || obj.thumbnail_src || ''
            };
            cache[code] = merge(cache[code], data);
            refreshCard(code);
        }

        keys = Object.keys(obj);
        for (i = 0; i < keys.length && i < 80; i++) {
            v = obj[keys[i]];
            if (v && typeof v === 'object') scanJsonObject(v, depth + 1, seen);
        }
    }

    function installNetworkObserver() {
        var originalFetch = window.fetch;
        var OriginalXHR = window.XMLHttpRequest;

        if (originalFetch && !originalFetch.__riWrapped) {
            window.fetch = function () {
                return originalFetch.apply(this, arguments).then(function (res) {
                    try {
                        var ct = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
                        if (ct.indexOf('json') !== -1) {
                            res.clone().json().then(function (json) {
                                try { scanJsonObject(json, 0, []); } catch (e) {}
                            }).catch(function () {});
                        }
                    } catch (e2) {}
                    return res;
                });
            };
            window.fetch.__riWrapped = true;
        }

        if (OriginalXHR && !OriginalXHR.prototype.__riWrapped) {
            var oldOpen = OriginalXHR.prototype.open;
            var oldSend = OriginalXHR.prototype.send;

            OriginalXHR.prototype.open = function () {
                this.__riUrl = arguments[1] || '';
                return oldOpen.apply(this, arguments);
            };

            OriginalXHR.prototype.send = function () {
                this.addEventListener('load', function () {
                    try {
                        var ct = this.getResponseHeader('content-type') || '';
                        if (ct.indexOf('json') !== -1 && typeof this.responseText === 'string' && this.responseText.length < 8000000) {
                            scanJsonObject(JSON.parse(this.responseText), 0, []);
                        }
                    } catch (e) {}
                });
                return oldSend.apply(this, arguments);
            };

            OriginalXHR.prototype.__riWrapped = true;
        }
    }

    function mainVideo() {
        var list = document.getElementsByTagName('video');
        var best = null, area = 0, i, r, a;
        for (i = 0; i < list.length; i++) {
            if (!visible(list[i])) continue;
            r = list[i].getBoundingClientRect();
            a = r.width * r.height;
            if (a > area) {
                area = a;
                best = list[i];
            }
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
        var candidates = [];
        var p = control.parentElement;
        var n, i, t;

        candidates.push(control.textContent || '');
        if (control.previousElementSibling) candidates.push(control.previousElementSibling.textContent || '');
        if (control.nextElementSibling) candidates.push(control.nextElementSibling.textContent || '');
        if (p) {
            if (p.previousElementSibling) candidates.push(p.previousElementSibling.textContent || '');
            if (p.nextElementSibling) candidates.push(p.nextElementSibling.textContent || '');
            if ((p.textContent || '').trim().length <= 40) candidates.push(p.textContent || '');
        }

        for (i = 0; i < candidates.length; i++) {
            t = String(candidates[i] || '').trim();
            n = singleCount(t);
            if (n !== null) return n;
        }
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

            n = labelled(aria, labels);
            if (n !== null) return n;
            n = labelled(title, labels);
            if (n !== null) return n;
            n = labelled(text, labels);
            if (n !== null) return n;

            n = numberAround(el);
            if (n !== null) return n;
        }
        return null;
    }

    function currentDomData() {
        var v = mainVideo();
        var root = rootFor(v);
        var times = document.querySelectorAll('time[datetime]');
        var date = null, i;

        for (i = 0; i < times.length; i++) {
            if (visible(times[i])) {
                date = times[i].getAttribute('datetime');
                break;
            }
        }

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

        if (!code) return Promise.resolve(dom);

        cache[code] = merge(cache[code], dom);

        return loadPost(location.href).then(function (remote) {
            var out = merge(remote, dom);

            if (remote.likes !== null && remote.likes !== undefined) out.likes = remote.likes;
            if (remote.comments !== null && remote.comments !== undefined) out.comments = remote.comments;
            if (remote.views !== null && remote.views !== undefined) out.views = remote.views;
            if (remote.reposts !== null && remote.reposts !== undefined) out.reposts = remote.reposts;
            if (remote.date) out.date = remote.date;

            if (dom.videoUrl) out.videoUrl = dom.videoUrl;
            if (dom.thumbUrl) out.thumbUrl = dom.thumbUrl;
            if (dom.duration !== null) out.duration = dom.duration;
            if (dom.width) out.width = dom.width;
            if (dom.height) out.height = dom.height;

            cache[code] = merge(cache[code], out);
            return cache[code];
        });
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
        window.open(UPDATE_URL + '?ri=' + Date.now(), '_blank');
    }

    function addRow(panel, label, value, id) {
        var row = document.createElement('div');
        var left = document.createElement('span');
        var right = document.createElement('b');

        row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee;';
        left.textContent = label;
        right.textContent = value;
        if (id) right.id = id;

        row.appendChild(left);
        row.appendChild(right);
        panel.appendChild(row);
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
            if (data.duration !== null && data.duration !== undefined) {
                info += ' · ' + Number(data.duration).toFixed(1) + '초';
            }
        }

        x = document.getElementById('ri-v-video');
        if (x) x.textContent = info;
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
        var initial = currentDomData();

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

        addRow(panel, '조회수', fmt(initial.views), 'ri-v-views');
        addRow(panel, '좋아요', fmt(initial.likes), 'ri-v-likes');
        addRow(panel, '댓글', fmt(initial.comments), 'ri-v-comments');
        addRow(panel, '리포스트', fmt(initial.reposts), 'ri-v-reposts');
        addRow(panel, '날짜', initial.date || '확인 불가', 'ri-v-date');
        addRow(panel, '영상', '읽는 중…', 'ri-v-video');

        actions.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;';

        img.textContent = '썸네일 열기';
        vid.textContent = '영상 열기';

        img.style.cssText = vid.style.cssText = 'border:0;border-radius:11px;background:#111;color:#fff;padding:11px;font-weight:800;';

        img.onclick = function () {
            currentData().then(function (d) { openUrl(d.thumbUrl); });
        };

        vid.onclick = function () {
            currentData().then(function (d) { openUrl(d.videoUrl); });
        };

        actions.appendChild(img);
        actions.appendChild(vid);
        panel.appendChild(actions);

        update.textContent = '새 버전 설치';
        update.style.cssText = 'width:100%;margin-top:8px;border:0;border-radius:11px;background:#eee;color:#111;padding:11px;font-weight:800;';
        update.onclick = openUpdate;
        panel.appendChild(update);

        bg.appendChild(panel);
        document.documentElement.appendChild(bg);

        bg.onclick = function (e) {
            if (e.target === bg) closePanel();
        };

        currentData().then(updatePanel);
        setTimeout(function () {
            if (document.getElementById('ri-panel')) currentData().then(updatePanel);
        }, 1000);
        setTimeout(function () {
            if (document.getElementById('ri-panel')) currentData().then(updatePanel);
        }, 2200);
    }

    function syncTool() {
        var b = document.getElementById('ri-tool');

        if (document.getElementById('ri-panel')) {
            if (b) b.remove();
            return;
        }

        if (!detailPage()) {
            if (b) b.remove();
            return;
        }

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
        var img = a.querySelector('img');
        var text = cardText(a);
        var nativeData = {
            code: code,
            pageUrl: a.href,
            views: labelled(text, ['조회수','views','plays','재생']),
            likes: labelled(text, ['좋아요','likes','like']),
            comments: labelled(text, ['댓글','comments','comment']),
            thumbUrl: img ? (img.currentSrc || img.src || '') : ''
        };

        cache[code] = merge(cache[code], nativeData);
        return cache[code];
    }

    function gridButton(text, title, fn) {
        var b = document.createElement('button');

        b.textContent = text;
        b.title = title;
        b.style.cssText = 'min-width:34px;height:29px;padding:0 6px;border:0;border-radius:8px;background:rgba(0,0,0,.72);color:#fff;font:800 9px system-ui;';

        b.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, true);

        b.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            fn();
        }, true);

        return b;
    }

    function paintCard(a) {
        var data = cardData(a);
        var box = a.querySelector('.ri-metrics');
        var actions = a.querySelector('.ri-actions');
        var lines = [];
        var second = [];
        var safe = safeOverlayArea(a);

        if (!box) return;

        if (data.views !== null && data.views !== undefined) lines.push('▶ ' + fmt(data.views));
        if (data.likes !== null && data.likes !== undefined) second.push('♥ ' + fmt(data.likes));
        if (data.comments !== null && data.comments !== undefined) second.push('💬 ' + fmt(data.comments));
        if (second.length) lines.push(second.join(' · '));
        if (data.date) lines.push(String(data.date).slice(5));

        box.textContent = lines.join('\n');
        box.style.display = safe && lines.length ? 'block' : 'none';

        if (actions) actions.style.display = safe ? 'flex' : 'none';
    }

    function refreshCard(code) {
        var all = document.querySelectorAll('a[data-ri-code="' + code + '"]');
        var i;

        for (i = 0; i < all.length; i++) paintCard(all[i]);
    }

    function renderCard(a) {
        var code, img, box, actions, vid;

        if (!validGridAnchor(a)) return;

        code = codeFromUrl(a.href);
        if (!code) return;

        if (a.getAttribute('data-ri') === '1' && a.querySelector('.ri-actions')) {
            paintCard(a);
            if (nearViewport(a)) loadPost(a.href);
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

        actions.appendChild(gridButton('IMG', '이미지 열기', function () {
            openUrl(img.currentSrc || img.src || '');
        }));

        if (/\/(reel|reels)\//.test(a.pathname || '')) {
            vid = gridButton('VID', '영상 열기', function () {
                loadPost(a.href).then(function (d) {
                    openUrl(d.videoUrl || a.href);
                });
            });
            actions.appendChild(vid);
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

        for (i = 0; i < all.length; i++) {
            if (validGridAnchor(all[i])) candidates.push(all[i]);
        }

        if (candidates.length < 3) return;

        for (i = 0; i < candidates.length; i++) renderCard(candidates[i]);
    }

    function schedule() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scan, 120);
    }

    function status() {
        var d = document.createElement('div');

        d.textContent = 'RI ' + VERSION;
        d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483646;background:#111;color:#fff;padding:6px 9px;border-radius:8px;font:700 12px system-ui;pointer-events:none;';

        (document.body || document.documentElement).appendChild(d);

        setTimeout(function () {
            if (d.parentNode) d.remove();
        }, 1200);
    }

    function start() {
        var observer = new MutationObserver(schedule);

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

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
                schedule();
            }
        }, 900);
    }

    installNetworkObserver();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();