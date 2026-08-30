# YouTube 북마클릿 코어 기준

이 문서는 **Android 모바일 북마크의 `javascript:` 코드 안에 들어가는 코어의 현재 구조**를 정의합니다.

실제 YouTube 전용 식별/추출/스트림 판별 코드는 모바일 북마크 URL 안에 유지합니다.

## 1. 북마클릿 내부 고정 상수

Apps Script 웹앱 주소는 모바일 북마클릿 JavaScript 내부에 들어갑니다.

```js
const GAS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec';
```

배치 위치:

```text
Android 모바일 브라우저
→ 북마크 편집
→ URL
→ javascript:(()=>{ ... GAS_WEBAPP_URL ... })()
```

이 값은 공용 Apps Script 주소입니다. 개인 Sheets URL은 북마클릿에 고정하지 않습니다.

## 2. 전체 코어 구조

```text
모바일 북마클릿 코어
├─ YouTube 페이지/영상 식별
├─ 메타데이터 수집
├─ 영상/음성 스트림 조사
├─ 데이터 선택 필드 수집
├─ UI 메시지 라우터
├─ 로컬 저장기
├─ Apps Script 브리지 클라이언트
└─ Drive 미디어 전달
```

## 3. 코어 내부 상태

실행 중에만 다음 상태를 유지합니다.

```text
현재 실행 token
현재 영상 ID
현재 영상 메타데이터
영상 후보 목록
음성 후보 목록
UI 후보 ID ↔ 실제 스트림 대응표
Apps Script bridge nonce
연결 파일/시트/카테고리 캐시
현재 중복 정보
```

실행 종료/새로고침 시 다시 구성합니다.

## 4. YouTube 미디어 경로

검증된 player 요청은 Android client 경로를 사용합니다.

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

영상 후보:

```text
streamingData.formats
→ direct url 존재
→ video/mp4
→ 영상+음성 통합 스트림
→ 실제 가능한 화질만 UI에 노출
```

음성 후보:

```text
streamingData.adaptiveFormats
→ direct url 존재
→ audio/mp4
→ 음질 내림차순
```

현재 검증된 영상 직접 저장 기준은 360p입니다. 분리 스트림 mux는 기본 범위에 넣지 않습니다.

## 5. 로컬 미디어 저장

```js
const handle=await showSaveFilePicker(...);
const response=await fetch(mediaUrl,{headers:{Range:'bytes=0-'}});
await response.body.pipeTo(await handle.createWritable());
```

- 일반 영상/Shorts 공통
- 영상: 통합 MP4
- 음성: audio/mp4
- 파일명은 영상 제목 기반으로 정리

## 6. UI 연결

UI에는 실제 미디어 URL을 상시 전달하지 않습니다.

초기화 메시지:

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

UI 선택값은 임시 후보 ID만 사용합니다. 실제 스트림 URL은 코어 내부 대응표에 유지합니다.

세부 메시지 형식은 `PROTOCOL.md`를 따릅니다.

## 7. Apps Script 브리지 클라이언트

코어 내부에는 다음 인터페이스를 둡니다.

```js
await gas.call(action,payload)
```

구조:

```text
YouTube 페이지
→ 숨은 iframe
→ form POST
→ GAS_WEBAPP_URL
→ Transport.gs
→ Code.gs dispatch
→ iframe 응답
→ window.top.postMessage
→ gas.call Promise 완료
```

세션:

```text
첫 call
→ init
→ bridgeNonce 획득
→ request

nonce 만료
→ init 1회 재실행
→ request 재시도
```

응답 수신 시 최소 검증:

```text
message type = YT_GAS_RESPONSE
token 일치
requestId 일치
event.source = 브리지 iframe contentWindow
```

Google 첫 권한 승인은 설정 UI의 `google-connect` 동작으로 `GAS_WEBAPP_URL`을 일반 창에서 열어 처리합니다.

세부 POST 규격은 `APPS_SCRIPT_BRIDGE.md`를 따릅니다.

## 8. UI 준비 시 초기화 순서

```text
1. 영상 ID 확인
2. 기본 메타데이터 준비
3. 영상/음성 후보 준비
4. gas.call('get-state')
5. 연결 파일이 있으면 defaultFileId 또는 첫 파일 선택
6. gas.call('list-sheets',{fileId})
7. 첫 selectable 데이터 시트 선택
8. gas.call('list-categories',{fileId,sheetName})
9. YT_TOOL_INIT 전송
```

설정 완료 판단:

```text
연결 파일 있음
+ 저장 가능한 데이터 시트 있음
```

없으면 `YouTube 수집도구 설정` 화면을 표시합니다.

## 9. UI action 라우팅

```text
google-connect
→ GAS_WEBAPP_URL 일반 창 열기

connect-file
→ gas.call('connect-file',{sheetUrl})
→ get-state로 파일 목록 재동기화

select-file
→ gas.call('list-sheets',{fileId})

select-sheet
→ gas.call('list-categories',{fileId,sheetName})

create-sheet
→ gas.call('create-sheet',{fileId,sheetName})
→ list-sheets 갱신

add-category
→ gas.call('add-category',{fileId,sheetName,category})

open-file/open-sheet/open-existing
→ 서버 응답에 포함된 URL을 브라우저에서 열기
```

개인 `sheetUrl`은 설정 UI에서 받은 값을 `connect-file` 호출 순간에만 사용합니다.

## 10. 데이터 수집

UI에서 선택된 필드만 조사합니다.

```text
썸네일
제목
영상 URL
채널명
업로드일
영상 길이
조회수
설명
태그
대본
댓글
좋아요
자막 원본
영상 ID
채널 ID
원본 메타데이터
```

댓글/대본 등 추가 요청이 필요한 항목은 선택되지 않았으면 호출하지 않습니다.

수집 결과 형식:

```js
{
  videoId,
  requested:[],
  result:{},
  errors:{},
  complete:true
}
```

실패한 필드는 `result`에서 생략하고 `errors`에 기록합니다.

## 11. 데이터 로컬 저장

```text
UI save-local
→ 선택 필드 수집
→ YT_TOOL_DATA_RESULT
→ ui.html이 미리 받은 FileSystemFileHandle에 기록
```

형식:

```text
원문
TXT
JSON
```

## 12. 데이터 Sheets 저장

```text
UI save-drive
→ 선택 필드 수집
→ gas.call('save-record',...)
→ SpreadsheetApp
```

Apps Script payload 핵심:

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

중요 규칙:

- `record`에는 이번 실행에서 실제로 얻은 필드만 포함
- 수집 실패/미선택 필드는 보내지 않음
- 관리정보는 사용자가 입력한 값만 전달
- 카테고리는 UI의 `drive.category`를 `management.category`로 합쳐 전달
- 영상 URL/썸네일은 Apps Script가 영상 ID 기준으로 관리 가능

`save-record`가 `status:'duplicate'`를 반환하면 저장을 완료하지 않고 UI에 중복 상태를 표시합니다.

사용자가 `업데이트` 또는 `새 기록 추가`를 선택한 뒤 다시 저장하면 `duplicateMode`를 포함해 재호출합니다.

## 13. 영상/음성 Drive 저장

영상/음성 Drive 저장은 Sheets 경로와 분리합니다.

```text
북마클릿 코어
→ 선택된 미디어 URL/파일명만 실행 시점에 UI 전달
→ YT_TOOL_DRIVE_MEDIA
→ Google 공식 Save to Drive 버튼
```

미디어 URL은 저장소, localStorage, IndexedDB, 문서에 기록하지 않습니다.

## 14. 오류 분리

```text
데이터 실패 + 영상 성공 → 영상 저장 가능
음성 후보 없음 + 영상 후보 있음 → 영상만 선택 가능
Apps Script 실패 → 로컬 저장 기능 유지
Drive 버튼 실패 → 로컬 저장 기능 유지
```

UI에는 사용자가 처리할 수 있는 짧은 상태만 전달합니다.

## 15. 공개 저장소에 두지 않는 값

```text
실행 중 얻은 media URL
로그인/세션 정보
인증 쿠키
OAuth access/refresh token
개인 계정 비밀값
```

Apps Script `/exec` URL은 비밀값이 아니며 공용 북마클릿 엔드포인트로 문서화합니다.
