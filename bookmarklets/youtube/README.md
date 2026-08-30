# 유튜브다운로드

Android 모바일 YouTube용 **단일 북마클릿** 프로젝트입니다.

이 문서는 진행 기록이 아니라 **현재 구조의 기준 문서**입니다.

## 1. 이름 체계

```text
모바일 북마클릿 이름  유튜브다운로드
Apps Script 프로젝트  유튜브다운로드앱_v1
Google Sheets 파일     유튜브다운로드sheet_v1
```

이 세 이름은 서로 다른 대상을 뜻하며 섞어 쓰지 않습니다.

## 2. 전체 구조

```text
Android 모바일 북마크
유튜브다운로드
└─ URL 칸에 bookmarklet.js 전체 내용
   ├─ YouTube 영상/음성/데이터 추출 코어
   ├─ 통합 UI
   └─ GAS_WEBAPP_URL 호출
          ↓
      독립형 Apps Script 프로젝트
      유튜브다운로드앱_v1
      ├─ Transport.gs : 모바일 iframe POST 브리지
      └─ Code.gs      : SpreadsheetApp 처리
          ↓
      각 사용자 계정의 Google Sheets
      유튜브다운로드sheet_v1
```

Apps Script 프로젝트는 특정 Google Sheets에 붙이지 않는 **독립형 프로젝트**입니다.

## 3. 모바일 북마크에 들어가는 공용 주소

Apps Script 웹앱 `/exec` URL은 `bookmarklet.js` 내부 `GAS_WEBAPP_URL` 값입니다.

```text
https://script.google.com/macros/s/AKfycbxj-jUt6mYeQMKqIR5d0hloyP7NqbBlZUwjbmctPovwxmApqWuius0WGpdsn21aMuOx/exec
```

이 주소는 `유튜브다운로드앱_v1`의 공용 웹앱 주소이며 개인 Google Sheets 주소가 아닙니다.

## 4. 최초 설정은 자동 생성

사용자는 Google Sheets를 미리 만들거나 링크를 붙여넣을 필요가 없습니다.

```text
첫 실행
→ Google 계정 승인
→ 연결된 저장공간이 없으면 create-storage
→ 사용자 계정에 Google Sheets 파일 자동 생성
   파일명: 유튜브다운로드sheet_v1
→ 안내 시트 자동 생성
→ 데이터 시트 자동 생성
   시트명: 수집
→ 기본 카테고리 자동 생성
   카테고리: 기본
→ 생성한 파일 ID를 그 사용자의 UserProperties에 자동 등록
→ 바로 저장 가능
```

기존 Google Sheets를 추가로 쓰고 싶은 경우에만 `connect-file`로 별도 파일을 연결합니다.

## 5. 데이터 저장 경로

```text
유튜브다운로드 북마클릿
→ GAS_WEBAPP_URL
→ 유튜브다운로드앱_v1
→ SpreadsheetApp
→ 유튜브다운로드sheet_v1 또는 추가 연결한 Google Sheets
```

영상/음성 로컬 저장:

```text
유튜브다운로드 북마클릿
→ 미디어 fetch
→ Android 파일 저장
```

영상/음성 Drive 저장은 Google 공식 Save to Drive 경로를 별도로 사용합니다.

## 6. Sheets 구조

자동 생성 기본값:

```text
파일     유튜브다운로드sheet_v1
1번 탭   안내
2번 탭   수집
카테고리 기본
```

추가 데이터 시트는 최대 10개입니다.

- 가로 = 항목(열)
- 세로 = 영상(행)
- 한 영상 = 한 행
- 연결 파일 최대 10개
- 데이터 시트당 최대 2,000개
- 1,800개부터 한도 경고

## 7. 기준 파일과 책임

- `README.md` : 전체 구조와 이름 체계
- `bookmarklet.js` : 모바일 북마크 `유튜브다운로드`의 URL 칸에 복사하는 실제 단일 북마클릿 코드
- `CORE_SPEC.md` : 모바일 북마클릿 코어 책임
- `PROTOCOL.md` : 북마클릿 ↔ UI 메시지 규격
- `APPS_SCRIPT_BRIDGE.md` : 북마클릿 ↔ Apps Script 통신 규격
- `GOOGLE_SETUP_FLOW.md` : 자동 저장공간 생성과 추가 Sheets 연결 구조
- `SHEET_RULES.md` : Sheets 데이터 저장 규칙
- `ui.html` : 통합 UI
- `apps-script/Transport.gs` : iframe POST 브리지와 최초 저장공간 생성 진입
- `apps-script/Code.gs` : SpreadsheetApp 처리

## 8. 문서 관리 원칙

- 문서는 현재 확정 구조만 기록합니다.
- 실패 이력, 임시 테스트 순서, 작업 로그를 기준 문서에 누적하지 않습니다.
- 같은 사실은 한 기준 문서에서 정의하고 다른 문서에서는 책임만 연결합니다.
- 실제 비밀값, OAuth 토큰, 쿠키, 실행 중 미디어 URL은 저장소에 기록하지 않습니다.
