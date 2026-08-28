# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.3**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI + 누적 개선 원칙**

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
- REEL/VIDEO 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- 하단 Instagram 배너 겹침 처리
- `ri311:*` 캐시 유지

## 실기기에서 확인된 사항

- v3.1.0에서 **그리드 숫자 깜빡임 제거 확인**
- v3.1.1~3.1.2에서 하단 정보영역/조회수/mediaType 복구
- v3.1.2 화면에서 우리 이미지 버튼 + 우리 플레이 버튼 + Instagram 기본 미디어 표시가 함께 보여 중복되는 문제 확인
- 결론: Instagram 기본 미디어 종류 표시는 그대로 두고, 우리 Grid 액션은 **단일 미디어 메뉴 버튼**만 유지

## v3.1.3 — Grid 액션 정리

### 유지한 개선사항

- MutationObserver / History / scroll / media event 기반 refresh 유지
- 동일 shortcode pending request dedupe 유지
- renderKey 기반 변경된 카드만 갱신
- React anchor 재사용 시 현재 shortcode 재확인
- 기존 2줄 성과정보 유지
- REEL/VIDEO 검증 조회수/ER/24h/계정 대비 표시 유지
- PHOTO/CAROUSEL 잘못된 조회수 차단 유지
- conflict가 발생해도 마지막 정상값을 즉시 숨기지 않는 구조 유지

### 바뀐 Grid 액션

- 우리 기존 **이미지 아이콘 + 플레이 아이콘 2개 구조 제거**
- **단일 미디어 메뉴 버튼**으로 통합
- Instagram의 기본 Reel/Video/Carousel 표시 아이콘은 건드리지 않음
- 우리 버튼은 플레이 모양을 사용하지 않음
- 우리 버튼을 카드 **좌측 상단**으로 이동하여 Instagram 기본 우측 상단 표시와 중복을 줄임
- 버튼 크기 **28px**

### 미디어 메뉴

카드의 미디어 버튼을 누르면 현재 카드 shortcode 기준으로 작은 메뉴가 열립니다.

REEL / VIDEO:
- `영상 열기` — 확인된 직접 video URL이 있을 때
- `썸네일 열기`
- `링크 복사`

PHOTO:
- `이미지 열기`
- `링크 복사`

CAROUSEL:
- `대표 이미지`
- `링크 복사`

현재 v3.1.3에서는 검증되지 않은 Carousel 전체 슬라이드 URL을 만들어내지 않습니다. 전체 슬라이드 액션은 v3.3 Content Types에서 `media[]` 수집이 들어간 뒤 연결합니다.

- 영상 URL이 아직 확보되지 않은 경우 `영상 준비중` disabled 표시
- 카드 밖을 누르거나 스크롤/리사이즈/페이지 이동 시 메뉴 자동 닫기
- 메뉴 버튼 조작은 Instagram 카드 기본 이동을 발생시키지 않음

## 현재 Grid 표시 기준

1줄:
`조회수 / 좋아요 / 댓글 / 리포스트`

2줄:
`ER / 24h / 계정 대비 / 날짜`

- 조회수 파생값은 REEL/VIDEO로 확인된 경우에만 표시
- 24h는 실제 snapshot이 있을 때만 표시
- 계정 대비는 동일 계정 비교 데이터가 최소 5개일 때만 표시

## 현재 검증할 항목

1. 각 보이는 Grid 카드에서 우리 버튼이 **1개만** 보이는지
2. 우리 플레이 버튼이 완전히 사라졌는지
3. Instagram 기본 미디어 아이콘은 그대로인지
4. 미디어 메뉴의 영상/이미지/링크가 현재 카드와 정확히 연결되는지
5. 카드 자체 탭은 기존 Instagram 게시물 이동이 정상인지
6. 조회수/좋아요/댓글/ER/날짜 표시가 유지되는지
7. 숫자 깜빡임이 다시 생기지 않는지
8. React 카드 재사용 시 다른 카드 미디어가 열리지 않는지
9. PHOTO/CAROUSEL에 잘못된 조회수가 나타나지 않는지
10. 하단 앱 배너와 실제 겹치는 카드만 RI 영역이 숨겨지는지

## 다음 개발 단계

Grid의 위 회귀를 확인한 뒤 다음 순서로 진행합니다.

### v3.2 Grid 안정화 마감

- 검색/프로필/탐색 Grid mediaType 정확도 확인
- 미디어 메뉴 current-card identity 검증
- 버튼 위치/크기 실기기 미세조정
- fixture 보강

### v3.3 Content Types

- Photo
- Feed Video
- Carousel + slide list
- Caption
- Hashtags
- Mentions
- Media list

`media[]`가 안정화되면 Carousel의 `전체 이미지` 액션을 Grid 미디어 메뉴에 연결합니다.

그 이후 v3.4 Research Detail UI → v3.5 Comments 순서로 진행합니다.

## 작업 규칙

- 좋아진 동작을 기능 복구 때문에 과거 방식으로 되돌리지 않습니다.
- Grid Frozen UI는 명시적 요청 없이는 크게 재설계하지 않습니다.
- Instagram이 이미 제공하는 미디어 종류 표시를 중복 생성하지 않습니다.
- 우리 Grid 액션은 단일 미디어 메뉴 진입점으로 유지합니다.
- 조회수 기반 지표는 REEL/VIDEO로 확인된 경우에만 표시합니다.
- 검증되지 않은 값을 만들지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
