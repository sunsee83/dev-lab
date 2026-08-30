/* 유튜브다운로드 - Apps Script iframe POST transport */

const BRIDGE_ = Object.freeze({
  STATE_KEY: 'ytCollector.bridge.v1',
  TTL_MS: 10 * 60 * 1000,
  MAX_SESSIONS: 5
});

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const origin = allowedOrigin_(p.origin);
  const token = sessionToken_(p.token);
  const requestId = bridgeRequestId_(p.requestId);
  const mode = String(p.mode || '');
  let result;

  if (!origin || !token || !requestId) {
    result = bridgeError_('INVALID_BRIDGE', '연결 정보가 올바르지 않습니다.');
  } else if (mode === 'init') {
    try {
      result = { ok: true, data: { bridgeNonce: bridgeStart_(origin, token), version: APP_.VERSION } };
    } catch (err) {
      result = bridgeError_('BRIDGE_FAILURE', 'Google 연결을 시작하지 못했습니다.');
    }
  } else if (mode === 'request') {
    const nonce = bridgeNonce_(p.bridgeNonce);
    if (!nonce || !bridgeSessionValid_(origin, token, nonce)) {
      result = bridgeError_('BRIDGE_EXPIRED', 'Google 연결이 만료되었습니다. 다시 연결해 주세요.');
    } else {
      const raw = String(p.request || '');
      if (!raw) {
        result = bridgeError_('INVALID_REQUEST', '요청 내용이 없습니다.');
      } else if (raw.length > APP_.MAX_REQUEST_CHARS) {
        result = bridgeError_('REQUEST_TOO_LARGE', '데이터가 너무 큽니다.');
      } else {
        try {
          result = bridgeDispatch_(JSON.parse(raw));
        } catch (err) {
          result = bridgeError_('INVALID_REQUEST', '요청 형식이 올바르지 않습니다.');
        }
      }
    }
  } else {
    result = bridgeError_('INVALID_BRIDGE', '연결 요청 종류가 올바르지 않습니다.');
  }

  return HtmlService.createHtmlOutput(bridgePostHtml_(origin, token, requestId, result))
    .setTitle('Google Sheets 연결')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function bridgeDispatch_(request) {
  if (request && request.action === 'get-ui') {
    try {
      const html = HtmlService.createHtmlOutputFromFile('ui').getContent();
      return ok_({ html: html });
    } catch (err) {
      return bridgeError_('UI_MISSING', 'Apps Script에 ui.html 파일이 없습니다.');
    }
  }

  if (request && request.action === 'create-storage') {
    try {
      const payload = plain_(request.payload) ? request.payload : {};
      return ok_(bridgeCreateStorage_(payload));
    } catch (err) {
      if (err && err.ytCode) return errorResult_(err);
      return bridgeError_('FILE_CREATE_FAILED', 'Google Sheets 파일을 자동으로 만들 수 없습니다.');
    }
  }

  return dispatch(request);
}

function bridgeCreateStorage_(p) {
  const state = loadState_();
  const fileName = trim_(p.fileName || '유튜브다운로드sheet_v1', 120) || '유튜브다운로드sheet_v1';
  const sheetName = dataSheetName_(p.sheetName || '수집');
  const category = trim_(p.category || '기본', 60) || '기본';

  if (state.files.length) {
    const fileId = state.defaultFileId || state.files[0].id;
    try {
      const ss = SpreadsheetApp.openById(fileId);
      if (ss.getName() === 'YouTube 수집' && fileName === '유튜브다운로드sheet_v1') ss.rename(fileName);
      refreshFileName_(fileId, ss.getName());
    } catch (err) {}
    return { created: false, state: publicState_() };
  }

  let ss;
  try {
    ss = SpreadsheetApp.create(fileName);
    const first = ss.getSheets()[0];
    first.setName(sheetName);
    initDataSheet_(first);
  } catch (err) {
    return bridgeCreateStorageFail_();
  }

  const connected = connectFile_({ sheetUrl: ss.getUrl() });
  ensureCategoryGroup_(connected.file.id, sheetName);
  const categories = addCategory_({ fileId: connected.file.id, sheetName: sheetName, category: category }).categories;

  return {
    created: true,
    file: connected.file,
    sheets: connected.sheets,
    sheetName: sheetName,
    categories: categories,
    state: publicState_()
  };
}

function bridgeCreateStorageFail_() {
  const e = new Error('Google Sheets 파일을 자동으로 만들 수 없습니다.');
  e.ytCode = 'FILE_NOT_WRITABLE';
  throw e;
}

function bridgeStart_(origin, token) {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) throw new Error('BUSY');
  try {
    const now = Date.now();
    let sessions = bridgeSessions_().filter(function (s) {
      return now - s.createdAt < BRIDGE_.TTL_MS && s.token !== token;
    });
    const nonce = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    sessions.push({ origin: origin, token: token, nonce: nonce, createdAt: now });
    if (sessions.length > BRIDGE_.MAX_SESSIONS) sessions = sessions.slice(-BRIDGE_.MAX_SESSIONS);
    PropertiesService.getUserProperties().setProperty(BRIDGE_.STATE_KEY, JSON.stringify(sessions));
    return nonce;
  } finally {
    lock.releaseLock();
  }
}

function bridgeSessionValid_(origin, token, nonce) {
  const now = Date.now();
  const sessions = bridgeSessions_().filter(function (s) { return now - s.createdAt < BRIDGE_.TTL_MS; });
  const found = sessions.some(function (s) {
    return s.origin === origin && s.token === token && s.nonce === nonce;
  });
  PropertiesService.getUserProperties().setProperty(BRIDGE_.STATE_KEY, JSON.stringify(sessions));
  return found;
}

function bridgeSessions_() {
  const raw = PropertiesService.getUserProperties().getProperty(BRIDGE_.STATE_KEY);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter(function (s) {
      return s && typeof s.origin === 'string' && typeof s.token === 'string' && typeof s.nonce === 'string' && Number.isFinite(Number(s.createdAt));
    }).map(function (s) {
      return { origin: s.origin, token: s.token, nonce: s.nonce, createdAt: Number(s.createdAt) };
    }) : [];
  } catch (e) {
    return [];
  }
}

function bridgeRequestId_(value) {
  const s = String(value || '').trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(s) ? s : '';
}

function bridgeNonce_(value) {
  const s = String(value || '').trim();
  return /^[A-Za-z0-9_-]{32,160}$/.test(s) ? s : '';
}

function bridgeError_(code, message) {
  return { ok: false, error: { code: String(code || 'BRIDGE_FAILURE'), message: String(message || '연결 요청을 처리하지 못했습니다.') } };
}

function bridgePostHtml_(origin, token, requestId, result) {
  const target = jsLiteral_({
    type: 'YT_GAS_RESPONSE',
    token: token,
    requestId: requestId,
    result: result || bridgeError_('BRIDGE_FAILURE', '연결 요청을 처리하지 못했습니다.')
  });
  const o = jsLiteral_(origin);
  const valid = Boolean(origin && token && requestId);
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Google Sheets 연결</title>' +
    '<style>body{margin:0;background:#111;color:#eee;font:15px/1.5 system-ui;padding:16px}.box{max-width:520px;margin:auto;padding:16px;border:1px solid #333;border-radius:12px;background:#181818}</style></head><body>' +
    '<div class="box"><b>Google Sheets 연결</b><div id="s" style="margin-top:8px">' + (valid ? '응답 전송 중…' : '잘못된 연결 요청입니다.') + '</div></div>' +
    '<script>(function(){"use strict";const O=' + o + ',M=' + target + ';if(!O)return;try{window.top.postMessage(M,O);document.getElementById("s").textContent=M.result&&M.result.ok?"연결됨":"요청 실패"}catch(e){document.getElementById("s").textContent="응답 전송 실패"}})();<\/script></body></html>';
}

function jsLiteral_(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
