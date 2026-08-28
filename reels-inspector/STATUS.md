# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.1**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI**

## 실기기에서 확인된 사항

- v3.1.0에서 **그리드 숫자 깜빡임 제거 확인**
- 기존 하단 정보영역 표현은 유지/복원 필요 → v3.1.1에서 반영

## v3.1 Core Stabilization — Phase 2 반영

### Grid

- 기존 2줄 정보 구조 유지
- 썸네일 하단 정보영역을 투명→반투명 그라데이션으로 명확히 복원
- 별도 흰색/회색 정보바는 만들지 않음
- `앱 사용 / Open app / Use app` 하단 고정 배너와 겹치는 카드의 RI 오버레이/액션 숨김
- 같은 값이면 DOM text를 다시 쓰지 않는 renderKey 구조 유지
- React anchor 재사용 시 현재 href shortcode 재확인 유지
- `/p/` Photo/Carousel에는 조회수 기반 지표 미표시 유지

### ContentIdentity / mediaType

- `media_type=1` → `PHOTO`
- `media_type=2` → `VIDEO`
- `media_type=8` 또는 carousel media → `CAROUSEL`
- `product_type=clips/reel` → `REEL`
- `mediaId`, `ownerId`, `username`, `productType`, canonical URL 기반 identity 유지
- Reel 후보 fallback은 계정명만으로 선택하지 않고 반응 지표 일치까지 요구하도록 강화

### Verified Store

- source 우선순위 유지: network > embedded > dom > permalink
- metric 급락 및 짧은 시간의 비현실적 급증을 conflict로 처리
- conflict 필드는 화면의 확정값으로 사용하지 않음
- 미디어 URL은 동적 필드로 취급

### 성능

- 동일 shortcode pending request dedupe 유지
- embedded/history 전체 탐색을 최소 700ms 단위로 제한
- history signature가 바뀐 경우에만 history state 재탐색
- main item cache write debounce 유지

### 회귀 테스트 기반

- `tests/fixtures/core-cases.json` 추가
- `tests/README.md` 추가
- `GRID_BASELINE.md` 추가

## 현재 유지되는 기능

- 3열 Instagram Grid
- 1줄: 조회수 / 좋아요 / 댓글 / 리포스트
- 2줄: ER / 24h / 계정 대비 / 날짜
- 이미지/썸네일 액션
- 순수 영상 액션
- Reel 화면 직접 지표
- 리서치 상세 패널
- 하단 닫기 버튼
- 직접 GitHub raw 업데이트 URL

## 다음 실기기 검증

1. 하단 Grid 정보영역이 기존 의도대로 보이는지
2. 숫자 깜빡임이 계속 없는지
3. `앱 사용` 배너 뒤로 숫자가 비치지 않는지
4. Photo/Carousel에 조회수가 표시되지 않는지
5. Reel 이동 시 다른 Reel 데이터가 섞이지 않는지
6. Reel 상세창에 조회수/ER/게시일 등이 실제로 채워지는지
7. 이미지/순수 영상 액션이 정상인지

## 다음 개발 단계

위 회귀 검증을 통과하면 **v3.2 Grid 안정화 완료 판정 → v3.3 Content Types**로 진행합니다.

v3.3에서는 새 UI를 먼저 만들지 않고 다음 데이터를 Store에 추가합니다.

- Photo
- Feed Video
- Carousel 및 slide list
- Caption
- Hashtags
- Mentions
- Media list

## 작업 규칙

- Grid Frozen UI는 명시적 요청 없이는 바꾸지 않습니다.
- 새 기능보다 현재 콘텐츠 식별 정확성을 우선합니다.
- 검증되지 않은 값은 만들지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
