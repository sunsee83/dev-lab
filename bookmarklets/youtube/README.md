# YouTube 수집도구

Android 모바일 YouTube 웹에서 사용하는 **통합 북마클릿 프로젝트**입니다.

상위 `bookmarklets/README.md`의 코드 배치/보안 원칙을 그대로 적용합니다.

## 현재 구조

북마클릿은 **1개**로 통합합니다.

본 화면에서 다음 항목을 복수 선택합니다.

- 영상
- 음성
- 데이터

화면 구조의 기준은 `UI_SPEC.md`입니다.

## 코드 배치

### 북마클릿 내부

YouTube에 직접 의존하는 짧고 중요한 로직만 둡니다.

- 현재 일반 영상/Shorts 식별
- YouTube player 응답 접근
- 영상/음성 스트림 판별
- YouTube 전용 데이터 추출

### 공개 GitHub

길거나 일반화 가능한 기능만 둡니다.

- 통합 팝업 UI
- 조건부 화면 표시
- 폼/상태 관리
- 일반 파일 저장 흐름
- Google 공식 Save to Drive 버튼 연결
- 원문/TXT/JSON 변환
- 데이터 로컬 파일 기록
- Drive/Sheets 일반 UI
- Apps Script/SpreadsheetApp 연결 규격
- 메시지 프로토콜
- 기타 일반 유틸리티

## 보안

다음 값은 GitHub와 북마클릿에 하드코딩하거나 영구 저장하지 않습니다.

- API 키
- 비밀번호
- OAuth access/refresh token
- 로그인/세션 토큰
- 인증 쿠키
- Client Secret
- 기타 계정 비밀정보

데이터의 `원본 메타데이터`에도 인증/세션값과 미디어 스트림 URL은 포함하지 않습니다.

Google Sheets 연결 파일의 ID/이름은 인증정보가 아니므로 사용자별 설정값으로 저장할 수 있습니다.

## 확정된 UI 흐름

### 최초 설정

`YouTube 수집도구 설정`

- Google 계정으로 계속
- Google Sheets 파일 연결
- 기본 시트 선택 또는 생성
- 기본 카테고리 설정

파일 연결은 링크 붙여넣기 방식으로 시작하고, Spreadsheet ID는 도구가 자동 추출합니다.

### 본 화면

1. 가져올 항목: `영상 / 음성 / 데이터`
2. 영상 선택 시: 화질
3. 음성 선택 시: 음질
4. 데이터 선택 시: 수집 항목 + 데이터 형식
5. 저장 위치: `로컬 / Drive`
6. Drive 선택 시: 파일 → 시트 → 카테고리
7. 데이터 + Drive 시: 태그 / 중요도 / 상태 / 메모
8. 중복 발견 시: 기존 기록 열기 / 업데이트 / 새 기록 추가
9. 저장 / 닫기

## 현재 검증된 기능

- 일반 영상: 통합 영상+음성 MP4 로컬 저장 성공
- Shorts: 통합 영상+음성 MP4 로컬 저장 성공
- 음성 전용 로컬 저장 성공
- 현재 검증된 통합 MP4 화질: 360p

## 현재 파일

- `README.md` : 프로젝트 구조와 현재 상태
- `UI_SPEC.md` : UI 기준본
- `PROTOCOL.md` : 통합 북마클릿 ↔ UI 통신 기준
- `CORE_SPEC.md` : 실제 코드를 공개하지 않고 북마클릿 코어 역할/입출력만 고정한 기준
- `LOCAL_SAVE_FLOW.md` : 영상/음성 로컬 저장 연결 기준
- `DRIVE_SAVE_FLOW.md` : 영상/음성 Drive 저장 1차 연결 기준
- `DATA_EXTRACT_FLOW.md` : 데이터 선택 필드/결과/부분 실패 기준
- `DATA_OUTPUT_FLOW.md` : 원문/TXT/JSON 변환과 데이터 로컬 저장 기준
- `GOOGLE_SETUP_FLOW.md` : Apps Script + SpreadsheetApp 기반 Google Sheets 연결 기준
- `ui.html` : 통합 팝업 UI + `YT_TOOL_*` 프로토콜 연결본

## 단계 2 완료: 통합 팝업 UI

`ui.html`에 최초 설정, 영상/음성/데이터 복수 선택, 조건부 옵션, 로컬/Drive, 관리정보, 중복 처리, 저장/닫기 화면을 구현했습니다.

Google 부분의 최초 설정 화면은 단계 8의 Apps Script 방식에 맞춰 후속 수정합니다.

## 단계 3 완료: 북마클릿 코어 인터페이스 정리

- 일반 영상/Shorts 공통 진입
- 영상+음성 통합 영상 후보
- 음성 전용 후보
- 실제 가능한 화질/음질만 표시
- UI에는 실제 URL 대신 실행 중 임시 ID 전달
- 로컬 저장은 YouTube 페이지 안 코어가 담당
- 기능별 실패 분리

## 단계 4 완료: 영상/음성 로컬 저장 연결

- 영상: `showSaveFilePicker()` → 미디어 fetch → writable stream 기록 → MP4
- 음성: `showSaveFilePicker()` → 음성 fetch → writable stream 기록
- 일반 영상/Shorts 동일 흐름
- 항목별 성공/실패 분리

## 단계 5: 영상/음성 Drive 저장 1차 연결

Google 공식 Save to Drive 방식의 코드 연결은 완료했고 모바일 실사용 검증 대기 상태입니다.

이 경로는 영상/음성용이며 Google Sheets 데이터 저장 경로와 분리합니다.

## 단계 6 완료: 데이터 추출 코어 구조

지원 필드:

- 썸네일
- 제목
- 영상 URL
- 채널명
- 업로드일
- 영상 길이
- 조회수
- 설명
- 태그
- 대본
- 댓글
- 좋아요
- 자막 원본
- 영상 ID
- 채널 ID
- 원본 메타데이터

원칙:

- 사용자가 선택한 필드만 조사
- 댓글은 수량/인기순·최신순 옵션 반영
- 필드별 부분 실패 허용
- 결과는 `YT_TOOL_DATA_RESULT`로 반환
- 인증/세션값과 미디어 스트림 URL은 데이터 결과에서 제외

## 단계 7 완료: 데이터 출력 / 로컬 저장 연결

- `YT_TOOL_DATA_RESULT`를 현재 실행 메모리에 수신
- `원문 / TXT / JSON` 변환
- 영상 제목 기반 파일명 생성
- 데이터 + 로컬이면 저장 클릭 시 파일 핸들을 먼저 확보
- 데이터 추출 완료 후 선택한 파일에 UTF-8 기록
- 파일 핸들/데이터 결과를 브라우저 저장소에 영구 저장하지 않음

## 단계 8: Google Sheets 최초 설정 구조 확정

Google Sheets 경로는 **Apps Script 웹앱 + SpreadsheetApp** 방식으로 고정합니다.

```text
북마클릿
  ↓
Apps Script 웹앱
  ↓
SpreadsheetApp
  ↓
사용자가 연결한 Google Sheets
```

핵심 규칙:

- 웹앱은 `웹앱에 액세스하는 사용자`로 실행
- 사용자는 자기 Google 계정으로 권한 승인
- 개발자 고정 Spreadsheet ID를 사용하지 않음
- 여러 Google Sheets 파일 연결 가능
- 연결 파일 목록은 사용자별 `UserProperties`로 분리
- 파일 연결은 Sheets 링크 붙여넣기 + 자동 ID 확인
- `SpreadsheetApp`으로 시트 목록/새 시트/행 추가/수정/중복 검색 처리
- `DriveApp`으로 사용자 Drive 전체를 탐색하는 구조는 기본 사용하지 않음
- Google Picker와 브라우저 직접 Drive/Sheets REST API는 기본 경로에서 제외

### 권한 주의

`SpreadsheetApp.openById/openByUrl`은 Google Sheets 권한 승인이 필요합니다. 로직은 사용자가 직접 연결한 파일 ID만 사용하도록 제한하지만, 이 권한 모델은 `drive.file`처럼 OAuth 범위 자체가 선택 파일 하나로 제한되는 방식과는 다릅니다.

상세 기준은 `GOOGLE_SETUP_FLOW.md`를 따릅니다.

## 다음 작업

단계 8의 실제 Apps Script 웹앱 소스/배포 연결을 구현한 뒤, 단계 9에서 `YT_TOOL_DATA_RESULT`를 선택된 파일/시트에 구조화 저장합니다.
