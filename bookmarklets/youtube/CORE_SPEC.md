# YouTube 북마클릿 코어 규격

이 문서는 **Android 모바일 북마크의 `javascript:` 코드 안에 들어가는 코어의 현재 구조**를 정의합니다.

## 1. 북마클릿 내부 고정 값

```js
const GAS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec';
```

배치 위치:

```text
Android 브라우저 북마크
→ URL
→ javascript:(()=>{ ... GAS_WEBAPP_URL ... })()
```

`GAS_WEBAPP_URL`은 공용 Apps Script 주소입니다. 개인 Google Sheets URL은 북마클릿에 고정하지 않습니다.

## 2. 코어 책임

```text
현재 일반 영상/Shorts 식별
영상 ID와 기본 메타데이터 확인
영상/음성 스트림 후보 생성
데이터 선택 필드 추출
UI 메시지 처리
로컬 파일 저장
Apps Script 브리지 호출
영상/음성 Drive 저장 정보 전달
```

## 3. 실행 상태

현재 북마클릿 실행 동안만 유지합니다.

```text
실행 token
영상 ID/메타데이터
영상 후보/음성 후보
UI 임시 후보 ID ↔ 실제 스트림 대응표
Apps Script bridge nonce
파일/시트/카테고리 캐시
중복 정보
```

미디어 URL, OAuth token, 쿠키를 영구 저장하지 않습니다.

## 4. 검증된 YouTube player 경로

```js
fetch('https://www.youtube.com/youtubei/v1/player',{
  method:'POST',
  credentials:'omit',
  headers:{
    'content-type':'application/json',
    'x-youtube-client-name':'3',
    'x-youtube-client-version':'20.10.38'
  },
  body:JSON.stringify({
    videoId,
    context:{client:{
      clientName:'ANDROID',
      clientVersion:'20.10.38',
      androidSdkVersion:30,
      hl:'ko',
      gl:'KR'
    }}
  })
})
```

영상:

```text
streamingData.formats
→ direct url
→ video/mp4
→ 영상+음성 통합 후보
```

음성:

```text
streamingData.adaptiveFormats
→ direct url
→ audio/mp4
→ 음질 내림차순
```

현재 Android Whale에서 일반 영상과 Shorts의 직접 저장이 검증되어 있으며 통합 영상의 검증 화질은 360p입니다.

## 5. 로컬 미디어 저장

```js
const handle=await showSaveFilePicker(...);
const response=await fetch(mediaUrl,{headers:{Range:'bytes=0-'}});
await response.body.pipeTo(await handle.createWritable());
```

영상/음성은 독립 작업으로 처리합니다.

## 6. UI 초기화

UI에는 실제 미디어 URL 대신 임시 후보 ID를 전달합니다.

```js
{
  type:'YT_TOOL_INIT',
  token,
  configured,
  video,
  media:{video:[],audio:[]},
  drive:{files:[],sheets:[],categories:[]},
  duplicate
}
```

메시지 세부 형식은 `PROTOCOL.md`가 기준입니다.

## 7. Apps Script 브리지

코어는 `APPS_SCRIPT_BRIDGE.md`의 기준 구현을 포함하고 다음 인터페이스만 사용합니다.

```js
const gas=createGasBridge(GAS_WEBAPP_URL,token);
await gas.call(action,payload);
```

실제 요청:

```text
YouTube 페이지
→ 숨은 iframe + form POST
→ GAS_WEBAPP_URL
→ Transport.gs
→ Code.gs dispatch
→ postMessage 응답
```

응답 연결 기준:

```text
YT_GAS_RESPONSE
token 일치
requestId 일치
```

Apps Script HTML Service의 sandbox frame 구조는 브라우저에 따라 달라질 수 있으므로 특정 `event.source`를 필수 조건으로 고정하지 않습니다.

처음 사용하는 Google 계정은 `google-connect`에서 `gas.authorize()`로 권한 승인을 진행합니다.

## 8. UI 시작 시 Google 상태 구성

```text
get-state
→ 연결 파일 확인
→ defaultFileId 또는 첫 파일
→ list-sheets
→ 첫 selectable 데이터 시트
→ list-categories
→ YT_TOOL_INIT
```

설정 화면을 건너뛰는 기준:

```text
연결 파일 있음
+ selectable 데이터 시트 있음
```

## 9. Google UI action 라우팅

```text
google-connect
→ gas.authorize()

connect-file
→ gas.call('connect-file',{sheetUrl})
→ get-state 재동기화

select-file
→ gas.call('list-sheets',{fileId})

select-sheet
→ gas.call('list-categories',{fileId,sheetName})

create-sheet
→ gas.call('create-sheet',{fileId,sheetName})
→ list-sheets 재조회

add-category
→ gas.call('add-category',{fileId,sheetName,category})
```

개인 `sheetUrl`은 `connect-file` 호출 때만 전달합니다.

## 10. 데이터 추출 결과

사용자가 선택한 필드만 조사합니다.

```js
{
  videoId,
  requested:[],
  result:{},
  errors:{},
  complete:true
}
```

실패하거나 선택하지 않은 필드는 `result`에 넣지 않습니다.

세부 필드 규격은 `DATA_EXTRACT_FLOW.md`를 따릅니다.

## 11. 로컬 데이터 저장

```text
UI save-local
→ UI가 showSaveFilePicker()로 파일 핸들 확보
→ 코어가 선택 데이터 수집
→ YT_TOOL_DATA_RESULT
→ ui.html이 원문/TXT/JSON으로 기록
```

출력 규격은 `DATA_OUTPUT_FLOW.md`를 따릅니다.

## 12. Sheets 데이터 저장

```text
UI save-drive
→ 코어가 선택 데이터 수집
→ gas.call('save-record',payload)
→ SpreadsheetApp
```

```js
{
  fileId,
  sheetName,
  videoId,
  record,
  management:{
    category,
    purpose,
    priority,
    status,
    tags,
    memo,
    aiSend
  },
  duplicateMode
}
```

규칙:

```text
이번 실행에서 실제로 얻은 record 필드만 전달
카테고리는 drive.category → management.category로 합침
수집 실패/미선택 필드는 전달하지 않음
save-record status=duplicate → UI 중복 화면 표시
업데이트/새 기록 선택 후 duplicateMode를 포함해 재저장
```

Sheets 규칙은 `SHEET_RULES.md`가 기준입니다.

## 13. 영상/음성 Drive 저장

```text
선택 미디어 URL/파일명
→ YT_TOOL_DRIVE_MEDIA
→ ui.html
→ Google 공식 Save to Drive 버튼
```

Sheets 저장 경로와 분리합니다.

## 14. 오류 분리

```text
데이터 실패 + 영상 성공 → 영상 저장 유지
음성 후보 없음 + 영상 후보 있음 → 영상 사용 가능
Apps Script 실패 → 로컬 저장 유지
Drive 버튼 실패 → 로컬 저장 유지
```

## 15. 영구 저장 금지

```text
실행 중 media URL
로그인/세션 정보
인증 쿠키
OAuth access/refresh token
개인 계정 비밀값
```

Apps Script `/exec` URL은 공용 엔드포인트이므로 북마클릿 구조 문서에 명시합니다.
