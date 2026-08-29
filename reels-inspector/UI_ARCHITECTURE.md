# Instagram Content Research Tool — UI Architecture

이 문서는 `UI_BASELINE.md`의 시각/조작 기준을 실제 컴포넌트·상태·데이터 흐름으로 구현하기 위한 **UI 구조 설계 문서**입니다.

문서 역할:

```text
PROJECT_PLAN.md          = 제품/데이터/장기 기능
UI_BASELINE.md           = 사용자가 보게 되는 모바일 UI 기준
UI_ARCHITECTURE.md       = UI 계층/상태/컴포넌트/데이터 흐름
GRID_BASELINE.md         = Grid Frozen UI
PRESERVATION_BASELINE.md = 기존 기능/외형 보존·교체 gate
CODE_STRUCTURE.md        = 현재 소스 owner/dependency
WORK_TRACK.md            = 지금 구현할 순서
```

UI 구조를 바꿀 때는 기존 좋은 점을 먼저 보존하고, 새 구조가 동등 이상의 접근성을 확보한 뒤 기존 구현을 교체합니다.

---

# 1. 목표

사용 흐름은 다음을 가장 짧게 이어야 합니다.

```text
발굴
→ 빠른 비교
→ 콘텐츠 확인
→ 상세 조사
→ 원본 확보
→ 분석
→ 참고 소재 저장
```

모바일 UI의 핵심 목표:

1. Instagram 자체 탐색을 방해하지 않는다.
2. 자주 보는 정보는 화면 위에 가볍게, 긴 정보는 열었을 때만 보여준다.
3. 같은 기능을 Grid/Reel/Post마다 중복 구현하지 않는다.
4. 한 손으로 열고 닫고 이동하기 쉽다.
5. 현재 콘텐츠 identity가 바뀌면 이전 콘텐츠 UI 상태가 섞이지 않는다.
6. 저장/분석 같은 비동기 작업 상태를 한 곳에서 보여준다.
7. 기존 승인 기능을 새 UI 때문에 잃지 않는다.

---

# 2. 5-Layer UI Model

UI는 다섯 층으로 나눕니다.

```text
L0 Instagram Native
   좋아요/댓글/공유/nav/feed/reel 자체 UI

L1 Ambient Intelligence
   Grid 8-slot / Reel 핵심지표 overlay

L2 Intent Entry
   Grid media action / Global RI Launcher

L3 Research Workspace
   Context Header / Navigation / Active Tab / Settings / Media

L4 Feedback & Activity
   Toast / download progress / error / future STT·OCR·AI job state
```

규칙:

- L1은 항상 가볍고 읽기 전용에 가깝게 유지합니다.
- L2는 진입점만 담당하고 상세 데이터를 쌓지 않습니다.
- L3에서만 긴 조사 UI를 보여줍니다.
- L4는 기능별로 따로 만들지 않고 공용 상태 표현을 사용합니다.
- Instagram native UI를 제거하거나 우리 UI로 복제하지 않습니다.

---

# 3. Context Model

Global RI는 모든 화면에 존재하지만, 모든 화면에서 억지로 같은 내용을 보여주지는 않습니다.

UI context는 최소 다음 두 종류로 구분합니다.

```text
CONTENT
- Reel
- Feed Video
- Photo
- Carousel
- Post detail

GLOBAL
- Search/Explore 등 현재 콘텐츠 identity가 없는 화면
- 콘텐츠를 특정할 수 없는 Profile/Grid 상태
```

향후 account 성과 모델이 준비되면 `ACCOUNT` context를 추가할 수 있지만, 데이터 모델 없이 UI만 먼저 만들지 않습니다.

## CONTENT context

기존에 합의한 6개 리서치 탭을 그대로 사용합니다.

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

## GLOBAL context

현재 콘텐츠가 없는데 6개 빈 탭을 보여주지 않습니다.

가벼운 `RI Home`을 보여줍니다.

초기 제공:

- 현재 콘텐츠가 없다는 명확한 안내
- 전역 설정 진입
- 업데이트 바로가기

향후 account/discovery 데이터가 준비되면 같은 Workspace shell 안에 확장합니다.

**6탭을 삭제하는 것이 아니라 CONTENT research mode의 정보구조로 고정합니다.**

---

# 4. Single UI Root

전역 UI는 여러 mount 함수가 document에 각자 루트를 만들지 않습니다.

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
│  ├ ActiveTabHost
│  └ WorkspaceActivity
└ FeedbackLayer
   └ Toast
```

초기 migration에서는 기존 파일을 한꺼번에 분해하지 않습니다. 그러나 상태와 lifecycle은 최종적으로 한 `UIRoot/WorkspaceController`에서 조정합니다.

목표:

- launcher 1개
- workspace 1개
- toast owner 1개
- layout owner 1개
- 동일 route/store event를 컴포넌트마다 중복 subscribe하지 않음

---

# 5. Workspace State Machine

Research Workspace는 명확한 상태 기계를 사용합니다.

```text
CLOSED
  └ launcher tap → COMPACT

COMPACT
  ├ expand → EXPANDED
  ├ close/outside tap → CLOSED
  └ route/context change → COMPACT 유지 + 새 context rebind

EXPANDED
  ├ collapse → COMPACT
  ├ close → CLOSED
  └ route/context change → EXPANDED 유지 + 새 context rebind
```

## COMPACT

- 기본 진입 상태
- 약 48~56vh
- non-modal에 가깝게 동작
- Instagram 화면을 상당 부분 계속 볼 수 있음
- 요약/미디어/설정의 빠른 사용에 적합

## EXPANDED

- 긴 Caption/댓글/분석 읽기
- 약 78~84vh
- soft scrim 허용
- 배경 accidental tap을 줄임
- full screen 강제 금지

## 조작 규칙

- `×` 닫기 항상 존재
- expand/collapse 명시적 버튼 제공
- drag handle은 보조 수단이며 유일한 조작법이 아님
- body 전체 swipe로 dismiss하지 않음
- Instagram 좌우 swipe와 충돌하는 탭 swipe navigation 금지
- 브라우저 Back을 가로채기 위해 임의 history entry를 만들지 않음

---

# 6. Route / Identity Change Policy

Workspace가 열린 상태에서 Instagram SPA가 다른 콘텐츠로 이동할 수 있습니다.

이때 가장 중요한 것은 stale content를 잠깐이라도 확정값처럼 보여주지 않는 것입니다.

정책:

1. route/identity change 감지
2. 이전 content view model 즉시 invalidation
3. context header 먼저 새 identity 또는 `확인 중`으로 전환
4. 현재 detent(COMPACT/EXPANDED)는 유지
5. CONTENT → CONTENT이면 active tab은 지원되는 경우 유지
6. body scroll은 새 콘텐츠에서 top으로 reset
7. CONTENT → GLOBAL이면 `RI Home`으로 전환
8. 새 데이터 도착 시 필요한 active view만 render

이전 shortcode의 미디어/댓글/지표를 새 shortcode와 혼합하지 않습니다.

---

# 7. Workspace Navigation

CONTENT mode의 6탭은 유지하되 모바일 조작성을 개선합니다.

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

규칙:

- sticky header 아래 sticky tab rail
- 가로 스크롤 가능
- 현재 탭은 자동으로 보이는 위치까지 scrollIntoView
- 탭 touch target 높이 약 44px 권장
- 색만으로 선택 상태를 구분하지 않음
- 좌우 swipe gesture로 탭 변경하지 않음

## Active Tab Host

성능과 상태 혼입을 막기 위해 **active tab만 mount**합니다.

- 비활성 탭의 무거운 DOM을 동시에 유지하지 않음
- 콘텐츠/댓글/분석은 필요할 때만 lazy render
- tab별 listener는 unmount cleanup
- 같은 context 안에서는 필요 시 scroll position을 기억할 수 있음
- context가 바뀌면 이전 content tab scroll/cache를 재사용하지 않음

---

# 8. Context Header

상단 header는 정보를 과도하게 넣지 않습니다.

CONTENT 예:

```text
RI · @username    REEL    v3.2.x    ⇱  ×
```

GLOBAL 예:

```text
RI Research              v3.2.x    ×
```

우선순위:

1. 현재 context
2. 닫기
3. expand/collapse
4. version은 보조 정보

shortcode 전체는 항상 header에 노출하지 않습니다.

---

# 9. Global RI Launcher

Global Launcher는 기존 Reel RI visual identity를 계승합니다.

역할:

```text
CLOSED에서 tap → Workspace COMPACT
열린 상태에서 tap → Workspace CLOSED
```

규칙:

- 화면당 1개
- 시각 크기 약 32~36px
- 실제 touch target 약 44×44px
- Instagram native action보다 더 강하게 튀지 않음
- 별도 설정 gear를 Grid/header에 추가하지 않음
- 현재 v3.2.3 임시 막대+돋보기 icon은 replacement 대상

향후 비동기 작업이 실행 중일 때 작은 status dot/badge를 붙일 수 있지만, 숫자 badge를 상시 표시해 시각 소음을 만들지 않습니다.

---

# 10. Layout Manager

위치 계산은 `ui/layout.js` 한 owner가 담당합니다.

입력:

```text
LayoutSnapshot
- viewport width/height
- visualViewport height/offset
- safe-area inset
- bottom blockers[]
- right blockers[]
- keyboardVisible
```

blocker 예:

- Instagram bottom navigation
- 앱 사용/Open app/Use app banner
- Reel right action rail
- browser keyboard로 줄어든 visual viewport

출력:

```text
launcherAnchor
reelOverlayLane
sheetMetrics
feedbackAnchor
```

## 계산 전략

단순히 하나의 `bottom: 88px`을 모든 화면에 적용하지 않습니다.

1. preferred anchor를 정함
2. 현재 blocker rect와 overlap 계산
3. 최소 이동으로 충돌을 피하는 candidate 선택
4. 동일 frame/layout 변화는 dedupe

## 트리거

- route change
- resize/orientation
- visualViewport resize
- 관련 fixed UI 변화

일반 DOM mutation마다 전체 layout scan을 실행하지 않습니다.

---

# 11. Grid UI — Preserve

Grid는 새 Workspace 때문에 재설계하지 않습니다.

유지:

- Instagram 3열
- 하단 2줄 8-slot
- no-flicker/renderKey
- Photo/Carousel 잘못된 views 차단
- native media type icon
- 카드당 media action 1개
- 실제 Video/Reel cover
- music/album/avatar 제외
- Carousel 개별 batch 저장

역할:

```text
Grid = 비교
Grid media action = 빠른 저장
Global RI = 상세 조사
```

Grid 카드에 상세 탭/전역 settings/update를 추가하지 않습니다.

---

# 12. Reel Overlay — Preserve + Adaptive Position

표현은 기존 좋은 방향을 유지합니다.

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

- box/blur 없음
- 작은 white/gray text
- shadow 정도만
- missing line 숨김
- native likes/comments/reposts/share 중복 금지
- caption/right rail 비침범

기존 안정적 위치를 시작점으로 사용하고 Layout Manager가 충돌 시 lane을 이동합니다.

---

# 13. Summary UX

목표는 **10초 안에 성과 판단**입니다.

identity strip:

- username
- media type
- published date

metric layout:

```text
조회        좋아요
댓글        리포스트

ER          24h
계정대비     게시일
```

작은 8열 table은 사용하지 않습니다.

상태 표현:

```text
loading      확인 중
missing      —
unavailable  사용 불가
conflict     검증 중
verified     실제 값
```

Grid의 단순 `-`와 상세 research 상태를 구분합니다.

---

# 14. Content / Comments / Analysis UX

## 콘텐츠

긴 Caption/STT/OCR을 section 단위로 구성합니다.

- Caption
- hashtags/mentions
- STT
- OCR
- corrected transcript
- Carousel slide별 OCR

복사 action은 해당 section 가까이에 둡니다.

## 댓글

필터 chip:

```text
유용 | 질문 | 구매의도 | 후기 | 불만 | 반론 | 팁 | 아이디어
```

- horizontal scroll 허용
- thread 관계 보존
- AI 전에 deterministic 후보 선별

## 분석

- Hook
- 고정 제목
- CTA
- 강조어
- 숫자/가격
- 콘텐츠 구조
- 발화/속도

결과가 없을 때 빈 카드 여러 개를 만들지 않고 하나의 clear empty state를 사용합니다.

---

# 15. Media / Settings UX

## Media

원본 확보 중심입니다.

- Reel/Video: video + actual cover
- Photo: original image
- Carousel: count + 대표 + whole batch + 향후 slide별

주요 download button height 약 44px 권장.

모든 저장은 Download Manager 사용.

## Settings

전역 설정만 둡니다.

- 지정 폴더
- 기본 Downloads
- 매번 선택
- 현재 폴더 이름
- 권한
- 폴더 선택/변경

큰 `업데이트 바로가기`를 Settings 하단에서 항상 접근 가능하게 유지합니다.

version label shortcut을 추가할 수 있어도 큰 버튼을 대체하지 않습니다.

---

# 16. Feedback & Activity Layer

Toast만으로 긴 작업 상태를 표현하지 않습니다.

상태 owner 개념:

```text
Activity
- kind: download | analysis | stt | ocr
- state: running | success | error
- label
- progress
- message
```

초기에는 Download Manager 결과를 사용하고, 향후 STT/OCR/AI job도 같은 activity presentation을 사용합니다.

표현:

- 짧은 성공: Toast
- 사용자가 조치해야 하는 오류: Workspace 내 persistent message
- Carousel batch 같은 진행: `3/8 저장 중` activity strip
- 같은 toast 중복 생성 금지

Launcher badge는 activity layer의 보조 표시이며 필수 UI가 아닙니다.

---

# 17. Non-modal / Modal Policy

COMPACT와 EXPANDED를 같은 방식으로 취급하지 않습니다.

## COMPACT

- 기본적으로 soft non-modal
- Instagram 배경이 보임
- 불필요한 전체 scrim 없음
- outside tap으로 닫을 수 있음

## EXPANDED

- 긴 읽기/분석 작업
- 약한 scrim 허용
- background accidental action 방지
- sheet 자체 scroll 우선

브라우저 navigation/back 동작은 가로채지 않습니다.

---

# 18. Mobile Design Tokens

UI 크기를 파일마다 제각각 지정하지 않도록 CSS variable/token으로 통일합니다.

권장 초기 token:

```text
--ri-touch: 44px
--ri-radius-sheet: 18~20px
--ri-radius-control: 9~12px
--ri-space-1: 4px
--ri-space-2: 8px
--ri-space-3: 12px
--ri-space-4: 16px
```

텍스트:

- 핵심 metric 11~13px 이상
- body 12~14px 수준
- 9px 이하를 핵심 정보에 사용하지 않음
- tabular numeric 사용

색상:

- Instagram보다 강한 브랜드 색을 상시 사용하지 않음
- dark/light 환경을 CSS variable로 대응 가능하게 설계
- 상태를 색만으로 구분하지 않음

---

# 19. UI Read Model Boundary

현재 `ri-panel.js`가 legacy adapter를 직접 읽는 구조는 migration 단계에서는 허용되지만 최종 구조는 아닙니다.

UI가 원하는 것은 Instagram parser가 아니라 **읽기용 context snapshot**입니다.

목표 contract:

```text
ResearchReadModel
- getContext()
- getSummary(identity)
- getMedia(identity)
- getCapabilities(identity)
- subscribe(listener)
```

UI는 이 contract만 보고 render합니다.

현재 migration에서는 adapter-backed 구현을 주입할 수 있고, 향후 Identity/Verified Store가 완성되면 provider만 교체합니다.

효과:

- tab마다 legacy store parsing 복제 금지
- route/identity stale 처리 한 곳
- UI가 Data Engine 교체에 덜 결합
- Account mode를 나중에 추가할 때 panel 전체 재작성 방지

`ResearchReadModel` 구현 파일은 실제 Data Engine migration 시점에 필요가 생겼을 때만 생성합니다.

---

# 20. UI State Ownership

Workspace UI state:

```text
WorkspaceState
- open
- detent: compact | expanded
- mode: content | global
- activeTab
- contextKey
- keyboardVisible
```

owner는 WorkspaceController입니다.

금지:

- launcher가 별도 `open` state 소유
- tab renderer가 sheet height 소유
- toast가 layout bottom offset 직접 계산
- route마다 새 global listener 추가

각 tab은 자신의 로컬 presentation state만 소유합니다.

---

# 21. Target File Ownership

한꺼번에 파일을 만들지 않습니다.

필요가 생기는 순서:

```text
ui/
├ ri-panel.js           # 현재 migration shell
├ ri-summary.js
├ ri-primitives.js      # UI-1에서 실제 중복 해결 시 생성
├ layout.js             # UI-1에서 생성
├ grid.js
├ toast.js
└ styles.js
```

Workspace 책임이 실제로 커지면 다음처럼 분리합니다.

```text
ui/
├ ui-root.js
├ launcher.js
├ research-workspace.js
├ workspace-navigation.js
├ layout.js
├ ri-primitives.js
├ ri-summary.js
├ grid.js
├ reel.js
├ toast.js
└ styles.js
```

처음부터 빈 `tabs/summary.js`, `tabs/comments.js` 등을 만들지 않습니다.

---

# 22. Improved Migration Plan

## UI-A — Architecture Freeze — 완료 조건

- `UI_BASELINE.md` 유지/수정점 확인
- 이 `UI_ARCHITECTURE.md` 작성
- 기존 기능/visual preservation 재확인
- current v3.2.3 ↔ target gap 문서화

runtime visual 변경 없음.

## UI-B — Primitive + Layout + Workspace State Foundation

1. RI section/row/empty/action 중복을 `ri-primitives.js`로 통합
2. `layout.js` 도입
3. WorkspaceState/transition을 한 owner로 정리
4. route/context rebind 규칙 구현
5. 기존 화면은 가능한 한 동일하게 유지

## UI-C — Launcher Replacement

1. 기존 Reel RI visual identity 확인
2. 새 Global Launcher에 적용
3. Layout Manager anchor 적용
4. 화면당 1개/44px touch target 확인
5. 새 launcher 검증 후 임시 v3.2.3 visual 제거

## UI-D — Research Workspace Replacement

1. 기존 panel 모든 action inventory
2. bottom sheet COMPACT/EXPANDED 구현
3. CONTENT 6탭 유지
4. GLOBAL RI Home 추가
5. active tab lazy mount
6. settings/update/media/summary 완전 이관
7. 새 workspace 검증 후 right floating panel 제거

## UI-E — Feedback / Activity

- toast dedupe
- batch download progress strip
- persistent actionable error
- future analysis job extension point

## UI-F — Reel Overlay Unification

- Reel identity/native metrics 정확도
- Metrics owner 사용
- Layout Manager lane
- legacy metric renderer 제거

## UI-G — Data Engine / Research Tabs

- Identity
- Extractor
- Verified Store
- common history
- media[]
- Content/Comments/Analysis 실제 데이터 연결
- 이후 STT/OCR/AI

---

# 23. Acceptance / Definition of Done

UI 단계는 아래를 만족하기 전 완료가 아닙니다.

## 보존

- Grid Frozen UI 유지
- 업데이트 바로가기 유지
- 기존 Reel RI visual identity 유지
- native Instagram actions 유지
- 기존 cover/no-flicker/media 개선 유지

## 구조

- Global Launcher 1개
- Workspace 1개
- layout owner 1개
- active tab만 mount
- stale context 즉시 invalidate
- UI가 storage/network/metric formula 직접 구현하지 않음

## 모바일

- 주요 touch target 약 44px
- close 항상 접근 가능
- COMPACT가 화면을 과도하게 덮지 않음
- EXPANDED에서 긴 글 읽기 가능
- keyboard/visualViewport 충돌 검토
- bottom nav/banner/right rail 심각한 overlap 없음
- swipe gesture가 Instagram navigation과 충돌하지 않음

## 검증

- unit/build/check 통과
- Android Edge 실기기 확인 전 시각/터치 동작을 Verified로 기록하지 않음
- 기존 component 제거는 replacement gate 이후에만 수행

---

# 24. 이번 구조 개선에서 바뀐 점

기존 `UI_BASELINE.md`의 좋은 방향은 유지하면서 다음을 더 구체화합니다.

**유지**

- Grid 3열/8-slot
- 기존 Reel RI visual identity
- Reel 5개 파생지표
- Global RI 1개
- CONTENT 6탭
- bottom Research Sheet
- Compact/Expanded
- 업데이트 바로가기
- 공용 Settings/Download Manager

**추가/개선**

- CONTENT / GLOBAL context 분리
- 현재 콘텐츠가 없을 때 빈 6탭 대신 RI Home
- Single UIRoot
- Workspace state machine
- route identity rebind 규칙
- active tab lazy mount
- non-modal Compact / semi-modal Expanded 정책
- 명시적 expand/collapse control
- browser Back/history 비침범
- LayoutSnapshot/collision owner
- Feedback/Activity layer
- Research Read Model boundary
- token 기반 모바일 크기 체계

이 문서의 구조를 바꾸려면 기존 의도와 보존 항목을 먼저 검토하고 `WORK_TRACK.md` 실행순서를 먼저 갱신합니다.
