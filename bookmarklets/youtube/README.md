# 유튜브다운로드

Android 모바일 YouTube용 **단일 북마클릿** 프로젝트입니다. 이 문서는 진행 기록이 아니라 현재 구조의 기준입니다.

## 1. 이름 체계

```text
모바일 북마클릿 이름  유튜브다운로드
Apps Script 프로젝트  유튜브다운로드앱_v1
Google Sheets 파일     유튜브다운로드sheet_v1
```

세 이름은 서로 다른 대상을 뜻하며 섞어 쓰지 않습니다.

## 2. 최종 실행 구조

```text
Android 모바일 북마크
유튜브다운로드
└─ URL = bookmarklet.js 전체 내용
   ↓
YouTube 페이지에서 북마클릿 실행
   ├─ youtubei/player로 영상 정보·미디어 후보 준비
   ├─ 숨은 iframe + POST로 Apps Script 통신
   └─ get-ui로 Apps Script의 ui.html 원본 수신
          ↓
      ui.html을 iframe.srcdoc으로 YouTube 페이지 안에 표시
          ↓
      사용자가 영상 / 음성 / 데이터 / 저장 위치 선택
```

`srcdoc` UI를 쓰는 이유는 북마클릿 URL에 20KB 이상의 UI 전체를 넣지 않으면서도, UI를 YouTube 페이지 컨텍스트에서 실행하기 위해서입니다.

## 3. Apps Script 구조

특정 Google Sheets에 붙지 않는 독립형 프로젝트입니다.

```text
유튜브다운로드앱_v1
├─ Code.gs       SpreadsheetApp / 데이터 처리
├─ Transport.gs  iframe POST / nonce / get-ui / create-storage
└─ ui.html       통합 사용자 화면
```

공용 웹앱 주소는 `bookmarklet.js` 안에 고정됩니다.

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

## 4. 최초 사용자 저장공간

사용자는 Google Sheets를 미리 만들거나 링크를 붙여넣지 않습니다.

```text
get-state
→ 연결 파일 없음
→ create-storage
→ Google Sheets 자동 생성: 유튜브다운로드sheet_v1
→ 안내 시트 생성
→ 데이터 시트 생성: 수집
→ 기본 카테고리 생성: 기본
→ 사용자별 UserProperties에 파일 연결 정보 저장
```

기존 Sheets를 추가로 사용하고 싶을 때만 `connect-file`을 사용합니다.

## 5. 저장 경로

```text
데이터 + Drive
북마클릿 → Apps Script → SpreadsheetApp → 선택한 파일 → 시트 → 카테고리

영상/음성 + 로컬
북마클릿 → googlevideo 직접 URL → Android 파일 저장

데이터 + 로컬
북마클릿 → 선택 데이터 추출 → TXT/JSON/원문 파일 저장

영상/음성 + Drive
북마클릿 → UI → Google Save to Drive 버튼
```

## 6. 기본 Sheets 구조

```text
파일     유튜브다운로드sheet_v1
1번 탭   안내
2번 탭   수집
카테고리 기본
```

- 연결 파일 최대 10개
- 데이터 시트 최대 10개
- 시트당 최대 2,000개
- 1,800개부터 한도 경고
- 한 영상 = 한 행
- 영상 ID로 중복 확인

## 7. 기준 파일

- `bookmarklet.js` : 모바일 북마크 URL에 복사하는 실제 실행 코드
- `ui.html` : 통합 UI 원본. Apps Script 프로젝트에도 같은 이름의 HTML 파일로 복사
- `apps-script/Transport.gs` : POST 브리지, `get-ui`, 최초 Sheets 자동 생성
- `apps-script/Code.gs` : Sheets 데이터 구조와 저장 처리
- `CORE_SPEC.md` : 북마클릿 코어 책임
- `APPS_SCRIPT_BRIDGE.md` : Apps Script 통신 규격
- `PROTOCOL.md` : UI ↔ 코어 메시지 규격
- `UI_SPEC.md` : 화면 구조와 표시 규칙
- `SHEET_RULES.md` : Sheets 저장 규칙
- `GOOGLE_SETUP_FLOW.md` : 사용자별 Google 저장공간 구성

## 8. 문서 관리 원칙

- 현재 확정 구조만 기록합니다.
- 실패 이력과 임시 테스트 코드를 기준 문서에 누적하지 않습니다.
- 같은 사실은 한 기준 문서에서 정의하고 다른 문서에서는 연결만 합니다.
- OAuth 토큰, 쿠키, 실행 중 미디어 URL은 저장소에 기록하지 않습니다.
