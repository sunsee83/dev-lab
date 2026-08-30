# YouTube 수집도구 통신 규격

이 문서는 **북마클릿 코어 ↔ UI 메시지 규격**을 정의합니다. Apps Script POST 세부 규격은 `APPS_SCRIPT_BRIDGE.md`가 기준입니다.

## 1. 공통

- 실행마다 `token` 생성
- 실제 미디어 URL은 저장 동작 때만 일시 전달
- 인증 토큰/쿠키/비밀번호는 메시지에 넣지 않음
- Apps Script `/exec` URL은 UI가 아니라 모바일 북마클릿 코어 내부 고정 상수로 사용

## 2. UI → 북마클릿 코어

```js
{type:'YT_TOOL_READY',token}

{type:'YT_TOOL_ACTION',token,action:'google-connect'}
{type:'YT_TOOL_ACTION',token,action:'create-storage'}
{type:'YT_TOOL_ACTION',token,action:'connect-file',sheetUrl}
{type:'YT_TOOL_ACTION',token,action:'select-file',fileId}
{type:'YT_TOOL_ACTION',token,action:'create-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'select-sheet',fileId,sheetName}
{type:'YT_TOOL_ACTION',token,action:'add-category',fileId,sheetName,category}
{type:'YT_TOOL_ACTION',token,action:'open-file'|'open-sheet'|'open-existing'}
{type:'YT_TOOL_ACTION',token,action:'setup-complete',fileId,sheetName,category}
{type:'YT_TOOL_ACTION',token,action:'save-local',...payload}
{type:'YT_TOOL_ACTION',token,action:'save-drive',...payload}
{type:'YT_TOOL_ACTION',token,action:'close'}
```

`create-storage`는 최초 사용자용 자동 생성입니다.

`connect-file`은 자동 생성된 기본 파일 외에 **기존 Sheets를 추가 연결할 때만** 사용합니다.

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

## 4. 북마클릿 코어 → UI

```js
{type:'YT_TOOL_INIT',token,configured,video,media,drive,duplicate}
{type:'YT_TOOL_STATUS',token,state:'ready'|'working'|'success'|'error',message,setup?}
{type:'YT_TOOL_OPTIONS',token,files?,sheets?,categories?,selectedFileId?,selectedSheetName?,selectedCategory?}
{type:'YT_TOOL_SETUP',token,configured,message,files?,sheets?,categories?}
{type:'YT_TOOL_DUPLICATE',token,duplicate}
{type:'YT_TOOL_DATA_RESULT',token,videoId,requested,result,errors,complete:true}
{type:'YT_TOOL_DRIVE_MEDIA',token,kind:'video'|'audio',src,filename}
```

## 5. UI action → 실제 처리

| UI action | 북마클릿 코어 처리 | Apps Script action |
|---|---|---|
| `google-connect` | 권한 승인용으로 `GAS_WEBAPP_URL` 일반 창 열기 | 없음 |
| `create-storage` | 최초 저장공간 자동 생성 | `create-storage` |
| `connect-file` | 기존 Sheets 추가 연결 | `connect-file` |
| `select-file` | 해당 파일 시트 조회 | `list-sheets` |
| `select-sheet` | 해당 시트 카테고리 조회 | `list-categories` |
| `create-sheet` | 시트 생성 후 목록 갱신 | `create-sheet` → `list-sheets` |
| `add-category` | 카테고리 추가 | `add-category` |
| `save-drive`의 데이터 | 수집 결과를 Sheets 레코드로 저장 | `save-record` |
| `open-file/open-sheet/open-existing` | 보유 URL을 브라우저에서 열기 | 없음 |

## 6. 최초 초기화

UI가 `YT_TOOL_READY`를 보내면 코어는 다음을 수행합니다.

```text
1. 현재 YouTube 영상 정보/미디어 후보 준비
2. Apps Script get-state
3. 연결 파일이 없으면 create-storage
4. 자동 생성 기본값
   파일: YouTube 수집
   시트: 수집
   카테고리: 기본
5. get-state 재조회
6. defaultFileId 선택
7. list-sheets
8. list-categories
9. YT_TOOL_INIT 전송
```

사용자는 최초 설정에서 Sheets 링크를 입력하지 않습니다.

## 7. 이후 실행

```text
get-state
→ 연결 파일 있음
→ defaultFileId
→ list-sheets
→ 기본/선택 시트
→ list-categories
→ 바로 본 화면
```

## 8. 기존 파일 추가/시트/카테고리 갱신

### 기존 파일 추가 연결

```text
connect-file 성공
→ get-state 재동기화
→ 연결된 파일 목록 반영
```

### 새 시트

```text
create-sheet 성공
→ list-sheets
→ 생성된 시트 선택
→ list-categories
```

### 새 카테고리

```text
add-category 성공
→ 반환 categories 반영
→ 새 카테고리 선택
```

## 9. 데이터 Drive/Sheets 저장

```js
await gas.call('save-record',{
  fileId,
  sheetName,
  videoId,
  record,
  management:{category,purpose,priority,status,tags,memo,aiSend},
  duplicateMode
})
```

`record`에는 이번 실행에서 실제로 얻은 필드만 넣습니다.

`save-record`가 `status:'duplicate'`를 반환하면 UI에 중복 선택 화면을 표시합니다.

## 10. 로컬 데이터 저장

```text
UI save-local
→ 코어가 데이터 수집
→ YT_TOOL_DATA_RESULT
→ ui.html이 사용자가 선택한 파일 핸들에 기록
```

## 11. 영상/음성 저장

```text
로컬
→ YouTube 페이지 코어가 직접 fetch + 파일 저장

Drive
→ 코어가 선택된 미디어 URL/파일명을 YT_TOOL_DRIVE_MEDIA로 UI에 일시 전달
→ UI가 Google 공식 Save to Drive 버튼 렌더링
```
