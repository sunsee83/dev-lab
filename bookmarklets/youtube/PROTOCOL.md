# 유튜브다운로드 UI ↔ 코어 통신 규격

## 1. UI 위치

`ui.html` 원본은 Apps Script에 저장되고 실행 시 `get-ui`로 북마클릿에 전달됩니다.

```text
Apps Script ui.html
→ get-ui
→ bookmarklet.js
→ iframe.srcdoc
→ YouTube 페이지 안의 통합 UI
```

실행마다 생성한 `token`으로 UI 메시지를 구분합니다.

## 2. UI → 코어

```js
{type:'YT_TOOL_READY',token}
{type:'YT_TOOL_ACTION',token,action:'google-connect'}
{type:'YT_TOOL_ACTION',token,action:'create-storage'}
{type:'YT_TOOL_ACTION',token,action:'connect-file',sheetUrl}
{type:'YT_TOOL_ACTION',token,action:'select-file',fileId}
{type:'YT_TOOL_ACTION',token,action:'select-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'create-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'add-category',fileId,sheetName,category}
{type:'YT_TOOL_ACTION',token,action:'open-file'|'open-sheet'|'open-existing'}
{type:'YT_TOOL_ACTION',token,action:'save-local',...payload}
{type:'YT_TOOL_ACTION',token,action:'save-drive',...payload}
{type:'YT_TOOL_ACTION',token,action:'close'}
```

`srcdoc` UI는 같은 YouTube 페이지 컨텍스트에서 실행되므로 가능하면 부모의 실행 핸들러를 직접 호출하고, 메시지 방식은 보조 경로로 사용합니다. 파일 선택 API의 사용자 활성화를 보존하기 위한 구조입니다.

## 3. 저장 payload

```js
{
  types:['video','audio','data'],
  target:'local'|'drive',
  video:{id},
  audio:{id},
  data:{
    fields:[],
    format:'original'|'txt'|'json',
    comments:{count,sort}
  },
  drive:{fileId,sheetName,category},
  management:{tags,purpose,priority,status,memo,aiSend},
  duplicateMode:'update'|'new'
}
```

영상/음성의 `id`는 실제 URL이 아니라 현재 실행 메모리에 있는 후보 ID입니다.

## 4. 코어 → UI

```js
{type:'YT_TOOL_INIT',token,configured,video,media,drive,duplicate}
{type:'YT_TOOL_STATUS',token,state:'ready'|'working'|'success'|'error',message,setup?}
{type:'YT_TOOL_OPTIONS',token,files?,sheets?,categories?,selectedFileId?,selectedSheetName?,selectedCategory?}
{type:'YT_TOOL_SETUP',token,configured,message}
{type:'YT_TOOL_DUPLICATE',token,duplicate}
{type:'YT_TOOL_DATA_RESULT',token,videoId,requested,result,errors,complete:true}
{type:'YT_TOOL_DRIVE_MEDIA',token,kind:'video'|'audio',src,filename}
```

## 5. 초기화

```text
YT_TOOL_READY
→ youtubei/player
→ get-state
→ 필요 시 create-storage
→ list-sheets
→ list-categories
→ check-duplicate
→ YT_TOOL_INIT
```

기본값:

```text
파일      유튜브다운로드sheet_v1
시트      수집
카테고리  기본
```

## 6. Google action 연결

| UI action | 처리 |
|---|---|
| `google-connect` | Apps Script 승인 창 열기 |
| `create-storage` | 기본 Sheets 자동 생성 |
| `connect-file` | 기존 Sheets 추가 연결 |
| `select-file` | `list-sheets` |
| `select-sheet` | `list-categories` |
| `create-sheet` | `create-sheet` 후 목록 재조회 |
| `add-category` | `add-category` |
| `save-drive` + data | `save-record` |

## 7. 로컬 저장

```text
한 종류
→ showSaveFilePicker

복수 종류
→ showDirectoryPicker
→ 선택 항목별 파일 생성
```

영상/음성은 북마클릿 코어가 직접 media URL을 fetch합니다. 데이터 파일은 코어가 선택 필드를 수집한 뒤 UI의 포맷터를 사용해 원문/TXT/JSON을 만듭니다.

## 8. 중복

`check-duplicate` 또는 `save-record status=duplicate`로 중복을 확인합니다.

```text
중복 발견
→ YT_TOOL_DUPLICATE
→ UI에서 업데이트 / 새 기록 추가 선택
→ duplicateMode와 함께 다시 저장
```

## 9. Drive 미디어

```text
코어의 후보 ID
→ 실행 메모리의 실제 media URL
→ YT_TOOL_DRIVE_MEDIA
→ UI의 Save to Drive 영역
```

실제 media URL은 이 저장 동작 동안만 사용합니다.
