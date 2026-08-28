# Instagram Content Research Tool — Code Structure

이 문서는 실제 코드를 어떤 파일과 모듈로 나눌지 정하는 **구현 구조 기준**입니다.

- 제품/데이터/UI 전체 설계의 상위 기준은 `PROJECT_PLAN.md`
- 현재 배포/실기기 상태는 `STATUS.md`
- Grid UI 세부 동결 기준은 `GRID_BASELINE.md`
- 회귀 기준은 `tests/README.md`
- 이 문서는 **코드를 어디에 작성하고 어떤 책임을 갖게 할지**를 정의합니다.

설계 변경 시 기존 구조를 먼저 검토하고 필요한 부분만 누적 변경합니다. 현재 `ri-retry.user.js`를 한 번에 대규모 분해하지 않습니다.

---

# 1. 기본 원칙

1. **배포 파일은 계속 하나**입니다.
   - Tampermonkey 설치 대상은 `ri-retry.user.js` 하나만 유지합니다.
2. **개발 소스는 모듈로 분리**합니다.
   - 신규 기능부터 `src/`에 작성하고 build 결과를 userscript로 합칩니다.
3. **UI가 Instagram을 직접 파싱하지 않습니다.**
   - Instagram 읽기는 `instagram/` 계층에서 담당합니다.
4. **모든 화면이 동일 Store를 사용합니다.**
   - Grid / Reel / RI Panel / Download Manager가 같은 identity와 data를 사용합니다.
5. **다운로드 경로를 UI별·미디어별로 따로 만들지 않습니다.**
   - 모든 저장은 `media/download-manager.js`를 통과합니다.
6. **순수 계산과 DOM 조작을 섞지 않습니다.**
   - metrics/normalizer/store는 가능한 한 DOM 비의존으로 둡니다.
7. **기능 하나당 임시 hotfix 파일을 계속 만들지 않습니다.**
8. **대규모 rewrite 금지**
   - 기존 실기기에서 좋아진 기능을 유지하면서 단계적으로 이동합니다.

---

# 2. 목표 디렉터리 구조

```text
reels-inspector/
├─ README.md
├─ PROJECT_PLAN.md
├─ STATUS.md
├─ GRID_BASELINE.md
├─ CODE_STRUCTURE.md
│
├─ src/
│  ├─ bootstrap/
│  │  ├─ main.js
│  │  └─ userscript-meta.js
│  │
│  ├─ core/
│  │  ├─ constants.js
│  │  ├─ events.js
│  │  ├─ capability.js
│  │  ├─ route.js
│  │  └─ logger.js
│  │
│  ├─ instagram/
│  │  ├─ identity/
│  │  │  ├─ content-identity.js
│  │  │  └─ route-identity.js
│  │  ├─ extractors/
│  │  │  ├─ network-extractor.js
│  │  │  ├─ embedded-extractor.js
│  │  │  ├─ permalink-extractor.js
│  │  │  └─ dom-extractor.js
│  │  └─ normalizers/
│  │     ├─ post-normalizer.js
│  │     ├─ media-normalizer.js
│  │     └─ comment-normalizer.js
│  │
│  ├─ store/
│  │  ├─ verified-store.js
│  │  ├─ settings-store.js
│  │  ├─ snapshot-store.js
│  │  └─ persistence.js
│  │
│  ├─ metrics/
│  │  ├─ engagement.js
│  │  ├─ growth24h.js
│  │  └─ account-relative.js
│  │
│  ├─ media/
│  │  ├─ media-resolver.js
│  │  ├─ cover-resolver.js
│  │  ├─ carousel-resolver.js
│  │  ├─ download-manager.js
│  │  └─ download-strategies/
│  │     ├─ directory-writer.js
│  │     ├─ browser-download.js
│  │     └─ save-picker.js
│  │
│  ├─ ui/
│  │  ├─ shell/
│  │  │  ├─ global-ri-button.js
│  │  │  └─ ri-panel.js
│  │  ├─ grid/
│  │  │  ├─ grid-controller.js
│  │  │  ├─ grid-card.js
│  │  │  ├─ grid-metrics.js
│  │  │  └─ grid-media-menu.js
│  │  ├─ reel/
│  │  │  └─ reel-overlay.js
│  │  ├─ panel/
│  │  │  ├─ summary-tab.js
│  │  │  ├─ content-tab.js
│  │  │  ├─ comments-tab.js
│  │  │  ├─ analysis-tab.js
│  │  │  ├─ media-tab.js
│  │  │  └─ settings-tab.js
│  │  └─ shared/
│  │     ├─ toast.js
│  │     ├─ icons.js
│  │     ├─ safe-area.js
│  │     └─ formatters.js
│  │
│  ├─ comments/
│  │  ├─ collector.js
│  │  ├─ filters.js
│  │  └─ scorer.js
│  │
│  └─ analysis/
│     ├─ analysis-client.js
│     └─ job-store.js
│
├─ tests/
│  ├─ README.md
│  ├─ fixtures/
│  │  └─ core-cases.json
│  ├─ unit/
│  └─ regression/
│
├─ scripts/
│  └─ build.mjs
│
└─ ri-retry.user.js
```

폴더를 미리 빈 상태로 모두 만들지는 않습니다. 해당 단계의 실제 코드가 생길 때 파일을 생성합니다.

---

# 3. 계층별 책임

## 3.1 `bootstrap/`

애플리케이션 조립만 담당합니다.

### `main.js`

- 각 subsystem 초기화
- network hook 시작
- route/observer 시작
- Store 생성
- global RI UI mount
- Grid/Reel controller 연결

여기에는 Instagram parsing, 지표 계산, 다운로드 구현을 넣지 않습니다.

### `userscript-meta.js`

- userscript name/version/updateURL/downloadURL 등 metadata 생성용 정보
- build 시 `ri-retry.user.js` header에 반영

---

# 4. `core/` — 공통 기반

어떤 특정 화면이나 콘텐츠 타입에도 종속되지 않는 코드입니다.

### `constants.js`

- mediaType
- identity state
- field status
- source rank
- storage key

### `events.js`

공용 event bus / subscription.

예:

- `store:changed`
- `route:changed`
- `identity:changed`
- `settings:changed`
- `download:state`

### `capability.js`

브라우저 기능을 실제 runtime에서 검사합니다.

- directory picker
- save picker
- File System Access
- clipboard
- download attribute
- IndexedDB

`Android`, `Edge` 같은 이름만 보고 기능을 단정하지 않습니다.

### `route.js`

- Instagram SPA history 감지
- pathname 변경
- 현재 화면 종류 분류

### `logger.js`

- debug/warn/error 통합
- 향후 진단 모드 대응

---

# 5. `instagram/` — Instagram 읽기 전담

## `identity/`

### `content-identity.js`

`ContentIdentity`를 생성·갱신합니다.

- shortcode
- mediaId
- ownerId
- username
- mediaType
- productType
- canonicalUrl
- parent/child media
- slide index

### `route-identity.js`

현재 화면의 URL/route와 active media를 연결합니다.

---

## `extractors/`

Instagram raw data를 읽는 계층입니다.

### `network-extractor.js`

- fetch/XHR hook
- GraphQL/API JSON 감지
- raw object 수집

### `embedded-extractor.js`

- script JSON
- history state
- embedded state

### `permalink-extractor.js`

- `/reel/`, `/p/` HTML
- meta/embedded JSON

### `dom-extractor.js`

DOM이 유일하거나 가장 신뢰할 만한 항목만 읽습니다.

- active Reel
- native visible metrics
- Grid actual cover 비교 후보

UI 파일에서 직접 이런 selector를 만들지 않습니다.

---

## `normalizers/`

raw Instagram 구조 차이를 공통 모델로 변환합니다.

### `post-normalizer.js`

GraphQL/API/permalink 구조를 공통 `Post` patch로 변환.

### `media-normalizer.js`

- Reel/Video/Photo/Carousel
- media[]
- video URL
- image URL
- cover
- slideIndex

### `comment-normalizer.js`

여러 댓글 API 구조를 공통 Comment 모델로 변환.

---

# 6. `store/` — 검증 상태와 영속성

### `verified-store.js`

프로젝트의 핵심 Store.

- field provenance
- source/confidence/status
- conflict
- identity 연결
- subscribe/update

UI는 이 Store만 읽는 것을 원칙으로 합니다.

### `settings-store.js`

전역 공용 설정.

초기 대상:

- download mode
- selected directory metadata/handle reference
- permission state

향후:

- Grid display options
- analysis endpoint
- material-library preferences

### `snapshot-store.js`

- views snapshot
- 24h growth 자료
- account recent performance 자료

### `persistence.js`

- localStorage
- IndexedDB
- debounce/write migration

저장 기술을 각 Store에 흩어놓지 않습니다.

---

# 7. `metrics/` — 순수 계산

DOM이나 UI를 보지 않습니다.

### `engagement.js`

`(likes + comments + reposts) / views × 100`

### `growth24h.js`

18~32시간 범위 실제 snapshot 비교.

### `account-relative.js`

동일 계정 최근 콘텐츠 중앙값 대비 배수.

값이 부족하면 숫자를 만들어내지 않고 `null/unknown`을 반환합니다.

---

# 8. `media/` — 미디어와 다운로드

### `media-resolver.js`

현재 identity의 실제 media[]를 결정합니다.

### `cover-resolver.js`

영상 cover만 책임집니다.

- current media object direct cover
- Grid 본문 큰 이미지 대조
- music/album/avatar 제외

### `carousel-resolver.js`

- `carousel_media[]`
- `edge_sidecar_to_children`
- slide order
- duplicate 제거
- child media type

### `download-manager.js`

**모든 다운로드의 단일 진입점**입니다.

호출 예시 개념:

```text
download(media, destinationPolicy)
downloadBatch(media[], destinationPolicy)
```

역할:

1. Settings Store에서 전역 저장정책 조회
2. capability/permission 확인
3. 적절한 strategy 선택
4. filename 결정
5. single/batch 상태 관리
6. 실패 이유 반환

Grid와 RI Panel은 직접 Blob/file-system 코드를 갖지 않습니다.

## `download-strategies/`

### `directory-writer.js`

지정 폴더 write handle 방식.

### `browser-download.js`

브라우저 기본 Downloads 방식.

### `save-picker.js`

매번 저장 위치 선택이 실제 지원되는 환경에서 사용.

지정 폴더 mode가 실패했을 때 `browser-download.js`로 **자동 조용한 fallback 금지**입니다.

---

# 9. `ui/` — 표현만 담당

UI는 Store/Manager의 결과를 표시하고 사용자 intent를 전달합니다.

Instagram raw JSON parsing이나 Blob 저장 구현을 넣지 않습니다.

## `ui/shell/`

### `global-ri-button.js`

모든 Instagram 화면의 동일 RI 버튼.

### `ri-panel.js`

- panel shell
- tab switching
- 현재 ContentIdentity 연결
- close/open

---

## `ui/grid/`

### `grid-controller.js`

- 현재 Grid 카드 발견
- React DOM reuse 대응
- 카드 identity 연결
- 필요한 Store data 구독

### `grid-card.js`

- overlay mount/unmount
- 8개 slot DOM
- safe visibility

### `grid-metrics.js`

Grid용 Store value → 표시값 변환.

- 8개 고정 slot
- missing → `-`

### `grid-media-menu.js`

현재 카드에서 **무엇을 저장할지**만 선택합니다.

- video
- thumbnail
- image
- carousel all
- link copy

폴더/저장 위치 설정을 넣지 않습니다.

---

## `ui/reel/`

### `reel-overlay.js`

- views
- ER
- 24h
- account relative
- date

Instagram native likes/comments UI는 중복하지 않습니다.

---

## `ui/panel/`

공용 RI Panel의 탭별 rendering.

- `summary-tab.js`
- `content-tab.js`
- `comments-tab.js`
- `analysis-tab.js`
- `media-tab.js`
- `settings-tab.js`

`settings-tab.js`는 Settings Store만 수정하며 특정 카드 state에 종속되지 않습니다.

---

## `ui/shared/`

재사용 가능한 순수 UI helper.

- toast
- icon
- safe-area
- formatting

특정 Instagram extractor selector는 넣지 않습니다.

---

# 10. `comments/`

Instagram에서 raw comment를 읽는 부분은 `instagram/extractors`가 담당하고, 연구 로직은 여기서 담당합니다.

### `collector.js`

- pagination orchestration
- thread 구성

### `filters.js`

- emoji-only
- generic reaction
- mention-only
- spam/duplicate

### `scorer.js`

Research Score 계산.

- question
- purchase intent
- experience
- complaint
- tip
- engagement
- recurring need

---

# 11. `analysis/`

브라우저와 향후 분석 서버 사이의 경계입니다.

### `analysis-client.js`

- create analysis job
- fetch job status/result
- Instagram 로그인 쿠키 전송 금지

### `job-store.js`

- queued/processing/completed/failed 상태
- RI 버튼/Panel에 분석 상태 전달

---

# 12. 의존성 규칙

허용 흐름:

```text
bootstrap
   ↓
core
   ↓
instagram → normalizers
   ↓
store
   ↓
metrics / media / comments / analysis
   ↓
ui
```

실제 호출은 단방향을 유지합니다.

### 금지

- `store`가 `ui` import
- `instagram` extractor가 `ui` import
- `metrics`가 DOM 접근
- `ui/grid`가 fetch/XHR 직접 hook
- `ui/panel`이 localStorage 직접 write
- `grid-media-menu`가 directory API 직접 호출
- `download-manager`가 Grid DOM을 탐색

순환 import가 생기면 모듈 경계를 다시 설계합니다.

---

# 13. 데이터 흐름 예시

## Grid Reel 표시

```text
network-extractor
 → post-normalizer
 → verified-store
 → engagement/growth/account-relative
 → grid-controller
 → grid-metrics
 → grid-card
```

## Grid 영상 다운로드

```text
Grid 카드
 → grid-media-menu
 → media-resolver
 → download-manager
 → settings-store
 → download strategy
```

## Carousel 전체 저장

```text
parent identity
 → carousel-resolver
 → media[] slide 1..N
 → download-manager.downloadBatch()
 → 같은 destination에 1..N 저장
```

---

# 14. Build 구조

최종 목표는 다음입니다.

```text
src/*
  ↓
scripts/build.mjs
  ↓
ri-retry.user.js
```

Build 요구사항:

- userscript metadata 자동 삽입
- 외부 runtime dependency 없음
- self-contained single file
- production build 전 syntax check
- build 결과 version과 `STATUS.md` 배포 version 일치

초기에는 간단한 Node build script를 사용하고 필요 시 esbuild 같은 bundler를 도입합니다. 번들러 자체를 제품 runtime dependency로 만들지는 않습니다.

---

# 15. 테스트 분류

```text
tests/
├ fixtures/
├ unit/
└ regression/
```

### `fixtures/`

Instagram 구조 샘플과 과거 회귀 사례.

### `unit/`

DOM 없이 검증 가능한 모듈.

- normalizer
- Store merge/conflict
- metrics
- cover candidate scoring
- carousel normalization
- filename/destination policy

### `regression/`

기존 실기기 문제가 다시 발생하지 않는지 확인.

- shortcode 혼입
- Grid flicker
- 8 slot 위치
- music artwork가 video cover로 선택됨
- video/image destination 분리
- Carousel 다른 post image 혼입

실기기 acceptance는 계속 `tests/README.md` + `STATUS.md`에 기록합니다.

---

# 16. 현재 monolith에서 모듈 구조로 이동하는 순서

현재 `ri-retry.user.js`가 이미 실기기에서 동작하고 있으므로 **전체 코드를 한 번에 분해하지 않습니다.**

## 단계 A — v3.2 신규 Foundation부터 분리

먼저 새로 작성되는 기능을 아래 파일로 시작합니다.

```text
src/core/capability.js
src/store/settings-store.js
src/media/download-manager.js
src/media/download-strategies/*
src/ui/shell/global-ri-button.js
src/ui/shell/ri-panel.js
src/ui/panel/settings-tab.js
```

이 단계에서 기존 Grid/Extractor 코드를 대규모 이동하지 않습니다.

## 단계 B — Download 경로 통합

현재 monolith의 video/image/carousel 저장 호출을 모두 `download-manager.js`로 연결합니다.

실기기에서:

- video
- thumbnail
- photo
- carousel

저장정책이 동일하게 동작하는 것이 확인된 후 기존 중복 다운로드 함수를 제거합니다.

## 단계 C — UI 분리

전역 RI shell이 안정화된 다음:

- Grid UI
- Reel overlay
- panel tabs

를 차례대로 `src/ui/`로 이동합니다.

## 단계 D — Instagram extraction 분리

마지막으로 가장 회귀 위험이 큰:

- network hooks
- permalink parser
- embedded JSON
- identity
- Verified Store

를 fixture를 붙이면서 이동합니다.

## 단계 E — `src`를 실제 source of truth로 전환

다음 조건을 만족해야 합니다.

1. build output과 기존 기능 parity 확인
2. regression tests 통과
3. Android Edge 실기기 확인
4. `ri-retry.user.js`를 직접 수작업으로 고치는 흐름 중단

이 시점부터:

- `src/*` = 개발 원본
- `ri-retry.user.js` = generated deployment artifact

로 고정합니다.

---

# 17. 파일 크기/분리 기준

무조건 파일을 잘게 쪼개지는 않습니다.

새 파일로 분리할 기준:

- 책임이 명확히 다름
- 독립 테스트 가치가 있음
- 두 개 이상의 UI/기능에서 재사용
- 변경 주기가 다른 영역과 분리하는 것이 회귀를 줄임

반대로 20~30줄짜리 helper 하나를 위해 폴더/파일을 계속 만드는 식의 과분할은 피합니다.

---

# 18. v3.2에서 실제로 먼저 만들 파일

첫 구현 세트는 아래로 제한합니다.

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

그리고 기존 `ri-retry.user.js`의 Grid 미디어 메뉴만 이 새 기반을 사용하도록 단계적으로 연결합니다.

**Grid 8슬롯/cover identity/network/store 구조는 이 첫 단계에서 재작성하지 않습니다.**
