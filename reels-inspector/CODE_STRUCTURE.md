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

처음부터 수십 개 파일을 만들지 않습니다. v3.2 Foundation은 아래 구조로 시작합니다.

```text
reels-inspector/
├─ README.md
├─ PROJECT_PLAN.md
├─ STATUS.md
├─ GRID_BASELINE.md
├─ CODE_STRUCTURE.md
├─ .gitignore
├─ package.json                 # build 도입 시 생성
│
├─ src/
│  ├─ main.js                  # composition root
│  ├─ legacy-runtime.js        # 전환기간 임시 canonical runtime
│  │
│  ├─ core/
│  │  ├─ app.js                # AppContext/event/lifecycle
│  │  └─ capability.js         # browser capability/permission
│  │
│  ├─ store/
│  │  └─ settings-store.js     # 전역 설정 + 자체 persistence
│  │
│  ├─ media/
│  │  └─ download-manager.js   # 모든 저장의 단일 진입점
│  │
│  └─ ui/
│     ├─ ri-panel.js           # 전역 RI button + panel shell
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

`legacy-runtime.js`는 backup 파일이 아닙니다. **현재 검증된 v3.1.6 런타임을 src 체계로 옮기기 위한 임시 canonical migration module**입니다.

규칙:

- 새 기능을 `legacy-runtime.js`에 계속 추가하지 않는다.
- 신규 v3.2 기능은 새 모듈에 작성한다.
- 기존 기능을 하나씩 새 모듈로 이동할 때 `legacy-runtime.js`에서 원래 구현을 제거한다.
- migration이 끝나면 `legacy-runtime.js` 자체를 삭제한다.
- `ri-retry.user.js`와 `src/legacy-runtime.js`를 동시에 수작업 수정하지 않는다.

이 방식으로 **이중 source-of-truth 기간을 최소화**합니다.

---

# 3. Runtime Architecture

런타임은 `main.js` 하나에서 조립합니다.

```text
main.js
  │
  ├─ createApp() ---------------------- core/app.js
  ├─ detectCapabilities() ------------- core/capability.js
  ├─ createSettingsStore() ------------ store/settings-store.js
  ├─ createDownloadManager() ---------- media/download-manager.js
  ├─ bootLegacyRuntime(app) ----------- legacy-runtime.js
  └─ mountRiPanel(app) ---------------- ui/ri-panel.js
```

핵심 원칙은 **Dependency Injection**입니다.

하위 모듈이 상위 모듈을 import해서 찾지 않습니다. `main.js`가 필요한 의존성을 만들어서 전달합니다.

예시 개념:

```js
const app = createApp();
const capabilities = detectCapabilities();
const settings = createSettingsStore({ app, capabilities });
const downloads = createDownloadManager({ app, capabilities, settings });

app.services = { capabilities, settings, downloads };

const legacy = bootLegacyRuntime({ app });
mountRiPanel({ app, legacy });
```

실제 구현은 이 계약을 기준으로 하되 불필요한 객체 계층을 더 만들지 않습니다.

---

# 4. AppContext — 공용 런타임 연결점

`core/app.js`는 앱 전체를 연결하는 작은 runtime context를 소유합니다.

개념 모델:

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
   └ legacyStore     # migration 중에만 존재
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

공식 event는 초기에 다음만 둡니다.

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

API 개념:

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

기존의 **event/Observer 기반 refresh + renderKey no-flicker 개선을 이 구조에 그대로 보존**합니다.

---

# 6. 상태 소유권

같은 상태를 여러 모듈에서 따로 보관하지 않습니다.

| 상태 | 단일 소유자 | 다른 모듈 접근 방식 |
|---|---|---|
| 현재 ContentIdentity | Identity 계층 / migration 중 legacy adapter | read/subscribe |
| 게시물 verified data | Verified Store | read/subscribe |
| 저장 정책 | Settings Store | get/set/subscribe |
| directory handle/permission | Settings Store | Download Manager가 조회 |
| download job 진행상태 | Download Manager | event/result |
| RI panel open/tab | RI Panel local state | UI 내부만 사용 |
| Grid 카드 renderKey | Grid UI | 카드 DOM과 함께 관리 |

**UI state와 domain state를 섞지 않습니다.**

예를 들어 패널이 닫혔다고 Verified Store 데이터가 삭제되면 안 되고, 다운로드 폴더 설정이 특정 Grid 카드 객체에 들어가면 안 됩니다.

---

# 7. 모듈 공개 API 계약

## 7.1 `core/capability.js`

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
refreshPermission(handle)
```

플랫폼 문자열이 아니라 실제 API/permission으로 판단합니다.

---

## 7.2 `store/settings-store.js`

초기 상태:

```text
SettingsState
- downloadMode: default | directory | prompt
- directoryName: string | null
- directoryHandle: FileSystemDirectoryHandle | null
- directoryPermission: granted | prompt | denied | unavailable
- schemaVersion
```

공개 API는 작게 유지합니다.

```js
getState()
setDownloadMode(mode)
selectDirectory()
clearDirectory()
refreshDirectoryPermission()
subscribe(listener) -> unsubscribe
```

Persistence 규칙:

- 일반 설정값은 localStorage 사용 가능
- FileSystemDirectoryHandle 저장이 필요하면 IndexedDB structured clone 사용
- full absolute path를 저장/표시한다고 가정하지 않는다.
- Settings Store가 유일한 설정 persistence owner이다.

두 번째 Store까지 IndexedDB 공통 코드가 필요해질 때만 `store/persistence.js`를 분리합니다.

---

## 7.3 `media/download-manager.js`

모든 다운로드의 단일 API입니다.

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
```

공개 API:

```js
download(request)
downloadBatch(requests)
```

`downloadBatch()`는 Carousel에서 **destination을 한 번만 확정**하고 slide 1..N 전체에 동일 destination을 사용합니다.

지정 폴더 저장 실패 시 manager가 자동으로 기본 Downloads로 바꾸지 않습니다.

### Transport 경계

현재 이미지/영상 CDN은 브라우저 CORS 동작이 다를 수 있으므로 다운로드 manager 내부에서 다음 경계를 유지합니다.

```text
Download Manager
  ├ destination policy
  ├ media transport       # URL → Blob/bytes
  └ writer                # bytes → destination
```

초기에는 한 파일에 둘 수 있습니다. cross-origin image 대응 때문에 Tampermonkey privileged transport가 필요해지면 그때만 `media/transport.js`를 분리합니다.

이렇게 하면 나중에 transport 방식이 바뀌어도 Grid/Panel/저장정책은 수정하지 않습니다.

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

## `ui/ri-panel.js`

초기에는 전역 버튼과 panel shell을 한 파일에서 관리합니다.

소유:

- 전역 RI button mount
- panel open/close
- active tab
- 6개 tab shell
- settings UI
- 현재 identity 표시 연결

패널 탭 코드가 실제로 커지면 그때 `ui/panel/*`로 분리합니다.

## `ui/styles.js`

RI 스타일의 단일 source입니다.

Grid/Reel/Panel JS 파일마다 동일 CSS 문자열을 복제하지 않습니다.

---

# 9. Instagram / Verified Store migration

가장 회귀 위험이 높은 영역은 v3.2 Foundation 직후 바로 재작성하지 않습니다.

현재 좋은 동작:

- shortcode binding
- pending request dedupe
- event/Observer refresh
- renderKey no-flicker
- Verified Store conflict 보호
- video cover identity
- Carousel parent slide 판정

은 `legacy-runtime.js` 안에서 우선 유지합니다.

추후 이동 순서:

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
media/media-resolver.js
  ↓
ui/grid.js / ui/reel.js
```

한 단계가 실기기/회귀 검증되기 전에는 다음 계층을 동시에 대규모 이동하지 않습니다.

---

# 10. 중복 코드 방지 시스템

“중복하지 않는다”는 문장만 두지 않고 **코드 소유권 규칙**으로 막습니다.

## 10.1 Single Owner Map

| 기능 | Owner |
|---|---|
| route/lifecycle/event | `core/app.js` |
| capability/permission probe | `core/capability.js` |
| download settings | `store/settings-store.js` |
| destination/file write | `media/download-manager.js` |
| ContentIdentity | `instagram/identity.js` (migration 전 legacy) |
| raw Instagram extraction | `instagram/extractor.js` (migration 전 legacy) |
| verified merge/conflict | `store/verified-store.js` (migration 전 legacy) |
| ER/24h/outlier | `metrics/metrics.js` (migration 전 legacy) |
| media/cover/carousel resolve | `media/media-resolver.js` (migration 전 legacy) |
| Grid rendering | `ui/grid.js` (migration 전 legacy) |
| Reel rendering | `ui/reel.js` (migration 전 legacy) |
| RI global panel | `ui/ri-panel.js` |
| shared CSS | `ui/styles.js` |

다른 모듈이 같은 로직이 필요하면 새 구현을 쓰지 않고 owner API를 호출합니다.

## 10.2 Helper promotion rule

- 한 파일에서만 쓰는 helper → 그 파일 private helper
- 두 번째 모듈에서도 필요 → owner가 명확하면 owner API로 승격
- UI 전용 공통 포맷이 2곳 이상 필요 → 그때 `ui/format.js` 생성 검토
- domain-neutral 공통 helper가 여러 계층에서 필요 → 그때만 `core/`로 이동
- 의미 없는 `utils.js`, `helpers.js` 쓰레기통 파일은 만들지 않음

## 10.3 Copy-before-extract 금지

기존 함수를 모듈화할 때:

```text
기존 코드 복사 → 새 코드 추가 → 둘 다 남김
```

방식을 사용하지 않습니다.

대신:

```text
새 owner API 작성
→ 기존 호출부를 owner API로 전환
→ 회귀 확인
→ 기존 구현 제거
```

순서로 진행합니다.

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

---

# 12. 성능 구조 규칙

파일 크기보다 런타임 중복 작업을 더 엄격히 관리합니다.

- 동일 shortcode pending network request dedupe
- MutationObserver callback에서 즉시 전체 scan 반복 금지
- route/DOM 변화는 `scheduleRender()`로 frame 단위 합치기
- 같은 renderKey이면 DOM text 재작성 금지
- Grid 카드마다 같은 DOM subtree를 반복 query하지 않도록 mount 시 reference 보관
- event listener는 mount 시 1회 등록, unmount 시 cleanup
- localStorage/IndexedDB write는 변경된 값에만 수행
- CDN URL을 identity key로 사용하지 않음

---

# 13. Build System

`src/*`가 source-of-truth가 되는 순간부터 build가 필수입니다.

목표:

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
- version 단일 source 사용
- generated warning 포함
- production output syntax check 통과 후에만 GitHub 배포파일 갱신

예:

```text
// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Source: src/*
```

Bundler는 개발도구일 뿐 제품 runtime dependency가 아닙니다. 초기에는 esbuild 계열의 단순 bundle 방식이 적절합니다.

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
- generated userscript version 불일치
- syntax/bundle 실패

## Warning 처리 대상

- 일반 source 파일 350줄 초과
- 일반 source 파일 500줄 초과는 원칙적으로 error 승격
- 함수 장기 비대화
- 여러 파일에 반복되는 긴 normalized code block
- 사용하지 않는 migration adapter

초기 check는 외부 품질도구를 여러 개 붙이지 않고 Node script로 가능한 검사부터 구현합니다.

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

금지:

```js
try {
  ...
} catch (e) {
  // 아무것도 안 함
}
```

로그만 필요한 내부 best-effort 작업과 사용자 결과를 바꾸는 실패를 구분합니다.

---

# 16. Source of Truth migration

현재 v3.1.6은 root `ri-retry.user.js`가 실행 원본입니다.

v3.2 첫 구조 작업의 목적은 **새 기능 추가보다 먼저 이중 원본 문제를 제거하는 것**입니다.

## Phase 0 — Runtime freeze

- 현재 v3.1.6 runtime을 기준선으로 고정
- 실기기 승인된 기능 목록 확인
- 사용자-visible 동작 변경 없음

## Phase 1 — Build source 전환

- userscript runtime body를 `src/legacy-runtime.js`로 이동
- `src/main.js` + build/check 생성
- `ri-retry.user.js`를 generated artifact로 전환
- 동작 parity 확인

이 시점부터 root userscript 직접 수정 금지.

## Phase 2 — v3.2 Foundation

- `core/app.js`
- `core/capability.js`
- `store/settings-store.js`
- `media/download-manager.js`
- `ui/ri-panel.js`
- `ui/styles.js`

을 실제 owner module로 도입.

## Phase 3 — Download migration

- legacy video/photo/cover/carousel 다운로드 호출을 Download Manager API로 교체
- old directory menu/policy 제거
- 영상/사진/cover/carousel 동일 정책 실기기 확인

## Phase 4 — UI migration

- 전역 RI shell 안정화
- Grid/Reel UI를 필요할 때 분리

## Phase 5 — Data engine migration

- Identity
- Extractor
- Verified Store
- Metrics
- Media resolver

순으로 이동.

## Phase 6 — Legacy removal

- `legacy-runtime.js`가 비면 삭제
- migration adapter/override 제거
- `src/*` 구조만 남김

---

# 17. 테스트 구조

```text
tests/
├ fixtures/
├ unit/
└ regression/
```

## unit

우선순위:

- Settings Store state transition
- destination policy
- filename
- download result/error
- capability mapping
- metrics
- media resolver
- Verified Store conflict

## regression

- shortcode 혼입
- Grid flicker
- 8 slot 위치
- music artwork cover 오선택
- video/image destination 분리
- Carousel 다른 shortcode slide 혼입
- 중복 RI button
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
5. 같은 핵심 로직이 두 군데 이상 독립 구현되지 않는다.
6. 신규 버전마다 override layer가 증가하지 않는다.
7. check 단계가 금지 의존성과 파일 비대화를 검사한다.
8. build/check/regression을 통과해야 배포파일을 갱신한다.
9. 기존 실기기 승인 기능이 유지된다.
10. `legacy-runtime.js`는 migration 종료 후 제거된다.

파일 수가 아니라 **명확한 소유권, 단방향 데이터 흐름, 자동 구조검사, 작은 변경 범위**를 기준으로 유지합니다.
