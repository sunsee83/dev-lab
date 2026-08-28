# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.4**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI + 누적 개선 원칙**

## 누적 보존 대상

- 숫자 깜빡임 제거
- MutationObserver / History / scroll / media event 기반 갱신
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- 기존 3열 Grid 크기/배치
- 썸네일 위 하단 2줄 정보영역
- REEL/VIDEO 검증 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram 기본 media-type 아이콘 유지
- 우리 Grid 액션은 카드당 단일 버튼
- 하단 Instagram 배너와 실제 겹치는 카드만 RI 영역 숨김
- `ri311:*` 캐시 유지

## v3.1.4 — Grid 표시/저장 개선

### 1. 하단 2줄을 항상 고정 슬롯으로 표시

콘텐츠마다 확보된 수치가 달라도 항목 자체를 제거하지 않습니다.

1줄 고정 순서:

`조회수 / 좋아요 / 댓글 / 리포스트`

예:

`▶59만 ♥2.1K ●174 ↻-`

2줄 고정 순서:

`ER / 24h / 계정 대비 / 날짜`

예:

`0.38% - - 08/09`

규칙:

- 미확보 값은 `-`로 표시
- PHOTO/CAROUSEL은 조회수를 추정하지 않고 `▶-`
- 조회수가 없는 콘텐츠의 ER/24h/계정 대비도 `-`
- 날짜 미확보 시 마지막 슬롯도 `-`
- 기존 renderKey 구조는 유지하여 값이 같으면 다시 쓰지 않음

### 2. Grid 미디어 메뉴 다운로드

카드당 우리 버튼은 계속 **1개만** 유지합니다. Instagram 기본 플레이/Reel/Carousel 표시는 건드리지 않습니다.

REEL / VIDEO:
- `영상 다운로드`
- `썸네일 다운로드`
- `링크 복사`

PHOTO:
- `이미지 다운로드`
- `링크 복사`

CAROUSEL:
- `대표 이미지 다운로드`
- `링크 복사`

다운로드 방식:

1. media URL 확보 확인
2. fetch → Blob → `download` 저장 우선 시도
3. CDN CORS 등으로 실패하면 direct download 방식으로 fallback

검증되지 않은 video URL은 만들지 않으며, 없으면 `영상 준비중` 비활성 상태를 유지합니다.

Carousel 전체 이미지 다운로드는 `media[]` 슬라이드 수집이 구현되는 v3.3에서 연결합니다.

## 이번 수정에서 유지한 항목

- 우리 플레이 버튼은 다시 추가하지 않음
- 단일 미디어 메뉴 버튼 위치/크기 유지
- 기존 조회수/좋아요/댓글/리포스트 수집 로직 유지
- Verified Store / conflict 처리 유지
- 24h snapshot 계산 방식 유지
- 계정 대비 최근 20개/최소 5개 기준 유지
- Reel 상세 패널은 이번 Grid 수정에서 재설계하지 않음

## 실기기 검증 항목

1. 모든 보이는 카드에 하단 1줄/2줄이 항상 존재하는지
2. 값이 없을 때 해당 위치에 `-`가 보이는지
3. REEL/VIDEO의 조회수 숫자가 기존처럼 유지되는지
4. PHOTO/CAROUSEL에서 `▶-`이고 가짜 조회수 숫자가 없는지
5. 우리 버튼이 카드당 1개만 보이는지
6. Instagram 기본 우측 상단 미디어 아이콘은 그대로인지
7. REEL/VIDEO 메뉴에 `영상 다운로드 / 썸네일 다운로드 / 링크 복사`가 보이는지
8. PHOTO는 `이미지 다운로드`, CAROUSEL은 `대표 이미지 다운로드`가 보이는지
9. 다운로드가 누른 현재 카드의 미디어와 정확히 연결되는지
10. 숫자 깜빡임이 다시 생기지 않는지
11. React 카드 재사용 시 다른 카드 수치/미디어가 섞이지 않는지
12. 하단 앱 배너와 겹치는 카드만 RI 영역이 숨겨지는지

## 다음 개발 단계

Grid 회귀를 실기기에서 확인한 뒤 다음 순서로 진행합니다.

### v3.2 Grid 안정화 마감

- 검색/프로필/탐색 Grid mediaType 정확도 확인
- 다운로드 current-card identity 검증
- 다운로드 fallback 실기기 검증
- 고정 슬롯 가독성 미세조정

### v3.3 Content Types

- Photo
- Feed Video
- Carousel + slide list
- Caption
- Hashtags
- Mentions
- Media list

`media[]`가 안정화되면 Carousel의 **전체 이미지 다운로드**를 Grid 미디어 메뉴에 연결합니다.

그 이후 v3.4 Research Detail UI → v3.5 Comments 순서로 진행합니다.

## 작업 규칙

- 좋아진 동작을 기능 복구 때문에 과거 방식으로 되돌리지 않습니다.
- Grid Frozen UI는 명시적 요청 없이는 크게 재설계하지 않습니다.
- Instagram 기본 미디어 종류 표시를 중복 생성하지 않습니다.
- 우리 Grid 액션은 단일 미디어 저장 메뉴 진입점으로 유지합니다.
- 미확보 값은 숨겨서 레이아웃을 바꾸지 않고 `-`로 표시합니다.
- 검증되지 않은 값을 만들지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
