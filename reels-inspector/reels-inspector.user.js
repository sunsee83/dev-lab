// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.4.0
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function boot() {
        if (document.getElementById('ri-install-ok')) return;

        var box = document.createElement('div');
        box.id = 'ri-install-ok';
        box.innerHTML = 'RI INSTALL OK';
        box.style.cssText = 'position:fixed;top:10px;left:10px;z-index:2147483647;background:#0a7a24;color:white;padding:10px 12px;font-size:16px;font-weight:bold;border-radius:8px;';
        (document.body || document.documentElement).appendChild(box);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
