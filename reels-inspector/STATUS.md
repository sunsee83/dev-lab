# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황입니다.

함께 보는 기준:

- `CODE_STRUCTURE.md` — 실제 owner/dependency
- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — 모바일 UI visual/interaction 기준
- `UI_ARCHITECTURE.md` — UI state/component/data-flow
- `PRESERVATION_BASELINE.md` — 기존 기능/외형 보존 gate
- `WORK_TRACK.md` — 현재 실행순서
- `tests/README.md` — 회귀/승인 기준

## 현재 배포

- 버전: **v3.2.3**
- 실행 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- 배포 방식: single self-contained userscript
- 현재 단계: **v3.2 UI/Foundation + Contextual Mobile Research Workspace 전환**

`ri-retry.user.js`는 build artifact이며 직접 수정하지 않습니다.

---

# 1. 계속 유지하는 승인 기능

## Runtime / Data

- 900ms 전체 polling 제거
- MutationObserver / History / media activity 기반 refresh
- 동일 shortcode pending request dedupe
- renderKey same-value DOM rewrite 방지
- React DOM 재사용 시 shortcode 재검증
- Verified Store source/confidence/status/conflict 보호
- missing metric → 임의 `0` 금지
- 실제 snapshot 없는 24h 생성 금지
- `ri311:*` cache/history migration 완료 전 보존

## Grid

- Instagram 3열
- 하단 2줄 8개 고정 슬롯
- REEL/VIDEO verified views
- PHOTO/CAROUSEL bogus views 차단
- native media-type icon
- 카드당 custom media action 1개
- no-flicker

## Media

- Video/Reel actual cover
- music/audio/album/avatar artwork 제외
- Carousel parent slide
- ZIP 없이 개별 batch
- directory failure silent fallback 금지
- Grid menu에 global folder setting 금지

## UI / 운영

- Global RI는 화면당 1개가 목표
- CONTENT research 6탭
- 기존 Reel RI visual identity 보존 대상
- 큰 업데이트 바로가기
- raw userscript install/update 경로
- runtime `@require` hotfix chain 없음

실기기에서 과거 확인된 좋은 사례:

- Grid 숫자 깜빡임 제거
- Video/Reel cover가 실제 영상 thumbnail로 저장된 사례
- 사용 환경에서 video directory save 동작 사례

---

# 2. Source / Build

```text
src/*
  ↓
esbuild
  ↓
ri-retry.user.js
```

자동 gate:

```text
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

`src/version.js`:

- `VERSION`
- `UPDATE_URL`
- cache-busting update URL

---

# 3. 현재 활성 Foundation

## Core

- `core/app.js` — route/event/lifecycle
- `core/capability.js` — runtime capability
- `core/clipboard.js` — clipboard owner

## Store / Metrics

- `store/settings-store.js` — global download settings
- `migration/legacy-store-adapter.js` — legacy read/history boundary
- `metrics/metrics.js` — ER/24h/account relative owner

## Media

- `media/media-resolver.js` — migrated media/cover/filename
- `media/download-manager.js` — destination/write owner

## UI

- `ui/grid.js` — Grid quick save intent
- `ui/ri-panel.js` — current Foundation RI shell
- `ui/ri-summary.js` — summary presentation
- `ui/ri-primitives.js` — shared RI section/row/action/empty
- `ui/workspace-state.js` — Workspace state owner
- `ui/layout.js` — mobile layout owner foundation
- `ui/toast.js`
- `ui/styles.js` — shared CSS + restored Global RI visual/touch geometry

---

# 4. Metrics + Live Store

현재 Metrics:

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32h snapshot 중 24h에 가장 가까운 값
계정 대비 = 동일 계정 최근 최대20 / 최소5 / views median 대비 배수
```

RI Summary:

- account
- shortcode
- media type
- views / likes / comments / reposts
- ER
- 24h
- account relative
- date

missing은 `—`.

Store live binding:

```text
기존 SPA observer activity
→ delayed legacy raw fingerprint check
→ 실제 key 변경
→ STORE_CHANGED
→ 열린 RI 필요한 view만 갱신
```

별도 interval polling / 두 번째 전체 DOM observer 없음.

---

# 5. v3.2.3 Preservation Repair

기존 v3.1.6 RI panel의 `새 버전` action이 v3.2 migration에서 누락됐던 회귀를 복구했습니다.

현재:

- 큰 `업데이트 바로가기` 존재
- metadata와 UI가 같은 UPDATE_URL owner 사용
- `PRESERVATION_BASELINE.md`
- CI preservation gate

Android Edge에서 실제 Tampermonkey install/update intercept는 아직 실기기 Unverified.

---

# 6. Mobile UI Redesign 문서

완료:

- `UI_BASELINE.md`
- `UI_ARCHITECTURE.md`

목표 구조:

```text
L0 Instagram Native
L1 Ambient Intelligence
L2 Intent Entry
L3 Research Workspace
L4 Feedback / Activity
```

Workspace:

```text
CLOSED
→ COMPACT
→ EXPANDED
```

Context:

- CONTENT → 6-tab research
- GLOBAL → RI Home / Settings / Update

현재 right floating panel은 최종 target이 아닙니다. Global RI launcher는 UI-C source에서 기존 Reel RI visual identity 쪽으로 복원했지만 Android Edge 실기기 확인 전입니다.

---

# 7. UI-B Foundation — source checkpoint

## 7.1 RI primitive 공통화

신규:

`src/ui/ri-primitives.js`

owner:

- section
- row
- action
- empty state

`ri-panel.js`와 `ri-summary.js` 중복 제거.

결과:

- architecture duplicate warnings **4 → 0**

## 7.2 Workspace State owner

신규:

`src/ui/workspace-state.js`

state:

```text
open
detent: closed | compact | expanded
mode: content | global
activeTab
contextKey
contextEpoch
```

현재 Foundation panel의 open/tab/context가 이 owner를 사용합니다.

Compact/Expanded actual sheet visual은 아직 UI-D 전입니다.

## 7.3 Layout Manager foundation

신규:

`src/ui/layout.js`

output:

```text
launcherAnchor
reelOverlayLane
sheetMetrics
feedbackAnchor
```

runtime trigger:

- route
- resize/orientation
- visualViewport resize/scroll

일반 mutation마다 전체 scan하지 않습니다.

현재 CSS가 owner variables를 사용:

```text
--ri-launcher-right
--ri-launcher-bottom
--ri-panel-bottom
--ri-feedback-bottom
--ri-sheet-compact-height
--ri-sheet-expanded-height
```

기본값은 기존 geometry를 최대한 유지하고 blocker가 확인되면 최소 이동하도록 설계했습니다.

Android Edge 실제 blocker detection은 아직 Unverified.

## 7.4 Composition

`main.js`가 Workspace State + Layout Manager를 생성하고 RI Panel에 주입합니다.

---

# 8. UI-C Global RI Launcher Restoration — source checkpoint

v3.1.6 legacy source를 다시 대조해 확인한 사실:

- `ri3-tool` icon SVG는 현재 `researchIcon()`과 동일합니다.
- 기존 visual은 `34×34`, border 없음, `rgba(0,0,0,.12)` 원형 배경, drop-shadow, `21×21` research icon이었습니다.
- v3.2.3 Foundation에서 달라졌던 것은 icon path 자체가 아니라 36px dark background/border/box-shadow 등의 외곽 styling이었습니다.

이번 source 변경:

```text
44×44 실제 touch target
└ 34×34 legacy-style visual circle
  └ 21×21 기존 research icon
```

유지:

- Global RI toggle 동작
- `aria-expanded`
- Layout Manager anchor
- 업데이트 바로가기
- CONTENT 6탭
- Grid action
- Download/Settings owner

새 visual은 코드 기준으로 legacy identity를 복원했지만 **Android Edge 실제 크기/위치/체감 parity는 아직 Unverified**입니다.

---

# 9. 자동 검증 결과

UI-B 완료 checkpoint:

- unit tests: **18 / 18 pass**
- build: success
- architecture/syntax: success
- source files: **19**
- warnings: **0**
- generated userscript syntax: success

UI-C source 변경 후 최종 CI 결과는 별도로 확인해 기록합니다.

자동 검증은 Android Edge 시각/터치 검증을 의미하지 않습니다.

---

# 10. 현재 실기기 검증 필요

## Global RI / Layout

- Global RI가 화면당 1개로 보이는지
- 34px visual + 44px touch target이 실제로 편한지
- bottom nav/app banner와 겹치지 않는지
- Reel right rail collision
- 기존 Reel RI visual identity가 체감상 유지되는지

## Context / Store

- SPA 이동 후 stale shortcode가 남지 않는지
- store change가 열린 Summary에 실제 반영되는지

## Download

- update shortcut → Tampermonkey install/update flow
- directory photo/cover cross-origin result
- prompt mode
- Carousel batch same destination
- failure visible / silent fallback 없음

## Regression

- Grid 3열
- 8 slots
- no-flicker
- actual cover
- native media icon

실기기 확인 전 완료/Verified라고 기록하지 않습니다.

---

# 11. 다음 개발 순서

정확한 순서는 `WORK_TRACK.md`가 owner입니다.

현재 다음:

```text
UI-D  Contextual Mobile Research Workspace
↓
UI-E  Feedback / Activity
↓
UI-F  Reel identity/native metrics + Metrics Overlay
↓
UI-G  Data Engine / Research tabs
```

UI-D에서:

- 기존 panel action inventory
- bottom Research Sheet
- Compact / Expanded
- CONTENT / GLOBAL presentation 분리
- close / explicit expand-collapse
- sticky tabs/header
- active tab lazy mount
- summary/media/settings/update 완전 이관
- 새 Workspace 동등성 확인 후에만 old floating panel 제거

Data Engine 순서:

```text
Identity
→ Extractor
→ Verified Store
→ history
→ media[]
→ Grid/Reel renderer
→ legacy removal
```

STT/OCR/AI는 데이터 기반이 준비되기 전에 UI만 먼저 크게 만들지 않습니다.
