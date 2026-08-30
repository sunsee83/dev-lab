# Google 저장공간 연결 구조

## 1. 이름 체계

```text
북마클릿      유튜브다운로드
Apps Script  유튜브다운로드앱_v1
기본 Sheets  유튜브다운로드sheet_v1
```

## 2. 독립형 Apps Script

Google Sheets에 바인딩하지 않습니다.

```text
유튜브다운로드앱_v1
├─ Code.gs
├─ Transport.gs
└─ ui.html
```

웹 앱 실행 사용자는 `웹 앱에 액세스하는 사용자`, 액세스 대상은 `Google 계정이 있는 모든 사용자`입니다.

## 3. 최초 사용자

```text
유튜브다운로드 실행
→ Google 승인
→ get-state
→ 연결 파일 없음
→ create-storage
→ SpreadsheetApp.create('유튜브다운로드sheet_v1')
→ 수집 시트 구성
→ 안내 시트 구성
→ 기본 카테고리 등록
→ 사용자별 UserProperties에 파일 ID/이름 저장
```

사용자는 최초 설정에서 Sheets를 직접 만들거나 주소를 입력하지 않습니다.

## 4. 이후 실행

```text
get-state
→ defaultFileId
→ SpreadsheetApp.openById(...)
→ 파일 → 시트 → 카테고리 복원
```

같은 웹 앱을 여러 사용자가 사용해도 `UserProperties`와 데이터 파일은 사용자별로 분리됩니다.

## 5. 기존 Sheets 추가

자동 생성 기본 파일 외에 이미 가진 Sheets를 추가할 때만:

```text
기존 Sheets URL 입력
→ connect-file
→ 접근 권한 확인
→ 연결 목록에 추가
```

연결 파일 최대 10개입니다.

## 6. 기본 파일 구조

```text
유튜브다운로드sheet_v1
├─ 안내
└─ 수집
   └─ 기본 카테고리
```

- 데이터 시트 최대 10개
- 시트당 기록 최대 2,000개
- 1,800개부터 한도 경고

## 7. ui.html의 위치

`ui.html`은 Google Sheets 안에 들어가는 데이터가 아니라 Apps Script 프로그램 파일입니다.

```text
Transport.gs / get-ui
→ Apps Script ui.html 내용 반환
→ bookmarklet.js
→ iframe.srcdoc
→ YouTube 페이지에 UI 표시
```

따라서 `유튜브다운로드sheet_v1`에는 코드나 UI 파일을 넣지 않습니다.
