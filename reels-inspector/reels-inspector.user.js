// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.5.1
// @description  Instagram mobile research tool
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function addStyle() {
        if (document.getElementById('ri-style')) return;
        var s = document.createElement('style');
        s.id = 'ri-style';
        s.textContent = '#ri-status{position:fixed;left:10px;top:10px;z-index:2147483647;background:#111;color:#fff;padding:8px 10px;border-radius:9px;font:700 13px system-ui}#ri-tool{position:fixed;right:14px;bottom:90px;z-index:2147483647;border:0;border-radius:999px;background:#111;color:#fff;padding:11px 14px;font:800 13px system-ui}';
        (document.head || document.documentElement).appendChild(s);
    }

    function showStatus() {
        if (document.getElementById('ri-status')) return;
        var d = document.createElement('div');
        d.id = 'ri-status';
        d.textContent = 'RI 1.5.1';
        (document.body || document.documentElement).appendChild(d);
        setTimeout(function () {
            if (d && d.parentNode) d.parentNode.removeChild(d);
        }, 2500);
    }

    function isDetail() {
        return /\/(?:reel|reels|p)\/[A-Za-z0-9_-]+/.test(location.pathname);
    }

    function syncTool() {
        var old = document.getElementById('ri-tool');
        if (!isDetail()) {
            if (old) old.remove();
            return;
        }
        if (old) return;
        var b = document.createElement('button');
        b.id = 'ri-tool';
        b.textContent = '도구';
        b.onclick = function () { alert('Reels Inspector 1.5.1 실행 정상'); };
        document.documentElement.appendChild(b);
    }

    function start() {
        addStyle();
        showStatus();
        syncTool();
        setInterval(syncTool, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
