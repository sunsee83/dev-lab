# YouTube 수집도구

Android 모바일 YouTube용 통합 북마클릿 프로젝트입니다.

## 구조

```text
북마클릿 1개
├─ 영상
├─ 음성
└─ 데이터
```

- YouTube 전용 핵심 추출: 북마클릿 내부
- UI/일반 로직: GitHub
- Google Sheets: Apps Script + `SpreadsheetApp`
- 비밀번호/API 키/OAuth token/쿠키 저장 금지

## 완료

- 영상+음성 통합 MP4 로컬 저장
- Shorts 로컬 저장
- 음성 로컬 저장
- 데이터 추출 규격
- 원문/TXT/JSON 로컬 저장
- Apps Script Sheets 연결 코드
- 여러 Sheets 파일 연결
- 안내 1 + 데이터 시트 최대 10
- 시트당 2,000개 / 1,800개 경고
- 썸네일 첫 열, 제목/채널 링크
- 영상 ID 중복 확인
- 읽기/쓰기 보존 규칙

## Google Sheets 구조

```text
북마클릿
→ Apps Script 웹앱
→ SpreadsheetApp
→ 사용자가 연결한 Sheets
```

파일:

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

데이터 시트:

```text
가로 = 항목(열)
세로 = 영상(행)
한 영상 = 한 행
```

## 기준 파일

- `ui.html` : 통합 UI
- `PROTOCOL.md` : 북마클릿 ↔ UI
- `APPS_SCRIPT_BRIDGE.md` : UI ↔ Apps Script
- `apps-script/Code.gs` : Apps Script 실제 코드
- `SHEET_RULES.md` : Sheets 저장 규칙
- `GOOGLE_SETUP_FLOW.md` : Google 연결 구조

## 다음 순서

1. Apps Script에 `Code.gs` 붙여넣기
2. 웹앱 배포 (`웹앱에 액세스하는 사용자`)
3. 배포 URL을 수집도구에 연결
4. 모바일에서 파일 연결 1회 테스트
5. 데이터 → Sheets 실제 저장 통합
6. 전체 테스트 후 북마클릿 축약

영상/음성 Google Save to Drive 1차 경로는 별도로 유지하며 모바일 검증이 남아 있습니다.
