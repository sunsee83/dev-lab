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

별도의 API key 또는 북마클릿 access token을 사용하지 않습니다.

---

## 보안 기준

- `DriveApp` 기본 사용 안 함
- 사용자의 Drive 전체 파일 목록을 탐색하지 않음
- 도구 로직은 사용자가 직접 연결한 Spreadsheet ID만 사용
- 고정된 개발자 Spreadsheet ID 사용 안 함
- access token / refresh token / 인증 쿠키 저장 안 함
- 연결 파일 ID/이름은 비밀정보가 아니므로 사용자 설정으로 저장 가능
- 외부에서 들어온 제목/설명/댓글 등이 Sheets 수식으로 실행되지 않도록 수식 주입을 차단
- 기존 데이터 시트의 열 구조가 도구 기준과 다르면 덮어쓰지 않고 저장 중단
- 파일 삭제/시트 삭제는 기본 기능에 넣지 않음

---

## 파일 / 시트 / 행 제한

Google 자체 최대치까지 사용하지 않고 수집도구에서 더 낮은 한도를 둡니다.

```text
연결 파일                 최대 10개
파일당 안내 시트          1개
파일당 데이터 시트        최대 10개
파일당 전체 시트          최대 11개 (안내 1 + 데이터 10)
데이터 시트당 수집 기록   최대 2,000개
용량 경고                 1,800개부터
2,000개 도달              새 기록 추가 차단
기존 기록 업데이트        허용
```

기존 파일이 이미 데이터 시트 10개를 넘는 경우 기존 탭을 삭제하지 않습니다. 연결/조회는 허용하되 도구에서 새 데이터 시트 생성은 차단합니다.

---

## 첫 번째 안내 시트

도구에 연결된 각 Google Sheets 파일의 **첫 번째 탭은 항상 `안내`**로 유지합니다.

파일 연결 시 `안내` 탭이 없으면 생성하고 첫 번째 위치로 이동합니다.

현재 안내 시트에는 다음 최소 정보만 기록합니다.

```text
YouTube 수집도구 안내

이 파일은 YouTube 수집도구가 연결한 Google Sheets 파일입니다.

저장 경로
YouTube 페이지
→ YouTube 수집 북마클릿
→ Apps Script 웹앱
→ 이 Google Sheets 파일
→ 선택한 데이터 시트

현재 기본 제한
- 데이터 시트 최대 10개
- 시트당 수집 기록 최대 2,000개
- 1,800개부터 경고
- 2,000개부터 새 기록 추가 차단
```

**읽기/쓰기 규칙, 자동/수동 수정 범위, 열별 수정 정책 등은 아직 확정하지 않습니다.** 다음 단계에서 규칙을 정한 뒤 안내 시트에 추가합니다.

`안내` 탭은 데이터 저장 대상으로 선택할 수 없게 합니다.

기존 파일에 이미 다른 용도의 `안내` 탭이 있으면 내용을 덮어쓰지 않고 연결을 중단하여 기존 데이터를 보호합니다.

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

Apps Script는 링크를 `SpreadsheetApp.openById()`로 열어 접근 가능 여부를 확인하고 ID/이름만 등록합니다.

두 번째·세 번째 파일도 같은 방식으로 계속 추가하며 전체 연결 파일은 최대 10개입니다.

---

## 사용자별 연결 목록

연결된 파일 목록은 Apps Script의 `PropertiesService.getUserProperties()`를 기본 저장소로 사용합니다.

사용자별로 다음과 같은 비밀정보가 아닌 설정만 보관합니다.

```js
{
  files: [
    { id:'...', name:'YouTube Research' },
    { id:'...', name:'AI 자료' }
  ],
  defaultFileId: '...',
  categoryGroups: []
}
```

인증 토큰이나 비밀번호는 UserProperties에 저장하지 않습니다.

---

## 최초 설정 UX

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

- `Sheets 새로 만들기` → Google Sheets 새 파일 화면 열기
- `내 Sheets 열기` → Google Sheets 화면 열기
- 사용자는 원하는 파일 주소를 복사해 `파일 링크`에 붙여넣기
- 도구는 Spreadsheet ID를 자동 추출하고 접근 가능 여부 확인
- 연결 시 `안내` 탭을 첫 번째 위치에 보장
- 연결 후 데이터 시트 목록을 표시
- 새 데이터 시트는 `SpreadsheetApp.insertSheet()`로 생성
- 사용자에게 Spreadsheet ID를 직접 찾아 입력하게 하지 않음

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

`안내` 탭은 파일 안에는 존재하지만 데이터 저장용 시트 드롭다운에서는 선택 불가로 처리합니다.

---

## 데이터 시트 기본 표시 구조

현재 방향은 다음과 같습니다.

- 첫 열: 작은 썸네일 미리보기
- 제목: YouTube 영상 링크
- 채널명: 채널 링크
- 1행 헤더 고정
- 썸네일/제목/채널명 3열 좌측 고정
- 사용자가 수집하지 않은 항목도 열 위치는 바꾸지 않고 빈칸 유지
- 긴 설명/대본/댓글/AI 결과는 뒤쪽 열에 배치
- 영상 ID로 중복 검사

세부 읽기/쓰기 규칙과 열별 수정 정책은 다음 단계에서 확정합니다.

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

- Apps Script 웹앱 방식 고정
- 실행 주체 = 웹앱에 액세스하는 사용자
- `SpreadsheetApp` 기반 파일/시트 접근
- 여러 Spreadsheet 연결 가능, 최대 10개
- 각 파일 첫 번째 `안내` 시트 보장
- 안내 1 + 데이터 최대 10 = 전체 최대 11개 구조
- 데이터 시트당 최대 2,000개 기록 / 1,800개 경고
- 사용자별 연결 목록은 `UserProperties`로 분리
- 파일 연결 UX = Sheets 링크 붙여넣기 + 자동 ID 인식
- Drive 전체 탐색 및 `DriveApp` 기본 사용 제외

실제 Apps Script 배포 URL 연결과 모바일 실사용 검증은 구현/통합 단계에서 진행합니다.
