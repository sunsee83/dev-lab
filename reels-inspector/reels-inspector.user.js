// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.5.0
// @description  Instagram mobile reels research overlay
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// @downloadURL  https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.5.0';
    var cache = {};
    var cards = {};
    var activeFetches = 0;
    var fetchQueue = [];
    var observer = null;
    var mutation = null;
    var scanTimer = null;
    var currentUrl = location.href;

    function addStyle() {
        if (document.getElementById('ri-style')) return;
        var s = document.createElement('style');
        s.id = 'ri-style';
        s.textContent =
            '.ri-card{position:relative!important}' +
            '.ri-metrics{position:absolute;left:4px;bottom:4px;z-index:60;background:rgba(0,0,0,.70);color:#fff;border-radius:7px;padding:4px 6px;font:700 11px/1.3 system-ui;pointer-events:none;white-space:pre-line;text-shadow:0 1px 1px #000}' +
            '.ri-actions{position:absolute;right:4px;top:4px;z-index:70;display:flex;flex-direction:column;gap:4px}' +
            '.ri-action{width:38px;height:38px;border:0;border-radius:11px;background:rgba(0,0,0,.72);color:#fff;font:700 17px system-ui;display:flex;align-items:center;justify-content:center}' +
            '#ri-sortbar{position:fixed;left:8px;right:8px;top:8px;z-index:2147483000;display:flex;gap:5px;overflow-x:auto;padding:5px;background:rgba(20,20,20,.90);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
            '#ri-sortbar button{flex:0 0 auto;border:0;border-radius:9px;background:#333;color:#fff;padding:8px 10px;font:700 12px system-ui}' +
            '#ri-tool{position:fixed;right:14px;bottom:90px;z-index:2147483000;border:0;border-radius:999px;background:#111;color:#fff;padding:11px 14px;font:800 13px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3)}' +
            '#ri-sheet-bg{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.38)}' +
            '#ri-sheet{position:absolute;left:0;right:0;bottom:0;max-height:58vh;overflow:auto;background:#fff;color:#111;border-radius:18px 18px 0 0;padding:14px 14px 24px;font:14px/1.45 system-ui}' +
            '#ri-sheet-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-14px;background:#fff;padding:8px 0 10px;font-weight:800;font-size:16px}' +
            '#ri-sheet-close{border:0;background:#eee;border-radius:999px;width:34px;height:34px;font-size:18px}' +
            '.ri-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #eee}.ri-row b{text-align:right;word-break:break-all}' +
            '.ri-sheet-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ri-sheet-actions button{border:0;border-radius:11px;background:#111;color:#fff;padding:11px 8px;font-weight:800}' +
            '#ri-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:2147483200;background:rgba(20,20,20,.94);color:#fff;padding:9px 13px;border-radius:12px;font:700 13px system-ui;max-width:82vw;text-align:center;pointer-events:none}';
        (document.head || document.documentElement).appendChild(s);
    }

    function toast(text) {
        var old = document.getElementById('ri-toast');
        if (old) old.remove();
        var el = document.createElement('div');
        el.id = 'ri-toast';
        el.textContent = text;
        (document.body || document.documentElement).appendChild(el);
        setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 1800);
    }

    function codeFromUrl(url) {
        var m = String(url || '').match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : null;
    }

    function cleanUrl(value) {
        return String(value || '').replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\\//g, '/').replace(/&amp;/g, '&');
    }

    function parseCount(value) {
        if (value === null || value === undefined) return null;
        var s = String(value).replace(/,/g, '').replace(/\s+/g, '');
        var m = s.match(/(-?\d+(?:\.\d+)?)(억|만|천|[KkMmBb])?/);
        if (!m) return null;
        var n = Number(m[1]);
        var u = m[2] || '';
        if (u === '천' || /k/i.test(u)) n *= 1000;
        else if (u === '만') n *= 10000;
        else if (u === '억') n *= 100000000;
        else if (/m/i.test(u)) n *= 1000000;
        else if (/b/i.test(u)) n *= 1000000000;
        return isFinite(n) ? Math.round(n) : null;
    }

    function fmt(n) {
        if (n === null || n === undefined || !isFinite(Number(n))) return '';
        n = Number(n);
        var a = Math.abs(n);
        if (a >= 100000000) return (n / 100000000).toFixed(a >= 1000000000 ? 1 : 2).replace(/\.0+$/, '') + '억';
        if (a >= 10000) return (n / 10000).toFixed(a >= 100000 ? 1 : 2).replace(/\.0+$/, '') + '만';
        if (a >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(Math.round(n));
    }

    function merge(a, b) {
        var out = {}, k;
        a = a || {}; b = b || {};
        for (k in a) out[k] = a[k];
        for (k in b) if (b[k] !== null && b[k] !== undefined && b[k] !== '') out[k] = b[k];
        return out;
    }

    function visible(el) {
        if (!el || !el.isConnected) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
    }

    function literalDate(text) {
        var months = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
        var s = String(text || '');
        var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[1] + '-' + m[2] + '-' + m[3];
        m = s.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/);
        if (m) return m[3] + '-' + months[m[1]] + '-' + String(m[2]).padStart(2, '0');
        return null;
    }

    function regexNumber(html, keys, code) {
        var area = html, i, m;
        if (code) {
            i = html.indexOf(code);
            if (i >= 0) area = html.slice(Math.max(0, i - 160000), Math.min(html.length, i + 220000));
        }
        for (i = 0; i < keys.length; i++) {
            m = area.match(new RegExp('["\\\']' + keys[i] + '["\\\']\\s*:\\s*(\\d+)', 'i'));
            if (m) return Number(m[1]);
            m = area.match(new RegExp('\\\\"' + keys[i] + '\\\\"\\s*:\\s*(\\d+)', 'i'));
            if (m) return Number(m[1]);
        }
        return null;
    }

    function regexString(html, keys, code) {
        var area = html, i, m;
        if (code) {
            i = html.indexOf(code);
            if (i >= 0) area = html.slice(Math.max(0, i - 180000), Math.min(html.length, i + 260000));
        }
        for (i = 0; i < keys.length; i++) {
            m = area.match(new RegExp('["\\\']' + keys[i] + '["\\\']\\s*:\\s*["\\\'](https?:[^"\\\']+)["\\\']', 'i'));
            if (m) return cleanUrl(m[1]);
        }
        return null;
    }

    function parseHtml(html, code) {
        var data = { code: code };
        var descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
        var desc = descMatch ? cleanUrl(descMatch[1]) : '';
        var m, n;
        if (desc) {
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+likes?/i); if (m) data.likes = parseCount(m[1]);
            m = desc.match(/([\d.,]+\s*[KkMmBb]?)\s+comments?/i); if (m) data.comments = parseCount(m[1]);
            data.postedAt = literalDate(desc);
            m = desc.match(/(?:comments?|likes?)\s*-\s*([A-Za-z0-9._]+)\s*-/i); if (m) data.username = m[1];
        }
        n = regexNumber(html, ['like_count','likes_count'], code); if (n !== null) data.likes = n;
        n = regexNumber(html, ['comment_count','comments_count'], code); if (n !== null) data.comments = n;
        data.views = regexNumber(html, ['play_count','ig_play_count','video_view_count','view_count','views'], code);
        data.reposts = regexNumber(html, ['reshare_count','repost_count','reshared_count','reposts_count'], code);
        data.takenAt = regexNumber(html, ['taken_at','taken_at_timestamp'], code);
        data.videoUrl = regexString(html, ['video_url'], code);
        data.thumbUrl = regexString(html, ['display_url','thumbnail_src','image_url'], code);
        if (!data.thumbUrl) {
            m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            if (m) data.thumbUrl = cleanUrl(m[1]);
        }
        if (!data.videoUrl) {
            var idx = code ? html.indexOf(code) : -1;
            var area = idx >= 0 ? html.slice(Math.max(0, idx - 200000), Math.min(html.length, idx + 300000)) : html;
            m = area.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4[^"'<>\s]*/i);
            if (m) data.videoUrl = cleanUrl(m[0]);
        }
        return data;
    }

    function runQueued(job) {
        return new Promise(function (resolve, reject) {
            fetchQueue.push({ job: job, resolve: resolve, reject: reject });
            pumpQueue();
        });
    }

    function pumpQueue() {
        while (activeFetches < 2 && fetchQueue.length) {
            (function (item) {
                activeFetches++;
                Promise.resolve().then(item.job).then(item.resolve, item.reject).then(function () {
                    activeFetches--; pumpQueue();
                }, function () {
                    activeFetches--; pumpQueue();
                });
            })(fetchQueue.shift());
        }
    }

    function fetchPost(code, href) {
        if (!code) return Promise.resolve({});
        if (cache[code] && cache[code].loaded) return Promise.resolve(cache[code]);
        if (cache[code] && cache[code].promise) return cache[code].promise;
        if (!cache[code]) cache[code] = { code: code };
        var url = String(href || ('https://www.instagram.com/reel/' + code + '/')).split('?')[0];
        var p = runQueued(function () {
            return fetch(url, { credentials: 'include' }).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            }).then(function (html) {
                cache[code] = merge(cache[code], parseHtml(html, code));
                cache[code].loaded = true;
                cache[code].promise = null;
                updateCard(code);
                return cache[code];
            });
        }).catch(function () {
            cache[code].promise = null;
            return cache[code];
        });
        cache[code].promise = p;
        return p;
    }

    function median(values) {
        var a = values.filter(function (v) { return isFinite(v); }).sort(function (x, y) { return x - y; });
        if (!a.length) return null;
        var m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    }

    function renderCard(item) {
        if (!item || !item.anchor || !item.anchor.isConnected) return;
        var d = cache[item.code] || {};
        var lines = [], row = [];
        if (d.views !== null && d.views !== undefined) lines.push('▶ ' + fmt(d.views));
        if (d.likes !== null && d.likes !== undefined) row.push('♥ ' + fmt(d.likes));
        if (d.comments !== null && d.comments !== undefined) row.push('💬 ' + fmt(d.comments));
        if (row.length) lines.push(row.join(' · '));
        var views = Object.keys(cards).map(function (k) { var x = cache[k]; return x && isFinite(x.views) ? Number(x.views) : NaN; });
        var med = median(views);
        if (med && d.views !== null && d.views !== undefined && Number(d.views) / med >= 1.5) lines.push('🔥 ' + (Number(d.views) / med).toFixed(1) + '×');
        item.metrics.textContent = lines.join('\n');
        item.metrics.style.display = lines.length ? 'block' : 'none';
    }

    function updateCard(code) {
        if (cards[code]) renderCard(cards[code]);
    }

    function stopEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }

    function downloadUrl(url, name) {
        if (!url) { toast('URL 없음'); return; }
        fetch(url).then(function (r) {
            if (!r.ok) throw new Error('download');
            return r.blob();
        }).then(function (blob) {
            var u = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = u; a.download = name; a.style.display = 'none';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
            toast('저장 시작');
        }).catch(function () {
            var a = document.createElement('a');
            a.href = url; a.download = name; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
            document.body.appendChild(a); a.click(); a.remove();
            toast('새 탭에서 열었습니다');
        });
    }

    function actionButton(text, title, fn) {
        var b = document.createElement('button');
        b.className = 'ri-action'; b.textContent = text; b.title = title;
        ['pointerdown','mousedown','touchstart'].forEach(function (ev) { b.addEventListener(ev, stopEvent, { capture:true, passive:false }); });
        b.addEventListener('click', function (e) { stopEvent(e); fn(); }, true);
        return b;
    }

    function attachCard(a) {
        var code = codeFromUrl(a.href);
        if (!code) return;
        if (cards[code] && cards[code].anchor === a && a.isConnected) return;
        a.classList.add('ri-card');
        var metrics = document.createElement('div'); metrics.className = 'ri-metrics';
        var actions = document.createElement('div'); actions.className = 'ri-actions';
        a.appendChild(metrics); a.appendChild(actions);
        var img = a.querySelector('img');
        if (!cache[code]) cache[code] = { code:code };
        cache[code] = merge(cache[code], { thumbUrl: img ? (img.currentSrc || img.src) : null, pageUrl:a.href });
        var item = { code:code, anchor:a, metrics:metrics, actions:actions };
        cards[code] = item;
        actions.appendChild(actionButton('▧', '이미지 저장', function () {
            fetchPost(code, a.href).then(function (d) {
                var src = (img && (img.currentSrc || img.src)) || d.thumbUrl;
                downloadUrl(src, code + '-thumb.jpg');
            });
        }));
        if (/\/(?:reel|reels)\//.test(a.pathname)) {
            actions.appendChild(actionButton('▶', '영상 저장', function () {
                fetchPost(code, a.href).then(function (d) {
                    if (!d.videoUrl) { toast('영상 URL 없음'); return; }
                    downloadUrl(d.videoUrl, code + '.mp4');
                });
            }));
        }
        renderCard(item);
        if (observer) observer.observe(a);
        if (visible(a)) fetchPost(code, a.href);
    }

    function getAnchors() {
        return Array.prototype.slice.call(document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]')).filter(function (a) {
            var r = a.getBoundingClientRect();
            return !!a.querySelector('img') && a.isConnected && r.width > 60 && r.height > 60;
        });
    }

    function sortCards(key) {
        var ids = Object.keys(cards).filter(function (k) { return cards[k].anchor && cards[k].anchor.isConnected; });
        var views = ids.map(function (k) { var d = cache[k] || {}; return isFinite(d.views) ? Number(d.views) : NaN; });
        var med = median(views);
        function value(id) {
            var d = cache[id] || {};
            if (key === 'outlier') return med && isFinite(d.views) ? Number(d.views) / med : -Infinity;
            if (key === 'latest') return d.takenAt || (d.postedAt ? Date.parse(d.postedAt) / 1000 : -Infinity);
            return d[key] !== null && d[key] !== undefined ? Number(d[key]) : -Infinity;
        }
        ids.sort(function (a, b) { return value(b) - value(a); });
        ids.forEach(function (id, i) { cards[id].anchor.style.order = String(i); });
    }

    function ensureSortBar() {
        if (document.getElementById('ri-sortbar')) return;
        var bar = document.createElement('div'); bar.id = 'ri-sortbar';
        [['views','조회수'],['outlier','Outlier'],['likes','좋아요'],['comments','댓글'],['latest','최신']].forEach(function (pair) {
            var b = document.createElement('button'); b.textContent = pair[1];
            b.addEventListener('click', function () { sortCards(pair[0]); });
            bar.appendChild(b);
        });
        document.documentElement.appendChild(bar);
    }

    function clearGrid() {
        var bar = document.getElementById('ri-sortbar'); if (bar) bar.remove();
        Object.keys(cards).forEach(function (k) {
            var x = cards[k];
            if (x.metrics && x.metrics.parentNode) x.metrics.remove();
            if (x.actions && x.actions.parentNode) x.actions.remove();
            if (x.anchor) { x.anchor.classList.remove('ri-card'); x.anchor.style.order = ''; }
        });
        cards = {};
    }

    function isDetail() {
        return /\/(?:reel|reels|p)\/[A-Za-z0-9_-]+/.test(location.pathname);
    }

    function scanGrid() {
        if (isDetail()) { clearGrid(); ensureTool(); return; }
        removeTool();
        var list = getAnchors();
        if (list.length < 3) { clearGrid(); return; }
        ensureSortBar();
        list.forEach(attachCard);
        Object.keys(cards).forEach(function (k) { if (!cards[k].anchor.isConnected) delete cards[k]; });
    }

    function metricNear(root, words) {
        var els = root.querySelectorAll('span,div,button,a');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var text = (el.textContent || '').trim();
            var aria = (el.getAttribute('aria-label') || '').trim();
            var hit = words.some(function (w) { return text === w || aria.indexOf(w) >= 0; });
            if (!hit) continue;
            var pool = [aria, text];
            if (el.parentElement) pool.push((el.parentElement.textContent || '').trim());
            for (var j = 0; j < pool.length; j++) {
                var m = pool[j].match(/([\d.,]+(?:만|억|천|[KkMmBb])?)/);
                var n = m ? parseCount(m[1]) : null;
                if (n !== null) return n;
            }
        }
        return null;
    }

    function currentDomData() {
        var code = codeFromUrl(location.href);
        var videos = Array.prototype.slice.call(document.querySelectorAll('video')).filter(visible);
        videos.sort(function (a, b) {
            var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
            return (br.width * br.height) - (ar.width * ar.height);
        });
        var v = videos[0] || null;
        var root = v ? (v.closest('article') || v.parentElement || document.body) : (document.querySelector('main') || document.body);
        var time = root.querySelector('time[datetime]');
        return {
            code: code,
            likes: metricNear(root, ['좋아요','likes','Like']),
            comments: metricNear(root, ['댓글','comments','Comment']),
            reposts: metricNear(root, ['리포스트','reposts','Repost']),
            postedAt: time ? literalDate(time.getAttribute('datetime')) : null,
            videoUrl: v ? (v.currentSrc || v.src) : null,
            thumbUrl: v ? v.poster : null,
            duration: v && isFinite(v.duration) ? v.duration : null,
            width: v ? v.videoWidth : null,
            height: v ? v.videoHeight : null
        };
    }

    function currentData() {
        var dom = currentDomData();
        var code = dom.code;
        if (!code) return Promise.resolve(dom);
        if (!cache[code]) cache[code] = { code:code };
        cache[code] = merge(cache[code], dom);
        return fetchPost(code, location.href).then(function (d) {
            cache[code] = merge(d, currentDomData());
            return cache[code];
        });
    }

    function row(label, value) {
        var r = document.createElement('div'); r.className = 'ri-row';
        var a = document.createElement('span'); a.textContent = label;
        var b = document.createElement('b'); b.textContent = value || '확인 불가';
        r.appendChild(a); r.appendChild(b); return r;
    }

    function openSheet() {
        var old = document.getElementById('ri-sheet-bg'); if (old) old.remove();
        var bg = document.createElement('div'); bg.id = 'ri-sheet-bg';
        var sheet = document.createElement('div'); sheet.id = 'ri-sheet';
        var head = document.createElement('div'); head.id = 'ri-sheet-head';
        var title = document.createElement('span'); title.textContent = 'Reels Inspector ' + VERSION;
        var close = document.createElement('button'); close.id = 'ri-sheet-close'; close.textContent = '×'; close.onclick = function () { bg.remove(); };
        head.appendChild(title); head.appendChild(close); sheet.appendChild(head);
        var loading = document.createElement('div'); loading.textContent = '데이터 읽는 중…'; sheet.appendChild(loading);
        bg.appendChild(sheet); document.documentElement.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        currentData().then(function (d) {
            if (!sheet.isConnected) return;
            loading.remove();
            sheet.appendChild(row('조회수', d.views !== null && d.views !== undefined ? fmt(d.views) : '확인 불가'));
            sheet.appendChild(row('좋아요', d.likes !== null && d.likes !== undefined ? fmt(d.likes) : '확인 불가'));
            sheet.appendChild(row('댓글', d.comments !== null && d.comments !== undefined ? fmt(d.comments) : '확인 불가'));
            sheet.appendChild(row('리포스트', d.reposts !== null && d.reposts !== undefined ? fmt(d.reposts) : '확인 불가'));
            sheet.appendChild(row('날짜', d.postedAt || (d.takenAt ? new Date(Number(d.takenAt) * 1000).toLocaleDateString('ko-KR') : '확인 불가')));
            sheet.appendChild(row('영상', d.width && d.height ? d.width + '×' + d.height + (d.duration ? ' · ' + Number(d.duration).toFixed(1) + '초' : '') : '확인 불가'));
            var acts = document.createElement('div'); acts.className = 'ri-sheet-actions';
            var img = document.createElement('button'); img.textContent = '썸네일 저장'; img.onclick = function () { downloadUrl(d.thumbUrl, (d.code || 'reel') + '-thumb.jpg'); };
            var vid = document.createElement('button'); vid.textContent = '영상 저장'; vid.onclick = function () { if (!d.videoUrl) toast('영상 URL 없음'); else downloadUrl(d.videoUrl, (d.code || 'reel') + '.mp4'); };
            acts.appendChild(img); acts.appendChild(vid); sheet.appendChild(acts);
        });
    }

    function ensureTool() {
        if (!isDetail() || document.getElementById('ri-tool')) return;
        var b = document.createElement('button'); b.id = 'ri-tool'; b.textContent = '도구'; b.onclick = openSheet;
        document.documentElement.appendChild(b);
    }

    function removeTool() {
        var b = document.getElementById('ri-tool'); if (b) b.remove();
        var bg = document.getElementById('ri-sheet-bg'); if (bg) bg.remove();
    }

    function scan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scanGrid, 120);
    }

    function start() {
        addStyle();
        if (typeof IntersectionObserver === 'function') {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    var code = codeFromUrl(e.target.href);
                    if (code) fetchPost(code, e.target.href);
                });
            }, { rootMargin:'250px' });
        }
        mutation = new MutationObserver(scan);
        mutation.observe(document.documentElement, { childList:true, subtree:true });
        setInterval(function () {
            if (location.href !== currentUrl) {
                currentUrl = location.href;
                clearGrid(); removeTool(); scan();
            }
        }, 700);
        scan();
        setTimeout(function () { toast('RI ' + VERSION + ' 실행'); }, 500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
})();
