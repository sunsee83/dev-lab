// ==UserScript==
// @name         Reels Inspector Mobile
// @version      1.7.0
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.7.0';
    var lastUrl = location.href;
    var scanTimer = null;

    function isDetailPage() {
        return /\/(reel|reels|p)\/[A-Za-z0-9_-]+/.test(location.pathname);
    }

    function isVisible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight;
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

    function formatCount(n) {
        if (n === null || n === undefined) return '확인 불가';
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    function labelledCount(text, labels) {
        var s = String(text || '');
        var i, label, re, m;

        for (i = 0; i < labels.length; i++) {
            label = labels[i];

            re = new RegExp(label + '\\s*[:：]?\\s*([0-9][0-9.,]*(?:\\.[0-9]+)?\\s*(?:만|천|억|K|M|B|k|m|b)?)', 'i');
            m = s.match(re);
            if (m) return parseCount(m[1].replace(/\s+/g, ''));

            re = new RegExp('([0-9][0-9.,]*(?:\\.[0-9]+)?\\s*(?:만|천|억|K|M|B|k|m|b)?)\\s*' + label, 'i');
            m = s.match(re);
            if (m) return parseCount(m[1].replace(/\s+/g, ''));
        }

        return null;
    }

    function getMainVideo() {
        var list = document.getElementsByTagName('video');
        var best = null;
        var bestArea = 0;
        var i, r, area;

        for (i = 0; i < list.length; i++) {
            if (!isVisible(list[i])) continue;
            r = list[i].getBoundingClientRect();
            area = r.width * r.height;
            if (area > bestArea) {
                bestArea = area;
                best = list[i];
            }
        }

        return best;
    }

    function getRoot(video) {
        var el = video;
        var i;

        if (!el) return document.querySelector('main') || document.body;

        for (i = 0; i < 9 && el; i++) {
            if (el.tagName && el.tagName.toLowerCase() === 'article') return el;
            el = el.parentElement;
        }

        return document.querySelector('main') || document.body;
    }

    function containsLabel(text, labels) {
        var s = String(text || '').toLowerCase();
        var i;
        for (i = 0; i < labels.length; i++) {
            if (s.indexOf(String(labels[i]).toLowerCase()) !== -1) return true;
        }
        return false;
    }

    function extractSingleCount(text) {
        var s = String(text || '').replace(/,/g, ' ');
        var list = s.match(/[0-9]+(?:\.[0-9]+)?\s*(?:만|천|억|K|M|B|k|m|b)?/g);
        if (!list || list.length !== 1) return null;
        return parseCount(list[0].replace(/\s+/g, ''));
    }

    function countFromSibling(el) {
        var list = [el.previousElementSibling, el.nextElementSibling];
        var i, n, text;

        for (i = 0; i < list.length; i++) {
            if (!list[i]) continue;
            text = (list[i].textContent || '').trim();
            n = parseCount(text.replace(/\s+/g, ''));
            if (n !== null) return n;
        }

        return null;
    }

    function findMetric(root, labels) {
        var all = root.querySelectorAll('button,a,span,div');
        var i, el, aria, title, text, control, n, parent;

        for (i = 0; i < all.length; i++) {
            el = all[i];
            aria = (el.getAttribute('aria-label') || '').trim();
            title = (el.getAttribute('title') || '').trim();
            text = (el.textContent || '').trim();

            if (!containsLabel(aria, labels) && !containsLabel(title, labels) && !containsLabel(text, labels)) continue;

            n = labelledCount(aria, labels);
            if (n !== null) return n;
            n = labelledCount(title, labels);
            if (n !== null) return n;

            control = el.closest('button,a');
            if (control) {
                n = extractSingleCount((control.textContent || '').trim());
                if (n !== null) return n;
                n = countFromSibling(control);
                if (n !== null) return n;
            }

            n = countFromSibling(el);
            if (n !== null) return n;

            parent = el.parentElement;
            if (parent && containsLabel(parent.textContent || '', labels)) {
                n = labelledCount(parent.textContent || '', labels);
                if (n !== null) return n;
            }
        }

        return null;
    }

    function getVisibleDate() {
        var times = document.querySelectorAll('time[datetime]');
        var i;
        for (i = 0; i < times.length; i++) {
            if (isVisible(times[i])) return times[i].getAttribute('datetime');
        }
        return times.length ? times[0].getAttribute('datetime') : null;
    }

    function getCurrentData() {
        var video = getMainVideo();
        var root = getRoot(video);

        return {
            likes: findMetric(root, ['좋아요', 'likes', 'like']),
            comments: findMetric(root, ['댓글', 'comments', 'comment']),
            reposts: findMetric(root, ['리포스트', 'reposts', 'repost']),
            views: findMetric(root, ['조회수', 'views', 'plays', '재생']),
            date: getVisibleDate(),
            videoUrl: video ? (video.currentSrc || video.src || '') : '',
            thumbUrl: video ? (video.poster || '') : '',
            duration: video && isFinite(video.duration) ? video.duration : null,
            width: video ? video.videoWidth : null,
            height: video ? video.videoHeight : null
        };
    }

    function addRow(panel, label, value) {
        var row = document.createElement('div');
        var left = document.createElement('span');
        var right = document.createElement('b');

        row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee;';
        left.textContent = label;
        right.textContent = value;

        row.appendChild(left);
        row.appendChild(right);
        panel.appendChild(row);
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

    function closePanel() {
        var bg = document.getElementById('ri-panel-bg');
        if (bg) bg.remove();
        syncTool();
    }

    function openPanel() {
        var old = document.getElementById('ri-panel-bg');
        var tool = document.getElementById('ri-tool');
        var data = getCurrentData();
        var bg, panel, close, title, info, actions, imageBtn, videoBtn;

        if (old) old.remove();
        if (tool) tool.remove();

        bg = document.createElement('div');
        bg.id = 'ri-panel-bg';
        bg.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.4);';

        panel = document.createElement('div');
        panel.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:white;color:#111;border-radius:18px 18px 0 0;padding:14px 14px 24px;font:14px system-ui;';

        close = document.createElement('button');
        close.textContent = '×';
        close.style.cssText = 'float:right;border:0;background:#eee;border-radius:999px;width:34px;height:34px;font-size:20px;';
        close.onclick = closePanel;

        title = document.createElement('b');
        title.textContent = 'Reels Inspector ' + VERSION;

        panel.appendChild(close);
        panel.appendChild(title);

        addRow(panel, '조회수', formatCount(data.views));
        addRow(panel, '좋아요', formatCount(data.likes));
        addRow(panel, '댓글', formatCount(data.comments));
        addRow(panel, '리포스트', formatCount(data.reposts));
        addRow(panel, '날짜', data.date ? data.date.slice(0, 10) : '확인 불가');

        info = '확인 불가';
        if (data.width && data.height) {
            info = data.width + '×' + data.height;
            if (data.duration !== null) info += ' · ' + data.duration.toFixed(1) + '초';
        }
        addRow(panel, '영상', info);

        actions = document.createElement('div');
        actions.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;';

        imageBtn = document.createElement('button');
        imageBtn.textContent = '썸네일 열기';
        imageBtn.style.cssText = 'border:0;border-radius:11px;background:#111;color:white;padding:11px;font-weight:800;';
        imageBtn.onclick = function () { openUrl(data.thumbUrl); };

        videoBtn = document.createElement('button');
        videoBtn.textContent = '영상 열기';
        videoBtn.style.cssText = 'border:0;border-radius:11px;background:#111;color:white;padding:11px;font-weight:800;';
        videoBtn.onclick = function () { openUrl(data.videoUrl); };

        actions.appendChild(imageBtn);
        actions.appendChild(videoBtn);
        panel.appendChild(actions);

        bg.appendChild(panel);
        document.documentElement.appendChild(bg);

        bg.onclick = function (e) {
            if (e.target === bg) closePanel();
        };
    }

    function syncTool() {
        var old = document.getElementById('ri-tool');

        if (document.getElementById('ri-panel-bg')) {
            if (old) old.remove();
            return;
        }

        if (!isDetailPage()) {
            if (old) old.remove();
            return;
        }

        if (old) return;

        old = document.createElement('button');
        old.id = 'ri-tool';
        old.textContent = '도구';
        old.style.cssText = 'position:fixed;right:14px;bottom:90px;z-index:2147483600;border:0;border-radius:999px;background:#111;color:white;padding:11px 14px;font:800 13px system-ui;';
        old.onclick = openPanel;
        document.documentElement.appendChild(old);
    }

    function codeFromHref(href) {
        var m = String(href || '').match(/\/(reel|reels|p)\/([A-Za-z0-9_-]+)/);
        return m ? m[2] : '';
    }

    function collectCardText(anchor) {
        var out = [];
        var all = anchor.querySelectorAll('[aria-label],[title],img[alt]');
        var i, v;

        out.push(anchor.textContent || '');
        out.push(anchor.getAttribute('aria-label') || '');
        out.push(anchor.getAttribute('title') || '');

        for (i = 0; i < all.length; i++) {
            v = all[i].getAttribute('aria-label');
            if (v) out.push(v);
            v = all[i].getAttribute('title');
            if (v) out.push(v);
            v = all[i].getAttribute('alt');
            if (v) out.push(v);
        }

        return out.join(' ');
    }

    function readGridMetrics(anchor) {
        var text = collectCardText(anchor);
        var time = anchor.querySelector('time[datetime]');

        return {
            views: labelledCount(text, ['조회수', 'views', 'plays', '재생']),
            likes: labelledCount(text, ['좋아요', 'likes', 'like']),
            comments: labelledCount(text, ['댓글', 'comments', 'comment']),
            reposts: labelledCount(text, ['리포스트', 'reposts', 'repost']),
            date: time ? time.getAttribute('datetime') : null
        };
    }

    function gridButton(text, title, fn) {
        var b = document.createElement('button');
        b.textContent = text;
        b.title = title;
        b.style.cssText = 'width:34px;height:34px;border:0;border-radius:10px;background:rgba(0,0,0,.72);color:white;font:800 15px system-ui;display:flex;align-items:center;justify-content:center;';

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

    function renderGridCard(anchor) {
        var img, metrics, actions, data, lines, row, code, isReel;

        if (!anchor || !anchor.isConnected) return;
        if (anchor.getAttribute('data-ri-grid') === '1') return;

        img = anchor.querySelector('img');
        if (!img) return;

        anchor.setAttribute('data-ri-grid', '1');
        anchor.style.position = 'relative';

        data = readGridMetrics(anchor);
        code = codeFromHref(anchor.href);
        isReel = /\/(reel|reels)\//.test(anchor.pathname || anchor.href);

        metrics = document.createElement('div');
        metrics.className = 'ri-grid-metrics';
        metrics.style.cssText = 'position:absolute;left:4px;bottom:4px;z-index:40;background:rgba(0,0,0,.68);color:white;border-radius:7px;padding:4px 6px;font:700 11px/1.3 system-ui;white-space:pre-line;pointer-events:none;';

        lines = [];
        row = [];
        if (data.views !== null) lines.push('▶ ' + formatCount(data.views));
        if (data.likes !== null) row.push('♥ ' + formatCount(data.likes));
        if (data.comments !== null) row.push('💬 ' + formatCount(data.comments));
        if (row.length) lines.push(row.join(' · '));
        metrics.textContent = lines.join('\n');
        if (!lines.length) metrics.style.display = 'none';

        actions = document.createElement('div');
        actions.className = 'ri-grid-actions';
        actions.style.cssText = 'position:absolute;right:4px;top:4px;z-index:50;display:flex;flex-direction:column;gap:4px;';

        actions.appendChild(gridButton('▧', '이미지 열기', function () {
            openUrl(img.currentSrc || img.src || '');
        }));

        if (isReel) {
            actions.appendChild(gridButton('▶', '릴스 열기', function () {
                openUrl(anchor.href);
            }));
        }

        anchor.appendChild(metrics);
        anchor.appendChild(actions);
        anchor.setAttribute('data-ri-views', data.views === null ? '' : String(data.views));
        anchor.setAttribute('data-ri-likes', data.likes === null ? '' : String(data.likes));
        anchor.setAttribute('data-ri-comments', data.comments === null ? '' : String(data.comments));
        anchor.setAttribute('data-ri-date', data.date || '');
        anchor.setAttribute('data-ri-code', code || '');
    }

    function getGridAnchors() {
        var all = document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
        var out = [];
        var i, r;

        for (i = 0; i < all.length; i++) {
            if (!all[i].querySelector('img')) continue;
            r = all[i].getBoundingClientRect();
            if (r.width < 70 || r.height < 70) continue;
            out.push(all[i]);
        }

        return out;
    }

    function clearGrid() {
        var all = document.querySelectorAll('[data-ri-grid="1"]');
        var i, x;

        for (i = 0; i < all.length; i++) {
            x = all[i].querySelector('.ri-grid-metrics');
            if (x) x.remove();
            x = all[i].querySelector('.ri-grid-actions');
            if (x) x.remove();
            all[i].removeAttribute('data-ri-grid');
            all[i].removeAttribute('data-ri-views');
            all[i].removeAttribute('data-ri-likes');
            all[i].removeAttribute('data-ri-comments');
            all[i].removeAttribute('data-ri-date');
            all[i].removeAttribute('data-ri-code');
            all[i].style.order = '';
        }

        x = document.getElementById('ri-sortbar');
        if (x) x.remove();
    }

    function sortGrid(key) {
        var anchors = getGridAnchors();
        var attr = 'data-ri-' + key;
        var i, v;

        anchors.sort(function (a, b) {
            var av = a.getAttribute(attr);
            var bv = b.getAttribute(attr);

            if (key === 'date') {
                av = av ? Date.parse(av) : -1;
                bv = bv ? Date.parse(bv) : -1;
            } else {
                av = av ? Number(av) : -1;
                bv = bv ? Number(bv) : -1;
            }

            return bv - av;
        });

        for (i = 0; i < anchors.length; i++) {
            v = anchors[i];
            v.style.order = String(i);
        }
    }

    function ensureSortBar(count) {
        var bar, items, i, b;

        if (count < 3) {
            bar = document.getElementById('ri-sortbar');
            if (bar) bar.remove();
            return;
        }

        if (document.getElementById('ri-sortbar')) return;

        bar = document.createElement('div');
        bar.id = 'ri-sortbar';
        bar.style.cssText = 'position:fixed;left:8px;right:8px;top:54px;z-index:2147483500;display:flex;gap:5px;overflow-x:auto;padding:5px;background:rgba(20,20,20,.90);border-radius:12px;';

        items = [
            ['views', '조회수'],
            ['likes', '좋아요'],
            ['comments', '댓글'],
            ['date', '최신']
        ];

        for (i = 0; i < items.length; i++) {
            b = document.createElement('button');
            b.textContent = items[i][1];
            b.setAttribute('data-key', items[i][0]);
            b.style.cssText = 'flex:0 0 auto;border:0;border-radius:9px;background:#333;color:white;padding:8px 10px;font:700 12px system-ui;';
            b.onclick = function () {
                sortGrid(this.getAttribute('data-key'));
            };
            bar.appendChild(b);
        }

        document.documentElement.appendChild(bar);
    }

    function scanGrid() {
        var anchors, i;

        if (isDetailPage()) {
            clearGrid();
            syncTool();
            return;
        }

        syncTool();
        anchors = getGridAnchors();
        ensureSortBar(anchors.length);

        for (i = 0; i < anchors.length; i++) renderGridCard(anchors[i]);
    }

    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scanGrid, 250);
    }

    function start() {
        var observer = new MutationObserver(scheduleScan);
        observer.observe(document.documentElement, { childList:true, subtree:true });

        syncTool();
        scanGrid();

        setInterval(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                clearGrid();
                closePanel();
                scheduleScan();
            } else {
                syncTool();
            }
        }, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
