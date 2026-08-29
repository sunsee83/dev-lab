# Instagram Content Research Tool — Active Work Track

이 문서는 **작업 중 방향 이탈을 막기 위한 실행 통제 문서**입니다.

문서 역할:

```text
PROJECT_PLAN.md          = 장기 제품/데이터/기능 설계
CODE_STRUCTURE.md        = 현재 파일/owner/dependency/migration 설계
GRID_BASELINE.md         = Grid Frozen UI 기준
UI_BASELINE.md           = 모바일 visual/interaction 기준
UI_ARCHITECTURE.md       = UI state/component/data-flow
PRESERVATION_BASELINE.md = 기존 승인 기능 보존/교체/삭제 gate
STATUS.md                = 현재 배포/실기기/완료 상태
WORK_TRACK.md            = 현재 목표/진행/다음 순서/차단요소
```

계획 변경 절차:

1. 기존 결정 목적 확인
2. 유지 / 수정 / 추가 분류
3. 기존 기능/외형 `PRESERVE / REPLACE / REMOVE-APPROVED` 분류
4. UI면 `UI_BASELINE / UI_ARCHITECTURE / GRID_BASELINE` 대조
5. owner/data-flow 영향 확인
6. 관련 문서 먼저 또는 동시에 갱신
7. 이 문서 실행순서 갱신
8. 코드 수정

---

# 1. Current Release

- Current version: **v3.2.4**
- Source of truth: `src/*`
- Deployment artifact: `ri-retry.user.js`
- Current phase: **v3.2 Contextual Mobile Research Workspace + Feedback/Activity**

현재 source는 UI-B Foundation, UI-C launcher restoration, UI-D Contextual Research Workspace, **UI-E Feedback / Activity**까지 반영했습니다.

자동검증과 source 구조는 확인하지만 **Android Edge 실제 시각/터치/Instagram collision은 실기기 확인 전 Unverified**입니다.

---

# 2. Current Objective

현재 최우선 목표:

**기존 Grid/미디어/업데이트/RI visual identity를 보존하면서 공용 Feedback/Activity 경로를 안정화했고, 다음 단계에서 Reel identity/native metrics를 같은 Metrics owner로 통합한다.**

제품 흐름:

```text
발굴
→ Grid 비교
→ 콘텐츠 확인
→ RI 상세 조사
→ 원본 확보
→ 분석
```

반드시 유지:

- Instagram 3열 Grid / 8-slot
- no-flicker / renderKey
- Video/Reel actual cover
- music/album/avatar artwork reject
- Carousel individual batch / no ZIP
- Grid 카드당 media action 1개
- 기존 Reel RI visual identity
- Global RI 화면당 1개 target
- CONTENT 6탭 `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`
- 큰 업데이트 바로가기
- common Download Manager / Settings Store
- missing metric 추정 금지
- directory failure silent fallback 금지

---

# 3. Completed Foundation

## UI-A — Contextual UI Architecture Freeze — 완료

- 5-layer UI model
- CONTENT / GLOBAL context
- CLOSED / COMPACT / EXPANDED
- route/identity stale invalidation
- active body lazy-render 목표
- non-modal Compact / semi-modal Expanded
- Layout Manager / Activity / Read Model boundary

## UI-B — Primitive + Layout + Workspace State Foundation — 완료

활성 owner:

```text
ui/ri-primitives.js
ui/workspace-state.js
ui/layout.js
```

완료:

- section/row/action/empty 공통화
- Workspace open/detent/mode/tab/context single owner
- LayoutSnapshot → launcher/reel/sheet/feedback
- route/resize/orientation/visualViewport schedule
- no second full DOM observer
- duplicate warning 0 checkpoint

## UI-C — Global RI Launcher visual restoration — source 완료 / device validation pending

v3.1.6 source audit:

- SVG는 현재 `researchIcon()`과 동일
- 실제 mismatch는 launcher wrapper styling

복원 source:

```text
44×44 actual touch target
└ 34×34 legacy-style low-opacity circle
  └ 21×21 original research icon
```

- border 없음
- `rgba(0,0,0,.12)` visual
- drop-shadow
- Layout Manager anchor
- update/Grid/panel actions 보존

## UI-D — Contextual Research Workspace — source 완료 / device validation pending

owner:

`ui/research-workspace.js`

현재 source 구조:

```text
Global RI
   ↓
Workspace State
   ↓
Research Workspace View
   ├ CONTENT
   │  └ 요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
   └ GLOBAL
      └ RI Home + global settings
```

구현:

- right floating panel → bottom Research Sheet source
- COMPACT / EXPANDED height는 Layout Manager variables 사용
- 명시적 `확장 / 축소`
- close 항상 header에 존재
- Compact는 scrim 없음 + outside tap close
- Expanded는 soft scrim
- body만 scroll
- header/tab/footer는 scroll 밖 유지
- CONTENT만 6탭 표시
- GLOBAL에서는 빈 6탭 숨기고 RI Home + Settings
- 큰 업데이트 바로가기 footer 유지
- route/identity contextEpoch 변경 시 scroll reset
- active body 하나만 render
- browser history/back manipulation 추가 없음
- 기존 Summary / Media / Settings action 보존

## UI-E — Feedback / Activity — source 완료 / device validation pending

새 owner:

```text
core/activity.js         = async activity state/lifecycle
ui/activity-indicator.js = running/persistent feedback presentation
ui/toast.js              = transient feedback + duplicate suppression
ui/ri-settings.js        = RI Settings presentation
```

현재 flow:

```text
Grid / Research Workspace
        ↓
Download Manager
        ↓ structured activity event
Activity Store
        ↓
Activity Indicator / Toast
```

구현:

- `running | success | error` 공통 Activity state
- `download | analysis | stt | ocr`로 확장 가능한 kind 구조
- 동일 activity id progress update 병합
- 짧은 success / non-actionable error는 Toast
- 같은 toast 1.4초 내 중복 억제
- Carousel batch는 `1/N ... N/N 저장 중` 진행상태 제공
- permission/directory/picker 계열 actionable error는 persistent message
- persistent error에서 `설정 열기` action으로 RI Settings 연결
- Workspace가 닫혀 있으면 global feedback anchor 사용
- Workspace가 열려 있으면 같은 Activity node를 `.ri32-activity-host`로 이동
- cancel은 success/error로 오인하지 않고 activity 제거
- 기존 designated-directory failure의 silent Downloads fallback 금지 유지
- launcher badge는 필요 근거가 없어 추가하지 않음
- `ri-panel.js` Settings rendering은 `ri-settings.js`로 분리해 size warning 제거

UI-E 자동검증 checkpoint:

- unit **26/26 pass**
- build pass
- architecture/syntax pass
- **23 source files / 0 warnings**

---

# 4. Preserve — 건드리면 안 되는 승인 개선

## Common

- raw userscript update path
- 큰 업데이트 바로가기
- single generated userscript
- no runtime `@require` hotfix chain
- 기존 Reel RI visual identity
- CONTENT 6-tab information architecture

## Grid / Data

- 3-column Grid
- two rows / 8 fixed slots
- no-flicker
- same-value DOM rewrite prevention
- pending request dedupe
- PHOTO/CAROUSEL bogus views prevention
- native media-type icon
- custom media button 1/card
- Verified Store provenance/conflict
- `ri311:*` migration 전 보존
- missing→0 금지

## Media / Download

- actual video cover
- music/audio/album/avatar reject
- Carousel individual files / no ZIP
- directory failure silent fallback 금지
- Grid menu global folder setting 금지
- Carousel prompt destination 1회 선택

기존 기능을 숨기거나 삭제하려면 replacement가 동등 이상인지 먼저 확인합니다.

---

# 5. Current Known Issues / Unverified

Android Edge 실기기 확인 전:

- Global RI visible launcher 정확히 1개인지
- 34px visual / 44px touch target 체감
- bottom nav / app banner / Reel right rail collision
- COMPACT 실제 높이/가림 정도
- EXPANDED 긴 내용 조작성
- close / expand / collapse 접근성
- GLOBAL RI Home presentation
- CONTENT 6탭 가로 이동
- keyboard/visualViewport
- SPA route 후 stale context
- live Store → open summary 갱신
- Activity global/Workspace 위치와 가독성
- Carousel `N/N 저장 중` 실제 표시
- persistent error → `설정 열기` 실제 터치 흐름
- update shortcut → Tampermonkey install/update intercept
- directory photo/cover cross-origin save
- prompt mode
- Carousel batch same destination
- Grid 8-slot/no-flicker/cover regression

photo/cover CORS가 실기기에서 확인되기 전 `@grant`/privileged transport 변경 금지.

---

# 6. Current Technical Debt

해결됨:

- RI section/row primitive duplicate
- workspace state owner 부재
- layout owner 부재
- launcher wrapper visual drift
- right floating workspace shell → bottom sheet source로 교체
- GLOBAL에서 빈 6탭 문제
- Feedback/Activity owner 부재
- batch progress toast-only 구조
- persistent actionable directory/permission error UI 부재
- `ri-panel.js` size warning

남음:

- `ri-panel.js` → legacy adapter 직접 read coupling
- Reel legacy metric compatibility functions
- Reel native metrics/identity accuracy
- Reel renderer가 Metrics owner를 완전히 사용하지 않음

Read Model implementation은 Data Engine migration 시 실제 필요가 생길 때 생성합니다.

---

# 7. Next Execution Order

순서를 바꾸려면 관련 문서를 먼저 갱신합니다.

## UI-F — Reel identity + Metrics Overlay — 다음 작업

1. current Reel identity 정확도 audit
2. native likes/comments/reposts source 결합 audit
3. Reel overlay 계산을 `metrics/metrics.js` owner로 전환
4. target `▶ / ER / 24h / × / date`
5. Layout Manager `reelOverlayLane` 연결
6. native rail/caption collision 보존
7. 기존 안정적 Reel visual geometry에서 시작
8. 새 경로 검증 후 legacy metric renderer/callsite 제거
9. compatibility formula body는 regression 확인 후 제거
10. Android Edge 실기기 전 accuracy/placement Verified 금지

## UI-G — Data Engine / Research Tabs

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[]
→ Grid/Reel renderer
→ legacy removal
```

그 뒤 실제 데이터 준비 순서:

- 콘텐츠
- 댓글
- 분석
- media[] 상세
- STT
- OCR
- alignment
- AI
- Library

---

# 8. Work Update Protocol

## 작업 시작 전

반드시 확인:

- Current Objective
- Preserve
- Known Issues
- Next Execution Order
- UI 작업 → `UI_BASELINE.md / UI_ARCHITECTURE.md`
- Grid 작업 → `GRID_BASELINE.md`
- component 교체 → `PRESERVATION_BASELINE.md`

```text
inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ baseline 비교
→ owner/data flow 확인
→ 문서 갱신
→ 구현
→ 자동검증
→ 실기기 필요항목 분리
→ replacement gate 후 old path 제거
```

## 작업 중 상태

```text
Verified   = 코드/CI 또는 실기기에서 실제 확인
Unverified = 구현됐지만 실기기 미확인
Blocked    = 외부 조건/실기기 결과 필요
Deferred   = 현재 범위 밖
```

## 작업 종료 시

1. 변경 내용
2. 유지 내용
3. baseline 차이
4. 자동검증
5. 실기기 여부
6. 새 문제
7. 다음 정확한 작업

---

# 9. Definition of Done for Each Step

- 관련 문서와 실제 source 일치
- baseline/architecture 대조
- owner 위반 없음
- 불필요한 duplicate 없음
- architecture warning 0 목표
- PRESERVE/REPLACE 접근경로 유지
- 주요 touch target 검토
- Instagram native UI collision 검토
- `npm test` pass
- `npm run build` pass
- `npm run check` pass
- `node --check ri-retry.user.js` pass
- Android Edge 항목은 실제 확인 전 Verified 금지
- 다음 작업이 이 문서에 명확히 남음

현재 다음 정확한 구현 작업은 **UI-F Reel identity + Metrics Overlay**입니다.
