// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.7.1
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.7.1';
    var lastUrl = location.href;
    var timer = null;

    function visible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight;
    }

    function detailPage() {
        return /\/(reel|reels|p)\/[A-Za-z0-9_-]+/.test(location.pathname);
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

    function mainVideo() {
        var list = document.getElementsByTagName('video');
        var best = null, area = 0, i, r, a;
        for (i = 0; i < list.length; i++) {
            if (!visible(list[i])) continue;
            r = list[i].getBoundingClientRect();
            a = r.width * r.height;
            if (a > area) { area = a; best = list[i]; }
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
        var i, el, aria, title, text, n, p;
        for (i = 0; i < all.length; i++) {
            el = all[i];
            aria = el.getAttribute('aria-label') || '';
            title = el.getAttribute('title') || '';
            text = el.textContent || '';
            n = labelled(aria, labels); if (n !== null) return n;
            n = labelled(title, labels); if (n !== null) return n;
            n = labelled(text, labels); if (n !== null) return n;
            p = el.parentElement;
            if (p) { n = labelled(p.textContent || '', labels); if (n !== null) return n; }
        }
        return null;
    }

    function currentData() {
        var v = mainVideo();
        var root = rootFor(v);
        var times = document.querySelectorAll('time[datetime]');
        var date = null, i;
        for (i = 0; i < times.length; i++) {
            if (visible(times[i])) { date = times[i].getAttribute('datetime'); break; }
        }
        return {
            views: metric(root, ['조회수', 'views', 'plays', '재생']),
            likes: metric(root, ['좋아요', 'likes', 'like']),
            comments: metric(root, ['댓글', 'comments', 'comment']),
            reposts: metric(root, ['리포스트', 'reposts', 'repost']),
            date: date,
            videoUrl: v ? (v.currentSrc || v.src || '') : '',
            thumbUrl: v ? (v.poster || '') : '',
            duration: v && isFinite(v.duration) ? v.duration : null,
            width: v ? v.videoWidth : null,
            height: v ? v.videoHeight : null
        };
    }

    function row(panel, label, value) {
        var r = document.createElement('div');
        var l = document.createElement('span');
        var b = document.createElement('b');
        r.style.cssText = 'display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee;';
        l.textContent = label; b.textContent = value;
        r.appendChild(l); r.appendChild(b); panel.appendChild(r);
    }

    function openUrl(url) {
        var a;
        if (!url) return;
        a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
    }

    function closePanel() {
        var bg = document.getElementById('ri-panel');
        if (bg) bg.remove();
        syncTool();
    }

    function openPanel() {
        var data = currentData();
        var tool = document.getElementById('ri-tool');
        var bg = document.createElement('div');
        var panel = document.createElement('div');
        var close = document.createElement('button');
        var title = document.createElement('b');
        var info = '확인 불가';
        var actions = document.createElement('div');
        var img = document.createElement('button');
        var vid = document.createElement('button');

        if (tool) tool.remove();
        bg.id = 'ri-panel';
        bg.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.4);';
        panel.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:#fff;color:#111;border-radius:18px 18px 0 0;padding:14px 14px 24px;font:14px system-ui;';
        close.textContent = '×';
        close.style.cssText = 'float:right;border:0;background:#eee;border-radius:999px;width:34px;height:34px;font-size:20px;';
        close.onclick = closePanel;
        title.textContent = 'Reels Inspector ' + VERSION;
        panel.appendChild(close); panel.appendChild(title);
        row(panel, '조회수', fmt(data.views));
        row(panel, '좋아요', fmt(data.likes));
        row(panel, '댓글', fmt(data.comments));
        row(panel, '리포스트', fmt(data.reposts));
        row(panel, '날짜', data.date ? data.date.slice(0, 10) : '확인 불가');
        if (data.width && data.height) {
            info = data.width + '×' + data.height;
            if (data.duration !== null) info += ' · ' + data.duration.toFixed(1) + '초';
        }
        row(panel, '영상', info);
        actions.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;';
        img.textContent = '썸네일 열기'; vid.textContent = '영상 열기';
        img.style.cssText = vid.style.cssText = 'border:0;border-radius:11px;background:#111;color:#fff;padding:11px;font-weight:800;';
        img.onclick = function () { openUrl(data.thumbUrl); };
        vid.onclick = function () { openUrl(data.videoUrl); };
        actions.appendChild(img); actions.appendChild(vid); panel.appendChild(actions); bg.appendChild(panel);
        document.documentElement.appendChild(bg);
        bg.onclick = function (e) { if (e.target === bg) closePanel(); };
    }

    function syncTool() {
        var b = document.getElementById('ri-tool');
        if (document.getElementById('ri-panel')) { if (b) b.remove(); return; }
        if (!detailPage()) { if (b) b.remove(); return; }
        if (b) return;
        b = document.createElement('button');
        b.id = 'ri-tool'; b.textContent = '도구';
        b.style.cssText = 'position:fixed;right:14px;bottom:90px;z-index:2147483600;border:0;border-radius:999px;background:#111;color:#fff;padding:11px 14px;font:800 13px system-ui;';
        b.onclick = openPanel; document.documentElement.appendChild(b);
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

    function button(text, fn) {
        var b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = 'width:34px;height:34px;border:0;border-radius:10px;background:rgba(0,0,0,.72);color:#fff;font:800 15px system-ui;';
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }, true);
        return b;
    }

    function renderCard(a) {
        var img, text, views, likes, comments, box, actions, lines, row2;
        if (!a || !a.isConnected || a.getAttribute('data-ri') === '1') return;
        img = a.querySelector('img'); if (!img) return;
        a.setAttribute('data-ri', '1'); a.style.position = 'relative';
        text = cardText(a);
        views = labelled(text, ['조회수', 'views', 'plays', '재생']);
        likes = labelled(text, ['좋아요', 'likes', 'like']);
        comments = labelled(text, ['댓글', 'comments', 'comment']);
        box = document.createElement('div');
        box.className = 'ri-m';
        box.style.cssText = 'position:absolute;left:4px;bottom:4px;z-index:40;background:rgba(0,0,0,.68);color:#fff;border-radius:7px;padding:4px 6px;font:700 11px/1.3 system-ui;white-space:pre-line;pointer-events:none;';
        lines = []; row2 = [];
        if (views !== null) lines.push('▶ ' + fmt(views));
        if (likes !== null) row2.push('♥ ' + fmt(likes));
        if (comments !== null) row2.push('💬 ' + fmt(comments));
        if (row2.length) lines.push(row2.join(' · '));
        box.textContent = lines.join('\n'); if (!lines.length) box.style.display = 'none';
        actions = document.createElement('div');
        actions.className = 'ri-a';
        actions.style.cssText = 'position:absolute;right:4px;top:4px;z-index:50;display:flex;flex-direction:column;gap:4px;';
        actions.appendChild(button('▧', function () { openUrl(img.currentSrc || img.src || ''); }));
        if (/\/(reel|reels)\//.test(a.pathname || a.href)) actions.appendChild(button('▶', function () { openUrl(a.href); }));
        a.appendChild(box); a.appendChild(actions);
    }

    function clearGrid() {
        var all = document.querySelectorAll('[data-ri="1"]');
        var i, x;
        for (i = 0; i < all.length; i++) {
            x = all[i].querySelector('.ri-m'); if (x) x.remove();
            x = all[i].querySelector('.ri-a'); if (x) x.remove();
            all[i].removeAttribute('data-ri');
        }
    }

    function scan() {
        var all, i, r;
        if (detailPage()) { clearGrid(); syncTool(); return; }
        syncTool();
        all = document.querySelectorAll('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
        for (i = 0; i < all.length; i++) {
            if (!all[i].querySelector('img')) continue;
            r = all[i].getBoundingClientRect();
            if (r.width < 70 || r.height < 70) continue;
            renderCard(all[i]);
        }
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(scan, 250);
    }

    function start() {
        var observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        scan();
        setInterval(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                clearGrid(); closePanel(); schedule();
            } else syncTool();
        }, 900);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
