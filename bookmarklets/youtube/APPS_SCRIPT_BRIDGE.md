# Apps Script 브리지

이 문서는 모바일 북마클릿 `유튜브다운로드`와 독립형 Apps Script `유튜브다운로드앱_v1` 사이의 통신 규격입니다.

## 1. Apps Script 파일

```text
유튜브다운로드앱_v1
├─ Code.gs
├─ Transport.gs
└─ ui.html
```

`ui.html`은 GitHub의 `bookmarklets/youtube/ui.html`과 같은 원본을 Apps Script의 HTML 파일 `ui`에 복사합니다.

## 2. 공용 엔드포인트

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

이 주소는 `bookmarklet.js` 내부 고정값이며 개인 Sheets 주소가 아닙니다.

## 3. 실제 요청 경로

```text
YouTube 페이지의 bookmarklet.js
→ 숨은 iframe 생성
→ form POST
→ Transport.gs / doPost(e)
→ bridgeNonce 확인
→ bridgeDispatch_(request)
→ 필요한 Apps Script 처리
→ HTML 응답 안의 postMessage
→ 원래 YouTube 페이지가 응답 수신
```

`window.opener`는 실제 데이터 요청에 사용하지 않습니다.

## 4. 세션

```text
init
→ 사용자별 bridgeNonce 발급

request
→ token + requestId + bridgeNonce 검증
→ action 실행
```

- nonce 유효시간 10분
- `PropertiesService.getUserProperties()`에 사용자별 저장
- OAuth access/refresh token을 북마클릿에 전달하지 않음

## 5. Transport 전용 action

### get-ui

```text
bookmarklet.js
→ get-ui
→ Transport.gs
→ HtmlService.createHtmlOutputFromFile('ui').getContent()
→ ui.html 문자열 반환
→ bookmarklet.js가 iframe.srcdoc으로 표시
```

UI 전체를 북마크 URL에 넣지 않기 위한 경로입니다.

### create-storage

```text
연결 파일 없음
→ create-storage
→ SpreadsheetApp.create('유튜브다운로드sheet_v1')
→ 첫 데이터 시트 '수집'
→ 안내 시트 생성
→ 기본 카테고리 '기본'
→ 사용자별 연결 상태 저장
```

## 6. Code.gs action

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

`get-ui`, `create-storage`만 `Transport.gs`에서 먼저 처리하고 나머지는 `Code.gs / dispatch()`로 전달합니다.

## 7. POST 필드

초기화:

```text
mode=init
origin=<YouTube origin>
token=<실행 token>
requestId=<요청 ID>
```

실제 요청:

```text
mode=request
origin=<YouTube origin>
token=<실행 token>
requestId=<요청 ID>
bridgeNonce=<init에서 받은 nonce>
request=<JSON 문자열>
```

응답은 `YT_GAS_RESPONSE`의 `token`과 `requestId`가 모두 일치할 때만 사용합니다.

## 8. Google 승인

웹 앱은 `웹 앱에 액세스하는 사용자`로 실행합니다. 처음 사용하는 Google 계정은 `유튜브다운로드앱_v1`에 대한 승인을 한 번 진행하고, 이후 요청은 위 POST 브리지를 사용합니다.
