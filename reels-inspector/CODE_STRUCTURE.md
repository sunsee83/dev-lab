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
3. **Single Side-Effect Path** — persistence/download/clipboard는 지정 경로만 사용
4. **Small Public API** — 모듈 간 작은 명시적 API
5. **Progressive Modularization** — 실제 책임 경계가 생길 때만 분리
6. **Migration without rollback** — 승인된 runtime을 보존하면서 호출부를 단계 이동
7. **UI State Ownership** — launcher/workspace/tab이 open/context/layout 상태를 중복 소유하지 않음
8. **Documented Replacement** — 기존 UI 제거는 preservation/replacement gate 이후에만

파일 수 자체를 목표로 하지 않습니다.

---

# 2. 현재 실제 구조 — v3.2.4 UI-E source checkpoint

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
│  │  ├ activity.js
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
│     ├ activity-indicator.js
│     ├ grid.js
│     ├ layout.js
│     ├ workspace-state.js
│     ├ research-workspace.js
│     ├ ri-primitives.js
│     ├ ri-panel.js
│     ├ ri-settings.js
│     ├ ri-summary.js
│     ├ toast.js
│     └ styles.js
│
├ tests/
│  ├ README.md
│  ├ fixtures/
│  └ unit/
│     ├ activity.test.mjs
│     ├ foundation.test.mjs
│     ├ migration.test.mjs
│     ├ metrics.test.mjs
│     ├ ui-launcher.test.mjs
│     └ ui-workspace.test.mjs
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

`src/main.js`만 subsystem을 조립합니다.

```text
main.js
  ├ VERSION / UPDATE_URL
  ├ AppContext
  ├ Activity Store
  ├ Capability Snapshot
  ├ Settings Store
  ├ Download Manager
  ├ Legacy Store Adapter
  ├ Metrics Engine
  ├ Workspace State
  ├ Layout Manager
  ├ Grid Actions
  ├ RI Controller
  └ Activity Indicator
```

개념:

```js
const app = createApp({ version: VERSION });
const activity = createActivityStore();
const settings = createSettingsStore(...);
const legacyStore = createLegacyStoreAdapter(...);
const metrics = createMetricsEngine({ history: legacyStore });
const downloads = createDownloadManager({
  ...,
  onChange(change) {
    if (change?.activity) activity.apply(change.activity);
  }
});
const workspace = createWorkspaceState();
const layout = createLayoutManager({ app, doc, env });
const riPanel = mountRiPanel({ app, settings, downloads, metrics, adapter: legacyStore, workspace, layout });
mountActivityIndicator({ activity, workspace, onAction: (item) => {
  if (item.action === 'open-settings') riPanel.openSettings();
}});
```

하위 모듈이 global service locator를 찾아다니지 않습니다.

---

# 4. Runtime Event / Activity

공식 AppContext event:

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

`core/app.js`가 event 이름과 SPA lifecycle을 소유합니다.

기존 SPA `MutationObserver` activity를 공유하여 같은 DOM을 보기 위한 두 번째 전체 observer를 만들지 않습니다.

```text
MutationObserver (1)
   ↓
AppContext
   ├ route/identity sync
   └ legacy store fingerprint schedule
```

Async 작업 상태는 별도 `core/activity.js` owner를 사용합니다. AppContext event bus가 Activity state 자체를 소유하지 않습니다.

규칙:

- mutation마다 전체 Grid/Store parse 금지
- `scheduleRender(key)` 동일 frame dedupe
- listener cleanup 필수
- route change 후 stale listener 금지
- Layout Manager도 일반 mutation마다 전체 scan 금지
- async progress를 각 UI가 별도 boolean/toast state로 복제하지 않음

---

# 5. 상태 / 책임 소유권

| 상태/책임 | Owner |
|---|---|
| 제품 버전 / update URL | `version.js` |
| route/event/lifecycle | `core/app.js` |
| async activity state/lifecycle | `core/activity.js` |
| capability/permission | `core/capability.js` |
| clipboard | `core/clipboard.js` |
| 저장정책 + directory handle | `store/settings-store.js` |
| legacy cache/history read | `migration/legacy-store-adapter.js` |
| ER/24h/account relative | `metrics/metrics.js` |
| media/cover/default filename | `media/media-resolver.js` |
| destination/Blob write + download activity emission | `media/download-manager.js` |
| Workspace open/detent/mode/tab/context | `ui/workspace-state.js` |
| safe-area/native collision/layout snapshot | `ui/layout.js` |
| Research Workspace DOM shell/header/tabs/detent/outside-close | `ui/research-workspace.js` |
| running/persistent Activity presentation | `ui/activity-indicator.js` |
| transient feedback / toast dedupe | `ui/toast.js` |
| RI section/row/empty/action primitive | `ui/ri-primitives.js` |
| RI intent/controller + summary/media wiring | `ui/ri-panel.js` |
| RI Settings presentation | `ui/ri-settings.js` |
| RI summary presentation | `ui/ri-summary.js` |
| Grid save intent/menu | `ui/grid.js` |
| shared CSS | `ui/styles.js` |

Instagram Identity/Extractor/Verified Store/Grid renderer/Reel renderer는 migration 완료 전까지 legacy runtime에 남아 있습니다.

---

# 6. Workspace State Owner

`ui/workspace-state.js`는 DOM을 소유하지 않는 UI state owner입니다.

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
- view가 detent business state를 소유하지 않음
- identity key가 실제 변경될 때만 contextEpoch 증가
- route/identity change 시 이전 context를 새 콘텐츠 확정값처럼 유지하지 않음

---

# 7. Contextual Research Workspace

`ui/research-workspace.js`는 모바일 Workspace **DOM shell만** 소유합니다.

소유:

```text
bottom sheet mount/unmount
context header
CONTENT tab rail
COMPACT / EXPANDED visual state binding
explicit expand/collapse control
close control
compact outside-tap close
expanded soft scrim
body scroll reset API
persistent update shortcut slot
activity host slot
```

소유하지 않음:

- Instagram parser
- Settings persistence
- download side effect
- Metrics formula
- Activity business state
- content data selection

`ui/ri-panel.js`가 controller 역할로 다음을 연결합니다.

```text
Workspace State
      ↓
Research Workspace View
      ↓
CONTENT
  ├ Summary
  ├ Content placeholder/data
  ├ Comments placeholder/data
  ├ Analysis placeholder/data
  ├ Media actions
  └ Settings → ri-settings.js

GLOBAL
  ├ RI Home
  ├ global Settings
  └ Update shortcut
```

CONTENT의 기존 6탭은 유지합니다. GLOBAL에서는 콘텐츠 identity가 없는데 빈 6탭을 보여주지 않습니다.

active body는 현재 탭 하나만 render하고, context가 실제 변경되면 body scroll을 top으로 reset합니다.

---

# 8. Layout Manager

`ui/layout.js`가 전역 모바일 위치 계산 owner입니다.

순수 계산:

```text
computeLayoutSnapshot(input)
```

runtime:

```text
createLayoutManager({ app, doc, env })
  .getSnapshot()
  .measure()
  .schedule()
  .subscribe()
  .destroy()
```

입력:

```text
viewport / visualViewport
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

CSS custom properties:

```text
--ri-launcher-right
--ri-launcher-bottom
--ri-panel-bottom       # migration compatibility
--ri-feedback-bottom
--ri-sheet-compact-height
--ri-sheet-expanded-height
```

route/resize/orientation/visualViewport 변화에서 schedule하며 일반 mutation마다 전체 layout scan하지 않습니다.

Instagram blocker heuristic의 실제 Android Edge 적합성은 실기기 검증 전 Unverified입니다.

---

# 9. UI Primitive / Settings Presentation

`ui/ri-primitives.js`:

```text
createSection()
addRow()
addAction()
renderEmpty()
```

실제 중복된 표현만 공통화합니다. 의미 없는 `utils.js/helpers.js`로 확장하지 않습니다.

`ui/ri-settings.js`는 실제 Settings tab/global settings 표현 책임이 커져 분리된 owner입니다.

소유:

- download mode option presentation
- folder name / permission rows
- folder select/change action
- settings feedback copy

Settings persistence와 directory handle은 계속 `store/settings-store.js`가 소유합니다.

---

# 10. Metrics Engine

`metrics/metrics.js`는 DOM/storage/UI 독립 domain layer입니다.

공식 계산:

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32시간 snapshot 중 24시간에 가장 가까운 값
account relative = 동일 account 최근 최대20 / 최소5 / views median 대비 배수
```

missing 값을 0으로 만들어 계산하지 않습니다.

legacy Grid/Reel compatibility metric 함수는 새 renderer 전환 뒤 제거합니다. 새 metric 변경은 `metrics/metrics.js`에만 적용합니다.

---

# 11. Migration Store Adapter

`migration/legacy-store-adapter.js`는 영구 Store가 아니라 migration boundary입니다.

legacy keys:

```text
ri311:items:v1
ri311:snap:v1
ri311:posts:v1
```

주요 read API:

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
- cache write ownership 가져오기
- 미확보 metric을 0으로 변환

Change Tracker는 interval polling이 아닙니다. AppContext activity에서 delayed fingerprint check를 한 번 schedule하고 실제 raw key가 바뀔 때만 STORE_CHANGED를 발생시킵니다.

---

# 12. Download + Activity System

미디어 저장 경로:

```text
UI intent
  ↓
Download Manager
  ├ destination policy
  ├ media transport/write
  └ structured activity event
        ↓
     Activity Store
        ↓
 Activity Indicator / Toast
```

mode:

- default
- directory
- prompt

Activity contract:

```text
id
kind: download | analysis | stt | ocr | ...
state: running | success | error
label
progress: { current, total } | null
message
code
persistent
action / actionLabel
```

규칙:

- video/cover/photo/carousel 같은 manager 사용
- filename owner는 media layer
- 지정 폴더 실패 시 silent default fallback 금지
- Carousel prompt destination 한 번 선택 후 batch 재사용
- batch progress는 동일 id로 `1/N ... N/N` 갱신
- success/non-actionable error는 transient Toast
- permission/directory/picker actionable error는 persistent Activity
- persistent error의 `open-settings` action은 composition root에서 RI Settings에 연결
- cancellation은 완료/실패처럼 표시하지 않고 Activity 제거
- open Workspace에서는 같은 Activity DOM node를 host로 이동하며 복제하지 않음
- launcher badge는 현재 필요성이 없어 만들지 않음
- cross-origin image/cover 실패가 실기기에서 확인되기 전 `@grant` 변경 금지

CORS 문제가 확인되면 UI가 아니라 `media/transport.js` 분리를 검토합니다.

---

# 13. Grid / Reel Preservation

Grid renderer는 migration 전 legacy runtime에 남겨 회귀 위험을 낮춥니다.

Frozen:

- Instagram 3열
- 하단 2줄 / 8 fixed slots
- no-flicker / renderKey
- Photo/Carousel bogus views 차단
- native media type icon
- 카드당 media action 1개
- actual Video/Reel cover
- music/album/avatar reject
- Carousel individual batch / no ZIP

Reel target:

```text
▶ views
ER
24h
× account relative
date
```

native likes/comments/reposts/share는 제거하거나 중복하지 않습니다.

---

# 14. 중복 / 파일 크기 관리

Single Owner 예:

- clipboard → `core/clipboard.js`
- activity state → `core/activity.js`
- filename → `media/media-resolver.js`
- metrics → `metrics/metrics.js`
- save policy → `settings-store.js`
- file write → `download-manager.js`
- workspace state → `workspace-state.js`
- workspace DOM shell → `research-workspace.js`
- RI settings presentation → `ri-settings.js`
- activity presentation → `activity-indicator.js`
- mobile collision → `layout.js`

금지:

- 새 override stack
- `backup.js`, `hotfix.js`, `final2.js`, `copy.js`
- 같은 helper 장기 복제
- global `utils.js` 쓰레기통

크기 기준:

- 0~250줄 정상
- 250~350줄 책임 혼합 검토
- 350~500줄 분리 후보/warning
- 500줄 초과 일반 source는 architecture error
- `legacy-runtime.js`만 migration 기간 예외

UI-D에서 shell을 `research-workspace.js`로 분리했고, UI-E에서 Settings presentation을 `ri-settings.js`로 분리해 `ri-panel.js`가 다시 controller 역할에 집중하도록 했습니다. UI-E checkpoint는 **23 source files / 0 architecture warnings**입니다.

---

# 15. 성능 규칙

- interval 전체 polling 금지
- 동일 shortcode request dedupe
- MutationObserver callback 전체 parse/render 금지
- shared SPA observer activity 활용
- store fingerprint 동일 시 parse/render 금지
- 같은 renderKey DOM rewrite 금지
- document-level listener는 owner가 cleanup
- active research body만 render
- context change 시 stale view invalidate
- Activity same-id update는 state merge
- localStorage/IndexedDB write는 owner만
- CDN URL을 identity key로 사용 금지

---

# 16. Build / Check

```text
src/main.js
  ↓
esbuild bundle
  ↓
userscript metadata
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

`check.mjs`가 확인하는 핵심:

- forbidden backup/hotfix filenames
- UI storage/File System/network direct use
- UI clipboard/default filename 재구현
- metrics DOM 접근
- store→UI dependency
- circular imports
- version/update URL/document checkpoints
- preservation update shortcut
- UI baseline/architecture/work-track sections
- UI-E owner files
- runtime `@require`
- syntax
- source size / duplicate warnings

UI-E checkpoint:

- unit 26/26
- 23 source files
- 0 warnings

---

# 17. Migration 단계

## Phase 1 — build source 전환 — 완료

- `src/*` source-of-truth
- root userscript generated

## Phase 2 — Foundation — 완료

- AppContext
- capability
- settings
- download manager
- global RI entry

## Phase 3 — Download migration — 진행 중

- Grid/RI intent → common manager
- global mode
- Activity lifecycle 연결
- directory photo/cover CORS device check 대기

## Phase 4 — UI / Metrics migration — 진행 중

완료/source checkpoint:

- shared SPA activity
- live store fingerprint binding
- Metrics Engine
- RI Summary metrics
- UI primitive owner
- Workspace State owner
- Layout Manager foundation
- v3.1 RI launcher visual restoration
- Contextual bottom Research Workspace source
- CONTENT / GLOBAL presentation split
- Compact / Expanded explicit controls
- Feedback / Activity owner
- Carousel batch progress
- persistent actionable download error

다음:

- Reel identity/native metrics audit
- Reel overlay → Metrics owner
- legacy metric renderer/callsite 제거

## Phase 5 — Data Engine

```text
Identity
→ Extractor
→ Verified Store
→ common history
→ media[]
→ Grid/Reel renderer
```

## Phase 6 — Legacy removal

- remaining legacy owners 이동
- migration adapter 삭제
- legacy runtime 삭제
- duplicate CSS/compatibility 제거

---

# 18. 완료 기준

1. `src/*`만 개발 원본
2. generated userscript 직접 수정 없음
3. 기능별 owner 명확
4. UI/Store/Metrics/Download/Activity 책임 분리
5. interval polling 없음
6. 핵심 로직 장기 중복 없음
7. source size gate / architecture warning 0 유지
8. Grid/cover/no-flicker/update shortcut 보존
9. 기존 component 제거는 replacement gate 이후
10. unit/build/check 통과
11. Android Edge 항목은 실제 확인 전 Verified로 기록하지 않음
