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

1. **Single Owner** — 하나의 책임은 한 모듈만 소유한다.
2. **Single Data Flow** — 동일 데이터가 UI별로 따로 수집/계산되지 않는다.
3. **Single Side-Effect Path** — 저장, persistence, clipboard, navigation 같은 부작용은 정해진 경로만 사용한다.
4. **Small Public API** — 모듈끼리는 작은 명시적 API로만 통신한다.
5. **Progressive Modularization** — 실제 두 번째 사용처나 독립 책임이 생길 때만 파일을 분리한다.

최종 배포는 계속 Tampermonkey용 `ri-retry.user.js` 한 파일이고, 개발 원본은 `src/*`입니다.

---

# 2. v3.2.1 실제 소스 구조

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
│  ├─ version.js                  # 제품 버전 단일 원본
│  ├─ main.js                     # composition root
│  ├─ legacy-runtime.js           # migration 기간 기존 검증 runtime
│  │
│  ├─ migration/
│  │  └─ legacy-store-adapter.js  # legacy Verified cache read boundary
│  │
│  ├─ core/
│  │  ├─ app.js                   # event/lifecycle/SPA route tracking
│  │  ├─ capability.js            # browser capability/permission
│  │  └─ clipboard.js             # 공용 clipboard write/fallback
│  │
│  ├─ store/
│  │  └─ settings-store.js        # 전역 저장 설정 + persistence
│  │
│  ├─ media/
│  │  ├─ media-resolver.js        # media/cover 선택 + 기본 파일명
│  │  └─ download-manager.js      # 모든 새 미디어 저장 단일 진입점
│  │
│  └─ ui/
│     ├─ grid.js                  # Grid 저장 intent/action menu
│     ├─ ri-panel.js              # 전역 RI button + panel
│     ├─ toast.js                 # 공용 사용자 결과 알림
│     └─ styles.js                # 새 RI 공용 CSS
│
├─ tests/
│  ├─ README.md
│  ├─ fixtures/
│  └─ unit/
│     ├─ foundation.test.mjs
│     └─ migration.test.mjs
│
├─ scripts/
│  ├─ build.mjs
│  └─ check.mjs
│
└─ ri-retry.user.js               # generated deployment artifact
```

`legacy-runtime.js`는 backup이 아닙니다. 기존 v3.1.6 계열의 검증된 데이터/렌더 엔진을 단계적으로 새 owner로 옮기기 위한 임시 canonical migration module입니다.

- 신규 제품 기능을 legacy에 계속 추가하지 않는다.
- 기존 책임을 새 owner로 옮기면 원래 legacy 구현/호출부를 제거한다.
- migration 완료 후 `legacy-runtime.js`와 `migration/legacy-store-adapter.js`를 삭제한다.
- root `ri-retry.user.js`는 직접 수정하지 않는다.

---

# 3. Runtime Architecture

`main.js`가 composition root입니다.

```text
main.js
  ├ VERSION ------------------------ version.js
  ├ AppContext --------------------- core/app.js
  ├ CapabilitySnapshot ------------- core/capability.js
  ├ Settings Store ----------------- store/settings-store.js
  ├ Download Manager --------------- media/download-manager.js
  ├ Legacy Store Adapter ----------- migration/legacy-store-adapter.js
  ├ preserved runtime -------------- legacy-runtime.js
  ├ Grid Actions ------------------- ui/grid.js
  └ Global RI Panel ---------------- ui/ri-panel.js
```

하위 모듈이 전역 변수나 상위 모듈을 찾아다니지 않습니다. `main.js`가 필요한 dependency를 생성해서 주입합니다.

```js
const app = createApp({ version: VERSION });
const capabilities = detectCapabilities(globalThis);
const settings = createSettingsStore({ capabilities, ... });
const downloads = createDownloadManager({ settings, capabilities, ... });
const legacyStore = createLegacyStoreAdapter(...);

app.services = { capabilities, settings, downloads };
app.adapters.legacyStore = legacyStore;

app.startRouteTracking({ resolveIdentity: (url) => legacyStore.getCurrentIdentity(url) });
mountGridActions({ app, adapter: legacyStore, downloads, capabilities });
mountRiPanel({ app, adapter: legacyStore, settings, downloads, capabilities });
```

---

# 4. AppContext / SPA Navigation

`core/app.js`는 다음만 소유합니다.

```text
AppContext
├ version
├ events
├ route
├ currentIdentity
├ services
├ adapters
└ route tracking lifecycle
```

공식 event:

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

API:

```js
app.on(event, listener) -> unsubscribe
app.emit(event, payload)
app.scheduleRender(key, callback)
app.setRoute(route)
app.setCurrentIdentity(identity)
app.startRouteTracking({ env, resolveIdentity }) -> cleanup
```

### Route tracking 규칙

Instagram SPA 이동에서 새 RI Panel이 이전 shortcode를 계속 보여주지 않도록 `app.js`가 URL lifecycle을 소유합니다.

- `popstate/hashchange/pageshow` 구독
- DOM 변화는 URL 변경 여부를 확인하는 trigger로만 사용
- URL이 실제로 바뀌지 않았으면 identity를 다시 만들지 않음
- MutationObserver에서 Grid 전체 scan을 새로 만들지 않음
- history API를 새로 중첩 override하지 않음
- route/identity event는 `scheduleRender()`로 UI 갱신을 합칠 수 있음
- cleanup이 모든 observer/listener를 제거함

현재 legacy runtime의 기존 History/Observer refresh는 데이터 엔진 migration 동안 보존합니다. 새 AppContext route tracking은 **새 UI의 stale-context 방지**만 담당합니다.

---

# 5. 상태 소유권

| 상태/기능 | 단일 소유자 |
|---|---|
| 제품 버전 | `version.js` |
| route/lifecycle/event | `core/app.js` |
| browser capability/permission | `core/capability.js` |
| clipboard write/fallback | `core/clipboard.js` |
| 현재 ContentIdentity | Identity 계층 / migration 중 legacy adapter |
| 게시물 verified data | Verified Store / migration 중 legacy cache |
| 저장 정책 | `store/settings-store.js` |
| directory handle/permission | `store/settings-store.js` |
| download job/destination/write | `media/download-manager.js` |
| media/cover 선택 | `media/media-resolver.js` |
| 기본 미디어 파일명 | `media/media-resolver.js` |
| RI panel open/tab | `ui/ri-panel.js` local state |
| Grid 정보 renderKey | 현재 legacy renderer, migration 후 `ui/grid.js` |

UI state와 domain state를 섞지 않습니다.

---

# 6. 공통 부작용 경로

## Clipboard

Grid와 RI Panel에서 링크 복사가 두 번째 사용처가 생겼기 때문에 `core/clipboard.js`로 공통화합니다.

```text
Grid / RI Panel
      ↓
core/clipboard.copyText()
      ├ navigator.clipboard
      └ DOM textarea fallback
```

UI가 각자 clipboard fallback을 복제하지 않습니다.

## Media filename

영상/썸네일/사진/Carousel 파일명도 UI가 만들지 않습니다.

```text
UI DownloadRequest
      ↓
Download Manager normalize
      ↓
media-resolver.mediaFilename()
```

기본 규칙:

```text
Instagram_<shortcode>_video.*
Instagram_<shortcode>_thumb.*
Instagram_<shortcode>_image.*
Instagram_<shortcode>_slide_01.*
```

이렇게 해서 Grid와 RI Panel에 동일 filename template이 복사되지 않게 합니다.

---

# 7. Settings Store

`store/settings-store.js`가 전역 저장 설정의 유일한 persistence owner입니다.

```text
SettingsState
- downloadMode: default | directory | prompt
- directoryName
- directoryHandle
- directoryPermission
- schemaVersion
```

API:

```js
init()
getState()
setDownloadMode(mode)
selectDirectory()
clearDirectory()
refreshDirectoryPermission()
subscribe(listener) -> unsubscribe
```

- 일반 설정은 localStorage 가능
- FileSystemDirectoryHandle은 가능하면 IndexedDB structured clone
- full absolute path를 읽거나 표시할 수 있다고 가정하지 않음
- UI가 localStorage/IndexedDB/File System Access를 직접 호출하지 않음

---

# 8. Download Manager

모든 새 미디어 저장은 `media/download-manager.js`를 통과합니다.

```text
DownloadRequest
- kind: video | cover | photo | carousel-slide | export
- shortcode
- url
- filename(optional override)
- mimeHint
- slideIndex
```

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

표준 code:

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

`downloadBatch()`는 destination을 한 번만 결정하여 Carousel slide 전체에 재사용합니다.

지정 폴더 실패 시 자동으로 기본 Downloads로 바꾸지 않습니다.

내부 경계:

```text
Download Manager
  ├ destination policy
  ├ media transport       # URL → Blob
  └ writer                # Blob → destination
```

실기기에서 cross-origin image 문제가 확인되면 UI가 아니라 transport만 `media/transport.js`로 분리합니다. `@grant` 변경은 필요성이 확인된 뒤 검토합니다.

---

# 9. Migration Adapter

`migration/legacy-store-adapter.js`는 새 UI가 legacy 내부 변수나 raw storage 구조를 직접 알지 않게 하는 임시 read boundary입니다.

```text
ri311:items:v1
   ↓
legacy-store-adapter
   ↓
Post-like snapshot / ContentIdentity-like snapshot
```

API:

```js
getItem(shortcode)
getPost(shortcode)
getCurrentIdentity(url?)
codeFromUrl(url)
```

- 새 Instagram parsing 알고리즘을 여기에 추가하지 않음
- verified/conflict/unknown 의미를 바꾸지 않음
- 미확보 metric을 `0`으로 만들지 않음
- Verified Store migration 후 삭제

---

# 10. Media Resolver

`media/media-resolver.js`는 migrated action의 media 선택과 기본 파일명을 소유합니다.

현재 media 선택 규칙:

- stored mediaType 우선
- URL/DOM은 보조 판정
- Video/Reel은 카드와 크게 겹치는 본문 image 우선
- 작은 music/audio/album/avatar/profile image 제외
- `srcset`의 큰 후보 우선
- Store cover/thumb fallback

UI가 cover 알고리즘/확장자/기본 파일명을 다시 구현하지 않습니다.

---

# 11. UI System

UI는 **표현 + 사용자 intent 전달**만 담당합니다.

```text
UI
 ↓ intent
Store / Download Manager / Clipboard owner
 ↓ result/event
UI render
```

금지:

- GraphQL/raw JSON parsing
- localStorage/IndexedDB 직접 사용
- `showDirectoryPicker/showSaveFilePicker` 직접 호출
- fetch/XHR/Blob transport
- ER/24h/outlier 직접 계산
- clipboard fallback 직접 구현
- `Instagram_...` 기본 파일명 조립

## `ui/grid.js`

현재 legacy Grid renderer는 보존하고 기존 `.ri3-grid-media` 버튼의 저장 intent만 capture합니다.

- 카드당 global listener를 만들지 않고 document-level capture listener 1세트
- 현재 shortcode → adapter → media resolver
- 메뉴는 콘텐츠 액션만 제공
- Download Manager 호출
- 링크 복사는 Clipboard owner 호출
- route change 시 열린 메뉴 닫기

## `ui/ri-panel.js`

- 전역 RI button 1개
- `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`
- route/identity event 구독
- SPA 이동 시 열린 패널의 context를 다음 frame에 갱신
- `요약`: legacy verified snapshot
- `미디어`: Download Manager
- `설정`: Settings Store
- `콘텐츠/댓글/분석`: 이후 데이터 계층 연결

## `ui/toast.js`

DownloadResult와 일반 사용자 결과를 같은 방식으로 표시합니다.

## `ui/styles.js`

새 RI button/panel/Grid action menu/toast 스타일의 단일 source입니다. legacy Reel-only `#ri3-tool/#ri3-panel`은 사용자에게 중복 표시되지 않도록 숨깁니다.

---

# 12. Data Engine migration

현재 검증된 다음 동작은 legacy에 우선 보존합니다.

- shortcode binding
- pending request dedupe
- event/Observer refresh
- renderKey no-flicker
- Verified Store conflict 보호
- cover identity
- Carousel parent slide 판정
- Grid 8-slot renderer

이동 순서:

```text
Identity
 → Extractor
 → Verified Store
 → Metrics
 → Media Resolver 완전 전환
 → Grid/Reel renderer
```

한 단계가 회귀 확인되기 전에 여러 위험 계층을 동시에 대규모 이동하지 않습니다.

---

# 13. 중복 코드 방지 시스템

## Single Owner Map

| 기능 | Owner |
|---|---|
| version | `version.js` |
| route/event/lifecycle | `core/app.js` |
| capability/permission | `core/capability.js` |
| clipboard | `core/clipboard.js` |
| download settings | `store/settings-store.js` |
| destination/write | `media/download-manager.js` |
| migration cache read | `migration/legacy-store-adapter.js` |
| media/cover/default filename | `media/media-resolver.js` |
| ER/24h/outlier | `metrics/metrics.js` migration 예정 |
| Grid info renderer | `ui/grid.js`로 migration 중 |
| Reel renderer | `ui/reel.js` migration 예정 |
| RI global panel | `ui/ri-panel.js` |
| toast | `ui/toast.js` |
| new shared CSS | `ui/styles.js` |

## Helper promotion

- 한 파일에서만 쓰는 helper → private
- 두 번째 사용처가 생기면 owner API 승격 여부 검토
- 실제 두 번째 사용처가 생긴 clipboard/toast/filename만 현재 공통 owner로 승격
- 의미 없는 `utils.js/helpers.js` 금지

## Copy-before-extract 금지

```text
새 owner API 작성
→ 새 호출부 전환
→ unit/build/실기기 확인
→ legacy 원래 구현 제거
```

migration 중 중복은 **삭제 계획과 실제 새 호출부가 있는 경우에만** 허용합니다.

## Override stack 금지

신규 `src/*`에서는 `oldFn = fn; fn = override` 패턴을 추가하지 않습니다.

---

# 14. 파일/함수 크기

- 0~250줄: 정상
- 250~350줄: 책임 혼합 검토
- 350~500줄: 분리 후보
- 500줄 초과: 단일 책임 근거 없으면 error
- `legacy-runtime.js`만 migration 기간 예외

함수 약 60줄 이상, 3단계 이상 중첩 지속, 서로 다른 side effect 혼합, 8줄 이상의 반복 로직은 리팩터링 검토 대상입니다.

줄 수를 맞추기 위한 의미 없는 wrapper/파일 분리는 금지합니다.

---

# 15. 성능 규칙

- 동일 shortcode pending request dedupe
- MutationObserver callback에서 전체 Grid scan 신규 반복 금지
- route/identity UI render는 frame 단위 dedupe
- 같은 renderKey DOM 재작성 금지
- event listener mount 1회 / cleanup 보장
- localStorage/IndexedDB write는 변경값에만
- CDN URL을 identity key로 사용하지 않음
- SPA route tracker는 **URL 변경 검사만** 하고 Instagram DOM 데이터 parser 역할을 하지 않음

---

# 16. Build / Architecture Check

```text
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
  ↓
generated artifact commit
```

`check.mjs` error:

- backup/hotfix/final/copy 계열 금지 파일명
- UI에서 storage/File System API 직접 사용
- UI에서 network/Blob transport 직접 구현
- UI에서 clipboard 직접 구현
- UI에서 default `Instagram_` 파일명 직접 조립
- metrics에서 DOM 접근
- store → ui import
- 순환 import
- version 불일치
- generated warning 누락
- runtime `@require`
- syntax 실패
- 일반 source 500줄 초과

warning:

- 350줄 초과
- override-stack 후보
- 여러 파일의 긴 duplicate block 후보

---

# 17. 현재 Migration 단계

## Phase 1 — Source of Truth — 완료

`src/* → build → ri-retry.user.js` 전환 완료.

## Phase 2 — Foundation — 완료/활성화

AppContext / capability / Settings / Download Manager / global RI shell 활성화.

## Phase 3 — Download migration — 진행 중

완료:

- legacy cache adapter
- 새 Grid action menu
- 카드 메뉴의 폴더 설정 제거
- Grid/RI 저장 intent → Download Manager
- global save policy
- Carousel batch destination 1회 결정
- filename owner 통합
- clipboard owner 통합

실기기 확인 필요:

- designated directory image/cover CORS
- prompt mode
- Carousel multi-file permission/UX

## Phase 4 — UI migration — 진행 중

v3.2.1:

- AppContext SPA route tracking 활성화
- Grid 메뉴 route-change cleanup
- 열린 RI Panel route/identity live context 갱신
- stale shortcode 표시 방지 기반 강화

다음:

- Store 변경 live binding
- safe-area/Reel rail 보정
- Metrics 연결
- Reel native metrics/identity 개선

## Phase 5 — Data Engine migration

Identity → Extractor → Verified Store → Metrics → Media Resolver → Grid/Reel renderer.

## Phase 6 — Legacy removal

새 owner로 모두 이동한 후 legacy runtime/adapter/CSS/UI/download 중복을 제거합니다.

---

# 18. 테스트 구조

현재 unit gate:

- AppContext event/render dedupe
- SPA route → identity transition
- capability mapping
- shared clipboard primary/fallback
- Settings Store persistence
- designated-directory failure no fallback
- Carousel prompt batch destination reuse
- migration adapter verified mapping
- cover resolver album artwork 제외
- media filename convention

실기기 acceptance는 `tests/README.md`와 `STATUS.md`에 기록합니다.

---

# 19. Git / fixture 관리

Git에 넣지 않습니다.

- 다운로드한 Instagram media
- HAR/network raw capture
- `.env`/secret
- login cookie/token/private header
- debug dump
- node_modules/cache/temp
- 개인 계정 raw fixture

테스트 fixture는 sanitized data만 commit합니다. 과거 코드는 old/backup 파일 대신 Git history로 관리합니다.

---

# 20. 완료 기준

1. `src/*`가 유일한 개발 source-of-truth다.
2. `ri-retry.user.js`는 generated artifact다.
3. 기능마다 Single Owner가 명확하다.
4. UI/Store/Instagram/Media side effect가 섞이지 않는다.
5. clipboard/filename/download policy 같은 공통 기능이 UI별로 중복되지 않는다.
6. 신규 override layer가 증가하지 않는다.
7. check가 금지 dependency와 중복 재도입을 막는다.
8. unit/build/check/regression을 통과해야 배포한다.
9. 기존 실기기 승인 기능을 보존한다.
10. legacy runtime/adapter는 migration 종료 후 삭제한다.
11. 저장정책은 video/cover/photo/carousel 모두 동일하다.
12. 전역 RI 진입점은 하나다.
13. SPA route 변경 후 이전 shortcode UI가 남지 않는다.

파일 수가 아니라 **소유권, 단방향 흐름, 자동 검사, 작은 변경 범위, 실제 중복 제거**를 기준으로 유지합니다.
