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
- Google 최초 설정 구조
- 메시지 프로토콜
- 기타 일반 유틸리티

## 보안

다음 값은 GitHub와 북마클릿 어디에도 하드코딩하거나 저장하지 않습니다.

- API 키
- 비밀번호
- OAuth access/refresh token
- 로그인/세션 토큰
- 인증 쿠키
- Client Secret
- 기타 계정 비밀정보

OAuth Web Client ID는 공개 식별자이므로 비밀정보로 취급하지 않지만, access token은 실행 메모리에만 둡니다.

데이터의 `원본 메타데이터`에도 인증/세션값과 미디어 스트림 URL은 포함하지 않습니다.

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
- `DATA_EXTRACT_FLOW.md` : 데이터 선택 필드/결과/부분 실패 기준
- `DATA_OUTPUT_FLOW.md` : 원문/TXT/JSON 변환과 데이터 로컬 저장 기준
- `GOOGLE_SETUP_FLOW.md` : Google 계정/Drive/Sheets 최초 자동 설정 구조와 OAuth 제약
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

로컬 선택 후 저장 시 UI는 `save-local` 요청과 선택된 영상/음성 임시 후보 ID를 코어에 전달합니다.

현재 검증된 저장 흐름을 그대로 보존합니다.

- 영상: `showSaveFilePicker()` → 미디어 fetch → writable stream 기록 → MP4
- 음성: `showSaveFilePicker()` → 음성 fetch → writable stream 기록
- 일반 영상/Shorts 동일 흐름
- 항목별 성공/실패 분리

## 단계 5: 영상/음성 Drive 저장 1차 연결

코드 연결은 완료했고 모바일 실사용 검증 대기 상태입니다.

Drive 선택 후 `[저장]`을 누르면 UI가 `save-drive`를 요청하고, 코어가 저장 시점에만 `YT_TOOL_DRIVE_MEDIA`를 전달합니다.

`ui.html`은 Google 공식 Save to Drive 버튼을 영상/음성별로 렌더링합니다.

아직 검증이 필요한 항목:

- Android 모바일 Whale에서 Google 공식 스크립트 로드
- GoogleVideo 미디어 URL의 Save to Drive CORS/Range 처리
- 영상 실제 Drive 저장 완료
- 음성 실제 Drive 저장 완료

## 단계 6 완료: 데이터 추출 코어 구조

`DATA_EXTRACT_FLOW.md`와 `PROTOCOL.md`에 데이터 추출 입출력을 확정했습니다.

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
- 대본/댓글 등 추가 요청 필드는 선택된 경우에만 조사
- 필드별 부분 실패 허용
- 확보된 다른 결과는 유지
- 결과는 `YT_TOOL_DATA_RESULT`로 반환
- 인증/세션값과 미디어 스트림 URL은 데이터 결과에서 제외

실제 YouTube 전용 추출 구현은 공개 저장소가 아니라 북마클릿 코어 내부에 유지합니다.

## 단계 7 완료: 데이터 출력 / 로컬 저장 연결

`ui.html`과 `DATA_OUTPUT_FLOW.md`에 다음 일반 로직을 연결했습니다.

- `YT_TOOL_DATA_RESULT`를 현재 실행 메모리에 수신
- `원문` → 사람이 읽기 좋고 AI에 바로 전달하기 좋은 정리형 텍스트
- `TXT` → 평문 항목형 출력
- `JSON` → 구조화 결과 보존
- 영상 제목 기반 파일명 생성
- 데이터 + 로컬이면 `[저장]` 클릭 직후 `showSaveFilePicker()`를 먼저 실행
- 데이터 추출 완료 후 미리 선택한 파일 핸들에 UTF-8 결과 기록
- 파일 핸들/데이터 결과를 localStorage/IndexedDB에 영구 저장하지 않음
- 데이터 파일 쓰기 실패가 영상/음성 저장 결과를 취소하지 않음

`원문`과 `TXT`는 `.txt`, `JSON`은 `.json`으로 저장합니다.

## 단계 8: Google 계정 최초 설정

`GOOGLE_SETUP_FLOW.md`에 자동 설정 구조를 확정했습니다.

자동 생성 목표:

1. Google 계정 선택/동의
2. `YouTube 수집` Drive 폴더 생성
3. 폴더 안에 `YouTube Research` Google Sheets 파일 생성
4. 기본 시트 `AI 자료` 설정
5. 기본 카테고리 `생성형 AI` 초기화
6. 생성된 폴더/파일/시트 ID와 이름만 설정값으로 보관

기본 OAuth 범위는 `drive.file` 하나를 사용합니다.

### 현재 막힌 부분

Google Identity Services의 브라우저 OAuth는 등록된 **Authorized JavaScript origin**에서 실행되어야 합니다.

현재 프로젝트는 GitHub Pages와 별도 서버를 사용하지 않도록 정리되어 있으므로, OAuth를 실행할 HTTPS origin이 없습니다.

따라서 단계 8은 현재:

```text
자동 생성 구조      완료
OAuth 권한 범위      완료
Drive/Sheets 호출 순서 완료
실제 Google 로그인   대기
실제 폴더/Sheets 생성 대기
```

실제 자동 설정을 끝내려면 **인증 전용 정적 HTTPS origin**을 하나 허용해야 합니다. 백엔드는 필요하지 않습니다.

HTTPS origin을 끝까지 사용하지 않으면 자동 계정 연결/폴더/Sheets 생성은 불가능하므로 수동 설정 UI로 요구사항을 바꿔야 합니다.

## 다음 작업

단계 8의 인증 origin을 확정한 뒤 Google Identity Services 연결을 구현합니다. 그 다음 단계 9에서 Drive/Sheets 데이터 기록을 연결합니다.
