# YouTube 수집도구

Android 모바일 YouTube용 **단일 북마클릿** 프로젝트입니다.

이 문서는 진행 기록이 아니라 **현재 구조의 기준 문서**입니다.

## 1. 전체 구조

```text
Android 모바일 북마크
└─ javascript: 북마클릿
   ├─ YouTube 영상/음성/데이터 추출 코어
   ├─ 통합 UI
   └─ GAS_WEBAPP_URL 호출
          ↓
      독립형 Apps Script 프로젝트
      유튜브다운로드 v1
      ├─ Transport.gs : 모바일 iframe POST 브리지
      └─ Code.gs      : SpreadsheetApp 처리
          ↓
      각 사용자가 연결한 Google Sheets
```

Apps Script 프로젝트는 **특정 Google Sheets에 바인딩하지 않는 독립형 프로젝트**를 기준으로 합니다.

Google Sheets는 프로그램의 부모 파일이 아니라 사용자가 연결하는 **데이터 저장 대상**입니다.

## 2. 모바일 북마크에 들어가는 공용 주소

Apps Script 웹앱 `/exec` URL은 모바일 북마크의 `javascript:` 코드 내부 `GAS_WEBAPP_URL` 상수에 들어갑니다.

```text
GAS_WEBAPP_URL =
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

- 공용 Apps Script 웹앱 주소
- 개인 Google Sheets 주소가 아님
- 사용자별 값이 아님
- 같은 배포를 새 버전으로 갱신하는 동안 `/exec` 주소 유지

## 3. 개인 Google Sheets 주소가 들어가는 위치

개인 Sheets URL은 북마클릿이나 `Code.gs`에 고정하지 않습니다.

```text
YouTube 수집도구 설정 UI
→ 사용자가 자기 Sheets URL 입력
→ connect-file
→ Apps Script가 Spreadsheet ID 확인
→ 그 사용자의 UserProperties에 연결 파일 정보 저장
```

같은 북마클릿과 같은 Apps Script 웹앱을 여러 사용자가 사용해도 각자의 연결 파일 목록은 분리됩니다.

## 4. 데이터 저장 경로

```text
YouTube 북마클릿
→ GAS_WEBAPP_URL
→ 독립형 Apps Script
→ Transport.gs
→ Code.gs
→ SpreadsheetApp
→ 사용자가 연결한 Google Sheets
```

영상/음성 로컬 저장:

```text
YouTube 북마클릿
→ 미디어 fetch
→ Android 파일 저장
```

영상/음성 Drive 저장은 Google 공식 Save to Drive 경로를 별도로 사용합니다.

## 5. Sheets 구조

```text
1번 탭   안내
2~11번   데이터 시트 최대 10개
```

- 가로 = 항목(열)
- 세로 = 영상(행)
- 한 영상 = 한 행
- 연결 파일 최대 10개
- 데이터 시트당 최대 2,000개
- 1,800개부터 한도 경고

## 6. 기준 파일과 책임

- `README.md` : 전체 구조와 값의 배치 위치
- `CORE_SPEC.md` : 모바일 북마클릿 코어 책임
- `PROTOCOL.md` : 북마클릿 ↔ UI 메시지 규격
- `APPS_SCRIPT_BRIDGE.md` : 북마클릿 ↔ Apps Script 통신 규격
- `GOOGLE_SETUP_FLOW.md` : 독립형 Apps Script와 사용자별 Sheets 연결 구조
- `SHEET_RULES.md` : Sheets 데이터 저장 규칙
- `ui.html` : 통합 UI
- `apps-script/Transport.gs` : iframe POST 브리지
- `apps-script/Code.gs` : SpreadsheetApp 처리

## 7. 문서 관리 원칙

- 문서는 **현재 확정 구조만** 기록합니다.
- 실패 이력, 임시 테스트 순서, `현재/다음` 작업 로그를 기준 문서에 누적하지 않습니다.
- 같은 사실은 한 기준 문서에서 정의하고 다른 문서에서는 책임만 연결합니다.
- 실제 비밀값, OAuth 토큰, 쿠키, 실행 중 미디어 URL은 저장소에 기록하지 않습니다.
