# 유튜브다운로드 북마클릿 코어 규격

이 문서는 **Android 모바일 북마크 `유튜브다운로드`의 `javascript:` 코드 안에 들어가는 코어 구조**를 정의합니다.

## 1. 이름 체계

```text
모바일 북마클릿 이름  유튜브다운로드
Apps Script 프로젝트  유튜브다운로드앱_v1
Google Sheets 파일     유튜브다운로드sheet_v1
```

## 2. 북마클릿 내부 고정 값

```js
const GAS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec';
```

이 값은 독립형 Apps Script 프로젝트 `유튜브다운로드앱_v1`의 공용 웹앱 주소입니다.

## 3. 코어 책임

```text
현재 일반 영상/Shorts 식별
영상 ID와 기본 메타데이터 확인
영상/음성 스트림 후보 생성
데이터 선택 필드 추출
통합 UI 제어
로컬 파일 저장
독립형 Apps Script 브리지 호출
최초 Google Sheets 저장공간 자동 생성
영상/음성 Drive 저장 정보 전달
```

## 4. Google 저장 구조

```text
유튜브다운로드 북마클릿
→ GAS_WEBAPP_URL
→ 유튜브다운로드앱_v1
→ 사용자별 Google Sheets
```

Google Sheets는 Apps Script에 붙어 있는 부모 파일이 아닙니다.

## 5. 최초 사용자 저장공간

```text
get-state
→ 연결 파일 없음
→ create-storage
→ 사용자 계정에 '유튜브다운로드sheet_v1' 자동 생성
→ '안내' 시트 생성
→ '수집' 데이터 시트 생성
→ '기본' 카테고리 등록
→ 생성 파일을 UserProperties에 연결
→ get-state 재조회
```

사용자는 최초 설정에서 Google Sheets를 직접 만들거나 URL을 입력하지 않습니다.

기존 Sheets 추가 연결이 필요할 때만 `connect-file`을 사용합니다.

## 6. 이후 실행 상태

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

## 7. 검증된 YouTube player 경로

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

영상은 `streamingData.formats`의 direct `video/mp4` 통합 스트림을 사용하고, 음성은 `adaptiveFormats`의 direct `audio/mp4` 후보를 사용합니다.

현재 Android Whale에서 일반 영상과 Shorts 직접 저장이 검증되어 있으며 통합 영상의 검증 화질은 360p입니다.

## 8. 로컬 미디어 저장

```js
const handle=await showSaveFilePicker(...);
const response=await fetch(mediaUrl,{headers:{Range:'bytes=0-'}});
await response.body.pipeTo(await handle.createWritable());
```

영상/음성은 독립 작업으로 처리합니다.

## 9. UI 초기화

```text
현재 영상/미디어 후보 준비
→ get-state
→ 필요하면 create-storage
→ defaultFileId
→ list-sheets
→ list-categories
→ YT_TOOL_INIT
```

기본 자동 생성값:

```text
파일      유튜브다운로드sheet_v1
시트      수집
카테고리  기본
```

## 10. Google UI action 라우팅

```text
google-connect
→ gas.authorize()

create-storage
→ gas.call('create-storage',{})

connect-file
→ 기존 Sheets를 추가할 때만 gas.call('connect-file',{sheetUrl})

select-file
→ gas.call('list-sheets',{fileId})

select-sheet
→ gas.call('list-categories',{fileId,sheetName})

create-sheet
→ gas.call('create-sheet',{fileId,sheetName})

add-category
→ gas.call('add-category',{fileId,sheetName,category})
```

## 11. 데이터 추출 결과

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

세부 필드 규격은 `DATA_EXTRACT_FLOW.md`를 따릅니다.

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
  management:{category,purpose,priority,status,tags,memo,aiSend},
  duplicateMode
}
```

이번 실행에서 실제로 얻은 `record` 필드만 전달합니다.

## 13. 영상/음성 Drive 저장

```text
선택 미디어 URL/파일명
→ YT_TOOL_DRIVE_MEDIA
→ UI
→ Google 공식 Save to Drive 버튼
```

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
