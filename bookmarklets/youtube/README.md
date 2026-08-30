# 유튜브다운로드

Android 모바일 YouTube용 **단일 북마클릿** 프로젝트입니다. 이 문서는 현재 구조의 기준입니다.

## 1. 이름 체계

```text
모바일 북마클릿 이름  유튜브다운로드
Apps Script 프로젝트  유튜브다운로드앱_v1
Google Sheets 파일     유튜브다운로드sheet_v1
```

## 2. 최종 실행 구조

```text
Android 모바일 북마크
유튜브다운로드
└─ URL = bookmarklet.js
      ↓
YouTube 페이지
└─ bookmarklet.js
   ├─ Apps Script POST 브리지 생성
   ├─ get-ui 호출
   ├─ 받은 ui.html로 Blob URL 생성
   └─ Blob URL을 iframe.src로 표시
          ↓
      ui.html
      ├─ 통합 화면
      ├─ youtubei/player 추출
      ├─ 영상/음성 로컬 저장
      ├─ 데이터 수집/로컬 출력
      ├─ Apps Script Sheets action 호출
      └─ Drive 저장 UI
```

YouTube가 `iframe.srcdoc`에 TrustedHTML을 요구하므로 `srcdoc`은 사용하지 않습니다. Apps Script에서 받은 HTML을 Blob URL로 만든 뒤 iframe의 `src`로 표시합니다.

현재 `bookmarklet.js`는 약 2KB 규모이며 UI 전체를 북마크 URL에 넣지 않습니다.

## 3. Apps Script 구조

Google Sheets에 바인딩하지 않는 독립형 프로젝트입니다.

```text
유튜브다운로드앱_v1
├─ Code.gs       SpreadsheetApp / 데이터 처리
├─ Transport.gs  POST 브리지 / nonce / get-ui / create-storage
└─ ui.html       UI + YouTube 추출 + 저장 코어
```

공용 웹앱 주소:

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

이 주소는 `bookmarklet.js`에만 고정하며 개인 Sheets 주소가 아닙니다.

## 4. 최초 사용자 저장공간

```text
ui.html 시작
→ create-storage
→ 기존 연결이 있으면 재사용
→ 없으면 유튜브다운로드sheet_v1 자동 생성
→ 안내 시트
→ 수집 시트
→ 기본 카테고리
→ UserProperties에 사용자별 연결 저장
```

사용자는 최초 설정에서 Google Sheets를 직접 만들거나 주소를 입력하지 않습니다.

## 5. 저장 경로

```text
데이터 + Drive
ui.html → Apps Script → SpreadsheetApp → 파일 → 시트 → 카테고리

영상/음성 + 로컬
ui.html → googlevideo 직접 URL → Android 파일 저장

데이터 + 로컬
ui.html → 선택 데이터 → 원문/TXT/JSON 파일

영상/음성 + Drive
ui.html → Google Save to Drive 영역
```

## 6. 기본 Sheets

```text
유튜브다운로드sheet_v1
├─ 안내
└─ 수집
   └─ 기본
```

- 연결 파일 최대 10개
- 데이터 시트 최대 10개
- 시트당 최대 2,000개
- 1,800개부터 한도 경고
- 영상 ID 기준 중복 확인

## 7. 기준 파일 책임

- `bookmarklet.js` : 모바일 북마크 URL용 짧은 Apps Script/UI 로더
- `ui.html` : 통합 UI + YouTube 추출 + 로컬/Drive 저장 코어
- `apps-script/Transport.gs` : POST 브리지, nonce, `get-ui`, `create-storage`
- `apps-script/Code.gs` : Sheets 구조와 데이터 저장
- `APPS_SCRIPT_BRIDGE.md` : 북마클릿 ↔ Apps Script 규격
- `CORE_SPEC.md` : 실행 코어의 실제 배치와 책임
- `UI_SPEC.md` : 화면 규격
- `SHEET_RULES.md` : Sheets 저장 규칙
- `GOOGLE_SETUP_FLOW.md` : 사용자별 Google 저장공간

## 8. 문서 원칙

현재 확정 구조만 기록하며 실패 이력과 임시 테스트 코드는 기준 문서에 누적하지 않습니다.
