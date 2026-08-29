# Instagram Content Research Tool — Code Structure

이 문서는 실제 코드의 **파일 책임, 상태 소유권, dependency, side effect 경로, migration, 크기/중복 관리** 기준입니다.

상위 기준:

- `PROJECT_PLAN.md` — 제품/데이터/장기 기능
- `UI_BASELINE.md` — 모바일 UI 시각/조작 기준
- `UI_ARCHITECTURE.md` — UI 계층/상태/데이터 흐름
- `GRID_BASELINE.md` — Grid Frozen UI
- `PRESERVATION_BASELINE.md` — 기존 기능/외형 보존 gate
- `STATUS.md` — 현재 배포/검증/미해결
- `WORK_TRACK.md` — 현재 실행순서
- `tests/README.md` — 회귀/승인 기준

설계가 바뀌면 기존 결정을 먼저 읽고 **유지 / 수정 / 추가**를 다시 통합합니다.

---

# 1. 설계 목표

1. **Single Owner** — 한 책임은 한 owner
2. **Single Data Flow** — UI별 별도 수집/계산 금지
3. **Single Side-Effect Path** — persistence/download/clipboard 같은 부작용은 지정 경로만 사용
4. **Small Public API** — 모듈 간 작은 명시적 API
5. **Progressive Modularization** — 실제 책임 경계가 생길 때만 분리
6. **Migration without rollback** — 기존 승인 runtime을 보존하면서 호출부를 한 단계씩 이동
7. **UI State Ownership** — launcher/panel/tab이 open/context/layout 상태를 따로 소유하지 않음
8. **Documented Replacement** — 기존 UI 제거는 preservation/replacement gate 이후에만

파일 수 자체를 목표로 하지 않습니다.

---

# 2. 현재 실제 구조 — v3.2.3 UI-B foundation checkpoint

```text
reels-inspector/
├ README.md
├ PROJECT_PLAN.md
├ STATUS.md
├ WORK_TRACK.md
├ GRID_BASELINE.md
├ UI_BASELINE.md
├ UI_ARCHITECTURE.md
├ PRESERVATION_BASELINE.md
├ CODE_STRUCTURE.md
├ package.json
├ .gitignore
│
├ src/
│  ├ version.js
│  ├ main.js
│  ├ legacy-runtime.js
│  │
│  ├ core/
│  │  ├ app.js
│  │  ├ capability.js
│  │  └ clipboard.js
│  │
│  ├ migration/
│  │  └ legacy-store-adapter.js
│  │
│  ├ store/
│  │  └ settings-store.js
│  │
│  ├ metrics/
│  │  └ metrics.js
│  │
│  ├ media/
│  │  ├ media-resolver.js
│  │  └ download-manager.js
│  │
│  └ ui/
│     ├ grid.js
│     ├ layout.js
│     ├ workspace-state.js
│     ├ ri-primitives.js
│     ├ ri-panel.js
│     ├ ri-summary.js
│     ├ toast.js
│     └ styles.js
│
├ tests/
│  ├ README.md
│  ├ fixtures/
│  └ unit/
│     ├ foundation.test.mjs
│     ├ migration.test.mjs
│     └ metrics.test.mjs
│
├ scripts/
│  ├ build.mjs
│  └ check.mjs
│
└ ri-retry.user.js   # generated artifact
```

빈 placeholder 파일은 만들지 않습니다.

---

# 3. Composition Root

`src/main.js`만 전체 subsystem을 조립합니다.

```text
main.js
  ├ VERSION / UPDATE_URL
  ├ AppContext
  ├ CapabilitySnapshot
  ├ Settings Store
  ├ Download Manager
  ├ Legacy Store Adapter
  ├ Metrics Engine
  ├ Workspace State
  ├ Layout Manager
  ├ Grid Actions
  └ RI Panel
```

하위 모듈이 global service locator를 찾아다니지 않고 main에서 dependency를 주입합니다.

현재 조립 개념:

```js
const app = createApp({ version: VERSION });
const settings = createSettingsStore(...);
const legacyStore = createLegacyStoreAdapter(...);
const metrics = createMetricsEngine({ history: legacyStore });
const downloads = createDownloadManager(...);
const workspace = createWorkspaceState();
const layout = createLayoutManager({ app, doc, env });

mountRiPanel({ app, settings, downloads, metrics, adapter: legacyStore, workspace, layout });
```

---

# 4. Runtime Event / Activity

공식 event:

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

`core/app.js`가 event 이름과 SPA lifecycle을 소유합니다.

기존 SPA `MutationObserver` activity를 `onActivity(reason)`으로 공유하여 같은 DOM을 보기 위한 두 번째 전체 observer를 만들지 않습니다.

```text
MutationObserver (1)
   ↓
AppContext
   ├ route/identity sync
   └ legacy store fingerprint schedule
```

규칙:

- mutation마다 전체 Grid/Store parse 금지
- `scheduleRender(key)`로 동일 frame render dedupe
- listener cleanup 필수
- route change 후 stale listener 금지
- Layout Manager도 일반 mutation마다 전체 scan하지 않음

---

# 5. 상태 / 책임 소유권

| 상태/책임 | Owner |
|---|---|
| 제품 버전 / update URL | `version.js` |
| route/event/lifecycle | `core/app.js` |
| capability/permission probe | `core/capability.js` |
| clipboard | `core/clipboard.js` |
| 저장정책 + directory handle | `store/settings-store.js` |
| legacy cache/history read | `migration/legacy-store-adapter.js` |
| ER/24h/account relative | `metrics/metrics.js` |
| media/cover/filename | `media/media-resolver.js` |
| destination/Blob write | `media/download-manager.js` |
| Workspace open/detent/mode/tab/context state | `ui/workspace-state.js` |
| safe-area/native collision/layout snapshot | `ui/layout.js` |
| RI section/row/empty/action primitive | `ui/ri-primitives.js` |
| Grid save intent/menu | `ui/grid.js` |
| RI Foundation shell/tabs/settings/media lifecycle | `ui/ri-panel.js` |
| RI summary presentation | `ui/ri-summary.js` |
| toast | `ui/toast.js` |
| new shared CSS | `ui/styles.js` |

Instagram Identity/Extractor/Verified Store/Grid renderer/Reel renderer는 migration 완료 전까지 legacy runtime에 남아 있습니다.

---

# 6. Workspace State Owner

`ui/workspace-state.js`는 DOM을 소유하지 않는 UI state owner입니다.

현재 state:

```text
WorkspaceState
- open
- detent: closed | compact | expanded
- mode: content | global
- activeTab
- contextKey
- contextEpoch
```

API:

```text
getState()
subscribe(listener)
open()
close()
toggle()
expand()
collapse()
setActiveTab(tab)
rebindContext(identity)
```

규칙:

- launcher가 별도 open state를 소유하지 않음
- tab renderer가 detent를 소유하지 않음
- identity key가 실제 변경될 때만 contextEpoch 증가
- route/identity change 시 이전 context를 stale 확정값처럼 유지하지 않도록 rebind
- UI-D에서 CONTENT/GLOBAL presentation을 이 state에 연결

현재 Foundation panel은 open/tab/context를 이 owner에서 읽지만, Compact/Expanded의 실제 bottom-sheet visual은 아직 UI-D 전입니다.

---

# 7. Layout Manager

`ui/layout.js`가 전역 모바일 위치 계산 owner입니다.

순수 계산 API:

```text
computeLayoutSnapshot(input)
```

runtime API:

```text
createLayoutManager({ app, doc, env })
  .getSnapshot()
  .measure()
  .schedule()
  .subscribe()
  .destroy()
```

입력 개념:

```text
viewport width/height
visualViewport
safeBottom
bottom blockers
right blockers
keyboard visible
```

출력:

```text
launcherAnchor
reelOverlayLane
sheetMetrics
feedbackAnchor
```

현재 UI-B에서는 기존 시각 baseline을 기본값으로 유지하면서 CSS custom property를 통해 launcher/panel/toast offset을 한 owner로 연결했습니다.

```text
--ri-launcher-right
--ri-launcher-bottom
--ri-panel-bottom
--ri-feedback-bottom
--ri-sheet-compact-height
--ri-sheet-expanded-height
```

실제 blocker 탐지는 제한된 visible fixed/sticky candidate를 사용하며 route/resize/visualViewport 변화 때만 schedule합니다. Instagram DOM 전체를 mutation마다 scan하지 않습니다.

Reel rail 세부 적응은 UI-C/UI-F 실기기 검증에서 보강합니다.

---

# 8. RI UI Primitive

`ui/ri-primitives.js`는 실제 중복이 생긴 표현 primitive만 소유합니다.

```text
createSection()
addRow()
addAction()
renderEmpty()
```

`ri-panel.js`와 `ri-summary.js`가 같은 section/row/empty 구현을 복제하지 않습니다.

의미 없는 global `utils.js/helpers.js`로 확장하지 않습니다.

---

# 9. Metrics Engine

`metrics/metrics.js`는 DOM/storage/UI 독립 domain layer입니다.

공개 API:

```text
createMetricsEngine({ history, now })
calculateEngagementRate(input)
calculateGrowth24h(input)
calculateAccountMultiple(input)
```

history contract:

```text
getSnapshots(shortcode)
getAccountPosts(username)
```

현재는 migration adapter가 이 contract를 제공합니다. Verified Store/history가 완성되면 주입 대상만 교체합니다.

규칙:

- ER missing→0 금지
- 24h 실제 18~32h snapshot
- account same username / current 제외 / max20 / min5 / median
- Metrics module DOM 접근 금지

---

# 10. Migration Store Adapter

`migration/legacy-store-adapter.js`는 영구 Store가 아니라 migration boundary입니다.

읽기 key:

```text
ri311:items:v1
ri311:snap:v1
ri311:posts:v1
```

API:

```text
getItem(shortcode)
getPost(shortcode)
getCurrentIdentity(url?)
getSnapshots(shortcode)
getAccountPosts(username)
createChangeTracker(listener)
codeFromUrl(url)
```

금지:

- 새 Instagram parser 추가
- Verified conflict 규칙 새 구현
- cache write ownership
- missing metric을 0으로 변경

Change Tracker는 interval polling이 아니라 shared SPA activity 후 delayed fingerprint check입니다.

---

# 11. UI 구조

UI는 표현과 intent 전달만 합니다.

금지:

- GraphQL/raw JSON parse
- localStorage/IndexedDB 직접 접근
- File System picker 직접 호출
- Blob/network transport 구현
- ER/24h/account formula 구현

## `ui/grid.js`

- 기존 카드 `.ri3-grid-media` intent capture
- shortcode 식별
- media resolver 호출
- content action menu
- Download Manager / clipboard owner 호출

Grid 8-slot renderer 자체는 아직 legacy이며 별도 migration에서 옮깁니다.

## `ui/ri-panel.js`

현재 Foundation 책임:

- Global RI button mount
- panel DOM open/close
- tabs
- settings/media intent
- route/identity/store render scheduling
- injected Workspace State / Layout 사용

최종 목표의 bottom Research Workspace visual은 UI-D에서 교체합니다.

## `ui/ri-summary.js`

- raw metric presentation
- Metrics Engine 결과 presentation
- missing `—`

Instagram/storage/download side effect 없음.

---

# 12. UI Target Architecture

`UI_ARCHITECTURE.md`의 목표:

```text
UIRoot
├ GlobalLauncher
├ AmbientLayer
│  ├ GridOverlay / Grid Action
│  └ ReelOverlay
├ ResearchWorkspace
│  ├ ContextHeader
│  ├ WorkspaceNavigation
│  ├ ActiveTabHost
│  └ WorkspaceActivity
└ FeedbackLayer
   └ Toast
```

책임이 실제 커질 때만 다음 파일 분리를 검토합니다.

```text
ui-root.js
launcher.js
research-workspace.js
workspace-navigation.js
reel.js
```

처음부터 빈 `tabs/*` 파일을 만들지 않습니다.

Research Read Model도 Data Engine migration에서 실제 필요가 생긴 시점에 생성합니다.

---

# 13. Download System

```text
UI intent
  ↓
Download Manager
  ↓
destination policy
  ↓
media transport
  ↓
writer
```

mode:

- default
- directory
- prompt

지정폴더 실패 시 silent default fallback 금지.

cross-origin image/cover 문제가 실기기에서 확인될 때만 `media/transport.js` 분리를 검토합니다. 확인 전 `@grant`를 바꾸지 않습니다.

---

# 14. 중복 / 파일 관리

Single Owner rule:

- clipboard → `core/clipboard.js`
- filename → `media/media-resolver.js`
- metrics → `metrics/metrics.js`
- save policy → `settings-store.js`
- file write → `download-manager.js`
- workspace state → `workspace-state.js`
- global layout → `layout.js`
- repeated RI DOM primitive → `ri-primitives.js`

Migration exception:

legacy runtime의 Grid/Reel compatibility 함수는 새 owner 전환 및 회귀 확인 후 삭제합니다.

금지:

- `oldFn = fn; fn = override` 새 stack
- `backup.js`, `final2.js`, `hotfix.js`, `copy.js`
- 동일 helper 장기 복제
- 의미 없는 global utils dump

파일 크기 기준:

- 0~250줄 정상
- 250~350 책임 혼합 검토
- 350~500 분리 후보
- 500 초과: 명확한 단일책임 사유 없으면 실패
- `legacy-runtime.js`만 migration 기간 예외

---

# 15. 성능 규칙

- interval 전체 polling 금지
- 동일 shortcode request dedupe
- MutationObserver callback 전체 parse/render 금지
- shared SPA observer activity 사용
- change fingerprint 같으면 Store parse/render 금지
- same renderKey DOM rewrite 금지
- document-level listener 한 세트 지향
- localStorage/IndexedDB write는 owner만
- CDN URL identity key 금지
- layout 전체 scan은 일반 mutation마다 실행 금지
- inactive heavy research tab 동시 mount 금지(향후 UI-D)

---

# 16. Build / Check

```text
src/main.js
  ↓ esbuild
metadata prepend
  ↓
ri-retry.user.js
```

Gate:

```text
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

현재 check 대상:

- forbidden backup/hotfix filename
- UI storage/File System 직접 사용
- UI network transport
- UI clipboard duplicate
- UI filename owner 침범
- metrics DOM 접근
- store→UI dependency
- circular import
- version/update URL mismatch
- generated warning
- runtime `@require`
- source size
- preservation/UI architecture 문서 존재
- required work-track sections

---

# 17. Migration 단계

## Phase 1 — Build source 전환 — 완료

- `src/*` source-of-truth
- generated userscript

## Phase 2 — Foundation — 완료

- AppContext
- capability
- settings
- download manager
- global RI shell

## Phase 3 — Download migration — 진행 중

- Grid/RI → common manager
- global mode
- 지정폴더 photo/cover 실기기 확인 대기

## Phase 4 — UI / Metrics migration — 진행 중

완료:

- SPA activity 공유
- legacy fingerprint binding
- Metrics Engine
- RI Summary metrics
- UI baseline / architecture
- RI primitives
- Workspace State
- Layout Manager foundation
- architecture duplicate warning 0

다음:

- UI-C Global Launcher visual replacement
- UI-D Contextual Research Workspace
- UI-E Activity layer
- UI-F Reel identity/native metrics + overlay

## Phase 5 — Data Engine

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[]
→ Grid/Reel renderer
```

## Phase 6 — Legacy removal

- legacy runtime 제거
- migration adapter 제거
- duplicate CSS/logic 제거

---

# 18. 완료 기준

1. `src/*`만 개발 원본
2. generated userscript 직접 수정 없음
3. 기능별 owner 명확
4. UI/Store/Metrics/Download/Layout 책임 분리
5. interval polling 없음
6. 같은 핵심 로직 장기 중복 없음
7. source size gate 유지
8. unit/build/check 통과
9. preservation/replacement gate 통과
10. Android Edge 실기기 미확인 항목을 Verified로 기록하지 않음
11. 문서와 실제 source ownership 일치
