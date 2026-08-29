# Instagram Content Research Tool — UI Architecture

이 문서는 `UI_BASELINE.md`의 시각/조작 기준을 실제 컴포넌트·상태·데이터 흐름으로 구현하기 위한 **UI 구조 설계 문서**입니다.

문서 역할:

```text
PROJECT_PLAN.md          = 제품/데이터/장기 기능
UI_BASELINE.md           = 사용자에게 보이는 모바일 UI 기준
UI_ARCHITECTURE.md       = UI 계층/상태/컴포넌트/데이터 흐름
GRID_BASELINE.md         = Grid Frozen UI
PRESERVATION_BASELINE.md = 기존 기능/외형 보존·교체 gate
CODE_STRUCTURE.md        = 실제 소스 owner/dependency
WORK_TRACK.md            = 현재 구현 순서
```

기존 좋은 점을 먼저 보존하고, 새 구조가 동등 이상의 접근성을 확보한 뒤 기존 구현을 교체합니다.

## 현재 구현 상태

- UI-A Architecture Freeze: **완료**
- UI-B Primitive + Layout + Workspace State Foundation: **코드/CI 완료, 실기기 미확인**
- UI-C Global Launcher Restoration: **source 완료, 실기기 미확인**
- UI-D Contextual Research Workspace: **source 완료, 실기기 미확인**
- UI-E Feedback/Activity: **source 완료, 실기기 미확인**
- UI-F Reel Overlay Unification: **다음 작업**
- UI-G Data Engine/Research Tabs: 예정

현재 source는 기존 RI visual identity를 유지한 Global Launcher, 모바일 bottom Research Workspace, 공용 Activity/Feedback owner까지 연결했습니다. Android Edge 실제 크기·충돌·터치·진행표시는 실기기 확인 전 Verified가 아닙니다.

---

# 1. 목표

사용 흐름:

```text
발굴
→ 빠른 비교
→ 콘텐츠 확인
→ 상세 조사
→ 원본 확보
→ 분석
→ 참고 소재 저장
```

모바일 UI 목표:

1. Instagram 자체 탐색 방해 최소화
2. 자주 보는 정보는 가볍게, 긴 정보는 열었을 때만
3. Grid/Reel/Post별 기능 중복 금지
4. 한 손으로 열기/닫기/이동 용이
5. identity change 시 stale UI 혼입 금지
6. 저장/분석 async 상태의 공용 표현
7. 기존 승인 기능/외형 손실 금지
8. UI가 parser/storage/network/domain formula를 소유하지 않음

---

# 2. 5-Layer UI Model

```text
L0 Instagram Native
   좋아요/댓글/공유/nav/feed/reel

L1 Ambient Intelligence
   Grid 8-slot / Reel 핵심지표 overlay

L2 Intent Entry
   Grid media action / Global RI Launcher

L3 Research Workspace
   Context Header / Navigation / Active Tab / Settings / Media

L4 Feedback & Activity
   Toast / download progress / error / future STT·OCR·AI job
```

규칙:

- L1은 항상 가볍고 read-oriented
- L2는 진입점만 담당
- L3에서 긴 조사 UI 제공
- L4는 공용 상태표현
- Instagram native UI 제거/복제 금지

---

# 3. Context Model

Global RI는 모든 화면에 존재하지만 모든 화면에서 같은 빈 UI를 강제하지 않습니다.

```text
CONTENT
- Reel
- Feed Video
- Photo
- Carousel
- Post detail

GLOBAL
- Search/Explore 등 current content identity가 없음
- content를 특정할 수 없는 Profile/Grid 상태
```

향후 account model이 준비되면 `ACCOUNT` context 검토. 데이터 없이 UI만 먼저 만들지 않습니다.

## CONTENT

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

6탭은 그대로 보존합니다.

## GLOBAL

빈 6탭 대신 가벼운 `RI Home`:

- 현재 콘텐츠 없음 안내
- 전역 설정
- 업데이트 바로가기

---

# 4. Single UI Root

논리 구조:

```text
UIRoot
├ GlobalLauncher
├ AmbientLayer
│  ├ GridOverlay / Grid Action
│  └ ReelOverlay
├ ResearchWorkspace
│  ├ ContextHeader
│  ├ WorkspaceNavigation
│  ├ WorkspaceActivityHost
│  └ ActiveTabHost
└ FeedbackLayer
   ├ ActivityIndicator
   └ Toast
```

목표/현재 원칙:

- launcher 1개
- workspace 1개
- Activity state owner 1개
- Activity indicator DOM node 1개
- toast owner 1개
- layout owner 1개
- workspace state owner 1개
- route/store event 중복 subscribe 최소화

Activity Indicator는 Workspace가 열렸다고 별도 인스턴스를 만들지 않습니다. 같은 DOM node를 Workspace host로 이동합니다.

---

# 5. Workspace State Machine

현재 `ui/workspace-state.js`가 state owner입니다.

```text
CLOSED
  └ launcher tap → COMPACT

COMPACT
  ├ expand → EXPANDED
  ├ close → CLOSED
  └ route/context change → detent 유지 + context rebind

EXPANDED
  ├ collapse → COMPACT
  ├ close → CLOSED
  └ route/context change → detent 유지 + context rebind
```

state:

```text
open
detent: closed | compact | expanded
mode: content | global
activeTab
contextKey
contextEpoch
```

UI-D부터 실제 bottom Research Workspace가 이 state를 읽습니다.

## COMPACT

- 약 48~56vh
- soft non-modal
- Instagram을 상당 부분 계속 볼 수 있음
- summary/media/settings 빠른 사용
- outside tap close 가능

## EXPANDED

- 약 78~84vh
- 긴 Caption/댓글/분석
- soft scrim
- full screen 강제 금지

조작:

- `×` 항상 존재
- explicit expand/collapse
- drag handle은 보조
- body swipe-dismiss 금지
- tab swipe navigation 금지
- browser Back용 임의 history entry 금지

---

# 6. Route / Identity Change Policy

정책:

1. route/identity change 감지
2. 이전 content state invalidation
3. new identity/contextKey rebind
4. contextEpoch 증가
5. detent 유지
6. CONTENT→CONTENT에서 지원되는 active tab 유지
7. CONTENT→GLOBAL은 RI Home
8. 새 body는 top으로 reset
9. active view만 render

현재 `workspace.rebindContext(identity)`가 panel route/identity/store scheduling과 연결되어 있습니다.

이전 shortcode의 media/comments/metrics를 새 shortcode와 혼합하지 않습니다.

---

# 7. Workspace Navigation

CONTENT 6탭:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

현재:

- header 아래 horizontal tab rail
- selected tab `scrollIntoView`
- touch target 약 44px
- selected 상태를 aria + underline/text로 표현
- swipe tab navigation 없음

## Active Tab Host

- active tab만 mount/render
- inactive heavy DOM 유지 금지
- Content/Comments/Analysis는 data migration 전 placeholder
- context change 시 이전 content scroll 재사용 금지

---

# 8. Context Header

CONTENT:

```text
RI · @username    REEL    v3.2.x    확장/축소  ×
```

GLOBAL:

```text
RI Research              v3.2.x    확장/축소  ×
```

우선순위:

1. current context
2. close
3. expand/collapse
4. version 보조정보

shortcode 전체를 항상 header에 노출하지 않습니다.

---

# 9. Global RI Launcher

기존 Reel RI visual identity를 계승합니다.

```text
CLOSED tap → COMPACT
OPEN tap   → CLOSED
```

현재 source:

```text
44×44 touch target
└ 34×34 low-opacity circle
  └ 21×21 research icon
```

규칙:

- 화면당 1개
- Instagram native보다 과도하게 튀지 않음
- 별도 settings gear를 Grid/header에 추가하지 않음
- Layout Manager anchor 사용
- Android Edge actual collision/parity는 실기기 전 Unverified

---

# 10. Layout Manager

현재 `ui/layout.js`가 단일 owner입니다.

순수 API:

```text
computeLayoutSnapshot(input)
```

runtime API:

```text
createLayoutManager({ app, doc, env })
getSnapshot()
measure()
schedule()
subscribe()
destroy()
```

입력 개념:

```text
viewportWidth / viewportHeight
visualViewport
safeBottom
bottomBlockers[]
rightBlockers[]
keyboardVisible
```

출력:

```text
launcherAnchor
reelOverlayLane
sheetMetrics
feedbackAnchor
```

CSS variables:

```text
--ri-launcher-right
--ri-launcher-bottom
--ri-panel-bottom
--ri-feedback-bottom
--ri-sheet-compact-height
--ri-sheet-expanded-height
```

Trigger:

- route change
- resize/orientation
- visualViewport resize/scroll

일반 DOM mutation마다 전체 layout scan하지 않습니다.

향후 보강:

- UI-C/UI-D/UI-E: 실제 launcher/sheet/activity와 nav/banner 충돌 실기기 검증
- UI-F: Reel native right rail lane 보강

---

# 11. Grid UI — Preserve

Grid는 Workspace/Activity 전환 때문에 재설계하지 않습니다.

유지:

- 3열
- 하단 2줄 8-slot
- no-flicker/renderKey
- Photo/Carousel bogus views 차단
- native media-type icon
- 카드당 action 1개
- actual Video/Reel cover
- music/album/avatar 제외
- Carousel individual batch

```text
Grid = 비교
Grid media action = 빠른 저장
Global RI = 상세 조사
```

---

# 12. Reel Overlay — Preserve + Adaptive Position

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

- box/blur 없음
- white/gray text + shadow
- missing line 숨김
- native likes/comments/reposts/share 중복 금지
- caption/right rail 비침범
- 기존 안정적 geometry 시작점
- Layout Manager `reelOverlayLane` 사용 목표

실제 identity/native metrics audit와 Metrics owner 전환은 UI-F.

---

# 13. Summary UX

목표: **10초 안에 성과 판단**.

identity strip:

- username
- media type
- date

모바일 metric layout target:

```text
조회        좋아요
댓글        리포스트

ER          24h
계정대비     게시일
```

작은 8-column table 금지.

상태:

```text
loading      확인 중
missing      —
unavailable  사용 불가
conflict     검증 중
verified     실제 값
```

현재 Summary는 Metrics Engine과 연결돼 있습니다.

---

# 14. Content / Comments / Analysis UX

## Content

- Caption
- hashtags/mentions
- STT
- OCR
- corrected transcript
- Carousel slide OCR

copy action은 section 가까이에 둡니다.

## Comments

```text
유용 | 질문 | 구매의도 | 후기 | 불만 | 반론 | 팁 | 아이디어
```

- horizontal filter scroll
- thread 보존
- AI 전 deterministic candidate selection

## Analysis

- Hook
- fixed title
- CTA
- emphasis
- numbers/prices
- structure
- speech rate

결과 없으면 빈 card 여러 개 대신 하나의 clear empty state.

실제 데이터 연결은 UI-G 이후.

---

# 15. Media / Settings UX

## Media

- Reel/Video: video + actual cover
- Photo: original image
- Carousel: count + representative + whole batch + future per-slide
- 주요 button 약 44px target
- 모든 저장은 Download Manager

## Settings

`ui/ri-settings.js`가 presentation owner입니다.

전역 설정:

- 지정 폴더
- 기본 Downloads
- 매번 선택
- 현재 폴더
- permission
- folder select/change

Persistence/directory handle은 `store/settings-store.js` owner입니다.

큰 `업데이트 바로가기`는 Workspace footer에서 항상 접근 가능하게 유지합니다.

---

# 16. Feedback & Activity Layer

현재 구현 owner:

```text
core/activity.js
= Activity state/lifecycle

media/download-manager.js
= download activity emission

ui/activity-indicator.js
= running/persistent Activity presentation

ui/toast.js
= transient feedback + duplicate suppression
```

Activity model:

```text
Activity
- id
- kind: download | analysis | stt | ocr | ...
- state: running | success | error
- label
- progress: { current, total } | null
- message
- code
- persistent
- action / actionLabel
- startedAt / updatedAt
```

표현 정책:

- 짧은 성공 → Toast
- non-actionable error → Toast
- 같은 Toast 1.4초 내 중복 억제
- long-running → Activity Indicator
- actionable directory/permission/picker error → persistent Activity
- persistent error → `설정 열기` action 가능
- Carousel batch → 동일 id로 `1/N ... N/N 저장 중`
- cancel → Activity 제거
- launcher badge는 현재 필요성 없어 추가하지 않음

Placement:

```text
Workspace closed
→ global Activity Indicator
→ Layout Manager --ri-feedback-bottom

Workspace open
→ 동일 #ri32-activity node
→ .ri32-activity-host 로 이동
```

즉 global과 Workspace에 진행카드를 복제하지 않습니다.

향후 STT/OCR/AI job은 Download Manager를 거치지 않아도 같은 Activity Store contract를 publish할 수 있습니다.

---

# 17. Non-modal / Modal Policy

COMPACT:

- soft non-modal
- 불필요한 full scrim 없음
- outside tap close 가능

EXPANDED:

- weak scrim 허용
- background accidental action 방지
- sheet scroll 우선

browser navigation/back 가로채지 않음.

---

# 18. Mobile Design Tokens

현재/target tokens:

```text
--ri-touch: 약 44px
--ri-radius-sheet: 18~20px
--ri-radius-control: 9~12px
--ri-space-1: 4px
--ri-space-2: 8px
--ri-space-3: 12px
--ri-space-4: 16px
```

텍스트:

- 핵심 metric 11~13px+
- body 12~14px
- 9px 이하 핵심정보 금지
- tabular numeric

색상:

- Instagram보다 강한 브랜드색 상시 사용 금지
- dark/light 대응 가능
- 상태를 color만으로 구분 금지

실제 토큰 일괄 추상화는 필요성이 생길 때만 합니다.

---

# 19. UI Read Model Boundary

현재 `ri-panel.js`가 migration adapter를 읽는 것은 임시 허용입니다.

최종 contract:

```text
ResearchReadModel
- getContext()
- getSummary(identity)
- getMedia(identity)
- getCapabilities(identity)
- subscribe(listener)
```

효과:

- tab별 legacy parsing 복제 금지
- stale 처리 한 곳
- Data Engine 교체와 UI 분리
- 향후 ACCOUNT mode 확장

실제 구현 파일은 Data Engine migration 시 필요가 생겼을 때 생성합니다.

---

# 20. UI State Ownership

현재 owner:

```text
Workspace State → ui/workspace-state.js
Layout State    → ui/layout.js
Activity State  → core/activity.js
```

금지:

- launcher separate open state
- tab renderer sheet height ownership
- toast direct bottom offset calculation
- Grid/RI별 download progress boolean 복제
- route마다 new global listener

각 tab은 local presentation state만 소유합니다.

---

# 21. Current / Target File Ownership

현재 실제 UI/Foundation:

```text
core/
└ activity.js

ui/
├ activity-indicator.js
├ grid.js
├ layout.js
├ workspace-state.js
├ research-workspace.js
├ ri-primitives.js
├ ri-panel.js
├ ri-settings.js
├ ri-summary.js
├ toast.js
└ styles.js
```

실제 책임이 커질 때만 추가 분리합니다. 처음부터 빈 `tabs/*`, `utils.js`, `helpers.js`를 만들지 않습니다.

---

# 22. Migration Plan

## UI-A — Architecture Freeze — 완료

- baseline/architecture/preservation 정리
- current↔target gap 문서화

## UI-B — Primitive + Layout + Workspace State — source 완료

- `ri-primitives.js`
- `layout.js`
- `workspace-state.js`
- owner injection / route scheduling
- duplicate warning 0

## UI-C — Launcher Restoration — source 완료 / device pending

- v3.1 RI SVG/visual audit
- 34px legacy-style visual + 44px touch target
- Layout Manager anchor

## UI-D — Research Workspace Replacement — source 완료 / device pending

- `research-workspace.js`
- bottom sheet COMPACT/EXPANDED
- CONTENT 6탭
- GLOBAL RI Home
- explicit expand/collapse/close
- active body only render
- summary/media/settings/update 이관

## UI-E — Feedback / Activity — source 완료 / device pending

- `core/activity.js`
- `ui/activity-indicator.js`
- Toast dedupe
- Carousel batch progress
- persistent actionable error
- Workspace Activity host
- Settings action 연결
- `ri-settings.js` responsibility split
- 23 source / 0 architecture warnings checkpoint

## UI-F — Reel Overlay Unification — 다음

1. current Reel identity audit
2. native metrics source audit
3. Metrics owner 연결
4. `▶ / ER / 24h / × / date`
5. Layout Manager reel lane
6. legacy metric renderer/callsite 제거

## UI-G — Data Engine / Research Tabs

- Identity
- Extractor
- Verified Store
- history
- media[]
- Content/Comments/Analysis
- STT/OCR/AI

---

# 23. Acceptance / Definition of Done

## Preserve

- Grid Frozen UI
- 업데이트 바로가기
- 기존 Reel RI visual identity
- native Instagram actions
- cover/no-flicker/media improvements
- directory failure no silent fallback

## Structure

- Global Launcher 1개
- Workspace 1개
- layout owner 1개
- workspace state owner 1개
- activity state owner 1개
- Activity Indicator 1개
- stale context invalidation
- active heavy tab only mount
- UI storage/network/metrics formula 금지

## Feedback

- batch progress same-id update
- short success toast
- duplicate toast suppression
- actionable error persistent
- Workspace/global Activity duplication 없음

## Mobile

- 주요 touch target 약 44px
- close 항상 접근
- Compact 과도한 화면 가림 없음
- Expanded 긴 글 가능
- keyboard/visualViewport 검토
- bottom nav/banner/right rail serious overlap 없음
- Instagram navigation과 swipe conflict 없음

## Verification

- unit/build/check pass
- architecture warnings 0
- Android Edge 실기기 전 visual/touch Verified 금지
- component 제거는 replacement gate 이후

---

# 24. 현재 구조에서 개선된 점

기존 좋은 방향 유지:

- Grid 3열/8-slot
- 기존 Reel RI visual identity
- Reel 5개 파생지표 target
- Global RI 1개
- CONTENT 6탭
- bottom Research Workspace
- Compact/Expanded
- 업데이트 shortcut
- common Settings/Download Manager

구조적 개선:

- CONTENT/GLOBAL context
- RI Home
- Workspace State owner
- Layout owner
- RI primitive duplicate 제거
- Research Workspace shell owner
- Settings presentation owner
- route identity contextEpoch
- active-tab lazy render
- non-modal/semi-modal policy
- explicit expand/collapse
- browser history 비침범
- Activity state owner
- transient/persistent feedback 분리
- future STT/OCR/AI Activity extension
- Research Read Model boundary

이 문서의 구조를 바꾸려면 기존 의도와 보존항목을 먼저 검토하고 `WORK_TRACK.md` 실행순서를 먼저 갱신합니다.
