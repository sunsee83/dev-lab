// ==UserScript==
// @name         Reels Inspector Mobile
// @namespace    dev-lab/reels-inspector
// @version      1.2.0
// @description  Instagram mobile research tool
// @match        https://www.instagram.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// @downloadURL  https://raw.githubusercontent.com/sunsee83/dev-lab/main/reels-inspector/reels-inspector.user.js
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const boot = () => {
    if (document.getElementById('ri-ok')) return;

    const badge = document.createElement('div');
    badge.id = 'ri-ok';
    badge.textContent = 'RI OK 1.2.0';
    Object.assign(badge.style, {
      position: 'fixed',
      left: '8px',
      top: '8px',
      zIndex: '2147483647',
      background: '#111',
      color: '#fff',
      padding: '6px 9px',
      borderRadius: '9px',
      font: '700 12px system-ui',
      pointerEvents: 'none'
    });

    const tool = document.createElement('button');
    tool.id = 'ri-tool-test';
    tool.textContent = '도구';
    Object.assign(tool.style, {
      position: 'fixed',
      right: '14px',
      bottom: '88px',
      zIndex: '2147483647',
      border: '0',
      borderRadius: '999px',
      background: '#111',
      color: '#fff',
      padding: '11px 14px',
      font: '800 13px system-ui'
    });
    tool.addEventListener('click', () => alert('Reels Inspector 실행 정상'));

    document.documentElement.append(badge, tool);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
