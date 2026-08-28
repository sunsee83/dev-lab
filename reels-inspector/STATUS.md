# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. 구조/제품 기준은 `PROJECT_PLAN.md`, 현재 구현 상태와 다음 작업은 이 문서를 기준으로 확인합니다.

## 현재 배포

- 버전: **v3.1.0**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI — 외형과 정보 배치 유지**

## v3.1 Core Stabilization — Phase 1

### 이번에 반영한 항목

- 900ms `setInterval` 전체 polling 제거
- MutationObserver / History / scroll / video event 기반 refresh 도입
- 동일 shortcode permalink 요청 `pending` dedupe 추가
- Grid `renderKey` 추가: 값이 같으면 row text를 다시 쓰지 않음
- React가 anchor를 재사용할 때 현재 href의 shortcode를 다시 확인
- 새 캐시 namespace `ri31:*` 사용으로 이전 오염 데이터와 분리
- Verified Store 1차 도입
  - `value`
  - `source`
  - `confidence`
  - `status`
  - `updatedAt`
- 데이터 출처 우선순위 도입: network > embedded > dom > permalink > legacy
- `mediaId`, `ownerId`, `mediaType`, `productType` 1차 수집
- JSON nested media 탐색 시 다른 shortcode child 데이터의 혼입 방지 강화
- 미디어 URL 탐색 조건을 기존보다 엄격하게 제한
- 상세 패널을 현재 Store 값으로 재렌더하도록 변경
- 현재 Reel shortcode가 없으면 상세 패널에 `현재 릴스 식별 중` 상태 표시
- 계정 대비 배수는 최근 저장 순서 기준 20개를 사용하도록 수정
- localStorage의 main item cache write debounce 적용

### 유지한 항목

- 기존 3열 Instagram 그리드
- 그리드 1줄: 조회수 / 좋아요 / 댓글 / 리포스트
- 그리드 2줄: ER / 24h / 계정 대비 / 날짜
- 기존 글자 크기/색/배치
- 이미지 버튼
- 순수 영상 버튼
- `/p/`에서는 조회수 기반 지표 미표시
- Reel 화면의 직접 지표 배치
- 리서치 상세 패널 및 하단 닫기 버튼
- 업데이트 URL

### 아직 검증이 필요한 항목

실제 Android Edge + Instagram에서 다음을 확인해야 합니다.

1. 프로필/검색 그리드 숫자 깜빡임이 사라졌는지
2. 스크롤 중 기존 그리드 UI 배치가 그대로인지
3. 같은 카드 숫자가 다른 카드에 이동하지 않는지
4. 사진/카드뉴스에 조회수가 나타나지 않는지
5. Reel 상세 패널이 처음 비어 있어도 데이터 도착 후 자동으로 채워지는지
6. Reel 이동 시 이전 Reel 상세 데이터가 남지 않는지
7. 순수 영상/썸네일 버튼이 기존처럼 동작하는지

## 다음 작업

### v3.1 Phase 2

실기기 검증 결과를 받은 뒤 다음 순서로 진행합니다.

1. ContentIdentity 판정 강화
2. `PHOTO / VIDEO / CAROUSEL / REEL` 실제 mediaType 검증
3. Verified Store conflict 처리 강화
4. history/embedded scan 비용 최적화
5. 회귀 테스트 fixture 추가
6. v3.1 Core 완료 판정

그 다음에만 `v3.2 Grid 안정화`로 이동합니다.

## 작업 규칙

- 새 기능보다 Core 정확성을 우선합니다.
- 그리드 Frozen UI는 명시적 요청 없이는 바꾸지 않습니다.
- 검증되지 않은 값을 화면에 만들지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 버전 수정 후 이 문서를 갱신합니다.
