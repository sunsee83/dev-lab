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

각 사용자는 자기 Google 계정으로 권한을 승인하고 자기 계정에서 접근 가능한 Google Sheets 파일을 연결합니다.

스크립트 소유자의 고정 Spreadsheet ID는 코드에 넣지 않습니다.

---

## SpreadsheetApp 역할

Apps Script 기본 서비스인 `SpreadsheetApp`으로 다음 기능을 처리합니다.

- 사용자가 입력한 Sheets 링크에서 파일 열기
- 파일 이름 확인
- 시트 목록 조회
- 새 데이터 시트 생성
- 셀/범위 읽기
- 행 추가
- 기존 행 수정
- 영상 ID 검색 및 중복 확인

별도의 API key 또는 북마클릿 access token을 사용하지 않습니다.

---

## 보안 기준

- `DriveApp` 기본 사용 안 함
- 사용자의 Drive 전체 파일 목록 탐색 안 함
- 사용자가 직접 연결한 Spreadsheet ID만 사용
- 개발자 고정 Spreadsheet ID 사용 안 함
- access token / refresh token / 인증 쿠키 저장 안 함
- 외부 텍스트의 Sheets 수식 주입 차단
- 관리 헤더 구조가 다르면 기존 내용을 덮어쓰지 않고 저장 중단
- 파일 / 시트 / 행 자동 삭제 기능 없음
- 파일 연결 해제는 사용자 설정만 제거하고 실제 Google 파일은 삭제하지 않음

---

## 파일 / 시트 / 행 제한

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

기존 파일이 이미 한도를 넘는 경우 도구가 기존 시트나 데이터를 삭제하지 않습니다. 새 시트/새 기록 생성만 제한합니다.

---

## 첫 번째 안내 시트

연결된 각 Google Sheets 파일의 **첫 번째 탭은 항상 `안내`**로 유지합니다.

파일 연결 시 `안내` 탭이 없으면 생성하고 첫 번째 위치로 이동합니다.

기존 파일에 이미 다른 용도의 `안내` 탭이 있으면 내용을 덮어쓰지 않고 연결을 중단합니다.

`안내` 탭은 데이터 저장 대상으로 선택할 수 없습니다.

실제 안내 내용은 짧게 유지합니다.

```text
YouTube 수집도구 안내

데이터 구조
• 가로 = 항목, 세로 = 영상
• 한 영상 = 한 행

저장 경로
YouTube → 북마클릿 → Apps Script → 이 파일 → 선택한 데이터 시트

제한
• 안내 1개 + 데이터 시트 최대 10개
• 데이터 시트당 최대 2,000개
• 1,800개부터 새 시트 사용 권장
• 2,000개부터 신규 추가 중지, 기존 기록 수정 가능

기본 규칙
• 영상 ID로 중복 확인
• 수집 실패 항목은 기존 값을 지우지 않음
• 사용자 관리값은 일반 재수집으로 덮어쓰지 않음
• 수집일 유지 / 수정일 자동 갱신
• 도구는 파일·시트·행을 자동 삭제하지 않음
```

상세 규칙은 `SHEET_RULES.md`를 기준으로 합니다.

---

## 여러 파일 연결

Apps Script 하나로 여러 Google Sheets 파일을 연결할 수 있습니다.

사용자가 `[+ 파일 연결]`을 누르면 Sheets 링크를 붙여넣습니다.

Apps Script는 링크에서 Spreadsheet ID를 자동 추출하고 현재 사용자 계정으로 접근 가능 여부를 확인한 뒤 ID와 파일 이름만 연결 목록에 등록합니다.

두 번째·세 번째 파일도 같은 방식으로 계속 추가하며 전체 연결 파일은 최대 10개입니다.

---

## 사용자별 연결 목록

연결된 파일 목록은 `PropertiesService.getUserProperties()`를 사용해 사용자별로 분리합니다.

저장하는 값은 비밀정보가 아닌 설정값뿐입니다.

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

Google Sheets 연결
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

- 사용자는 Spreadsheet ID를 직접 찾지 않음
- 파일 링크를 붙여넣으면 도구가 ID를 자동 인식
- 연결 시 `안내` 탭을 첫 번째 위치에 보장
- 연결 후 데이터 시트 목록 표시
- 새 데이터 시트는 `SpreadsheetApp.insertSheet()`로 생성

---

## 본 화면

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

`안내` 탭은 파일 안에는 존재하지만 데이터 시트 선택 목록에서는 제외합니다.

---

## 데이터 시트 구조

```text
가로 = 항목(열)
세로 = 영상(행)
한 영상 = 한 행
```

- 1행 헤더 고정
- 썸네일 / 제목 / 채널명 앞쪽 배치
- 일부 항목을 수집하지 않아도 열 위치는 고정
- 영상 ID로 중복 검사
- 상세 읽기/쓰기 정책은 `SHEET_RULES.md` 적용

---

## 사용하지 않는 기본 경로

- Google Picker
- 브라우저 직접 Drive REST API
- 브라우저 직접 Sheets REST API
- OAuth Client ID를 북마클릿에서 직접 처리하는 구조
- `DriveApp`으로 사용자 Drive 전체를 탐색하는 구조

---

## 단계 8 기준

- Apps Script 웹앱 방식 고정
- 실행 주체 = 웹앱에 액세스하는 사용자
- `SpreadsheetApp` 기반 파일/시트 접근
- 여러 Spreadsheet 연결 가능, 최대 10개
- 각 파일 첫 번째 `안내` 시트 보장
- 안내 1 + 데이터 최대 10 = 전체 최대 11개
- 데이터 시트당 최대 2,000개 / 1,800개 경고
- 사용자별 연결 목록은 `UserProperties`로 분리
- Drive 전체 탐색 및 `DriveApp` 기본 사용 제외
- Sheets 읽기/쓰기 규칙은 `SHEET_RULES.md`로 고정

다음 단계는 실제 Apps Script 배포 URL 연결과 단계 9의 Sheets 저장 통합입니다.
