# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.2**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI**

## 개발 방식 보정

앞으로는 **현재 좋아진 상태를 기준으로 필요한 부분만 추가 수정**합니다.

- 이전 버전 전체로 되돌리는 방식 금지
- `현재 승인된 baseline + 필요한 delta`만 적용
- 한 기능 복구 때문에 이미 해결된 기능을 되돌리지 않음
- 실기기에서 좋아졌다고 확인된 항목은 누적 보존
- 새 수정으로 기존 승인 항목이 나빠지면 regression으로 처리

현재 누적 보존 대상:

- 숫자 깜빡임 제거
- 이벤트 기반 갱신
- 같은 값 DOM 재작성 방지
- 기존 3열 Grid 크기/배치
- 하단 2줄 정보영역
- 이미지/썸네일 액션
- REEL/VIDEO 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- 하단 Instagram 배너 겹침 처리

## 실기기에서 확인된 사항

- v3.1.0에서 **그리드 숫자 깜빡임 제거 확인**
- v3.1.1에서 하단 정보영역은 복원했지만, 일부 카드에서 이미지 액션/조회수/영상 판정이 빠지는 회귀가 확인됨
- 원인: Grid 표시 조건이 URL의 `/reel/` 여부에 과도하게 의존하고, conflict 상태의 마지막 정상값을 UI에서 숨기던 구조

## v3.1.2 반영

### Frozen Grid 복구

- 이미지/썸네일 아이콘은 **모든 Grid 카드에 항상 생성/유지**
- Reel/Video로 확인된 카드에는 순수 영상 아이콘 표시
- 조회수는 URL만 보지 않고 Store `mediaType` + DOM media indicator + Reel URL을 함께 사용
- `/p/` 경로라도 실제 `VIDEO`로 확인되면 조회수/ER/24h/계정 대비 표시 가능
- `PHOTO` / `CAROUSEL`에는 검증되지 않은 조회수 기반 지표를 표시하지 않음
- 기존 2줄 정보 구조와 하단 반투명 정보영역 유지
- 기존 3열 Grid 크기/Instagram 카드 클릭 동작 유지

### ContentIdentity / mediaType

표준 mediaType:

- `PHOTO`
- `VIDEO`
- `CAROUSEL`
- `REEL`

판정 근거 우선순위:

1. Network/embedded JSON의 `media_type`, `product_type`
2. 저장된 Verified Store mediaType
3. 현재 카드 DOM의 video/Reel indicator
4. URL은 보조 근거

Permalink가 `/p/`여도 `og:video`가 실제 존재하는 경우 VIDEO 후보로 처리하고, 그 경우에만 view key를 탐색합니다.

### Verified Store

- source 우선순위 유지: network > embedded > dom > permalink > legacy
- 비현실적 급락/급증은 conflict 기록
- **conflict가 발생해도 마지막 정상 검증값은 화면에서 즉시 사라지지 않도록 변경**
- 새 값이 검증되면 conflict 해소
- v3.1.1의 `ri311:*` 캐시를 그대로 사용하여 설치 시 기존 정상 수치를 불필요하게 초기화하지 않음

### 이벤트/성능

- 900ms polling은 다시 사용하지 않음
- MutationObserver / History / scroll / media event 기반 refresh 유지
- 동일 shortcode pending request dedupe 유지
- embedded/history scan throttle 유지
- Store write debounce 유지
- renderKey 기반 변경된 Grid만 갱신

## 현재 유지되는 기능

- 3열 Instagram Grid
- Grid 1줄: 조회수 / 좋아요 / 댓글 / 리포스트
- Grid 2줄: ER / 24h / 계정 대비 / 날짜
- 이미지/썸네일 액션
- Reel/Video 순수 영상 액션
- Reel 화면 직접 지표
- 리서치 상세 패널
- 하단 닫기 버튼
- 직접 GitHub raw 업데이트 URL

## 현재 검증할 항목

1. 모든 보이는 Grid 카드 우측 상단에 이미지 아이콘이 유지되는지
2. Reel/Video 카드에 조회수가 다시 표시되는지
3. Reel/Video 카드에 순수 영상 아이콘이 표시되는지
4. Photo/Carousel에는 잘못된 조회수가 나타나지 않는지
5. 기존 하단 2줄 정보영역이 그대로인지
6. 숫자 깜빡임이 다시 생기지 않는지
7. `앱 사용` 배너와 겹치는 카드만 RI 영역이 숨겨지는지
8. Reel 상세창 데이터가 Store 도착 후 갱신되는지

## 다음 개발 단계

위 Grid 회귀가 통과하면 v3.1 Core를 완료 판정하고 다음 순서로 진행합니다.

### v3.2 Grid 안정화 마감

- 검색/프로필/탐색 Grid mediaType 회귀 확인
- Grid 액션/수치 정확도 검증
- fixture 보강

### v3.3 Content Types

새 UI보다 Store 수집을 먼저 확장합니다.

- Photo
- Feed Video
- Carousel + slide list
- Caption
- Hashtags
- Mentions
- Media list

그 이후 v3.4 Research Detail UI → v3.5 Comments 순서로 진행합니다.

## 작업 규칙

- Grid Frozen UI는 명시적 요청 없이는 바꾸지 않습니다.
- 이미지 액션은 모든 Grid 카드에서 유지합니다.
- 조회수 기반 지표는 Reel/Video로 확인된 경우에만 표시합니다.
- 새 기능보다 현재 콘텐츠 식별 정확성을 우선합니다.
- 검증되지 않은 값을 만들지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
