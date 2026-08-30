# YouTube 수집도구

Android 모바일 YouTube용 **단일 북마클릿** 프로젝트입니다.

이 문서는 진행 기록이 아니라 **현재 구조의 기준 문서**입니다. 과거 실패/수정 순서는 문서에 누적하지 않습니다.

## 1. 전체 구조

```text
모바일 북마크의 북마클릿 JavaScript
├─ YouTube 영상/음성/데이터 추출 코어
├─ 공개 UI 호출
└─ Apps Script 웹앱 호출
        ↓
   Apps Script
   ├─ Transport.gs : 모바일 iframe POST 브리지
   └─ Code.gs      : SpreadsheetApp 처리
        ↓
   사용자가 연결한 Google Sheets
```

## 2. 모바일 북마크에 들어가는 고정 값

Apps Script 웹앱 `/exec` URL은 **모바일 북마크에 저장되는 북마클릿 JavaScript 내부 상수**로 들어갑니다.

```text
GAS_WEBAPP_URL =
https://script.google.com/macros/s/AKfycbxNvYE5AxCJ_9yNI_mS1GKOrRMBX6Qy3_u9CkUvNyiyOM0aof_CNaUDa0lEGHDFCdsa/exec
```

이 주소는 공용 앱의 엔드포인트입니다.

- 사용자 개인 Google Sheets 주소가 아님
- 사용자별 값이 아님
- 새 웹앱 배포를 만들지 않는 한 같은 `/exec` 주소 유지

## 3. 개인 Google Sheets 주소가 들어가는 위치

개인 Sheets URL은 북마클릿 코드나 `Code.gs`에 고정하지 않습니다.

```text
YouTube 수집도구 설정 UI
→ 사용자가 자기 Sheets URL 입력
→ connect-file
→ Apps Script가 Spreadsheet ID 확인
→ 해당 사용자의 UserProperties에 파일 ID/이름 저장
```

따라서 같은 모바일 북마클릿을 여러 사용자가 사용해도 각자 자기 Sheets만 연결합니다.

## 4. 저장 경로

```text
데이터
YouTube 북마클릿
→ GAS_WEBAPP_URL
→ Transport.gs
→ Code.gs
→ SpreadsheetApp
→ 사용자가 연결한 Sheets
```

```text
영상/음성 로컬
YouTube 북마클릿
→ 미디어 fetch
→ Android 파일 저장
```

영상/음성 Drive 저장은 Google 공식 Save to Drive 경로를 사용합니다.

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
- `GOOGLE_SETUP_FLOW.md` : 사용자별 Sheets 연결 구조
- `SHEET_RULES.md` : Sheets 데이터 저장 규칙
- `ui.html` : 통합 UI
- `apps-script/Transport.gs` : iframe POST 브리지
- `apps-script/Code.gs` : SpreadsheetApp 처리

## 7. 문서 관리 원칙

- 문서는 **현재 확정 구조만** 기록합니다.
- `현재`, `다음`, `실패했던 방식`, 임시 테스트 순서는 기준 문서에 누적하지 않습니다.
- 같은 사실은 한 기준 문서에서 정의하고 다른 문서에서는 링크/책임만 명시합니다.
- 실제 비밀값, OAuth 토큰, 쿠키, 실행 중 미디어 URL은 저장소에 기록하지 않습니다.
