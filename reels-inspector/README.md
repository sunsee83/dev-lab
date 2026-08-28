# Reels Inspector

Instagram 모바일 웹에서 콘텐츠를 빠르게 조사하기 위한 Tampermonkey 기반 Instagram Content Research Tool 프로토타입입니다.

## 기준 문서

개발 전에 아래 순서로 확인합니다.

1. `PROJECT_PLAN.md` — 제품 구조, 데이터 모델, 개발 로드맵의 단일 기준
2. `STATUS.md` — 현재 배포 버전, 구현 상태, 다음 작업
3. `GRID_BASELINE.md` — 현재 Grid Frozen UI 기준
4. `tests/README.md` — Core/Grid 회귀검증 기준

구조·기능·우선순위 결정이 바뀌면 관련 문서도 코드와 함께 갱신합니다.

## 현재 배포

- 버전: **v3.1.5**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 별도 hotfix `@require` 체인 사용 안 함

## 설치/업데이트

`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

## 현재 개발 단계

**v3.1 Core Stabilization / Grid stabilization**

- ContentIdentity
- PHOTO / VIDEO / CAROUSEL / REEL mediaType
- Verified Store + source/confidence/status/conflict
- 중복 요청 방지
- Event/Observer 기반 refresh
- Grid renderKey
- Grid Frozen UI 보존
- 회귀 fixture 도입

Grid 안정화 후 `v3.3 Content Types`로 진행합니다.

## Grid Frozen UI

- 썸네일 위 하단 정보영역 유지
- 1줄 고정 슬롯: 조회수 · 좋아요 · 댓글 · 리포스트
- 2줄 고정 슬롯: ER · 24h · 계정 대비 · 게시일
- 미확보 값은 슬롯을 제거하지 않고 `-`
- 각 슬롯은 다른 값의 길이에 밀리지 않는 독립 위치 사용
- Photo/Carousel에는 검증되지 않은 조회수 기반 숫자 미표시
- 우리 Grid 액션은 카드당 단일 미디어 저장 메뉴 버튼
- Reel/Video: 영상 다운로드 + 실제 카드 썸네일 다운로드
- Photo: 이미지 다운로드
- Carousel: 확보된 전체 slide 이미지 다운로드
- File System Access API 지원 환경에서는 사용자가 저장 폴더 선택 가능
- 미지원 환경에서는 브라우저 기본 Downloads 사용
- UI 세부 기준은 `GRID_BASELINE.md` 참고

## 개발 원칙

- Identity → Extractor → Verified Store → Metrics → UI 흐름을 지킵니다.
- UI마다 별도 데이터 파서를 만들지 않습니다.
- 값이 확인되지 않으면 임의 수치를 만들지 않습니다.
- 같은 값이면 DOM을 다시 그리지 않습니다.
- Grid Frozen UI는 명시적 변경 요청이 없으면 유지합니다.
- 좋아진 동작을 다른 기능 수정 때문에 되돌리지 않습니다.
- 수정 전 `PROJECT_PLAN.md`와 `STATUS.md`를 확인합니다.
