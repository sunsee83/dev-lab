# Google Sheets 연결 구조

이 문서는 **독립형 Apps Script 웹앱이 사용자별 Google Sheets 저장공간을 어떻게 만들고 연결하는지** 정의합니다.

## 1. 공용 Apps Script

Apps Script 프로젝트는 특정 Sheets 파일에 붙이지 않는 독립형 프로젝트입니다.

```text
독립형 Apps Script 프로젝트
유튜브다운로드 v1
├─ Transport.gs
└─ Code.gs
```

공용 웹앱 URL:

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

이 URL은 모바일 북마클릿 내부 `GAS_WEBAPP_URL`에 들어갑니다.

## 2. 최초 설정: 자동 생성

사용자는 Google Sheets를 미리 만들 필요가 없습니다.

```text
첫 실행
→ Google 계정 승인
→ get-state
→ 연결 파일이 없으면 create-storage
→ SpreadsheetApp.create('YouTube 수집')
→ 첫 데이터 시트를 '수집'으로 구성
→ '안내' 시트 생성 및 첫 탭 배치
→ 기본 카테고리 '기본' 등록
→ 생성된 Spreadsheet ID/이름을 사용자별 UserProperties에 저장
→ 이후 자동 재연결
```

기본값:

```text
파일명      YouTube 수집
데이터 시트 수집
카테고리    기본
```

## 3. 이후 실행

```text
get-state
→ UserProperties의 연결 파일 확인
→ defaultFileId로 SpreadsheetApp.openById(...)
→ 저장 계속
```

같은 사용자는 매번 Sheets 링크를 다시 입력하지 않습니다.

## 4. 기존 Sheets 추가 연결

자동 생성된 기본 파일 외에 기존 Google Sheets를 추가하고 싶은 경우에만 사용합니다.

```text
기존 Sheets URL 입력
→ connect-file
→ Spreadsheet ID 확인
→ 현재 사용자에게 접근 권한이 있는지 확인
→ 사용자별 연결 파일 목록에 추가
```

연결 파일은 최대 10개입니다.

## 5. 사용자별 분리

```text
사용자 A
→ A 계정에 자동 생성된 YouTube 수집
→ A의 UserProperties

사용자 B
→ B 계정에 자동 생성된 YouTube 수집
→ B의 UserProperties
```

같은 북마클릿과 같은 Apps Script 웹앱을 사용해도 데이터 파일과 연결 목록은 사용자별로 분리됩니다.

## 6. 전체 경로

```text
모바일 북마클릿
→ 독립형 Apps Script 웹앱
→ create-storage 또는 기존 연결 복원
→ SpreadsheetApp
→ 현재 사용자의 Google Sheets
```

- 웹앱 실행: `웹 앱에 액세스하는 사용자`
- 각 사용자가 자기 Google 계정으로 승인
- `DriveApp`, Google Picker, 브라우저 직접 Sheets/Drive REST API 사용 안 함
- API key/access token을 북마클릿에 저장하지 않음

## 7. 연결된 파일 구조

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

- 시트당 기록 최대 2,000개
- 1,800개부터 한도 경고
- 2,000개부터 신규 추가 차단
- 기존 레코드 수정 허용

세부 저장 규칙은 `SHEET_RULES.md`, Apps Script 브리지는 `APPS_SCRIPT_BRIDGE.md`를 기준으로 합니다.
