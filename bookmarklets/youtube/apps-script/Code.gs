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
  VERSION: '0.2.0',
  USER_STATE_KEY: 'ytCollector.userState.v1',
  MAX_STATE_CHARS: 8000,
  MAX_REQUEST_CHARS: 1000000,

  // 수집도구 자체 제한. Google의 물리 한도보다 의도적으로 낮게 둔다.
  MAX_FILES: 10,
  GUIDE_SHEET_NAME: '안내',
  GUIDE_TITLE: 'YouTube 수집도구 안내',
  MAX_DATA_SHEETS_PER_FILE: 10,
  MAX_TOTAL_SHEETS_PER_FILE: 11, // 안내 1 + 데이터 10
  MAX_DATA_ROWS_PER_SHEET: 2000,
  ROW_WARNING_AT: 1800,

  MAX_CATEGORY_GROUPS: 100,
  MAX_CATEGORIES_PER_SHEET: 30,
  MAX_FILE_NAME_CHARS: 120,
  MAX_SHEET_NAME_CHARS: 100,
  MAX_CATEGORY_CHARS: 60,
  MAX_PURPOSE_CHARS: 40,
  MAX_STATUS_CHARS: 40,
  MAX_MEMO_CHARS: 10000,
  MAX_CELL_CHARS: 49000,

  ALLOWED_ORIGINS: Object.freeze([
    'https://www.youtube.com',
    'https://m.youtube.com',
    'https://youtube.com',
    'https://music.youtube.com'
  ]),

  PURPOSES: Object.freeze(['공부', '자료조사', '아이디어', '보관']),
  STATUSES: Object.freeze(['미분석', '분석중', '완료', '보류']),

  // 사용자가 일부 항목만 수집해도 열 위치는 바뀌지 않는다.
  HEADERS: Object.freeze([
    '썸네일',
    '제목',
    '채널명',
    '카테고리',
    '활용 목적',
    '중요도',
    '상태',
    '내 태그',
    '업로드일',
    '영상 길이',
    '조회수',
    '좋아요',
    '영상 언어',
    '태그 / 해시태그',
    '설명',
    '대본',
    '댓글',
    '인상적인 구간',
    '관련 그룹 ID',
    'AI 전송',
    'AI 요약',
    '핵심 주장',
    '핵심 키워드',
    '사실확인 필요',
    '댓글 반응 요약',
    '타임스탬프 핵심',
    '영상 URL',
    '영상 ID',
    '채널 ID',
    '자막 원본',
    '원본 메타데이터',
    '수집일시',
    '수정일시'
  ])
});

const RECORD_COLUMNS_ = Object.freeze({
  thumbnail: '썸네일',
  title: '제목',
  channel: '채널명',
  publishedAt: '업로드일',
  duration: '영상 길이',
  views: '조회수',
  likes: '좋아요',
  language: '영상 언어',
  tags: '태그 / 해시태그',
  description: '설명',
  transcript: '대본',
  comments: '댓글',
  videoId: '영상 ID',
  channelId: '채널 ID',
  rawCaptions: '자막 원본',
  rawMetadata: '원본 메타데이터'
});

const MANAGEMENT_COLUMNS_ = Object.freeze({
  purpose: '활용 목적',
  priority: '중요도',
  status: '상태',
  tags: '내 태그',
  memo: null,
  highlights: '인상적인 구간',
  groupId: '관련 그룹 ID',
  aiSend: 'AI 전송',
  aiSummary: 'AI 요약',
  keyClaims: '핵심 주장',
  keyKeywords: '핵심 키워드',
  factCheck: '사실확인 필요',
  commentSummary: '댓글 반응 요약',
  timestampSummary: '타임스탬프 핵심'
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
        return ok_({ version: APP_.VERSION, limits: publicLimits_() });
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

function publicLimits_() {
  return {
    maxFiles: APP_.MAX_FILES,
    guideSheetsPerFile: 1,
    maxDataSheetsPerFile: APP_.MAX_DATA_SHEETS_PER_FILE,
    maxTotalSheetsPerFile: APP_.MAX_TOTAL_SHEETS_PER_FILE,
    maxDataRowsPerSheet: APP_.MAX_DATA_ROWS_PER_SHEET,
    rowWarningAt: APP_.ROW_WARNING_AT
  };
}

function getPublicState_() {
  const state = loadState_();
  return {
    version: APP_.VERSION,
    limits: publicLimits_(),
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

  // 연결한 파일은 반드시 첫 탭을 안내 시트로 유지한다.
  ensureGuideSheet_(ss);

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
    sheets: sheetListFromSpreadsheet_(ss),
    capacity: fileSheetCapacity_(ss)
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
  ensureGuideSheet_(ss);
  refreshStoredFileName_(fileId, ss.getName());

  return {
    file: publicFile_({ id: fileId, name: ss.getName() }),
    sheets: sheetListFromSpreadsheet_(ss),
    capacity: fileSheetCapacity_(ss)
  };
}

function createSheet_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateDataSheetName_(payload.sheetName);

  return withScriptLock_(function () {
    const ss = openLinkedSpreadsheet_(fileId);
    ensureGuideSheet_(ss);

    let sheet = ss.getSheetByName(sheetName);
    let created = false;

    if (!sheet) {
      const capacity = fileSheetCapacity_(ss);
      if (capacity.dataSheets >= APP_.MAX_DATA_SHEETS_PER_FILE) {
        fail_('SHEET_LIMIT', '데이터 시트는 파일당 최대 10개까지 만들 수 있습니다.');
      }

      try {
        sheet = ss.insertSheet(sheetName);
        created = true;
      } catch (err) {
        fail_('SHEET_CREATE_FAILED', '새 시트를 만들 수 없습니다. 파일 편집 권한을 확인해 주세요.');
      }
      initializeEmptySheet_(sheet);
    } else if (isGuideSheet_(sheet)) {
      fail_('GUIDE_IS_RESERVED', '안내 시트에는 수집 데이터를 저장할 수 없습니다.');
    }

    ensureCategoryGroup_(fileId, sheetName);

    return {
      created: created,
      sheet: publicSheet_(ss, sheet),
      capacity: fileSheetCapacity_(ss)
    };
  });
}

function listCategories_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateDataSheetName_(payload.sheetName);
  requireExistingDataSheet_(fileId, sheetName);

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
  const sheetName = validateDataSheetName_(payload.sheetName);
  const category = validateCategory_(payload.category);
  requireExistingDataSheet_(fileId, sheetName);

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
  const sheetName = validateDataSheetName_(payload.sheetName);
  const videoId = validateVideoId_(payload.videoId);
  const ss = openLinkedSpreadsheet_(fileId);
  const sheet = getDataSheetOrFail_(ss, sheetName);

  if (sheet.getLastRow() === 0) {
    return { found: false, rows: [], capacity: sheetCapacity_(sheet) };
  }

  assertCompatibleSchema_(sheet);
  const rows = findVideoRows_(sheet, videoId);

  return {
    found: rows.length > 0,
    rows: rows.map(function (row) {
      return {
        row: row,
        url: sheetRangeUrl_(ss, sheet, 'B' + row)
      };
    }),
    capacity: sheetCapacity_(sheet)
  };
}

function saveRecord_(payload) {
  const fileId = requireLinkedFileId_(payload.fileId);
  const sheetName = validateDataSheetName_(payload.sheetName);
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
    const sheet = getDataSheetOrFail_(ss, sheetName);
    ensureWritableSchema_(sheet);

    const duplicateRows = findVideoRows_(sheet, videoId);
    if (duplicateRows.length && !duplicateMode) {
      return {
        status: 'duplicate',
        duplicates: duplicateRows.map(function (row) {
          return { row: row, url: sheetRangeUrl_(ss, sheet, 'B' + row) };
        }),
        capacity: sheetCapacity_(sheet)
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
      applyRowPresentation_(sheet, rowToUpdate, record, videoId);

      return {
        status: 'updated',
        row: rowToUpdate,
        url: sheetRangeUrl_(ss, sheet, 'B' + rowToUpdate),
        capacity: sheetCapacity_(sheet)
      };
    }

    const capacityBefore = sheetCapacity_(sheet);
    if (capacityBefore.used >= APP_.MAX_DATA_ROWS_PER_SHEET || capacityBefore.overLimit) {
      fail_('ROW_LIMIT', '이 시트는 새 기록 한도 2,000개에 도달했습니다. 새 시트를 선택해 주세요.');
    }

    const newRow = Math.max(sheet.getLastRow() + 1, 2);
    if (newRow > APP_.MAX_DATA_ROWS_PER_SHEET + 1) {
      fail_('ROW_LIMIT', '이 시트는 새 기록 한도 2,000개에 도달했습니다. 새 시트를 선택해 주세요.');
    }

    const rowValues = mergeRecordRow_(new Array(APP_.HEADERS.length).fill(''), videoId, record, management, category, true);
    sheet.getRange(newRow, 1, 1, APP_.HEADERS.length).setValues([rowValues]);
    applyRowPresentation_(sheet, newRow, record, videoId);

    return {
      status: 'created',
      row: newRow,
      url: sheetRangeUrl_(ss, sheet, 'B' + newRow),
      capacity: sheetCapacity_(sheet)
    };
  });
}

function mergeRecordRow_(baseRow, videoId, record, management, category, isNew) {
  const row = baseRow.slice(0, APP_.HEADERS.length);
  while (row.length < APP_.HEADERS.length) row.push('');
  const index = headerIndex_();

  row[index['영상 ID']] = safeCellValue_(videoId);

  Object.keys(RECORD_COLUMNS_).forEach(function (field) {
    if (field === 'videoId' || field === 'thumbnail') return;
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      row[index[RECORD_COLUMNS_[field]]] = serializeField_(field, record[field]);
    }
  });

  // 썸네일은 저장 후 검증된 IMAGE 수식으로만 표시한다.
  row[index['썸네일']] = '';

  if (category !== '') {
    row[index['카테고리']] = safeCellValue_(category);
  }

  if (Object.prototype.hasOwnProperty.call(management, 'purpose')) {
    row[index['활용 목적']] = validatePurpose_(management.purpose);
  }
  if (Object.prototype.hasOwnProperty.call(management, 'priority')) {
    row[index['중요도']] = validatePriority_(management.priority);
  }
  if (Object.prototype.hasOwnProperty.call(management, 'status')) {
    row[index['상태']] = validateStatus_(management.status);
  }
  if (Object.prototype.hasOwnProperty.call(management, 'tags')) {
    row[index['내 태그']] = safeCellValue_(serializeList_(management.tags));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'highlights')) {
    row[index['인상적인 구간']] = safeCellValue_(serializeList_(management.highlights));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'groupId')) {
    row[index['관련 그룹 ID']] = safeCellValue_(optionalString_(management.groupId, 120));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'aiSend')) {
    row[index['AI 전송']] = Boolean(management.aiSend);
  }
  if (Object.prototype.hasOwnProperty.call(management, 'aiSummary')) {
    row[index['AI 요약']] = safeCellValue_(optionalString_(management.aiSummary, APP_.MAX_CELL_CHARS));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'keyClaims')) {
    row[index['핵심 주장']] = safeCellValue_(serializeFlexibleText_(management.keyClaims));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'keyKeywords')) {
    row[index['핵심 키워드']] = safeCellValue_(serializeList_(management.keyKeywords));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'factCheck')) {
    row[index['사실확인 필요']] = safeCellValue_(serializeFlexibleText_(management.factCheck));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'commentSummary')) {
    row[index['댓글 반응 요약']] = safeCellValue_(serializeFlexibleText_(management.commentSummary));
  }
  if (Object.prototype.hasOwnProperty.call(management, 'timestampSummary')) {
    row[index['타임스탬프 핵심']] = safeCellValue_(serializeFlexibleText_(management.timestampSummary));
  }

  // 현재 UI의 메모는 아직 독립 열을 유지하지 않는다. 읽기/쓰기 최종 규칙 확정 때 다시 결정한다.
  if (Object.prototype.hasOwnProperty.call(management, 'memo') && management.memo) {
    const memoText = optionalString_(management.memo, APP_.MAX_MEMO_CHARS);
    if (memoText) {
      const current = String(row[index['핵심 주장']] || '');
      row[index['핵심 주장']] = safeCellValue_(current ? current + '\n\n[메모]\n' + memoText : '[메모]\n' + memoText);
    }
  }

  const canonicalVideoUrl = canonicalVideoUrl_(videoId, record.url);
  row[index['영상 URL']] = safeCellValue_(canonicalVideoUrl);

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

function serializeFlexibleText_(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(String).join('\n');
  if (isPlainObject_(value)) return jsonText_(value);
  return String(value);
}

/**
 * 첫 번째 시트는 항상 안내 시트로 유지한다.
 * 기존에 같은 이름의 시트가 있으나 우리 안내 시트가 아니면 덮어쓰지 않고 중단한다.
 */
function ensureGuideSheet_(ss) {
  let guide = ss.getSheetByName(APP_.GUIDE_SHEET_NAME);

  if (guide) {
    const a1 = String(guide.getRange('A1').getDisplayValue() || '').trim();
    if (a1 && a1 !== APP_.GUIDE_TITLE) {
      fail_('GUIDE_NAME_CONFLICT', '이 파일에 이미 다른 용도의 "안내" 시트가 있습니다. 해당 탭 이름을 바꾼 뒤 다시 연결해 주세요.');
    }
  } else {
    try {
      guide = ss.insertSheet(APP_.GUIDE_SHEET_NAME, 0);
    } catch (err) {
      fail_('FILE_NOT_WRITABLE', '안내 시트를 만들 수 없습니다. 이 파일의 편집 권한을 확인해 주세요.');
    }
  }

  initializeGuideSheet_(guide);

  try {
    ss.setActiveSheet(guide);
    ss.moveActiveSheet(1);
  } catch (err) {
    fail_('FILE_NOT_WRITABLE', '안내 시트를 첫 번째 위치로 이동할 수 없습니다. 파일 편집 권한을 확인해 주세요.');
  }

  return guide;
}

function initializeGuideSheet_(sheet) {
  const a1 = String(sheet.getRange('A1').getDisplayValue() || '').trim();
  if (a1 && a1 !== APP_.GUIDE_TITLE) return;

  const rows = [
    [APP_.GUIDE_TITLE],
    [''],
    ['이 파일은 YouTube 수집도구가 연결한 Google Sheets 파일입니다.'],
    ['저장 경로'],
    ['YouTube 페이지 → YouTube 수집 북마클릿 → Apps Script 웹앱 → 이 Google Sheets 파일 → 선택한 데이터 시트'],
    [''],
    ['현재 기본 규칙'],
    ['• 첫 번째 탭은 항상 이 안내 시트입니다.'],
    ['• 데이터 시트는 파일당 최대 10개까지 사용할 수 있습니다.'],
    ['• 각 데이터 시트는 최대 2,000개의 수집 기록을 저장합니다.'],
    ['• 1,800개부터 새 시트 사용을 안내하고, 2,000개부터 새 기록 추가를 차단합니다. 기존 기록 업데이트는 허용합니다.'],
    [''],
    ['읽기/쓰기 세부 규칙은 다음 단계에서 확정한 뒤 이 안내 시트에 추가합니다.'],
    ['도구 버전: ' + APP_.VERSION]
  ];

  sheet.getRange(1, 1, rows.length, 1).setValues(rows);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(16);
  sheet.getRange('A4').setFontWeight('bold');
  sheet.getRange('A7').setFontWeight('bold');
  sheet.getRange(1, 1, rows.length, 1).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 760);
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
}

function initializeEmptySheet_(sheet) {
  if (sheet.getLastRow() !== 0) return;

  const range = sheet.getRange(1, 1, 1, APP_.HEADERS.length);
  range.setValues([APP_.HEADERS.slice()]);
  range.setFontWeight('bold');
  range.setWrap(true);

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  sheet.setRowHeight(1, 34);

  // 모바일에서 첫 화면만 봐도 영상 식별이 되도록 앞쪽 열을 넉넉하게 둔다.
  sheet.setColumnWidth(1, 120); // 썸네일
  sheet.setColumnWidth(2, 280); // 제목
  sheet.setColumnWidth(3, 180); // 채널
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 70);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 160);

  // 긴 원문/AI 데이터는 기본 폭을 과도하게 키우지 않는다.
  [15, 16, 17, 21, 22, 24, 25, 26, 30, 31].forEach(function (column) {
    sheet.setColumnWidth(column, 220);
  });

  const rowCount = APP_.MAX_DATA_ROWS_PER_SHEET;

  const purposeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(APP_.PURPOSES.slice(), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, rowCount, 1).setDataValidation(purposeRule);

  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '2', '3', '4', '5'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, rowCount, 1).setDataValidation(priorityRule);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(APP_.STATUSES.slice(), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, rowCount, 1).setDataValidation(statusRule);

  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 20, rowCount, 1).setDataValidation(checkboxRule);
}

function ensureWritableSchema_(sheet) {
  if (isGuideSheet_(sheet)) {
    fail_('GUIDE_IS_RESERVED', '안내 시트에는 수집 데이터를 저장할 수 없습니다.');
  }
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

function applyRowPresentation_(sheet, rowNumber, record, videoId) {
  const index = headerIndex_();

  // 썸네일은 파일로 저장하지 않고 검증된 YouTube 썸네일 URL을 셀 이미지로 표시한다.
  const thumbnailUrl = validateThumbnailUrl_(record.thumbnail);
  const thumbnailCell = sheet.getRange(rowNumber, index['썸네일'] + 1);
  if (thumbnailUrl) {
    const formulaUrl = thumbnailUrl.replace(/"/g, '""');
    thumbnailCell.setFormula('=IMAGE("' + formulaUrl + '")');
    sheet.setRowHeight(rowNumber, 68);
  } else {
    thumbnailCell.clearContent();
  }

  const videoUrl = canonicalVideoUrl_(videoId, record.url);
  setLinkedText_(sheet.getRange(rowNumber, index['제목'] + 1), record.title, videoUrl);
  setLinkedText_(sheet.getRange(rowNumber, index['영상 URL'] + 1), videoUrl, videoUrl);

  const channelId = validateChannelIdSoft_(record.channelId);
  if (channelId) {
    setLinkedText_(
      sheet.getRange(rowNumber, index['채널명'] + 1),
      record.channel,
      'https://www.youtube.com/channel/' + encodeURIComponent(channelId)
    );
  }
}

function setLinkedText_(range, text, url) {
  const label = safeCellValue_(text == null ? '' : text);
  if (!label || !url) {
    range.setValue(label || '');
    return;
  }
  try {
    const rich = SpreadsheetApp.newRichTextValue()
      .setText(String(label))
      .setLinkUrl(String(url))
      .build();
    range.setRichTextValue(rich);
  } catch (err) {
    range.setValue(label);
  }
}

function findVideoRows_(sheet, videoId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const videoIdColumn = headerIndex_()['영상 ID'] + 1;
  const range = sheet.getRange(2, videoIdColumn, lastRow - 1, 1);
  const matches = range
    .createTextFinder(videoId)
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll();

  return matches.map(function (cell) {
    return cell.getRow();
  });
}

function sheetCapacity_(sheet) {
  const used = Math.max(0, sheet.getLastRow() - 1);
  return {
    used: used,
    max: APP_.MAX_DATA_ROWS_PER_SHEET,
    warningAt: APP_.ROW_WARNING_AT,
    nearLimit: used >= APP_.ROW_WARNING_AT,
    full: used >= APP_.MAX_DATA_ROWS_PER_SHEET,
    overLimit: used > APP_.MAX_DATA_ROWS_PER_SHEET
  };
}

function fileSheetCapacity_(ss) {
  const sheets = ss.getSheets();
  const dataSheets = sheets.filter(function (sheet) {
    return !isGuideSheet_(sheet);
  }).length;

  return {
    totalSheets: sheets.length,
    dataSheets: dataSheets,
    maxDataSheets: APP_.MAX_DATA_SHEETS_PER_FILE,
    maxTotalSheets: APP_.MAX_TOTAL_SHEETS_PER_FILE,
    full: dataSheets >= APP_.MAX_DATA_SHEETS_PER_FILE,
    overLimit: dataSheets > APP_.MAX_DATA_SHEETS_PER_FILE || sheets.length > APP_.MAX_TOTAL_SHEETS_PER_FILE
  };
}

function openLinkedSpreadsheet_(fileId) {
  requireLinkedFileId_(fileId);
  try {
    return SpreadsheetApp.openById(fileId);
  } catch (err) {
    fail_('FILE_NO_ACCESS', '연결된 Google Sheets 파일을 열 수 없습니다. 현재 계정의 권한을 확인해 주세요.');
  }
}

function requireExistingDataSheet_(fileId, sheetName) {
  const ss = openLinkedSpreadsheet_(fileId);
  return getDataSheetOrFail_(ss, sheetName);
}

function getDataSheetOrFail_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    fail_('SHEET_NOT_FOUND', '선택한 시트를 찾을 수 없습니다.');
  }
  if (isGuideSheet_(sheet)) {
    fail_('GUIDE_IS_RESERVED', '안내 시트에는 수집 데이터를 저장할 수 없습니다.');
  }
  return sheet;
}

function isGuideSheet_(sheet) {
  return sheet && sheet.getName() === APP_.GUIDE_SHEET_NAME;
}

function sheetListFromSpreadsheet_(ss) {
  return ss.getSheets().map(function (sheet) {
    return publicSheet_(ss, sheet);
  });
}

function publicSheet_(ss, sheet) {
  const guide = isGuideSheet_(sheet);
  const result = {
    id: sheet.getSheetId(),
    name: sheet.getName(),
    hidden: sheet.isSheetHidden(),
    kind: guide ? 'guide' : 'data',
    selectable: !guide,
    url: sheetRangeUrl_(ss, sheet, '')
  };
  if (!guide) result.capacity = sheetCapacity_(sheet);
  return result;
}

function publicFile_(file) {
  return {
    id: file.id,
    name: trimText_(file.name || 'Google Sheets', APP_.MAX_FILE_NAME_CHARS),
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

function canonicalVideoUrl_(videoId, suppliedUrl) {
  const url = validateYoutubeVideoUrlSoft_(suppliedUrl);
  return url || 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId);
}

function validateYoutubeVideoUrlSoft_(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 2048) return '';
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].indexOf(host) < 0) return '';
    return parsed.toString();
  } catch (err) {
    return '';
  }
}

function validateThumbnailUrl_(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 2048) return '';
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (host !== 'i.ytimg.com' && host !== 'img.youtube.com') return '';
    return parsed.toString();
  } catch (err) {
    return '';
  }
}

function validateChannelIdSoft_(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{6,128}$/.test(id) ? id : '';
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

function validateDataSheetName_(sheetName) {
  const name = validateSheetName_(sheetName);
  if (name === APP_.GUIDE_SHEET_NAME) {
    fail_('GUIDE_IS_RESERVED', '"안내"는 첫 번째 안내 시트 전용 이름입니다.');
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

function validatePurpose_(value) {
  if (value === '' || value == null) return '';
  const text = optionalString_(value, APP_.MAX_PURPOSE_CHARS);
  if (APP_.PURPOSES.indexOf(text) < 0) {
    fail_('INVALID_PURPOSE', '활용 목적 값이 올바르지 않습니다.');
  }
  return text;
}

function validatePriority_(value) {
  if (value === '' || value == null) return '';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    fail_('INVALID_PRIORITY', '중요도는 1~5 범위여야 합니다.');
  }
  return number;
}

function validateStatus_(value) {
  if (value === '' || value == null) return '';
  const text = optionalString_(value, APP_.MAX_STATUS_CHARS);
  if (APP_.STATUSES.indexOf(text) < 0) {
    fail_('INVALID_STATUS', '상태 값이 올바르지 않습니다.');
  }
  return text;
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
      if (!seenFiles[fileId] || !sheetName || sheetName === APP_.GUIDE_SHEET_NAME) return;

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
    INVALID_PURPOSE: '활용 목적 값이 올바르지 않습니다.',
    INVALID_PRIORITY: '중요도 값이 올바르지 않습니다.',
    INVALID_STATUS: '상태 값이 올바르지 않습니다.',
    INVALID_DUPLICATE_MODE: '중복 처리 방식이 올바르지 않습니다.',
    INVALID_ROW: '수정할 행 정보가 올바르지 않습니다.',
    FILE_NO_ACCESS: '이 Google Sheets 파일을 열 수 없습니다. 현재 계정의 접근 권한을 확인해 주세요.',
    FILE_NOT_WRITABLE: '이 Google Sheets 파일을 수정할 수 없습니다. 현재 계정의 편집 권한을 확인해 주세요.',
    FILE_NOT_LINKED: '먼저 이 Google Sheets 파일을 연결해 주세요.',
    FILE_LIMIT: '연결 파일은 최대 10개까지 사용할 수 있습니다.',
    SHEET_NOT_FOUND: '선택한 시트를 찾을 수 없습니다.',
    SHEET_CREATE_FAILED: '새 시트를 만들 수 없습니다. 파일 편집 권한을 확인해 주세요.',
    SHEET_LIMIT: '안내 시트를 제외한 데이터 시트는 파일당 최대 10개까지 사용할 수 있습니다.',
    GUIDE_NAME_CONFLICT: '기존 "안내" 탭을 보호하기 위해 연결을 중단했습니다. 기존 탭 이름을 바꾼 뒤 다시 시도해 주세요.',
    GUIDE_IS_RESERVED: '안내 시트에는 수집 데이터를 저장할 수 없습니다.',
    ROW_LIMIT: '이 시트는 새 기록 한도 2,000개에 도달했습니다. 새 시트를 선택해 주세요.',
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
