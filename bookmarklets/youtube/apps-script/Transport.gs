/* YouTube 수집도구 - Apps Script iframe POST transport */

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const origin = allowedOrigin_(p.origin);
  const token = sessionToken_(p.token);
  const requestId = bridgeRequestId_(p.requestId);
  let result;

  if (!origin || !token || !requestId) {
    result = bridgeError_('INVALID_BRIDGE', '연결 정보가 올바르지 않습니다.');
  } else {
    const raw = String(p.request || '');
    if (!raw) {
      result = bridgeError_('INVALID_REQUEST', '요청 내용이 없습니다.');
    } else if (raw.length > APP_.MAX_REQUEST_CHARS) {
      result = bridgeError_('REQUEST_TOO_LARGE', '데이터가 너무 큽니다.');
    } else {
      try {
        result = dispatch(JSON.parse(raw));
      } catch (err) {
        result = bridgeError_('INVALID_REQUEST', '요청 형식이 올바르지 않습니다.');
      }
    }
  }

  return HtmlService.createHtmlOutput(bridgePostHtml_(origin, token, requestId, result))
    .setTitle('Google Sheets 연결')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function bridgeRequestId_(value) {
  const s = String(value || '').trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(s) ? s : '';
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
