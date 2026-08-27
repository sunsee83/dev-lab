// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.7.4
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    var VERSION = '1.7.4';
    var UPDATE_URL = 'https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js';
    var lastUrl = location.href;
    var scanTimer = null;

    function visible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight;
    }

    function detailPage() {
        return /^\/(reel|reels|p)\/[A-Za-z0-9_-]+\/?/.test(location.pathname);
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
        var best = null, bestArea = 0, i, r, area;
        for (i = 0; i < list.length; i++) {
            if (!visible(list[i])) continue;
            r = list[i].getBoundingClientRect();
            area = r.width * r.height;
            if (area > bestArea) {
                bestArea = area;
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

    function metric(root, labels) {
        var all = root.querySelectorAll('button,a,span,div');
        var i, el, n, p;
        for (i = 0; i < all.length; i++) {
            el = all[i];
            n = labelled(el.getAttribute('aria-label') || '', labels); if (n !== null) return n;
            n = labelled(el.getAttribute('title') || '', labels); if (n !== null) return n;
            n = labelled(el.textContent || '', labels); if (n !== null) return n;
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
        l.textContent = label;
        b.textContent = value;
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
        var update = document.createElement('button');

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
        img.textContent = '썸네일 열기';
        vid.textContent = '영상 열기';
        img.style.cssText = vid.style.cssText = 'border:0;border-radius:11px;background:#111;color:#fff;padding:11px;font-weight:800;';
        img.onclick = function () { openUrl(data.thumbUrl); };
        vid.onclick = function () { openUrl(data.videoUrl); };
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
        var path = a.pathname || '';
        return /^\/(reel|reels|p)\/[A-Za-z0-9_-]+\/?$/.test(path);
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
        if (ar.width < 80 || ar.height < 80) return false;
        if (ir.width < 80 || ir.height < 80) return false;
        if (ir.width < ar.width * 0.55) return false;
        if (ar.bottom < 80 || ar.top > window.innerHeight - 145) return false;
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

    function gridButton(text, title, fn) {
        var b = document.createElement('button');
        b.textContent = text;
        b.title = title;
        b.style.cssText = 'min-width:34px;height:30px;padding:0 6px;border:0;border-radius:8px;background:rgba(0,0,0,.72);color:#fff;font:800 9px system-ui;';
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }, true);
        return b;
    }

    function renderCard(a) {
        var img, text, views, likes, comments, box, actions, lines, second;
        if (!validGridAnchor(a)) return;
        if (a.getAttribute('data-ri') === '1' && a.querySelector('.ri-actions')) return;
        a.setAttribute('data-ri', '1');
        a.style.position = 'relative';
        img = a.querySelector('img');
        text = cardText(a);
        views = labelled(text, ['조회수', 'views', 'plays', '재생']);
        likes = labelled(text, ['좋아요', 'likes', 'like']);
        comments = labelled(text, ['댓글', 'comments', 'comment']);
        box = document.createElement('div');
        box.className = 'ri-metrics';
        box.style.cssText = 'position:absolute;left:4px;bottom:4px;z-index:40;background:rgba(0,0,0,.68);color:#fff;border-radius:7px;padding:4px 6px;font:700 11px/1.3 system-ui;white-space:pre-line;pointer-events:none;';
        lines = [];
        second = [];
        if (views !== null) lines.push('▶ ' + fmt(views));
        if (likes !== null) second.push('♥ ' + fmt(likes));
        if (comments !== null) second.push('💬 ' + fmt(comments));
        if (second.length) lines.push(second.join(' · '));
        box.textContent = lines.join('\n');
        if (!lines.length) box.style.display = 'none';
        actions = document.createElement('div');
        actions.className = 'ri-actions';
        actions.style.cssText = 'position:absolute;right:4px;top:4px;z-index:50;display:flex;flex-direction:column;gap:3px;';
        actions.appendChild(gridButton('IMG', '이미지 열기', function () { openUrl(img.currentSrc || img.src || ''); }));
        if (/\/(reel|reels)\//.test(a.pathname || '')) {
            actions.appendChild(gridButton('OPEN', '릴스 열기', function () { openUrl(a.href); }));
        }
        a.appendChild(box);
        a.appendChild(actions);
    }

    function removeLegacy() {
        var ids = ['ri-github-retry', 'ri-install-ok', 'ri-file-ok', 'ri-test-box', 'ri-update'];
        var i, x, all;
        for (i = 0; i < ids.length; i++) {
            x = document.getElementById(ids[i]);
            if (x) x.remove();
        }
        all = document.querySelectorAll('.ri-m,.ri-a');
        for (i = 0; i < all.length; i++) all[i].remove();
    }

    function cleanupStrays() {
        var all = document.querySelectorAll('.ri-actions,.ri-metrics');
        var i, host;
        for (i = 0; i < all.length; i++) {
            host = all[i].parentElement;
            if (!host || !validGridAnchor(host) || detailPage()) all[i].remove();
        }
        all = document.querySelectorAll('[data-ri="1"]');
        for (i = 0; i < all.length; i++) {
            if (!validGridAnchor(all[i]) || detailPage()) all[i].removeAttribute('data-ri');
        }
    }

    function scan() {
        var all, candidates = [], i;
        removeLegacy();
        cleanupStrays();
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
        removeLegacy();
        status();
        scan();
        setInterval(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                closePanel();
                schedule();
            } else {
                removeLegacy();
                cleanupStrays();
                syncTool();
            }
        }, 900);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
