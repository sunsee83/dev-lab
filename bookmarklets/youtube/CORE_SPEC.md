# 유튜브다운로드 실행 코어 규격

## 1. 코드 배치

```text
bookmarklet.js
→ 짧은 로더

ui.html
→ 실제 YouTube 추출/저장 코어

Transport.gs / Code.gs
→ Google 통신과 Sheets 처리
```

북마클릿 길이를 줄이기 위해 YouTube 추출·저장 로직을 `bookmarklet.js`에 누적하지 않습니다.

## 2. bookmarklet.js 책임

```text
공용 Apps Script /exec 주소 보유
실행 token 생성
숨은 iframe + form POST 브리지 생성
bridgeNonce 발급
get-ui 호출
받은 ui.html로 Blob URL 생성
Blob URL을 iframe.src로 표시
ui.html에 Apps Script call 함수 제공
종료 시 iframe/Blob URL/전역 실행값 정리
```

YouTube의 Trusted Types 정책 때문에 `iframe.srcdoc`은 사용하지 않습니다.

목표는 모바일 Whale 북마크 URL 길이를 짧게 유지하는 것입니다.

## 3. ui.html 책임

```text
일반 영상/Shorts ID 확인
youtubei/player 호출
영상/음성 후보 생성
전체 사용자 화면
로컬 영상/음성 저장
데이터 선택/출력
파일 → 시트 → 카테고리 선택
관리정보
중복 처리
Apps Script action 호출
Drive 저장 영역
```

`ui.html`은 YouTube 페이지가 만든 Blob URL iframe에서 실행됩니다. Blob 문서는 부모 YouTube 문서와 같은 실행 출처를 사용하므로 부모 문서의 영상 URL/메타데이터와 fetch 기능을 참조합니다.

## 4. YouTube player

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

- 영상: `streamingData.formats`의 direct `video/mp4`
- 음성: `adaptiveFormats`의 direct `audio/mp4`
- 실제 URL은 실행 메모리의 후보 Map에만 보관
- UI select에는 후보 ID와 품질 표시만 사용

## 5. Google 저장공간

```text
ui.html 시작
→ create-storage
→ 기존 연결 있으면 재사용
→ 없으면 유튜브다운로드sheet_v1 생성
→ 수집 시트 + 기본 카테고리
→ get-state / list-sheets / list-categories
```

기본값:

```text
파일      유튜브다운로드sheet_v1
시트      수집
카테고리  기본
```

## 6. 데이터 저장

```text
데이터 + Drive
→ ui.html collect
→ save-record
→ SpreadsheetApp
```

이번 실행에서 실제로 얻은 필드만 `record`에 포함합니다.

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

중요도 미선택은 `priority`를 보내지 않습니다.

## 7. 로컬 저장

`저장` 버튼 클릭 안에서 파일/폴더 선택창을 먼저 엽니다. 사용자 활성화가 사라지기 전에 `showSaveFilePicker()` 또는 `showDirectoryPicker()`를 호출합니다.

```text
단일 항목
→ showSaveFilePicker

복수 항목
→ showDirectoryPicker
→ 항목별 파일 생성
```

그 뒤 준비된 direct URL/데이터를 선택한 파일 핸들에 기록합니다.

## 8. 영상/음성 Drive

```text
미디어 direct URL
→ ui.html
→ Google Save to Drive 버튼
```

Sheets 데이터 저장 경로와 별도입니다.

## 9. 영구 저장 금지

```text
미디어 direct URL
인증 쿠키
Google OAuth access/refresh token
YouTube 로그인 정보
```

실행 종료 시 북마클릿 전역 브리지 값과 Blob URL을 정리합니다.
