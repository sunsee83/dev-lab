// ==UserScript==
// @name         Reels Inspector Link Test
// @namespace    dev-lab/reels-inspector
// @version      1.3.1
// @match        *://*.instagram.com/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function show(text, color) {
        var el = document.getElementById('ri-link-test');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ri-link-test';
            el.style.cssText = 'position:fixed;top:10px;left:10px;z-index:2147483647;color:white;padding:10px;font-size:16px;font-weight:bold;';
            (document.body || document.documentElement).appendChild(el);
        }
        el.style.background = color;
        el.textContent = text;
    }

    function start() {
        show('RI START', '#444');
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/manifest.json?test=' + Date.now(),
            onload: function (r) {
                if (r.status >= 200 && r.status < 300) {
                    show('RI GITHUB OK', 'green');
                } else {
                    show('RI GITHUB HTTP ' + r.status, 'orange');
                }
            },
            onerror: function () {
                show('RI GITHUB FAIL', 'red');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
