// ==UserScript==
// @name         RI Fresh Install Test
// @namespace    dev-lab/reels-inspector
// @version      1.0.0
// @match        *://*.instagram.com/*
// @grant        none
// ==/UserScript==

(function () {
    var d = document.createElement('div');
    d.textContent = 'RI FRESH OK';
    d.style.cssText = 'position:fixed;top:10px;left:10px;z-index:2147483647;background:green;color:white;padding:10px;font-size:16px;font-weight:bold;';
    (document.body || document.documentElement).appendChild(d);
})();
