# YouTube Bookmarklets

YouTube 모바일 웹에서 사용하는 서버리스 북마클릿 프로젝트입니다.

상위 `bookmarklets/README.md` 원칙을 그대로 적용합니다.

## 목표

북마클릿을 두 개로 분리합니다.

### 1. YT 미디어

- 영상 저장
- 음성 저장
- 로컬 저장
- Google 공식 `Save to Drive`를 이용한 Drive 저장 1차 경로
- 실제 접근 가능한 품질만 표시

### 2. YT 수집

- 제목 / URL / 채널 / 업로드일 / 길이 / 조회수
- 설명 / 태그 / 대본 / 댓글
- 중요도 1~3 / 상태 / 메모
- 원문(TXT 성격) / JSON 출력
- 복사 / 로컬 / 개인 Google Drive·Sheets 저장 구조

## 코드 배치 원칙

### 북마크 URL 안에 남기는 것

YouTube 구조에 직접 의존하는 짧고 중요한 로직만 둡니다.

- 현재 영상/Shorts 식별
- YouTube 전용 player 응답 접근
- 미디어 스트림 판별
- 서비스 전용 최소 추출 규칙

이 코드는 공개 폴더에 복제하지 않습니다.

### 이 공개 폴더에 두는 것

서비스 핵심과 무관하거나 일반화 가능한 코드만 둡니다.

- 팝업 UI
- 메시지 프로토콜
- 파일 저장 UI
- Google 공식 Drive 저장 UI
- Drive/Sheets용 일반 UI
- TXT/JSON 출력 UI
- 상태 표시 / 폼 / 유틸리티

## 보안

다음 값은 저장소와 북마클릿 어느 쪽에도 하드코딩하지 않습니다.

- API 키
- 비밀번호
- OAuth access/refresh token
- 로그인/세션 토큰
- 인증 쿠키
- 개인 계정 식별용 비밀값

사용자 인증이 필요한 기능은 사용자의 브라우저/Google 공식 인증 흐름을 사용합니다.

## YT 미디어 흐름

1. 영상 / 음성 선택
2. 실제 가능한 화질 / 음질 선택
3. 로컬 / Drive 선택
4. 로컬이면 YouTube 페이지의 코어가 직접 저장
5. Drive이면 코어가 현재 선택 스트림의 임시 URL만 UI에 전달
6. 공개 UI가 Google 공식 `Save to Drive` 버튼을 즉시 렌더링
7. 파일 URL은 공개 UI에 영구 저장하지 않음

`Save to Drive` 1차 방식은 별도 OAuth Client ID/API Key를 북마클릿에 넣지 않습니다. 저장 위치는 `My Drive`이며 특정 폴더 지정은 지원 대상이 아닙니다.

## YT 수집 흐름

1. 데이터 항목 선택
2. 데이터 형식: 원문(TXT) / JSON
3. 출력: 복사 / 로컬 / Drive
4. Drive/Sheets 기능을 붙일 경우 파일 → 시트 → 카테고리 순차 선택
5. 태그 / 중요도(1~3) / 상태 / 메모
6. 저장

## 공개 UI 실행 방식

`raw.githubusercontent.com`의 원본 파일은 코드 저장·배포 원본으로는 적합하지만, HTML/SVG 안의 스크립트를 실행하는 최종 UI 호스트로 신뢰하지 않습니다. 응답 MIME/CSP 정책 때문에 브라우저에서 실행이 제한될 수 있기 때문입니다.

따라서 최종 구조는 **백엔드 없는 정적 GitHub 호스팅**을 사용합니다.

- 소스: 이 공개 저장소
- 실행 UI: GitHub Pages 같은 정적 호스트
- 백엔드/API 서버: 없음
- YouTube 전용 추출 코어: 북마클릿 내부

현재 저장소에서 Pages가 아직 활성화되지 않았으므로 `media.html`은 구현 완료 상태이고, 실제 iframe 연결은 정적 URL이 준비되면 연결합니다.

기존 `bridge.svg`/`bridge.html`은 구조 실험 파일로 유지합니다. 최종 미디어 UI는 `media.html` 기준으로 진행합니다.

## 현재 검증 상태

Android 모바일 Whale + YouTube 모바일 웹에서 다음을 확인했습니다.

- 일반 영상: 통합 영상+음성 MP4 로컬 저장 성공
- Shorts: 통합 영상+음성 MP4 로컬 저장 성공
- 음성 전용 로컬 저장 성공
- 통합 MP4의 검증된 화질은 현재 360p
- 고화질 영상은 영상/음성 분리 스트림 병합이 필요하므로 별도 과제
- `media.html`: 영상/음성 → 품질 → 로컬/Drive UI 구현 완료
- Drive: Google 공식 Save to Drive 연결 코드 구현 완료, 실제 GoogleVideo 스트림 저장 검증 대기
- 실제 북마클릿 ↔ 공개 UI 연결: 정적 UI URL 준비 후 검증

## 파일

- `media.html` : YT 미디어 전용 공개 UI. 로컬 저장 요청과 Google Save to Drive 렌더링 담당
- `PROTOCOL.md` : 북마클릿 코어와 공개 UI 사이 메시지 규격
- `bridge.svg` : raw SVG 브리지 실험본
- `bridge.html` : 초기 통합 UI 실험본

핵심 YouTube 추출 코드는 이 폴더에 저장하지 않습니다.
