# YouTube 수집도구

Android 모바일 YouTube 웹에서 사용하는 **서버 없는 통합 북마클릿 프로젝트**입니다.

상위 `bookmarklets/README.md`의 코드 배치/보안 원칙을 그대로 적용합니다.

## 현재 구조

북마클릿은 **1개**로 통합합니다.

본 화면에서 다음 항목을 복수 선택합니다.

- 영상
- 음성
- 데이터

화면 구조의 최종 기준은 `UI_SPEC.md`입니다.

## 코드 배치

### 북마클릿 내부

YouTube에 직접 의존하는 짧고 중요한 로직만 둡니다.

- 현재 일반 영상/Shorts 식별
- YouTube player 응답 접근
- 영상/음성 스트림 판별
- YouTube 전용 최소 데이터 추출

### 공개 GitHub

길거나 일반화 가능한 기능만 둡니다.

- 통합 팝업 UI
- 조건부 화면 표시
- 폼/상태 관리
- 일반 파일 저장 흐름
- Google 공식 Save to Drive 버튼 연결
- 원문/TXT/JSON 출력
- Drive/Sheets 일반 UI
- 메시지 프로토콜
- 기타 일반 유틸리티

## 보안

다음 값은 GitHub와 북마클릿 어디에도 하드코딩하거나 저장하지 않습니다.

- API 키
- 비밀번호
- OAuth access/refresh token
- 로그인/세션 토큰
- 인증 쿠키
- 기타 계정 비밀정보

## 확정된 UI 흐름

### 최초 설정

`YouTube 수집도구 설정`

- Google 계정으로 계속
- 내 Drive에 `YouTube 수집` 전용 폴더 생성
- Google Sheets 파일 생성
- 기본 시트 생성
- 기본 카테고리 생성

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

세부 화면은 `UI_SPEC.md`를 기준으로 합니다.

## 현재 검증된 기능

- 일반 영상: 통합 영상+음성 MP4 로컬 저장 성공
- Shorts: 통합 영상+음성 MP4 로컬 저장 성공
- 음성 전용 로컬 저장 성공
- 현재 검증된 통합 MP4 화질: 360p

## 현재 파일

- `README.md` : 프로젝트 구조와 현재 상태
- `UI_SPEC.md` : 최종 UI 기준본
- `PROTOCOL.md` : 통합 북마클릿 ↔ UI 통신 기준
- `CORE_SPEC.md` : 실제 코드를 공개하지 않고 북마클릿 코어 역할/입출력만 고정한 기준
- `LOCAL_SAVE_FLOW.md` : 영상/음성 로컬 저장 연결 기준
- `DRIVE_SAVE_FLOW.md` : 영상/음성 Drive 저장 1차 연결 기준
- `ui.html` : 통합 팝업 UI + `YT_TOOL_*` 프로토콜 연결본

이전 미디어 전용 UI, bridge 실험본, GitHub Pages용 파일은 제거했습니다.

## 단계 2 완료: 통합 팝업 UI

`ui.html`에 최초 설정, 영상/음성/데이터 복수 선택, 조건부 옵션, 로컬/Drive, 관리정보, 중복 처리, 저장/닫기 화면을 구현했습니다.

## 단계 3 완료: 북마클릿 코어 인터페이스 정리

실제 YouTube 전용 추출 코드는 공개 저장소에 올리지 않고 `CORE_SPEC.md`에 역할과 입출력만 고정했습니다.

- 일반 영상/Shorts 공통 진입
- 영상+음성 통합 영상 후보
- 음성 전용 후보
- 실제 가능한 화질/음질만 표시
- UI에는 실제 URL 대신 실행 중 임시 ID 전달
- 로컬 저장은 YouTube 페이지 안 코어가 담당
- 기능별 실패 분리

## 단계 4 완료: 영상/음성 로컬 저장 연결

`ui.html`을 `YT_TOOL_*` 통합 프로토콜에 맞췄습니다.

로컬 선택 후 저장 시 UI는 `save-local` 요청과 선택된 영상/음성 임시 후보 ID를 코어에 전달합니다.

현재 검증된 저장 흐름을 그대로 보존합니다.

- 영상: `showSaveFilePicker()` → 미디어 fetch → writable stream 기록 → MP4
- 음성: `showSaveFilePicker()` → 음성 fetch → writable stream 기록
- 일반 영상/Shorts 동일 흐름
- 항목별 성공/실패 분리

## 단계 5: 영상/음성 Drive 저장 1차 연결

코드 연결은 완료했습니다.

Drive 선택 후 `[저장]`을 누르면 UI가 `save-drive`를 코어에 요청합니다. 코어는 선택된 임시 ID를 실제 스트림으로 해석한 뒤 저장 시점에만 `YT_TOOL_DRIVE_MEDIA`를 보냅니다.

`ui.html`은 이 메시지를 받으면:

- Google 공식 `https://apis.google.com/js/platform.js`를 필요할 때만 로드
- `gapi.savetodrive.render()`로 영상/음성별 공식 Drive 저장 버튼 생성
- 화질/음질/선택 항목/저장 위치 변경 시 기존 버튼 제거
- 실제 미디어 URL을 localStorage/IndexedDB 등에 저장하지 않음

이 1차 방식은 Drive API 직접 업로드가 아니므로 특정 폴더를 지정하지 않습니다. 저장 대상은 Google 공식 버튼의 `My Drive` 경로입니다.

### 아직 실제 검증이 필요한 항목

- Android 모바일 Whale에서 Google 공식 스크립트 로드
- GoogleVideo 미디어 URL의 Save to Drive CORS/Range 처리
- 영상 실제 Drive 저장 완료
- 음성 실제 Drive 저장 완료

따라서 단계 5는 **구현 완료 / 모바일 실사용 검증 대기** 상태입니다.

상세 흐름은 `DRIVE_SAVE_FLOW.md`, 메시지 형식은 `PROTOCOL.md`를 기준으로 합니다.

## 다음 작업

단계 6: 데이터 추출 코어 구현.
