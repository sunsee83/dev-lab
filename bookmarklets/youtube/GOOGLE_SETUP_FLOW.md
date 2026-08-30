# Google Sheets 연결 구조

이 문서는 **공용 Apps Script 웹앱과 사용자별 Google Sheets가 어떻게 연결되는지** 정의합니다.

## 1. 공용 엔드포인트

Apps Script 웹앱 URL:

```text
https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec
```

이 URL은 사용자별 설정값이 아니라 **모바일 북마클릿 JavaScript 내부에 들어가는 공용 고정 값**입니다.

```text
모바일 북마크 URL
→ javascript: 북마클릿 코드
→ GAS_WEBAPP_URL
```

## 2. 사용자별 Sheets 연결

개인 Sheets URL은 공용 코드에 넣지 않습니다.

```text
사용자 A
→ 설정 UI에 A의 Sheets URL 입력
→ connect-file
→ A의 UserProperties에 파일 ID/이름 저장

사용자 B
→ 설정 UI에 B의 Sheets URL 입력
→ connect-file
→ B의 UserProperties에 파일 ID/이름 저장
```

같은 북마클릿과 같은 Apps Script 웹앱을 사용해도 연결 파일 목록은 사용자별로 분리됩니다.

## 3. 전체 구조

```text
모바일 북마클릿의 GAS_WEBAPP_URL
→ Apps Script 웹앱
→ Transport.gs
→ Code.gs
→ SpreadsheetApp
→ 현재 사용자가 연결한 Google Sheets
```

- 웹앱 실행: `웹 앱에 액세스하는 사용자`
- 각 사용자가 자기 Google 계정으로 승인
- `DriveApp`, Google Picker, 브라우저 직접 Sheets/Drive REST API 사용 안 함
- API key/access token을 북마클릿에 저장하지 않음
- Sheets 링크에서 Spreadsheet ID 추출
- 연결 파일 최대 10개
- 연결 목록은 사용자별 `UserProperties`

## 4. 파일 구조

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

- 시트당 기록 최대 2,000개
- 1,800개부터 한도 경고
- 2,000개부터 신규 추가 차단
- 기존 레코드 수정은 허용

## 5. 데이터 시트

- 가로 = 항목(열)
- 세로 = 영상(행)
- 한 영상 = 한 행
- 썸네일 첫 열
- 제목/채널명 클릭 링크
- 영상 ID로 중복 확인

세부 저장 규칙은 `SHEET_RULES.md`, Apps Script 브리지는 `APPS_SCRIPT_BRIDGE.md`, 실제 Sheets 처리는 `apps-script/Code.gs`를 기준으로 합니다.
