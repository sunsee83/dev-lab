// ==UserScript==
// @name         RI GitHub Retry
// @namespace    dev-lab/reels-inspector
// @version      1.0.0
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// @downloadURL  https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js
// ==/UserScript==

(function () {
    'use strict';

    function boot() {
        if (document.getElementById('ri-github-retry')) return;
        var d = document.createElement('div');
        d.id = 'ri-github-retry';
        d.textContent = 'RI GITHUB OK';
        d.style.cssText = 'position:fixed;top:10px;left:10px;z-index:2147483647;background:green;color:white;padding:10px 12px;border-radius:9px;font:700 16px system-ui;';
        (document.body || document.documentElement).appendChild(d);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
