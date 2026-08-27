// ==UserScript==
// @name         Reels Inspector Loader
// @namespace    dev-lab/reels-inspector
// @version      1.1.0
// @description  Instagram research tool loader
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      *.cdninstagram.com
// @updateURL    https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// @downloadURL  https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';
  const base = 'https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/';
  const get = path => new Promise((resolve, reject) => GM_xmlhttpRequest({
    method: 'GET', url: base + path + '?ts=' + Date.now(),
    onload: r => r.status >= 200 && r.status < 300 ? resolve(r.responseText) : reject(new Error('HTTP ' + r.status)),
    onerror: reject, ontimeout: reject
  }));
  (async () => {
    try {
      const manifest = JSON.parse(await get('manifest.json'));
      const parts = await Promise.all(manifest.modules.map(get));
      Function('GM_download','GM_setClipboard','GM_xmlhttpRequest','unsafeWindow','__RI_VERSION', parts.join('\n\n'))(
        GM_download, GM_setClipboard, GM_xmlhttpRequest, unsafeWindow, manifest.version
      );
    } catch (e) {
      console.error('[Reels Inspector] load failed', e);
    }
  })();
})();
