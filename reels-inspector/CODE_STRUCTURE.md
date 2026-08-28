# Instagram Content Research Tool — Code Structure

이 문서는 실제 코드를 **어디에 작성하고, 누가 어떤 상태와 기능을 소유하며, 모듈이 어떻게 통신하고, 중복과 파일 비대화를 어떻게 구조적으로 막을지** 정하는 구현 기준입니다.

상위 기준:

- `PROJECT_PLAN.md` — 제품/데이터/UI/로드맵
- `STATUS.md` — 현재 배포/실기기 상태
- `GRID_BASELINE.md` — Grid Frozen UI 기준
- `tests/README.md` — 회귀/실기기 승인 기준
- `CODE_STRUCTURE.md` — 코드 구조/모듈 계약/build/migration 기준

설계가 바뀌면 기존 결정을 먼저 확인하고 현재 구조에 통합합니다. 실기기에서 좋아진 기능을 되돌리거나 임시 override/hotfix 층을 계속 쌓는 방식은 사용하지 않습니다.

---

# 1. 설계 목표

파일을 많이 만드는 것이 목적이 아닙니다.

이 구조의 목표는 다음 다섯 가지입니다.

1. **Single Owner** — 하나의 책임은 한 모듈만 소유한다.
2. **Single Data Flow** — 동일 데이터가 UI별로 따로 수집/계산되지 않는다.
3. **Single Side-Effect Path** — 저장, persistence, Instagram hook 같은 부작용은 정해진 경로만 사용한다.
4. **Small Public API** — 모듈끼리는 작은 명시적 API로만 통신한다.
5. **Progressive Modularization** — 실제 책임이 생길 때만 파일을 분리한다.

최종 배포는 계속 Tampermonkey용 `ri-retry.user.js` **한 파일**입니다. 개발 원본만 `src/*`로 분리합니다.

---

# 2. v3.2 실제 소스 구조

현재 v3.2.0 기준 실제 구조입니다.

```text
reels-inspector/
├─ README.md
├─ PROJECT_PLAN.md
├─ STATUS.md
├─ GRID_BASELINE.md
├─ CODE_STRUCTURE.md
├─ .gitignore
├─ package.json
│
├─ src/
│  ├─ version.js               # 제품 버전의 단일 원본
│  ├─ main.js                  # composition root
│  ├─ legacy-runtime.js        # 전환기간 임시 canonical runtime
│  │
│  ├─ migration/
│  │  └─ legacy-store-adapter.js  # legacy Verified cache → 새 계층 read adapter
│  │
│  ├─ core/
│  │  ├─ app.js                # AppContext/event/lifecycle
│  │  └─ capability.js         # browser capability/permission
│  │
│  ├─ store/
│  │  └─ settings-store.js     # 전역 설정 + 자체 persistence
│  │
│  ├─ media/
│  │  ├─ media-resolver.js     # 새 Grid action의 media/cover 선택
│  │  └─ download-manager.js   # 모든 새 저장의 단일 진입점
│  │
│  └─ ui/
│     ├─ grid.js               # 기존 Grid button intent → 새 action menu
│     ├─ ri-panel.js           # 전역 RI button + panel
│     ├─ toast.js              # 공용 사용자 결과 알림
│     └─ styles.js             # RI 공용 CSS
│
├─ tests/
│  ├─ README.md
│  ├─ fixtures/
│  ├─ unit/
│  └─ regression/
│
├─ scripts/
│  ├─ build.mjs
│  └─ check.mjs
│
└─ ri-retry.user.js            # generated deployment artifact
```

`legacy-runtime.js`는 backup 파일이 아닙니다. **현재 검증된 v3.1.6 계열 런타임을 src 체계로 옮기기 위한 임시 canonical migration module**입니다.

규칙:

- 새 기능을 `legacy-runtime.js`에 계속 추가하지 않는다.
- 신규 v3.2 기능은 새 owner module에 작성한다.
- 기존 기능을 하나씩 새 owner module로 이동할 때 `legacy-runtime.js`에서 원래 구현을 제거한다.
- migration이 끝나면 `legacy-runtime.js` 자체를 삭제한다.
- `migration/legacy-store-adapter.js`도 Verified Store migration 완료 후 삭제한다.
- root `ri-retry.user.js`는 build output이며 직접 수정하지 않는다.

이 방식으로 **이중 source-of-truth를 제거하고 migration 중복 기간을 제한**합니다.

---

# 3. Runtime Architecture

런타임은 `main.js` 하나에서 조립합니다.

현재 실제 조립 구조:

```text
main.js
  │
  ├─ VERSION --------------------------- version.js
  ├─ createApp() ----------------------- core/app.js
  ├─ detectCapabilities() -------------- core/capability.js
  ├─ createSettingsStore() ------------- store/settings-store.js
  ├─ createDownloadManager() ----------- media/download-manager.js
  ├─ createLegacyStoreAdapter() -------- migration/legacy-store-adapter.js
  ├─ boot preserved runtime ------------ legacy-runtime.js import
  ├─ mountGridActions() ---------------- ui/grid.js
  └─ mountRiPanel() -------------------- ui/ri-panel.js
```

핵심 원칙은 **Dependency Injection**입니다.

하위 모듈이 상위 모듈을 import해서 dependency를 찾지 않습니다. `main.js`가 필요한 dependency를 만들어 전달합니다.

현재 개념:

```js
const app = createApp({ version: VERSION });
const capabilities = detectCapabilities(globalThis);
const settings = createSettingsStore({ capabilities, ... });
const downloads = createDownloadManager({ capabilities, settings, ... });
const legacyStore = createLegacyStoreAdapter(...);

app.services = { capabilities, settings, downloads };
app.adapters.legacyStore = legacyStore;

mountGridActions({ app, adapter: legacyStore, downloads, capabilities });
mountRiPanel({ app, settings, capabilities, downloads, adapter: legacyStore });
```

불필요한 service locator나 거대한 global object를 새로 만들지 않습니다.

---

# 4. AppContext — 공용 런타임 연결점

`core/app.js`는 앱 전체를 연결하는 작은 runtime context를 소유합니다.

```text
AppContext
├ version
├ events
├ route
├ currentIdentity
├ services
│  ├ capabilities
│  ├ settings
│  └ downloads
└ adapters
   ├ legacyStore       # migration 중에만 존재
   ├ grid              # 현재 mount lifecycle reference
   └ riPanel           # 현재 mount lifecycle reference
```

`AppContext`에 실제 Instagram 데이터 전체를 복제해 저장하지 않습니다.

역할:

- subsystem 연결
- 현재 route/identity reference
- event publish/subscribe
- lifecycle cleanup
- migration adapter 보관

금지:

- 지표 계산
- media parsing
- 파일 저장 구현
- 거대한 전역 데이터 객체

---

# 5. Event System

SPA 화면에서 모듈 간 직접 호출을 난립시키지 않도록 `app.js`가 작은 event bus를 제공합니다.

공식 event는 다음만 둡니다.

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

API:

```js
app.on(eventName, listener) -> unsubscribe
app.emit(eventName, payload)
app.scheduleRender(key, callback)
```

규칙:

- event 문자열은 `app.js` 한 곳에서 정의한다.
- UI가 임의 event 이름을 새로 만들지 않는다.
- subscribe는 반드시 unsubscribe/cleanup 경로를 가진다.
- route 변경 때 이전 화면 listener가 남지 않게 한다.
- 동일 render key가 연속 발생하면 한 frame 안에서 합친다.

기존의 **event/Observer 기반 refresh + renderKey no-flicker 개선은 legacy migration 동안 그대로 보존**합니다.

---

# 6. 상태 소유권

같은 상태를 여러 모듈에서 따로 보관하지 않습니다.

| 상태 | 단일 소유자 | 다른 모듈 접근 방식 |
|---|---|---|
| 제품 버전 | `version.js` | import |
| 현재 ContentIdentity | Identity 계층 / migration 중 legacy adapter | read/subscribe |
| 게시물 verified data | Verified Store / migration 중 legacy cache | adapter read |
| 저장 정책 | Settings Store | get/set/subscribe |
| directory handle/permission | Settings Store | Download Manager가 조회 |
| download job 진행상태 | Download Manager | event/result |
| RI panel open/tab | RI Panel local state | UI 내부만 사용 |
| Grid 카드 renderKey | legacy Grid UI | migration 후 Grid owner로 이동 |

**UI state와 domain state를 섞지 않습니다.**

예를 들어 패널이 닫혔다고 Verified Store 데이터가 삭제되면 안 되고, 다운로드 폴더 설정이 특정 Grid 카드 객체에 들어가면 안 됩니다.

---

# 7. 모듈 공개 API 계약

## 7.1 `version.js`

제품 version의 단일 원본입니다.

```js
export const VERSION = '3.2.0';
```

`build.mjs`가 이 값을 userscript `@version`과 generated build header에 반영하고, `check.mjs`가 `STATUS.md`와 일치 여부를 검사합니다.

---

## 7.2 `core/capability.js`

단일 snapshot을 반환합니다.

```text
CapabilitySnapshot
- directoryPicker
- saveFilePicker
- fileSystemWrite
- indexedDB
- clipboard
- anchorDownload
```

공개 API 예:

```js
detectCapabilities()
queryHandlePermission(handle)
requestHandlePermission(handle)
```

플랫폼 문자열이 아니라 실제 API/permission으로 판단합니다.

---

## 7.3 `store/settings-store.js`

상태:

```text
SettingsState
- downloadMode: default | directory | prompt
- directoryName: string | null
- directoryHandle: FileSystemDirectoryHandle | null
- directoryPermission: granted | prompt | denied | unavailable
- schemaVersion
```

공개 API:

```js
init()
getState()
setDownloadMode(mode)
selectDirectory()
clearDirectory()
refreshDirectoryPermission()
subscribe(listener) -> unsubscribe
```

Persistence 규칙:

- 일반 설정값은 localStorage 사용 가능
- FileSystemDirectoryHandle은 가능하면 IndexedDB structured clone 사용
- full absolute path를 저장/표시한다고 가정하지 않는다.
- Settings Store가 유일한 설정 persistence owner이다.

두 번째 Store까지 IndexedDB 공통 코드가 필요해질 때만 `store/persistence.js`를 분리합니다.

---

## 7.4 `media/download-manager.js`

모든 새 다운로드의 단일 API입니다.

### Request

```text
DownloadRequest
- kind: video | cover | photo | carousel-slide | export
- shortcode
- url
- filename
- mimeHint
- slideIndex
```

### Result

```text
DownloadResult
- ok
- code
- destinationMode
- folderName
- filename
- message
- error
```

표준 `code` 예:

```text
saved
cancelled
unsupported
permission-denied
fetch-failed
write-failed
invalid-media
batch-partial
```

공개 API:

```js
download(request)
downloadBatch(requests)
```

`downloadBatch()`는 Carousel에서 **destination을 한 번만 확정**하고 slide 1..N 전체에 동일 destination을 사용합니다.

지정 폴더 저장 실패 시 manager가 자동으로 기본 Downloads로 바꾸지 않습니다.

### Transport 경계

현재 이미지/영상 CDN은 브라우저 CORS 동작이 다를 수 있으므로 Download Manager 안에서도 다음 책임을 분리해 생각합니다.

```text
Download Manager
  ├ destination policy
  ├ media transport       # URL → Blob/bytes
  └ writer                # bytes → destination
```

v3.2.0에서는 아직 한 파일 안에 있습니다. Android Edge 실기기에서 cross-origin image가 지정 폴더 저장에 실패하는 것이 확인되면 그때 `media/transport.js`를 분리합니다.

Tampermonkey privileged transport는 **필요성이 실기기로 확인된 뒤** 도입 여부를 결정합니다. `@grant` 변경은 page network hook sandbox 동작에 영향을 줄 수 있으므로 선제적으로 추가하지 않습니다.

---

## 7.5 `migration/legacy-store-adapter.js`

새 UI/Download 계층이 preserved legacy runtime의 내부 변수를 직접 뒤지지 않게 하는 **읽기 전용 migration boundary**입니다.

현재 source:

```text
ri311:items:v1
      ↓
legacy-store-adapter
      ↓
Post-like snapshot / ContentIdentity-like snapshot
      ↓
RI Panel / Grid action
```

공개 API:

```js
getItem(shortcode)
getPost(shortcode)
getCurrentIdentity(url?)
codeFromUrl(url)
```

규칙:

- adapter에서 새 Instagram parsing 로직을 확장하지 않는다.
- legacy cache의 검증/미확보 의미를 바꾸지 않는다.
- 미확보 metric을 `0`으로 만들지 않는다.
- Verified Store migration 완료 후 삭제한다.

---

## 7.6 `media/media-resolver.js`

새 Grid action의 media 선택 책임을 시작한 owner입니다.

현재 책임:

- stored mediaType 우선
- URL/DOM은 보조 판정
- Video/Reel의 큰 본문 image 우선
- 작은 music/audio/album/avatar/profile image 제외
- 큰 `srcset` 후보 선택
- Store cover/thumb fallback
- 파일 확장자 추출

Grid UI가 자체적으로 cover 후보 알고리즘을 복제하지 않습니다.

향후 extractor/Verified Store migration이 끝나면 resolver 입력을 공통 `media[]` 모델로 바꿉니다.

---

# 8. UI System

UI는 **표현 + 사용자 intent 전달**만 담당합니다.

```text
Grid/RI Panel
   ↓ user action
Download Manager / Store
   ↓ result/event
UI render
```

금지:

- UI에서 GraphQL/raw JSON parsing
- UI에서 localStorage/IndexedDB 직접 사용
- UI에서 `showDirectoryPicker()` 직접 호출
- UI에서 Blob fetch/download 구현
- UI에서 ER/24h/outlier 계산

## `ui/grid.js`

현재는 기존 Grid renderer 자체를 재작성하지 않고 **기존 카드당 단일 `.ri3-grid-media` 버튼의 사용자 intent만 capture**합니다.

이유:

- 검증된 3열/8-slot/no-flicker renderer를 한 번에 건드리지 않음
- 새 저장 메뉴와 Download Manager를 먼저 적용
- 기존 버튼 위치/Instagram native media icon 보존

현재 역할:

- card button click capture
- 현재 shortcode 식별
- `media-resolver` 호출
- 콘텐츠 유형별 action menu
- Download Manager 호출
- 링크 복사

금지:

- 저장 폴더 설정 UI
- 직접 Blob fetch
- 별도 media parsing
- Grid 8-slot 계산 재구현

migration이 진행되면 legacy Grid renderer 자체도 이 owner로 이동합니다.

## `ui/ri-panel.js`

전역 버튼과 panel을 관리합니다.

소유:

- 전역 RI button mount
- legacy Reel-only RI button/panel을 대체하는 단일 진입점
- panel open/close
- active tab
- 6개 tab shell
- settings UI
- 현재 identity/legacy snapshot 표시
- media download intent 전달

현재 연결:

- `요약` — migration adapter snapshot
- `미디어` — Download Manager
- `설정` — Settings Store
- `콘텐츠/댓글/분석` — shell, 이후 owner 데이터 연결

탭 코드가 실제로 커지면 그때 `ui/panel/*` 분리를 검토합니다.

## `ui/toast.js`

Grid와 RI Panel 두 곳에서 사용자 영향 결과를 같은 방식으로 표시하기 때문에 공통화한 작은 UI owner입니다.

소유:

- toast mount/remove
- 구조화된 result message 표시

Download 실패 의미를 새로 해석하지 않고 manager의 result를 표시합니다.

## `ui/styles.js`

새 RI UI 스타일의 단일 source입니다.

현재:

- 전역 RI button/panel
- 새 Grid action menu
- toast
- legacy Reel-only `#ri3-tool/#ri3-panel` 숨김

기존 `#ri3-reels-overlay`와 Grid 정보영역 스타일은 legacy runtime에 남아 있어 기존 승인 UI를 보존합니다. 해당 renderer migration 시 새 owner로 흡수합니다.

---

# 9. Instagram / Verified Store migration

가장 회귀 위험이 높은 영역은 Foundation과 동시에 재작성하지 않습니다.

현재 좋은 동작:

- shortcode binding
- pending request dedupe
- event/Observer refresh
- renderKey no-flicker
- Verified Store conflict 보호
- video cover identity
- Carousel parent slide 판정
- Grid 8-slot renderer

은 `legacy-runtime.js` 안에서 우선 유지합니다.

현재 migration은 **행동/저장 계층부터** 시작했습니다.

```text
legacy Verified cache
  ↓ read-only adapter
new Grid action / global RI
  ↓
Settings Store / Download Manager
```

추후 data engine 이동 순서:

```text
legacy runtime
  ↓
instagram/identity.js
  ↓
instagram/extractor.js
  ↓
store/verified-store.js
  ↓
metrics/metrics.js
  ↓
media/media-resolver.js 완전 전환
  ↓
ui/grid.js / ui/reel.js renderer 전환
```

한 단계가 실기기/회귀 검증되기 전에는 다음 계층을 동시에 대규모 이동하지 않습니다.

---

# 10. 중복 코드 방지 시스템

“중복하지 않는다”는 문장만 두지 않고 **코드 소유권 규칙**으로 막습니다.

## 10.1 Single Owner Map

| 기능 | Owner |
|---|---|
| version | `version.js` |
| route/lifecycle/event | `core/app.js` |
| capability/permission probe | `core/capability.js` |
| download settings | `store/settings-store.js` |
| destination/file write | `media/download-manager.js` |
| migration cache read | `migration/legacy-store-adapter.js` |
| media/cover selection for migrated actions | `media/media-resolver.js` |
| ContentIdentity | `instagram/identity.js` (migration 전 legacy) |
| raw Instagram extraction | `instagram/extractor.js` (migration 전 legacy) |
| verified merge/conflict | `store/verified-store.js` (migration 전 legacy) |
| ER/24h/outlier | `metrics/metrics.js` (migration 전 legacy) |
| Grid information rendering | `ui/grid.js`로 migration 중, 현재 renderer는 legacy |
| Reel rendering | `ui/reel.js` (migration 전 legacy) |
| RI global panel | `ui/ri-panel.js` |
| user toast | `ui/toast.js` |
| new shared CSS | `ui/styles.js` |

다른 모듈이 같은 로직이 필요하면 새 구현을 쓰지 않고 owner API를 호출합니다.

## 10.2 Helper promotion rule

- 한 파일에서만 쓰는 helper → 그 파일 private helper
- 두 번째 모듈에서도 필요 → owner가 명확하면 owner API로 승격
- UI 전용 공통 표현이 2곳 이상 필요 → 현재 `ui/toast.js`처럼 실제 두 번째 사용처가 생겼을 때 분리
- domain-neutral 공통 helper가 여러 계층에서 필요 → 그때만 `core/`로 이동
- 의미 없는 `utils.js`, `helpers.js` 쓰레기통 파일은 만들지 않음

## 10.3 Copy-before-extract 금지

기존 함수를 모듈화할 때:

```text
기존 코드 복사 → 새 코드 추가 → 둘 다 영구 유지
```

방식을 사용하지 않습니다.

migration 중에는 일시적 중복이 생길 수 있지만 다음 순서를 강제합니다.

```text
새 owner API 작성
→ 새 호출부를 owner API로 전환
→ unit/build/실기기 회귀 확인
→ legacy 원래 구현과 호출부 제거
```

현재 media resolver 계열도 새 Grid action이 owner를 사용하기 시작했으며 legacy renderer migration이 끝나면 중복 구현을 제거합니다.

## 10.4 Override stack 금지

다음 패턴을 새 `src/*`에서 사용하지 않습니다.

```js
const oldFn = someFn;
someFn = function () {
  // 또 다른 patch
};
```

v3.1의 기존 override가 남아 있는 부분은 migration 과정에서 owner module로 흡수하고 제거합니다. 새 버전마다 override layer를 추가하지 않습니다.

---

# 11. 파일/함수 크기 관리

줄 수만으로 기계적으로 분리하지 않되 경고 기준은 둡니다.

## 파일 기준

- `0~250줄` — 정상 범위
- `250~350줄` — 책임 혼합 여부 검토
- `350~500줄` — 분리 후보
- `500줄 초과` — 명확한 단일 책임 사유가 없으면 분리
- `legacy-runtime.js`만 migration 동안 예외

## 함수 기준

다음 중 하나면 리팩터링 검토:

- 함수가 약 60줄 이상
- 중첩 조건/반복이 3단계를 지속적으로 초과
- DOM 탐색 + 데이터 정규화 + 저장 같은 서로 다른 side effect가 한 함수에 존재
- 동일한 8줄 이상 로직이 두 군데 이상 반복

짧게 만들기 위해 의미 없는 wrapper 함수를 늘리지는 않습니다.

현재 `ri-panel.js`가 350줄을 넘어가면 설정/미디어/요약 렌더 책임이 실제로 커졌는지 확인하고 `ui/panel/*` 분리를 검토합니다. 줄 수만 맞추기 위한 분리는 금지합니다.

---

# 12. 성능 구조 규칙

파일 크기보다 런타임 중복 작업을 더 엄격히 관리합니다.

- 동일 shortcode pending network request dedupe
- MutationObserver callback에서 즉시 전체 scan 반복 금지
- route/DOM 변화는 `scheduleRender()`로 frame 단위 합치기
- 같은 renderKey이면 DOM text 재작성 금지
- Grid 카드마다 같은 DOM subtree를 반복 query하지 않도록 migration 시 mount reference 구조 사용
- event listener는 mount 시 1회 등록, unmount 시 cleanup
- localStorage/IndexedDB write는 변경된 값에만 수행
- CDN URL을 identity key로 사용하지 않음
- new Grid action은 document-level capture listener 1세트로 처리하고 카드마다 중복 global listener를 추가하지 않음

---

# 13. Build System

`src/*`가 source-of-truth이며 build가 필수입니다.

```text
src/main.js
  ↓ bundle
single IIFE runtime
  ↓ userscript metadata prepend
ri-retry.user.js
```

Build 요구사항:

- self-contained
- runtime `@require` 없음
- external runtime dependency 없음
- userscript metadata는 output 최상단
- `src/version.js`가 version 단일 원본
- generated warning 포함
- production output syntax check 통과 후에만 GitHub 배포파일 갱신

```text
// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Source: reels-inspector/src/*
// Build version: x.y.z
```

Bundler는 개발도구일 뿐 제품 runtime dependency가 아닙니다. 현재 esbuild를 사용합니다.

GitHub Actions:

```text
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
  ↓
변경된 generated userscript commit
```

---

# 14. `check.mjs`가 강제할 구조 규칙

문서 규칙이 실제 코드에서 무시되지 않도록 check 단계에서 가능한 것은 자동 검사합니다.

## Error 처리 대상

- 금지 파일명: `old`, `backup`, `hotfix`, `final2`, `copy` 등
- `src/ui/*`에서 `showDirectoryPicker`, `showSaveFilePicker`, `indexedDB`, `localStorage` 직접 사용
- `src/ui/*`에서 fetch/XHR hook 구현
- `src/metrics/*`에서 DOM 접근
- `src/store/*`가 `src/ui/*` import
- 순환 import
- `src/version.js` / generated `@version` / generated Build version / `STATUS.md` version 불일치
- generated warning 누락
- runtime `@require`
- syntax 실패

## Warning 처리 대상

- 일반 source 파일 350줄 초과
- 일반 source 파일 500줄 초과는 error
- possible override-stack pattern
- 여러 파일에 반복되는 긴 normalized code block

`legacy-runtime.js`는 migration 동안 파일 크기 예외지만 새 코드 추가 허가를 의미하지 않습니다.

---

# 15. Error / Result 규칙

부작용 함수는 실패를 숨기지 않습니다.

다운로드/권한/저장 같은 사용자 영향 작업은 가능한 한 구조화된 result를 반환합니다.

```text
{
  ok: false,
  code: 'permission-denied',
  message: '저장 폴더 권한이 필요합니다.',
  error: ...
}
```

특히 지정 폴더 모드:

```text
fetch/write 실패
   ↓
DownloadResult false
   ↓
UI가 사용자에게 표시
```

이며 자동 `default Downloads` fallback을 하지 않습니다.

금지:

```js
try {
  ...
} catch (e) {
  // 사용자 결과를 바꾸는 실패를 무시
}
```

로그만 필요한 내부 best-effort 작업과 사용자 결과를 바꾸는 실패를 구분합니다.

---

# 16. Source of Truth migration

## Phase 0 — Runtime freeze — 완료

- v3.1.6 runtime 기준선 고정
- 실기기 승인 기능 목록 확인

## Phase 1 — Build source 전환 — 완료

- runtime body를 `src/legacy-runtime.js`로 이동
- `src/main.js` + build/check 생성
- `ri-retry.user.js` generated artifact 전환
- 사용자 확인으로 source 전환 전후 Instagram 표시가 동일한 parity checkpoint 확보

이 시점부터 root userscript 직접 수정 금지.

## Phase 2 — v3.2 Foundation — 완료/활성화

- `core/app.js`
- `core/capability.js`
- `store/settings-store.js`
- `media/download-manager.js`
- `ui/ri-panel.js`
- `ui/styles.js`

Foundation service와 global RI shell을 runtime에 연결했습니다.

## Phase 3 — Download migration — 진행 중

현재 완료:

- legacy cache read adapter
- 새 Grid action menu
- 카드 메뉴의 폴더 설정 제거
- Grid/RI video/photo/cover/carousel action → Download Manager
- 전역 settings mode 연결
- Carousel batch 동일 destination 코드 경로

실기기 검증 필요:

- designated directory의 image/cover cross-origin fetch
- prompt mode 실제 browser behavior
- Carousel 다중 저장 permission/UX

실기기 CORS 실패가 확인되면 `media/transport.js`를 추가합니다.

## Phase 4 — UI migration — 진행 중

- 전역 RI button/panel 활성화
- legacy Reel-only RI tool/panel은 새 CSS에서 숨김
- legacy Reel metrics overlay는 보존
- RI `요약/미디어/설정` 최소 연결

다음:

- safe-area/reel rail 실기기 조정
- RI live data binding 강화
- 필요 시 tab renderer 분리
- Reel native metrics/identity 정확도 개선

## Phase 5 — Data engine migration

다음 순서:

- Identity
- Extractor
- Verified Store
- Metrics
- Media resolver 완전 전환
- Grid/Reel renderer

한 단계씩 이동합니다.

## Phase 6 — Legacy removal

- `legacy-runtime.js`가 비면 삭제
- migration adapter 제거
- legacy CSS/UI/download 중복 제거
- `src/*` owner 구조만 유지

---

# 17. 테스트 구조

```text
tests/
├ fixtures/
├ unit/
└ regression/
```

## 현재 unit gate

- AppContext event publish/unsubscribe
- render dedupe
- capability mapping
- Settings Store mode persistence
- designated directory write failure no fallback
- Carousel prompt batch destination one-time selection
- migration adapter verified cache/identity mapping
- media resolver large card body image vs album artwork

## 다음 unit 우선순위

- filename edge cases
- migration adapter unknown/conflict status semantics
- DownloadResult normalization
- route/current identity transition
- Metrics
- media[] resolver
- Verified Store conflict

## regression

- shortcode 혼입
- Grid flicker
- 8 slot 위치
- music artwork cover 오선택
- video/image destination 분리
- Carousel 다른 shortcode slide 혼입
- 중복 RI button
- Grid menu에 폴더설정 재등장
- route 변경 후 stale listener

실기기 acceptance는 계속 `tests/README.md`와 `STATUS.md`에 기록합니다.

---

# 18. Git / fixture 관리

Git에 넣지 않습니다.

- 다운로드한 Instagram 영상/사진
- HAR/network capture 원본
- `.env`/secret
- login cookie/token/private header
- debug dump
- node_modules/cache/temp
- 개인 계정 raw fixture

테스트 fixture는 필요한 구조만 남긴 sanitized data만 commit합니다.

과거 코드를 보관하려고 별도 old/backup 파일을 만들지 않습니다. Git commit SHA/history를 사용합니다.

---

# 19. 완료 기준

구조 설계가 실제로 적용됐다고 보는 기준입니다.

1. `src/*`가 유일한 개발 source-of-truth다.
2. `ri-retry.user.js`는 build output이고 직접 수정하지 않는다.
3. 기능마다 Single Owner가 명확하다.
4. UI/Store/Instagram/Download 책임이 섞이지 않는다.
5. 같은 핵심 로직이 두 군데 이상 영구 독립 구현되지 않는다.
6. 신규 버전마다 override layer가 증가하지 않는다.
7. check 단계가 금지 의존성과 파일 비대화를 검사한다.
8. unit/build/check/regression을 통과해야 배포파일을 갱신한다.
9. 기존 실기기 승인 기능이 유지된다.
10. `legacy-runtime.js`와 migration adapter는 migration 종료 후 제거된다.
11. v3.2 저장경로가 video/cover/photo/carousel에 동일한 global policy를 적용한다.
12. 전역 RI 진입점은 화면별 중복 버튼이 아니라 하나의 공용 UI로 유지된다.

파일 수가 아니라 **명확한 소유권, 단방향 데이터 흐름, 자동 구조검사, 작은 변경 범위**를 기준으로 유지합니다.
