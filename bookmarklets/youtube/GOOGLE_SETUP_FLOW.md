# Google Sheets 연결

## 구조

```text
북마클릿
→ Apps Script 웹앱
→ SpreadsheetApp
→ 사용자가 연결한 Google Sheets
```

- 웹앱 실행: `웹앱에 액세스하는 사용자`
- 각 사용자가 자기 Google 계정으로 승인
- `DriveApp`, Picker, 브라우저 직접 Drive/Sheets API 사용 안 함
- API 키/access token을 북마클릿에 저장하지 않음
- Sheets 링크에서 파일 ID 자동 인식
- 연결 파일 최대 10개, 목록은 사용자별 `UserProperties`

## 파일 구조

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

- 시트당 기록 최대 2,000개
- 1,800개부터 새 시트 권장
- 2,000개부터 신규 추가 차단, 기존 수정 허용

## 데이터 시트

- 가로: 항목(열)
- 세로: 영상(행)
- 한 영상 = 한 행
- 썸네일 첫 열
- 제목/채널명 클릭 링크
- 영상 ID로 중복 확인

세부 저장 규칙은 `SHEET_RULES.md`, 실제 코드는 `apps-script/Code.gs`를 기준으로 합니다.
