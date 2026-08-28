# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. Grid UI 세부 기준은 `GRID_BASELINE.md`, 실제 코드 분류/의존성 기준은 `CODE_STRUCTURE.md`, 회귀 기준은 `tests/README.md`를 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.6**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 현재 코드 단계: **v3.1 Core/Grid 안정화**
- 다음 설계 단계: **v3.2 UI/Foundation**

## 누적 보존 대상

- 숫자 깜빡임 제거
- MutationObserver / History / scroll / media event 기반 갱신
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- 기존 3열 Grid 크기/배치
- 썸네일 위 하단 2줄 정보영역
- 8개 지표 독립 슬롯 구조
- REEL/VIDEO 검증 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram 기본 media-type 아이콘 유지
- 우리 Grid 액션은 카드당 단일 버튼
- 하단 Instagram 배너와 실제 겹치는 카드만 RI 영역 숨김
- `ri311:*` 캐시 유지

## v3.1.6 실기기 확인

확인된 개선:

- Video/Reel `썸네일 다운로드`가 실제 영상 cover로 정상 저장되는 사례 확인
- Grid 숫자 깜빡임 제거 상태 유지

현재 확인된 저장 구조 문제:

1. Grid 카드 팝업에서 폴더를 선택하면 그 설정이 해당 카드만의 설정처럼 보이지만 실제로는 이후 영상 다운로드에도 공통으로 사용됨.
2. 영상은 선택한 폴더에 저장되지만 이미지 다운로드는 기존 기본 Downloads로 빠지는 사례가 있음.
3. 즉 저장정책이 미디어 종류별로 동일한 경로를 거치지 않고 있어 결과가 일관되지 않음.
4. 카드별 메뉴에 전역 성격의 저장 위치 설정이 들어가 있어 UI 의미도 맞지 않음.

이 문제는 개별 patch로 계속 보정하지 않고 v3.2에서 **공통 Download Manager + 전역 설정**으로 구조를 정리한다.

## 확정된 전체 UI 역할

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

### 전역 RI 버튼

현재 Reel에서 사용하는 RI 도구 버튼을 모든 Instagram 화면에 표시하는 전역 진입점으로 승격한다.

표시 대상:

- 프로필
- 검색
- 탐색
- Grid
- Reel
- 일반 Post 상세
- Photo / Video / Carousel

기본 위치는 **우측 하단 safe area**이며 Instagram 하단 navigation / `앱 사용` 배너와 겹치면 자동으로 위로 이동한다.

### 공용 RI Panel

탭 shell:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

- 현재 콘텐츠가 있으면 해당 콘텐츠의 상세 조사 정보를 표시
- `설정`은 콘텐츠와 무관한 전역 설정
- 패널은 Store 변경을 구독하여 live update

## Grid 기준

### 8개 고정 슬롯

1줄:

`조회수 | 좋아요 | 댓글 | 리포스트`

2줄:

`ER | 24h | 계정 대비 | 날짜`

- 각 슬롯은 독립된 고정 x 영역
- 다른 숫자 길이에 위치가 밀리지 않음
- 값이 없으면 해당 자리 `-`
- PHOTO/CAROUSEL은 `▶-`

### 카드 미디어 메뉴

v3.2에서 카드 메뉴에서는 **저장 위치 설정을 제거**하고 해당 콘텐츠의 액션만 둔다.

REEL / VIDEO:
- `영상 다운로드`
- `썸네일 다운로드`
- `링크 복사`

PHOTO:
- `이미지 다운로드`
- `링크 복사`

CAROUSEL:
- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- `링크 복사`

## 공통 Download Manager 설계

모든 저장 액션은 하나의 manager를 통과한다.

```text
Grid / RI Panel
      ↓
Media Action
      ↓
Download Manager
      ↓
전역 저장정책
```

설정 탭에서 capability에 따라 제공:

- `지정 폴더`
- `기본 Downloads`
- `매번 선택`

적용 대상:

- 영상
- 영상 cover/썸네일
- 사진
- 캐러셀 전체 slide
- 향후 STT/OCR export

중요 규칙:

- 영상만 지정 폴더, 사진만 Downloads처럼 미디어별로 저장정책이 갈라지지 않음
- 지정 폴더 모드에서 쓰기 실패 시 조용히 기본 Downloads로 fallback하지 않음
- 실패를 표시하고 사용자가 재시도/기본 다운로드를 명시적으로 선택하게 함
- 기능 지원 여부는 `Android` 같은 플랫폼명으로 단정하지 않고 실제 API/권한을 runtime에서 검사

## Carousel 전체 다운로드

ZIP은 기본 방식으로 사용하지 않는다.

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

에서 parent shortcode의 slide를 순서대로 구성한다.

`전체 이미지 다운로드 (N)` 한 번으로:

`slide_01 → slide_02 → ... → slide_N`

개별 파일을 저장한다.

선택 폴더 쓰기가 가능한 환경에서는 향후 게시물별 하위 폴더로 batch를 묶는 옵션을 고려할 수 있다.

## 코드 파일 구조 — 확정

상위 제품 설계와 별도로 실제 구현 파일 책임은 `CODE_STRUCTURE.md`에 고정한다.

목표 계층:

```text
src/
├ bootstrap/    # subsystem 조립/시작
├ core/         # constants/events/capability/route
├ instagram/    # identity/extractor/normalizer
├ store/        # Verified/Settings/Snapshot/Persistence
├ metrics/      # 순수 계산
├ media/        # resolver/cover/carousel/Download Manager
├ ui/           # global RI/Grid/Reel/Panel
├ comments/     # 댓글 연구 로직
└ analysis/     # 분석 서버 client/job
```

원칙:

- `ui`에서 Instagram raw parsing 금지
- `metrics`에서 DOM 접근 금지
- `store`가 `ui`를 import하지 않음
- Grid 메뉴가 directory/file-system API를 직접 호출하지 않음
- 모든 저장은 `media/download-manager.js`를 통과
- 순환 의존성 금지
- Tampermonkey 배포는 계속 `ri-retry.user.js` 하나

현재 monolith를 한 번에 분해하지 않는다. 실기기에서 검증된 v3.1 기능을 보호하기 위해 **신규 v3.2 Foundation부터 모듈로 작성**하고 단계적으로 기존 코드를 연결한다.

v3.2에서 먼저 만들 파일:

```text
src/core/capability.js
src/store/settings-store.js
src/media/download-manager.js
src/media/download-strategies/directory-writer.js
src/media/download-strategies/browser-download.js
src/media/download-strategies/save-picker.js
src/ui/shell/global-ri-button.js
src/ui/shell/ri-panel.js
src/ui/panel/settings-tab.js
```

이 첫 단계에서는 Grid 8슬롯, cover identity, network extractor, Verified Store를 대규모 재작성하지 않는다.

## v3.2 — UI/Foundation 실행 순서

1. `CODE_STRUCTURE.md` 기준 신규 Foundation 소스 모듈 생성
2. capability detection
3. Settings Store
4. 공통 Download Manager + strategies
5. 전역 RI 버튼을 모든 Instagram 화면에 표시
6. RI 버튼 위치를 우측 하단 safe area로 통일
7. 공용 RI Panel shell 생성
8. `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` 탭 shell
9. Grid 카드 메뉴에서 저장 위치 설정 제거
10. 지정 폴더 / 기본 Downloads / 매번 선택 정책
11. 영상·썸네일·사진·Carousel 저장경로 통합
12. Grid 8개 고정 슬롯 실기기 마감
13. cover identity 회귀 마감
14. Carousel 개별 batch 다운로드 안정화
15. regression test/실기기 검증

그 다음 `v3.3 Content Types`에서 공통 Post/media 모델을 완성한다.

## v3.3 이후

### v3.3 Content Types

- Reel
- Feed Video
- Photo
- Carousel + slide media
- Caption
- Hashtags
- Mentions
- collaborators/location
- 공통 `media[]`

### v3.4 Research Detail UI

- 요약/콘텐츠/미디어 실제 데이터 연결
- 콘텐츠 타입별 UI
- 상태표시

### v3.5 Comments

- 댓글/답글
- thread 보존
- low-value filter
- Research Score
- 참고 댓글 UI

### 이후

- v3.6 Research Features
- v4.x Analysis Server / STT / OCR / Alignment / AI
- v5.0 MV3 Extension

## 작업 규칙

- 기존 설계를 먼저 읽고 새 요구사항을 현재 구조에 통합한다.
- 바뀐 설계를 반영한다고 관련 없는 기존 설계를 삭제하지 않는다.
- 실기기에서 좋아졌다고 확인된 동작은 누적 보존한다.
- Grid Frozen UI를 관련 없는 기능 수정 때문에 되돌리지 않는다.
- 카드별 메뉴에 전역 설정을 반복 배치하지 않는다.
- 저장정책은 미디어 종류별로 분기하지 않고 공통 manager에서 처리한다.
- 실제 코드 작성 위치/의존성은 `CODE_STRUCTURE.md`를 따른다.
- 검증되지 않은 값을 만들지 않는다.
- hotfix `@require` 체인은 다시 만들지 않는다.
- 구조/UI/우선순위/파일 책임이 바뀌면 `PROJECT_PLAN.md`, `CODE_STRUCTURE.md`와 관련 문서를 코드보다 먼저 또는 같은 작업에서 갱신한다.
