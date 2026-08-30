# Google Sheets 연결 구조

이 문서는 **독립형 Apps Script 웹앱과 사용자별 Google Sheets가 어떻게 연결되는지** 정의합니다.

## 1. 공용 Apps Script

Apps Script 프로젝트는 특정 Sheets 파일 안에서 만든 바인딩 스크립트가 아니라 **독립형 프로젝트**를 기준으로 합니다.

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

이 URL의 배치 위치:

```text
Android 모바일 북마크
→ URL 칸의 javascript: 코드
→ GAS_WEBAPP_URL 상수
```

## 2. 사용자별 Sheets 연결

개인 Sheets URL은 공용 코드에 고정하지 않습니다.

```text
사용자 A
→ 설정 UI에 A의 Sheets URL 입력
→ connect-file
→ A의 UserProperties에 연결 파일 정보 저장

사용자 B
→ 설정 UI에 B의 Sheets URL 입력
→ connect-file
→ B의 UserProperties에 연결 파일 정보 저장
```

Google Sheets는 Apps Script 프로젝트의 부모 파일이 아니라 **사용자가 선택하는 데이터 저장 대상**입니다.

## 3. 전체 경로

```text
모바일 북마클릿의 GAS_WEBAPP_URL
→ 독립형 Apps Script 웹앱
→ Transport.gs
→ Code.gs
→ SpreadsheetApp.openById(...)
→ 현재 사용자가 연결한 Google Sheets
```

- 웹앱 실행: `웹 앱에 액세스하는 사용자`
- 각 사용자가 자기 Google 계정으로 승인
- `DriveApp`, Google Picker, 브라우저 직접 Sheets/Drive REST API 사용 안 함
- API key/access token을 북마클릿에 저장하지 않음
- Sheets 링크에서 Spreadsheet ID 추출
- 연결 파일 최대 10개
- 연결 목록은 사용자별 `UserProperties`

## 4. Apps Script와 Sheets의 관계

```text
잘못된 최종 구조
Google Sheets
└─ Apps Script

최종 구조
독립형 Apps Script
└─ 사용자가 연결한 Google Sheets를 필요할 때 열기
```

따라서 사용자가 데이터용 Sheets를 바꾸거나 추가해도 공용 Apps Script 프로젝트 자체는 바뀌지 않습니다.

## 5. 파일 구조

연결된 각 Google Sheets:

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

- 시트당 기록 최대 2,000개
- 1,800개부터 한도 경고
- 2,000개부터 신규 추가 차단
- 기존 레코드 수정 허용

## 6. 데이터 시트

- 가로: 항목(열)
- 세로: 영상(행)
- 한 영상 = 한 행
- 썸네일 첫 열
- 제목/채널명 클릭 링크
- 영상 ID로 중복 확인

세부 저장 규칙은 `SHEET_RULES.md`, Apps Script 브리지는 `APPS_SCRIPT_BRIDGE.md`, 실제 Sheets 처리는 `apps-script/Code.gs`를 기준으로 합니다.
