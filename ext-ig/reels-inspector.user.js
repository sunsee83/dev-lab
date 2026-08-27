// ==UserScript==
// @name         Reels Inspector Loader
// @namespace    dev-lab/ext-ig
// @version      1.0.0
// @description  Instagram research tool loader
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/sunsee83/dev-lab/main/ext-ig/reels-inspector.user.js
// @downloadURL  https://raw.githubusercontent.com/sunsee83/dev-lab/main/ext-ig/reels-inspector.user.js
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const url = 'https://raw.githubusercontent.com/sunsee83/dev-lab/main/ext-ig/app.js?ts=' + Date.now();
  GM_xmlhttpRequest({
    method: 'GET',
    url,
    onload: r => {
      if (r.status >= 200 && r.status < 300) {
        try { Function(r.responseText)(); }
        catch (e) { console.error('[Reels Inspector] app error', e); }
      } else {
        console.error('[Reels Inspector] load failed', r.status);
      }
    },
    onerror: e => console.error('[Reels Inspector] network error', e)
  });
})();
