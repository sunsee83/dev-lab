# YouTube 수집도구 통신 규격

이 문서는 **북마클릿 코어 ↔ UI 메시지 규격**을 정의합니다. Apps Script POST 세부 규격은 `APPS_SCRIPT_BRIDGE.md`가 기준입니다.

## 공통

- 실행마다 `token` 생성
- 실제 미디어 URL은 저장 동작 때만 일시 전달
- 인증 토큰/쿠키/비밀번호는 메시지에 넣지 않음
- Apps Script `/exec` URL은 모바일 북마클릿 코어 내부 고정 상수로 사용

## UI → 북마클릿 코어

```js
{type:'YT_TOOL_READY',token}

{type:'YT_TOOL_ACTION',token,action:'save-local'|'save-drive', ...}

{type:'YT_TOOL_ACTION',token,action:'google-connect'}
{type:'YT_TOOL_ACTION',token,action:'connect-file',sheetUrl}
{type:'YT_TOOL_ACTION',token,action:'select-file',fileId}
{type:'YT_TOOL_ACTION',token,action:'create-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'select-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'add-category',fileId,sheetName,category}
{type:'YT_TOOL_ACTION',token,action:'open-file'|'open-sheet'|'open-existing'}
{type:'YT_TOOL_ACTION',token,action:'setup-complete'|'close'}
```

데이터 저장 요청의 핵심:

```js
{
  data:{fields:[],format:'original'|'txt'|'json',comments:{count,sort}},
  drive:{fileId,sheetName,category},
  management:{tags,purpose,priority,status,memo,aiSend},
  duplicateMode:'update'|'new'
}
```

`sheetUrl`은 사용자가 설정 UI에서 입력한 개인 Sheets URL이며 공용 북마클릿 상수가 아닙니다.

## 코어 → UI

```js
{type:'YT_TOOL_INIT',token,configured,video,media,drive,duplicate}
{type:'YT_TOOL_STATUS',token,state:'ready'|'working'|'success'|'error',message}
{type:'YT_TOOL_OPTIONS',token,files?,sheets?,categories?}
{type:'YT_TOOL_SETUP',token,configured,message}
{type:'YT_TOOL_DUPLICATE',token,duplicate}
{type:'YT_TOOL_DATA_RESULT',token,videoId,requested,result,errors,complete:true}
{type:'YT_TOOL_DRIVE_MEDIA',token,kind:'video'|'audio',src,filename}
```

## Apps Script 호출 책임

UI는 Apps Script 웹앱 URL을 직접 관리하지 않습니다.

```text
UI action
→ 북마클릿 코어
→ 코어 내부 GAS_WEBAPP_URL
→ 숨은 iframe + form POST
→ Apps Script
```

GAS action:

```text
ping
get-state
connect-file
unlink-file
list-sheets
create-sheet
list-categories
add-category
check-duplicate
save-record
```

영상/음성 Drive 저장은 Google 공식 Save to Drive 경로, 데이터 Drive/Sheets 저장은 Apps Script + SpreadsheetApp 경로를 사용합니다.
