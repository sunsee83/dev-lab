# Google 계정 / Sheets 최초 설정 구조

이 문서는 `YouTube 수집도구 설정`의 Google 연결 방식을 고정합니다.

## 최종 선택

Google Sheets 데이터 저장은 **Apps Script 웹앱 + SpreadsheetApp** 방식으로 구현합니다.

```text
YouTube 북마클릿
        ↓
Apps Script 웹앱
        ↓
SpreadsheetApp
        ↓
사용자가 연결한 Google Sheets 파일
```

브라우저에서 Drive API / Sheets REST API를 직접 호출하는 구조와 Google Picker는 기본 경로로 사용하지 않습니다.

영상/음성 Drive 저장은 기존 Google 공식 `Save to Drive` 1차 경로를 별도로 유지합니다.

---

## 실행 주체

Apps Script 웹앱은 **웹앱에 액세스하는 사용자로 실행**하도록 배포합니다.

따라서 사용자 A와 사용자 B는 각각 자기 Google 계정으로 권한을 승인하고, 각자 접근 가능한 Google Sheets 파일을 사용합니다.

스크립트 소유자의 고정 Spreadsheet ID를 코드에 넣지 않습니다.

---

## SpreadsheetApp 역할

Apps Script 기본 서비스인 `SpreadsheetApp`으로 다음 기능을 처리합니다.

- 사용자가 입력한 Sheets URL/ID 열기
- 파일 이름 확인
- 시트 목록 조회
- 새 시트 생성
- 셀/범위 읽기
- 행 추가
- 기존 행 수정
- 영상 ID 검색 및 중복 확인
- 시트 이름 변경

예:

```js
const ss = SpreadsheetApp.openByUrl(sheetUrl);
const sheets = ss.getSheets();
ss.insertSheet('새 시트');
```

별도의 API key 또는 북마클릿 access token을 사용하지 않습니다.

---

## 권한에 대한 정확한 기준

`SpreadsheetApp.openById()` / `openByUrl()`을 사용하는 독립형 Apps Script 웹앱은 Google Sheets 권한 승인이 필요합니다.

이 방식은 **Google Drive 전체 권한을 요구하는 `DriveApp` 기반 구조는 사용하지 않지만**, 사용자가 승인하는 Sheets 권한 자체는 연결한 파일 하나만으로 제한되는 `drive.file` 모델과 동일하지 않습니다.

따라서 보안 원칙은 다음과 같이 구현합니다.

- `DriveApp` 기본 사용 안 함
- 사용자의 Drive 전체 파일 목록을 탐색하지 않음
- 도구 로직은 사용자가 직접 연결한 Spreadsheet ID만 사용
- 고정된 개발자 Spreadsheet ID 사용 안 함
- access token / refresh token / 인증 쿠키 저장 안 함
- 연결 파일 ID/이름은 비밀정보가 아니므로 사용자 설정으로 저장 가능

---

## 여러 파일 연결

Apps Script 하나로 여러 Google Sheets 파일을 연결할 수 있습니다.

```text
연결된 파일
├─ YouTube Research
├─ 투자 자료
├─ AI 자료
└─ 여행 자료
```

사용자가 `[+ 파일 연결]`을 누르면 Sheets 링크를 입력하거나 붙여넣습니다.

Apps Script는 링크를 `SpreadsheetApp.openByUrl()`로 열어 접근 가능 여부를 확인하고 다음 값만 등록합니다.

```js
{
  id: 'spreadsheet-id',
  name: '파일 이름',
  url: 'https://docs.google.com/spreadsheets/...'
}
```

두 번째·세 번째 파일도 같은 방식으로 계속 추가합니다.

---

## 사용자별 연결 목록

연결된 파일 목록은 Apps Script의 `PropertiesService.getUserProperties()`를 기본 저장소로 사용합니다.

`UserProperties`는 현재 웹앱 사용자별로 분리되는 설정 저장소이므로 한 Apps Script 웹앱을 여러 사람이 사용해도 연결 파일 목록이 사용자별로 분리됩니다.

저장 예:

```js
{
  files: [
    { id:'...', name:'YouTube Research' },
    { id:'...', name:'AI 자료' }
  ],
  defaultFileId: '...',
  defaultSheetName: 'AI 자료',
  categories: ['생성형 AI']
}
```

인증 토큰이나 비밀번호는 UserProperties에 저장하지 않습니다.

---

## 최초 설정 UX

기존의 자동 Drive 폴더 생성 대신 **파일 연결 중심 설정**으로 변경합니다.

```text
YouTube 수집도구 설정

[ Google 계정으로 계속 ]

① Google Sheets 연결
[ Sheets 새로 만들기 ]
[ 내 Sheets 열기 ]

파일 링크
[________________________]
[ 파일 연결 ]

연결된 파일
✓ YouTube Research

기본 시트
[ AI 자료 ▼ ]
[ + 새 시트 ]

기본 카테고리
[ 생성형 AI ]

[ 설정 완료 ]
```

### 도움 동작

- `Sheets 새로 만들기` → Google Sheets 새 파일 화면 열기
- `내 Sheets 열기` → Google Sheets/Drive 화면 열기
- 사용자는 원하는 파일의 주소를 복사해 `파일 링크`에 붙여넣기
- 도구는 Spreadsheet ID를 자동 추출하고 접근 가능 여부 확인
- 연결 후 시트 목록을 자동 표시
- 새 시트는 `SpreadsheetApp.insertSheet()`로 생성
- 카테고리는 수집도구 논리값으로 관리

사용자에게 Spreadsheet ID를 직접 찾아 입력하게 하지 않습니다.

---

## 본 화면

설정 후 기존 구조를 유지합니다.

```text
파일
[ YouTube Research ▼ ]
[ + 파일 연결 ] [ 열기 ]

↓

시트
[ AI 자료 ▼ ]
[ + 새 시트 ] [ 열기 ]

↓

카테고리
[ 생성형 AI ▼ ]
[ + 새 카테고리 ]
```

연결 파일이 늘어나면 파일 드롭다운도 같이 늘어납니다.

---

## 데이터 저장

단계 9에서 `YT_TOOL_DATA_RESULT`를 Apps Script에 전달하여 선택된 파일/시트에 구조화된 행으로 기록합니다.

예:

```text
영상 ID | 제목 | 채널 | URL | 업로드일 | 조회수 | 설명 | 대본 | 태그 | 중요도 | 상태 | 메모
```

중복 영상 ID를 찾으면:

- 기존 기록 열기
- 기존 행 업데이트
- 새 기록 추가

중 하나를 선택할 수 있게 합니다.

---

## 사용하지 않는 기본 경로

다음은 현재 최종 구조의 기본 경로가 아닙니다.

- Google Picker
- 브라우저 직접 Drive REST API
- 브라우저 직접 Sheets REST API
- OAuth Client ID를 북마클릿에서 직접 처리하는 구조
- `DriveApp`으로 사용자 Drive 전체를 탐색하는 구조

---

## 단계 8 완료 기준

단계 8에서 확정할 항목:

- Apps Script 웹앱 방식 고정
- 실행 주체 = 웹앱에 액세스하는 사용자
- `SpreadsheetApp` 기반 파일/시트 접근
- 여러 Spreadsheet 연결 가능
- 사용자별 연결 목록은 `UserProperties`로 분리
- 파일 연결 UX = Sheets 링크 붙여넣기 + 자동 ID 인식
- 시트 목록/새 시트 구조 확정
- 카테고리 사용자별 관리 구조 확정
- Drive 전체 탐색 및 `DriveApp` 기본 사용 제외

실제 Apps Script 배포 URL 연결과 모바일 실사용 검증은 구현/통합 단계에서 진행합니다.
