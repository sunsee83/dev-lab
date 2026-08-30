# Apps Script 브리지

이 문서는 **모바일 북마클릿 ↔ Apps Script 웹앱 통신 규격**만 정의합니다.

## 1. 고정 웹앱 URL

```text
https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec
```

이 URL의 정확한 배치 위치:

```text
Android 모바일 브라우저의 북마크
→ URL 칸의 javascript: 북마클릿 코드
→ 그 JavaScript 내부 GAS_WEBAPP_URL 상수
```

즉 이 URL은 **모바일 북마크 자체에 들어가는 공용 Apps Script 엔드포인트**입니다.

개인 Google Sheets URL은 여기에 넣지 않습니다.

## 2. 통신 구조

```text
YouTube 페이지의 북마클릿
→ 숨은 iframe 생성
→ form POST를 GAS_WEBAPP_URL로 전송
→ Transport.gs의 doPost(e)
→ Apps Script 처리
→ iframe HTML 응답
→ window.top.postMessage(...)
→ 원래 YouTube 페이지의 북마클릿이 결과 수신
```

`window.opener` 기반 popup 통신은 사용하지 않습니다.

## 3. 연결 세션

Apps Script 요청은 2단계입니다.

```text
init
→ 사용자별 임시 bridgeNonce 발급

request
→ bridgeNonce 검증
→ 실제 action 실행
```

- nonce 저장: `PropertiesService.getUserProperties()`
- 유효시간: 10분
- 다른 사용자와 공유하지 않음
- Google OAuth access token을 북마클릿에 전달하지 않음

## 4. POST 파라미터

### init

```text
mode=init
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
```

응답 핵심:

```js
{
  type:'YT_GAS_RESPONSE',
  token,
  requestId,
  result:{
    ok:true,
    data:{bridgeNonce,version}
  }
}
```

### request

```text
mode=request
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
bridgeNonce=<init에서 받은 nonce>
request=<JSON 문자열>
```

`request` 형식:

```js
{action:'ping',payload:{}}
```

## 5. 허용 action

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

## 6. 파일 책임

```text
apps-script/Transport.gs
→ doPost
→ bridge nonce
→ iframe 응답/postMessage

apps-script/Code.gs
→ dispatch
→ SpreadsheetApp
→ 파일/시트/카테고리/레코드 처리
```

## 7. 개인 Sheets 연결

개인 Sheets URL은 공용 코드의 상수가 아닙니다.

```text
설정 UI에서 사용자가 Sheets URL 입력
→ connect-file payload로 1회 전달
→ Apps Script가 Spreadsheet ID 추출/검증
→ 사용자별 UserProperties에 연결 파일 ID/이름 저장
```

공용 북마클릿의 `GAS_WEBAPP_URL`과 사용자 개인 `sheetUrl`은 서로 다른 값입니다.
