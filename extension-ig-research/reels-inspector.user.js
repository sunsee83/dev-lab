// ==UserScript==
// @name         Reels Inspector Loader
// @namespace    dev-lab/extension-ig-research
// @version      1.0.2
// @description  Instagram research tool loader
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// @connect      raw.githubusercontent.com
// @connect      *.cdninstagram.com
// @updateURL    https://raw.githubusercontent.com/sunsee83/dev-lab/main/extension-ig-research/reels-inspector.user.js
// @downloadURL  https://raw.githubusercontent.com/sunsee83/dev-lab/main/extension-ig-research/reels-inspector.user.js
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const url = 'https://raw.githubusercontent.com/sunsee83/dev-lab/main/extension-ig-research/app.js?ts=' + Date.now();
  GM_xmlhttpRequest({
    method: 'GET',
    url,
    onload: r => {
      if (r.status >= 200 && r.status < 300) {
        try { Function(r.responseText)(); }
        catch (e) { console.error('[Reels Inspector] app error', e); }
      } else console.error('[Reels Inspector] load failed', r.status);
    },
    onerror: e => console.error('[Reels Inspector] network error', e)
  });
})();
