# Apps Script 브리지

이 문서는 **모바일 북마클릿 코어 ↔ 독립형 Apps Script 웹앱** 통신 규격을 정의합니다.

## 1. 이름 체계

```text
모바일 북마클릿 이름  유튜브다운로드
Apps Script 프로젝트  유튜브다운로드앱_v1
Google Sheets 파일     유튜브다운로드sheet_v1
```

## 2. Apps Script 위치

최종 Apps Script는 특정 Google Sheets에 붙어 있는 바인딩 스크립트가 아니라 **독립형 프로젝트**입니다.

```text
독립형 Apps Script 프로젝트
유튜브다운로드앱_v1
├─ Transport.gs
└─ Code.gs
```

## 3. 모바일 북마크의 공용 엔드포인트

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

이 값은 `bookmarklet.js` 내부 `GAS_WEBAPP_URL`에 들어갑니다.

## 4. 전송 구조

```text
YouTube 페이지의 유튜브다운로드 북마클릿
→ 숨은 iframe
→ form POST
→ Transport.gs / doPost(e)
→ bridgeDispatch_
   ├─ create-storage : 최초 저장공간 자동 생성
   └─ 그 외 action : Code.gs / dispatch(...)
→ HTML 응답
→ window.top.postMessage(...)
→ YouTube 페이지의 북마클릿이 결과 수신
```

실제 데이터 요청에는 `window.opener`를 사용하지 않습니다.

## 5. Google 권한 승인

처음 사용하는 Google 계정은 `유튜브다운로드앱_v1`에 대해 권한 승인을 한 번 진행합니다.

승인 후 실제 호출은 숨은 iframe + POST를 사용합니다.

## 6. 브리지 세션

```text
init
→ 사용자별 bridgeNonce 발급

request
→ bridgeNonce 검증
→ action 실행
```

- nonce 저장: `PropertiesService.getUserProperties()`
- 유효시간: 10분
- 사용자별 분리
- OAuth access/refresh token을 북마클릿에 전달하지 않음

## 7. POST 형식

### init

```text
mode=init
origin=<현재 YouTube origin>
token=<실행 token>
requestId=<요청 ID>
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

예:

```js
{action:'create-storage',payload:{}}
{action:'list-sheets',payload:{fileId}}
```

응답 연결 기준:

```text
YT_GAS_RESPONSE
token 일치
requestId 일치
```

## 8. 최초 저장공간 자동 생성

연결 파일이 없는 사용자는 `create-storage`를 호출합니다.

```text
create-storage
→ SpreadsheetApp.create('유튜브다운로드sheet_v1')
→ 첫 시트 이름을 '수집'으로 변경
→ 데이터 시트 형식 적용
→ '안내' 시트 생성
→ 기본 카테고리 '기본' 등록
→ 생성 파일을 사용자별 UserProperties에 연결
```

사용자는 최초 설정에서 Google Sheets URL을 입력하지 않습니다.

## 9. action

```text
create-storage     최초 기본 Sheets 자동 생성
ping               연결 확인
get-state          사용자 연결 상태
connect-file       기존 Sheets 추가 연결
unlink-file        연결 해제
list-sheets        데이터 시트 조회
create-sheet       데이터 시트 생성
list-categories    카테고리 조회
add-category       카테고리 추가
check-duplicate    영상 ID 중복 확인
save-record        데이터 저장/업데이트
```

`create-storage`는 최초 생성 진입을 위해 `Transport.gs`에서 처리하며 기존 Sheets 처리는 `Code.gs`의 action을 사용합니다.

## 10. 이후 실행

```text
get-state
→ 연결 파일 있음
→ defaultFileId
→ list-sheets
→ list-categories
→ 저장 계속
```

기존 Sheets 추가 연결이 필요한 경우에만 `connect-file {sheetUrl}`을 사용합니다.

## 11. 파일 책임

```text
apps-script/Transport.gs
→ iframe POST
→ nonce
→ create-storage 최초 생성 진입
→ 응답 postMessage

apps-script/Code.gs
→ 기존/연결된 Sheets 처리
→ SpreadsheetApp.openById
→ 시트/카테고리/레코드
```
