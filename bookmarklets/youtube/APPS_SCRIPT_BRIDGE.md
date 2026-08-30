# Apps Script 브리지

이 문서는 **모바일 북마클릿 코어 ↔ Apps Script 웹앱 통신 규격**만 정의합니다.

## 1. 고정 엔드포인트

Apps Script 웹앱 주소:

```text
https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec
```

정확한 배치 위치:

```text
Android 모바일 브라우저 북마크
→ URL 칸의 javascript: 북마클릿
→ 북마클릿 JavaScript 내부 GAS_WEBAPP_URL 상수
```

```js
const GAS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec';
```

이 값은 공용 Apps Script 엔드포인트입니다. 개인 Google Sheets URL은 이 상수에 넣지 않습니다.

## 2. 전송 구조

```text
YouTube 페이지의 북마클릿 코어
→ 숨은 iframe 생성
→ form POST를 GAS_WEBAPP_URL로 전송
→ Transport.gs / doPost(e)
→ Apps Script 처리
→ iframe HTML 응답
→ window.top.postMessage(...)
→ YouTube 페이지의 북마클릿 코어가 결과 수신
```

브리지 데이터 요청에는 `window.opener`를 사용하지 않습니다.

## 3. Google 권한 승인

처음 사용하는 계정은 Apps Script 권한 승인이 필요합니다.

설정 UI의 `Google 계정으로 계속` 동작은 북마클릿 코어가 `GAS_WEBAPP_URL`을 일반 창으로 한 번 열어 Google 승인 화면을 진행하게 합니다.

승인 후 실제 데이터 요청은 다시 **숨은 iframe + POST** 경로를 사용합니다.

## 4. 브리지 세션

각 북마클릿 실행마다 임의 `token`을 생성합니다.

Apps Script 호출은 2단계입니다.

```text
init
→ 사용자별 임시 bridgeNonce 발급

request
→ bridgeNonce 검증
→ 실제 GAS action 실행
```

- nonce 저장: `PropertiesService.getUserProperties()`
- 유효시간: 10분
- 사용자별 분리
- OAuth access/refresh token을 북마클릿에 전달하지 않음

## 5. 북마클릿 코어의 브리지 인터페이스

코어에서는 Apps Script 호출을 다음 인터페이스 하나로 감쌉니다.

```js
await gas.call(action,payload)
```

동작 원칙:

```text
gas.call(...)
├─ 아직 nonce 없음 → init 먼저 실행
├─ request POST
├─ token + requestId + iframe source가 맞는 응답만 수신
├─ BRIDGE_EXPIRED → init 1회 재실행 후 요청 재시도
└─ 20초 응답 없음 → 오류
```

브리지 iframe은 화면에 표시하지 않고 한 번 생성하여 현재 북마클릿 실행 동안 재사용합니다.

## 6. POST 형식

### init

```text
mode=init
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
```

응답:

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

`request` 예:

```js
{action:'list-sheets',payload:{fileId}}
```

## 7. 허용 action

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

## 8. UI action과 GAS action 연결

```text
Google 계정으로 계속
→ GAS_WEBAPP_URL 일반 창 열기

파일 연결
→ connect-file {sheetUrl}

파일 선택
→ list-sheets {fileId}

시트 선택
→ list-categories {fileId,sheetName}

새 시트
→ create-sheet {fileId,sheetName}
→ 성공 후 list-sheets 갱신

새 카테고리
→ add-category {fileId,sheetName,category}

데이터 저장
→ save-record
```

## 9. 초기 실행 시 상태 복원

북마클릿 코어는 UI를 열 때 다음 순서로 상태를 구성합니다.

```text
get-state
→ 연결 파일 목록 확인
→ defaultFileId 또는 첫 파일 선택
→ list-sheets
→ 첫 selectable 데이터 시트 선택
→ list-categories
→ YT_TOOL_INIT으로 UI 전달
```

연결 파일이 없으면 설정 화면을 표시합니다.

## 10. 개인 Sheets 연결

개인 Sheets URL은 공용 코드 상수가 아닙니다.

```text
설정 UI에서 사용자가 자기 Sheets URL 입력
→ connect-file payload
→ Apps Script가 Spreadsheet ID 추출/검증
→ 사용자별 UserProperties에 파일 ID/이름 저장
```

공용 `GAS_WEBAPP_URL`과 사용자 개인 `sheetUrl`은 완전히 다른 값입니다.

## 11. 서버 파일 책임

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
