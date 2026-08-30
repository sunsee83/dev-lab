/*
 * YouTube 수집도구 - Google Sheets connector
 *
 * 배포 원칙
 * - 웹앱 실행 주체: 웹앱에 액세스하는 사용자
 * - DriveApp 사용 안 함
 * - API key / OAuth token / 비밀번호 / 쿠키 저장 안 함
 * - 사용자가 직접 연결한 Spreadsheet ID만 사용
 * - 외부 라이브러리 없음
 */

const APP_ = Object.freeze({
  VERSION: '0.1.0',
  USER_STATE_KEY: 'ytCollector.userState.v1',
  MAX_STATE_CHARS: 8000,
  MAX_REQUEST_CHARS: 1000000,
  MAX_FILES: 20,
  MAX_CATEGORY_GROUPS: 50,
  MAX_CATEGORIES_PER_SHEET: 30,
  MAX_FILE_NAME_CHARS: 120,
  MAX_SHEET_NAME_CHARS: 100,
  MAX_CATEGORY_CHARS: 60,
  MAX_STATUS_CHARS: 40,
  MAX_MEMO_CHARS: 10000,
  MAX_CELL_CHARS: 49000,
  ALLOWED_ORIGINS: Object.freeze([
    'https://www.youtube.com',
    'https://m.youtube.com',
    'https://youtube.com',
    'https://music.youtube.com'
  ]),
  HEADERS: Object.freeze([
    '영상 ID',
    '제목',
    '채널명',
    '영상 URL',
    '업로드일',
    '영상 길이',
    '조회수',
    '썸네일',
    '설명',
    '태그',
    '대본',
    '댓글',
    '좋아요',
    '자막 원본',
    '채널 ID',
    '원본 메타데이터',
    '내 태그',
    '중요도',
    '상태',
    '메모',
    '카테고리',
    '수집일시',
    '수정일시'
  ])
});

const RECORD_COLUMNS_ = Object.freeze({
  videoId: '영상 ID',
  title: '제목',
  channel: '채널명',
  url: '영상 URL',
  publishedAt: '업로드일',
  duration: '영상 길이',
  views: '조회수',
  thumbnail: '썸네일',
  description: '설명',
  tags: '태그',
  transcript: '대본',
  comments: '댓글',
  likes: '좋아요',
  rawCaptions: '자막 원본',
  channelId: '채널 ID',
  rawMetadata: '원본 메타데이터'
});

/**
 * 웹앱 진입점.
 * 북마클릿은 이 페이지를 새 창/탭으로 열고 postMessage로 통신한다.
 * CORS fetch를 기본 연결 방식으로 사용하지 않는다.
 */
function doGet(e) {
  const origin = getAllowedOrigin_(e && e.parameter ? e.parameter.origin : '');
  const token = getSessionToken_(e && e.parameter ? e.parameter.token : '');

  return HtmlService
    .createHtmlOutput(buildBridgeHtml_(origin, token))
    .setTitle('YouTube 수집 - Google 연결');
}

/**
 * HTML bridge에서 호출하는 유일한 서버 진입점.
 * 함수명을 payload로 실행하지 않고 action allowlist로 분기한다.
 */
function dispatch(request) {
  try {
    validateRequest_(request);
    const action = request.action;
    const payload = isPlainObject_(request.payload) ? request.payload : {};

    switch (action) {
      case 'ping':
        return ok_({ version: APP_.VERSION });
      case 'get-state':
        return ok_(getPublicState_());
      case 'connect-file':
        return ok_(connectFile_(payload));
      case 'unlink-file':
        return ok_(unlinkFile_(payload));
      case 'list-sheets':
        return ok_(listSheets_(payload));
      case 'create-sheet':
        return ok_(createSheet_(payload));
      case 'list-categories':
        return ok_(listCategories_(payload));
      case 'add-category':
        return ok_(addCategory_(payload));
      case 'check-duplicate':
        return ok_(checkDuplicate_(payload));
      case 'save-record':
        return ok_(saveRecord_(payload));
      default:
        fail_('INVALID_ACTION', '허용되지 않은 요청입니다.');
    }
  } catch (err) {
    return errorResult_(err);
  }
}

function getPublicState_() {
  const state = loadState_();
  return {
    version: APP_.VERSION,
    files: state.files.map(function (file) {
      return publicFile_(file);
    }),
    defaultFileId: state.defaultFileId || '',
    categoryGroups: state.categoryGroups.map(function (group) {
      return {
        fileId: group.fileId,
        sheetName: group.sheetName,
        items: group.items.slice()
      };
    })
  };
}

function connectFile_(payload) {
  const sheetUrl = requireString_(payload.sheetUrl, 'Sheets 링크', 2048);
  const fileId = extractSpreadsheetId_(sheetUrl);

  let ss;
  try {
    ss = SpreadsheetApp.openById(fileId);
  } catch (err) {
    fail_('FILE_NO_ACCESS', '이 Google Sheets 파일을 열 수 없습니다. 현재 계정의 접근 권한을 확인해 주세요.');
  }

  const fileName = trimText_(ss.getName(), APP_.MAX_FILE_NAME_CHARS);
  const state = loadState_();
  const existingIndex = state.files.findIndex(function (file) {
    return file.id === fileId;
  });

  if (existingIndex < 0 && state.files.length >= APP_.MAX_FILES) {
    fail_('FILE_LIMIT', '연결할 수 있는 파일 수를 초과했습니다.');
  }

  const stored = { id: fileId, name: fileName || 'Google Sheets' };
  if (existingIndex >= 0) {
    state.files[existingIndex] = stored;
  } else {
    state.files.push(stored);
  }

  if (!state.defaultFileId) {
    state.defaultFileId = fileId;
  }

  saveState_(state);

  return {
    file: publicFile_(stored),
    sheets: sheetListFromSpreadsheet_(ss)
  };
}

function unlinkFile_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const state = loadState_();

  state.files = state.files.filter(function (file) {
    return file.id !== fileId;
  });
  state.categoryGroups = state.categoryGroups.filter(function (group) {
    return group.fileId !== fileId;
  });
  if (state.defaultFileId === fileId) {
    state.defaultFileId = state.files.length ? state.files[0].id : '';
  }

  saveState_(state);
  return { removed: true, fileId: fileId };
}

function listSheets_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const ss = openLinkedSpreadsheet_(fileId);
  refreshStoredFileName_(fileId, ss.getName());

  return {
    file: { id: fileId, name: trimText_(ss.getName(), APP_.MAX_FILE_NAME_CHARS), url: spreadsheetUrl_(fileId) },
    sheets: sheetListFromSpreadsheet_(ss)
  };
}

function createSheet_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateSheetName_(payload.sheetName);

  return withScriptLock_(function () {
    const ss = openLinkedSpreadsheet_(fileId);
    let sheet = ss.getSheetByName(sheetName);
    let created = false;

    if (!sheet) {
      try {
        sheet = ss.insertSheet(sheetName);
        created = true;
      } catch (err) {
        fail_('SHEET_CREATE_FAILED', '새 시트를 만들 수 없습니다. 파일 편집 권한을 확인해 주세요.');
      }
      initializeEmptySheet_(sheet);
    }

    ensureCategoryGroup_(fileId, sheetName);

    return {
      created: created,
      sheet: publicSheet_(ss, sheet)
    };
  });
}

function listCategories_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateSheetName_(payload.sheetName);
  requireExistingSheet_(fileId, sheetName);

  const state = loadState_();
  const group = findCategoryGroup_(state, fileId, sheetName);
  return {
    fileId: fileId,
    sheetName: sheetName,
    categories: group ? group.items.slice() : []
  };
}

function addCategory_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateSheetName_(payload.sheetName);
  const category = validateCategory_(payload.category);
  requireExistingSheet_(fileId, sheetName);

  const lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) {
    fail_('BUSY', '다른 설정 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  try {
    const state = loadState_();
    let group = findCategoryGroup_(state, fileId, sheetName);
    if (!group) {
      if (state.categoryGroups.length >= APP_.MAX_CATEGORY_GROUPS) {
        fail_('CATEGORY_GROUP_LIMIT', '카테고리 설정 수를 초과했습니다.');
      }
      group = { fileId: fileId, sheetName: sheetName, items: [] };
      state.categoryGroups.push(group);
    }

    if (group.items.indexOf(category) < 0) {
      if (group.items.length >= APP_.MAX_CATEGORIES_PER_SHEET) {
        fail_('CATEGORY_LIMIT', '이 시트에 추가할 수 있는 카테고리 수를 초과했습니다.');
      }
      group.items.push(category);
      saveState_(state);
    }

    return {
      fileId: fileId,
      sheetName: sheetName,
      categories: group.items.slice()
    };
  } finally {
    lock.releaseLock();
  }
}

function checkDuplicate_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateSheetName_(payload.sheetName);
  const videoId = validateVideoId_(payload.videoId);
  const ss = openLinkedSpreadsheet_(fileId);
  const sheet = getSheetOrFail_(ss, sheetName);

  if (sheet.getLastRow() === 0) {
    return { found: false, rows: [] };
  }

  assertCompatibleSchema_(sheet);
  const rows = findVideoRows_(sheet, videoId);

  return {
    found: rows.length > 0,
    rows: rows.map(function (row) {
      return {
        row: row,
        url: sheetRangeUrl_(ss, sheet, 'A' + row)
      };
    })
  };
}

function saveRecord_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateSheetName_(payload.sheetName);
  const category = payload.category == null || payload.category === '' ? '' : validateCategory_(payload.category);
  const record = isPlainObject_(payload.record) ? payload.record : {};
  const management = isPlainObject_(payload.management) ? payload.management : {};
  const videoId = validateVideoId_(payload.videoId || record.videoId);
  const duplicateMode = payload.duplicateMode == null ? '' : String(payload.duplicateMode);
  const targetRow = payload.targetRow == null ? null : Number(payload.targetRow);

  if (duplicateMode && ['update', 'new'].indexOf(duplicateMode) < 0) {
    fail_('INVALID_DUPLICATE_MODE', '중복 처리 방식이 올바르지 않습니다.');
  }
  if (targetRow != null && (!Number.isInteger(targetRow) || targetRow < 2)) {
    fail_('INVALID_ROW', '수정할 행 정보가 올바르지 않습니다.');
  }

  return withScriptLock_(function () {
    const ss = openLinkedSpreadsheet_(fileId);
    const sheet = getSheetOrFail_(ss, sheetName);
    ensureWritableSchema_(sheet);

    const duplicateRows = findVideoRows_(sheet, videoId);
    if (duplicateRows.length && !duplicateMode) {
      return {
        status: 'duplicate',
        duplicates: duplicateRows.map(function (row) {
          return { row: row, url: sheetRangeUrl_(ss, sheet, 'A' + row) };
        })
      };
    }

    if (duplicateMode === 'update') {
      let rowToUpdate = targetRow;
      if (rowToUpdate == null) {
        if (duplicateRows.length === 1) {
          rowToUpdate = duplicateRows[0];
        } else if (duplicateRows.length > 1) {
          fail_('MULTIPLE_DUPLICATES', '같은 영상 ID가 여러 행에 있습니다. 수정할 기록을 먼저 선택해 주세요.');
        } else {
          fail_('DUPLICATE_NOT_FOUND', '업데이트할 기존 기록을 찾지 못했습니다.');
        }
      }

      if (duplicateRows.indexOf(rowToUpdate) < 0) {
        fail_('ROW_MISMATCH', '선택한 행의 영상 ID가 현재 영상과 일치하지 않습니다.');
      }

      const current = sheet.getRange(rowToUpdate, 1, 1, APP_.HEADERS.length).getValues()[0];
      const merged = mergeRecordRow_(current, videoId, record, management, category, false);
      sheet.getRange(rowToUpdate, 1, 1, APP_.HEADERS.length).setValues([merged]);

      return {
        status: 'updated',
        row: rowToUpdate,
        url: sheetRangeUrl_(ss, sheet, 'A' + rowToUpdate)
      };
    }

    const rowValues = mergeRecordRow_(new Array(APP_.HEADERS.length).fill(''), videoId, record, management, category, true);
    const newRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(newRow, 1, 1, APP_.HEADERS.length).setValues([rowValues]);

    return {
      status: 'created',
      row: newRow,
      url: sheetRangeUrl_(ss, sheet, 'A' + newRow)
    };
  });
}

function mergeRecordRow_(baseRow, videoId, record, management, category, isNew) {
  const row = baseRow.slice(0, APP_.HEADERS.length);
  while (row.length < APP_.HEADERS.length) row.push('');
  const index = headerIndex_();

  row[index['영상 ID']] = safeCellValue_(videoId);

  Object.keys(RECORD_COLUMNS_).forEach(function (field) {
    if (field === 'videoId') return;
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      row[index[RECORD_COLUMNS_[field]]] = serializeField_(field, record[field]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(management, 'tags')) {
    row[index['내 태그']] = safeCellValue_(serializeList_(management.tags));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'priority')) {
    row[index['중요도']] = validatePriority_(management.priority);
  }
  if (Object.prototype.hasOwnProperty.call(management, 'status')) {
    row[index['상태']] = safeCellValue_(optionalString_(management.status, APP_.MAX_STATUS_CHARS));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'memo')) {
    row[index['메모']] = safeCellValue_(optionalString_(management.memo, APP_.MAX_MEMO_CHARS));
  }
  if (category !== '') {
    row[index['카테고리']] = safeCellValue_(category);
  }

  const now = new Date().toISOString();
  if (isNew || !row[index['수집일시']]) {
    row[index['수집일시']] = now;
  }
  row[index['수정일시']] = now;

  return row.map(safeCellValue_);
}

function serializeField_(field, value) {
  if (value == null) return '';

  if (field === 'tags') {
    return safeCellValue_(serializeList_(value));
  }
  if (field === 'transcript') {
    if (isPlainObject_(value) && typeof value.text === 'string') {
      return safeCellValue_(value.text);
    }
    return safeCellValue_(jsonText_(value));
  }
  if (field === 'comments' || field === 'rawCaptions' || field === 'rawMetadata') {
    return safeCellValue_(jsonText_(value));
  }

  return safeCellValue_(value);
}

function initializeEmptySheet_(sheet) {
  if (sheet.getLastRow() !== 0) return;
  const range = sheet.getRange(1, 1, 1, APP_.HEADERS.length);
  range.setValues([APP_.HEADERS.slice()]);
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function ensureWritableSchema_(sheet) {
  if (sheet.getLastRow() === 0) {
    initializeEmptySheet_(sheet);
    return;
  }
  assertCompatibleSchema_(sheet);
}

function assertCompatibleSchema_(sheet) {
  const actual = sheet.getRange(1, 1, 1, APP_.HEADERS.length).getDisplayValues()[0];
  for (let i = 0; i < APP_.HEADERS.length; i += 1) {
    if (actual[i] !== APP_.HEADERS[i]) {
      fail_(
        'SCHEMA_MISMATCH',
        '선택한 시트에 기존 데이터가 있고 YouTube 수집도구 열 구조와 다릅니다. 기존 내용을 덮어쓰지 않도록 저장을 중단했습니다.'
      );
    }
  }
}

function findVideoRows_(sheet, videoId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const matches = range
    .createTextFinder(videoId)
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll();

  return matches.map(function (cell) {
    return cell.getRow();
  });
}

function openLinkedSpreadsheet_(fileId) {
  requireLinkedFileId_(fileId);
  try {
    return SpreadsheetApp.openById(fileId);
  } catch (err) {
    fail_('FILE_NO_ACCESS', '연결된 Google Sheets 파일을 열 수 없습니다. 현재 계정의 권한을 확인해 주세요.');
  }
}

function requireExistingSheet_(fileId, sheetName) {
  const ss = openLinkedSpreadsheet_(fileId);
  return getSheetOrFail_(ss, sheetName);
}

function getSheetOrFail_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    fail_('SHEET_NOT_FOUND', '선택한 시트를 찾을 수 없습니다.');
  }
  return sheet;
}

function sheetListFromSpreadsheet_(ss) {
  return ss.getSheets().map(function (sheet) {
    return publicSheet_(ss, sheet);
  });
}

function publicSheet_(ss, sheet) {
  return {
    id: sheet.getSheetId(),
    name: sheet.getName(),
    hidden: sheet.isSheetHidden(),
    url: sheetRangeUrl_(ss, sheet, '')
  };
}

function publicFile_(file) {
  return {
    id: file.id,
    name: file.name,
    url: spreadsheetUrl_(file.id)
  };
}

function spreadsheetUrl_(fileId) {
  return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(fileId) + '/edit';
}

function sheetRangeUrl_(ss, sheet, rangeA1) {
  const base = ss.getUrl() + '#gid=' + sheet.getSheetId();
  return rangeA1 ? base + '&range=' + encodeURIComponent(rangeA1) : base;
}

function extractSpreadsheetId_(url) {
  const text = String(url || '').trim();
  const match = text.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{10,200})(?:\/|$)/);
  if (!match) {
    fail_('INVALID_SHEETS_URL', 'Google Sheets 파일 링크를 붙여넣어 주세요.');
  }
  return match[1];
}

function requireLinkedFileId_(fileId) {
  const id = validateFileId_(fileId);
  const state = loadState_();
  const linked = state.files.some(function (file) {
    return file.id === id;
  });
  if (!linked) {
    fail_('FILE_NOT_LINKED', '먼저 이 Google Sheets 파일을 연결해 주세요.');
  }
  return id;
}

function validateFileId_(fileId) {
  const id = String(fileId || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) {
    fail_('INVALID_FILE_ID', '파일 정보가 올바르지 않습니다.');
  }
  return id;
}

function validateVideoId_(videoId) {
  const id = String(videoId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
    fail_('INVALID_VIDEO_ID', '영상 ID가 올바르지 않습니다.');
  }
  return id;
}

function validateSheetName_(sheetName) {
  const name = requireString_(sheetName, '시트 이름', APP_.MAX_SHEET_NAME_CHARS).trim();
  if (!name || /[\\\/\?\*\[\]:]/.test(name)) {
    fail_('INVALID_SHEET_NAME', '사용할 수 없는 시트 이름입니다.');
  }
  return name;
}

function validateCategory_(category) {
  const value = requireString_(category, '카테고리', APP_.MAX_CATEGORY_CHARS).trim();
  if (!value) {
    fail_('INVALID_CATEGORY', '카테고리 이름을 입력해 주세요.');
  }
  return value;
}

function validatePriority_(value) {
  if (value === '' || value == null) return '';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 3) {
    fail_('INVALID_PRIORITY', '중요도는 0~3 범위여야 합니다.');
  }
  return number === 0 ? '' : number;
}

function validateRequest_(request) {
  if (!isPlainObject_(request)) {
    fail_('INVALID_REQUEST', '요청 형식이 올바르지 않습니다.');
  }

  let serialized;
  try {
    serialized = JSON.stringify(request);
  } catch (err) {
    fail_('INVALID_REQUEST', '요청을 처리할 수 없습니다.');
  }

  if (serialized.length > APP_.MAX_REQUEST_CHARS) {
    fail_('REQUEST_TOO_LARGE', '데이터가 너무 큽니다. 선택 항목을 줄여 다시 저장해 주세요.');
  }

  if (typeof request.action !== 'string' || request.action.length > 40) {
    fail_('INVALID_ACTION', '요청 종류가 올바르지 않습니다.');
  }
}

function safeCellValue_(value) {
  if (value == null) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value;

  let text = String(value).replace(/\u0000/g, '');
  if (text.length > APP_.MAX_CELL_CHARS) {
    const suffix = '\n[셀 최대 길이로 일부 내용이 잘렸습니다]';
    text = text.slice(0, APP_.MAX_CELL_CHARS - suffix.length) + suffix;
  }

  // 제목/설명/댓글 등 외부 텍스트가 수식으로 실행되는 것을 막는다.
  if (/^\s*[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  return text;
}

function serializeList_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return item == null ? '' : String(item);
    }).join(', ');
  }
  return value == null ? '' : String(value);
}

function jsonText_(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (err) {
    return '';
  }
}

function optionalString_(value, maxChars) {
  if (value == null) return '';
  return trimText_(String(value), maxChars);
}

function requireString_(value, label, maxChars) {
  if (typeof value !== 'string') {
    fail_('INVALID_TEXT', label + ' 값이 올바르지 않습니다.');
  }
  const text = value.trim();
  if (!text || text.length > maxChars) {
    fail_('INVALID_TEXT', label + ' 값이 올바르지 않습니다.');
  }
  return text;
}

function trimText_(text, maxChars) {
  const value = String(text == null ? '' : text).trim();
  return value.length <= maxChars ? value : value.slice(0, maxChars);
}

function headerIndex_() {
  const result = {};
  APP_.HEADERS.forEach(function (header, index) {
    result[header] = index;
  });
  return result;
}

function ensureCategoryGroup_(fileId, sheetName) {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) return;
  try {
    const state = loadState_();
    if (!findCategoryGroup_(state, fileId, sheetName)) {
      if (state.categoryGroups.length >= APP_.MAX_CATEGORY_GROUPS) return;
      state.categoryGroups.push({ fileId: fileId, sheetName: sheetName, items: [] });
      saveState_(state);
    }
  } finally {
    lock.releaseLock();
  }
}

function findCategoryGroup_(state, fileId, sheetName) {
  return state.categoryGroups.find(function (group) {
    return group.fileId === fileId && group.sheetName === sheetName;
  }) || null;
}

function refreshStoredFileName_(fileId, currentName) {
  const name = trimText_(currentName, APP_.MAX_FILE_NAME_CHARS);
  const state = loadState_();
  const file = state.files.find(function (item) {
    return item.id === fileId;
  });
  if (file && file.name !== name) {
    file.name = name;
    saveState_(state);
  }
}

function loadState_() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(APP_.USER_STATE_KEY);
  if (!raw) return emptyState_();

  try {
    return normalizeState_(JSON.parse(raw));
  } catch (err) {
    return emptyState_();
  }
}

function saveState_(state) {
  const normalized = normalizeState_(state);
  const serialized = JSON.stringify(normalized);
  if (serialized.length > APP_.MAX_STATE_CHARS) {
    fail_('STATE_TOO_LARGE', '연결 설정이 너무 많습니다. 사용하지 않는 파일 또는 카테고리를 정리해 주세요.');
  }
  PropertiesService.getUserProperties().setProperty(APP_.USER_STATE_KEY, serialized);
}

function emptyState_() {
  return {
    version: 1,
    files: [],
    defaultFileId: '',
    categoryGroups: []
  };
}

function normalizeState_(input) {
  const state = emptyState_();
  if (!isPlainObject_(input)) return state;

  const seenFiles = {};
  if (Array.isArray(input.files)) {
    input.files.slice(0, APP_.MAX_FILES).forEach(function (file) {
      if (!isPlainObject_(file)) return;
      const id = String(file.id || '').trim();
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(id) || seenFiles[id]) return;
      seenFiles[id] = true;
      state.files.push({
        id: id,
        name: trimText_(file.name || 'Google Sheets', APP_.MAX_FILE_NAME_CHARS)
      });
    });
  }

  const defaultFileId = String(input.defaultFileId || '').trim();
  if (seenFiles[defaultFileId]) state.defaultFileId = defaultFileId;
  else if (state.files.length) state.defaultFileId = state.files[0].id;

  if (Array.isArray(input.categoryGroups)) {
    input.categoryGroups.slice(0, APP_.MAX_CATEGORY_GROUPS).forEach(function (group) {
      if (!isPlainObject_(group)) return;
      const fileId = String(group.fileId || '').trim();
      const sheetName = trimText_(group.sheetName || '', APP_.MAX_SHEET_NAME_CHARS);
      if (!seenFiles[fileId] || !sheetName) return;

      const items = [];
      if (Array.isArray(group.items)) {
        group.items.slice(0, APP_.MAX_CATEGORIES_PER_SHEET).forEach(function (item) {
          const category = trimText_(item, APP_.MAX_CATEGORY_CHARS);
          if (category && items.indexOf(category) < 0) items.push(category);
        });
      }
      state.categoryGroups.push({ fileId: fileId, sheetName: sheetName, items: items });
    });
  }

  return state;
}

function withScriptLock_(callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    fail_('BUSY', '다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function getAllowedOrigin_(value) {
  const origin = String(value || '').trim();
  return APP_.ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : '';
}

function getSessionToken_(value) {
  const token = String(value || '').trim();
  return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : '';
}

function isPlainObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(code, message) {
  const err = new Error(message);
  err.ytCode = code;
  throw err;
}

function errorResult_(err) {
  const code = err && err.ytCode ? String(err.ytCode) : 'INTERNAL';
  const safeMessages = {
    INVALID_ACTION: '허용되지 않은 요청입니다.',
    INVALID_REQUEST: '요청 형식이 올바르지 않습니다.',
    INVALID_TEXT: err && err.message ? err.message : '입력값이 올바르지 않습니다.',
    REQUEST_TOO_LARGE: '데이터가 너무 큽니다. 선택 항목을 줄여 다시 저장해 주세요.',
    INVALID_SHEETS_URL: 'Google Sheets 파일 링크를 붙여넣어 주세요.',
    INVALID_FILE_ID: '파일 정보가 올바르지 않습니다.',
    INVALID_VIDEO_ID: '영상 ID가 올바르지 않습니다.',
    INVALID_SHEET_NAME: '사용할 수 없는 시트 이름입니다.',
    INVALID_CATEGORY: '카테고리 이름이 올바르지 않습니다.',
    INVALID_PRIORITY: '중요도 값이 올바르지 않습니다.',
    INVALID_DUPLICATE_MODE: '중복 처리 방식이 올바르지 않습니다.',
    INVALID_ROW: '수정할 행 정보가 올바르지 않습니다.',
    FILE_NO_ACCESS: '이 Google Sheets 파일을 열 수 없습니다. 현재 계정의 접근 권한을 확인해 주세요.',
    FILE_NOT_LINKED: '먼저 이 Google Sheets 파일을 연결해 주세요.',
    FILE_LIMIT: '연결할 수 있는 파일 수를 초과했습니다.',
    SHEET_NOT_FOUND: '선택한 시트를 찾을 수 없습니다.',
    SHEET_CREATE_FAILED: '새 시트를 만들 수 없습니다. 파일 편집 권한을 확인해 주세요.',
    SCHEMA_MISMATCH: '기존 내용을 보호하기 위해 저장을 중단했습니다. YouTube 수집도구용 새 시트를 사용해 주세요.',
    MULTIPLE_DUPLICATES: '같은 영상 ID가 여러 행에 있습니다. 수정할 기록을 먼저 선택해 주세요.',
    DUPLICATE_NOT_FOUND: '업데이트할 기존 기록을 찾지 못했습니다.',
    ROW_MISMATCH: '선택한 행과 현재 영상이 일치하지 않습니다.',
    CATEGORY_GROUP_LIMIT: '카테고리 설정 수를 초과했습니다.',
    CATEGORY_LIMIT: '카테고리 수를 초과했습니다.',
    STATE_TOO_LARGE: '연결 설정이 너무 많습니다. 사용하지 않는 설정을 정리해 주세요.',
    BUSY: '다른 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.'
  };

  return {
    ok: false,
    error: {
      code: code,
      message: safeMessages[code] || '요청을 처리하지 못했습니다.'
    }
  };
}

function buildBridgeHtml_(origin, token) {
  const originJson = JSON.stringify(origin);
  const tokenJson = JSON.stringify(token);

  return '<!doctype html>' +
    '<html lang="ko"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="referrer" content="no-referrer">' +
    '<title>YouTube 수집 - Google 연결</title>' +
    '<style>' +
      'body{margin:0;background:#111;color:#eee;font:15px/1.5 system-ui,sans-serif;padding:24px}' +
      '.box{max-width:560px;margin:0 auto;padding:18px;border:1px solid #333;border-radius:14px;background:#181818}' +
      'h1{font-size:18px;margin:0 0 10px}' +
      '#status{color:#bbb;white-space:pre-wrap}' +
    '</style></head><body>' +
    '<div class="box"><h1>YouTube 수집 · Google 연결</h1><div id="status">연결 확인 중...</div></div>' +
    '<script>' +
    '(function(){' +
      '"use strict";' +
      'const ORIGIN=' + originJson + ';' +
      'const TOKEN=' + tokenJson + ';' +
      'const status=document.getElementById("status");' +
      'function setStatus(text){status.textContent=String(text||"");}' +
      'function send(message){' +
        'if(!ORIGIN||!TOKEN||!window.opener)return;' +
        'window.opener.postMessage(message,ORIGIN);' +
      '}' +
      'if(!ORIGIN||!TOKEN){' +
        'setStatus("잘못된 연결 요청입니다. YouTube 수집도구에서 다시 열어 주세요.");' +
        'return;' +
      '}' +
      'if(!window.opener){' +
        'setStatus("Google 연결 페이지입니다.\nYouTube 수집도구에서 이 페이지를 열면 자동으로 연결됩니다.");' +
      '}else{' +
        'setStatus("Google 연결 준비됨");' +
        'send({type:"YT_GAS_READY",token:TOKEN});' +
      '}' +
      'window.addEventListener("message",function(event){' +
        'if(event.origin!==ORIGIN||event.source!==window.opener)return;' +
        'const msg=event.data;' +
        'if(!msg||msg.type!=="YT_GAS_REQUEST"||msg.token!==TOKEN)return;' +
        'const requestId=String(msg.requestId||"");' +
        'if(!/^[A-Za-z0-9_-]{8,128}$/.test(requestId))return;' +
        'if(!msg.request||typeof msg.request!=="object")return;' +
        'setStatus("처리 중...");' +
        'google.script.run' +
          '.withSuccessHandler(function(result){' +
            'setStatus(result&&result.ok?"연결됨":"요청 실패");' +
            'send({type:"YT_GAS_RESPONSE",token:TOKEN,requestId:requestId,result:result});' +
          '})' +
          '.withFailureHandler(function(){' +
            'setStatus("요청 실패");' +
            'send({type:"YT_GAS_RESPONSE",token:TOKEN,requestId:requestId,result:{ok:false,error:{code:"BRIDGE_FAILURE",message:"Google 연결 요청을 처리하지 못했습니다."}}});' +
          '})' +
          '.dispatch(msg.request);' +
      '});' +
    '})();' +
    '<\/script></body></html>';
}
