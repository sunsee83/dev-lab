# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황입니다.

함께 보는 기준:

- `CODE_STRUCTURE.md` — 실제 owner/dependency
- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — 모바일 visual/interaction
- `UI_ARCHITECTURE.md` — UI state/component/data-flow
- `PRESERVATION_BASELINE.md` — 기존 기능/외형 보존 gate
- `WORK_TRACK.md` — 현재 실행순서
- `tests/README.md` — 회귀/승인 기준

## 현재 배포

- 버전: **v3.2.4**
- 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- single self-contained userscript
- 현재 단계: **v3.2 Contextual Mobile Research Workspace + Feedback/Activity**

`ri-retry.user.js`는 build artifact이며 직접 수정하지 않습니다.

---

# 1. Preserve

구조 전환 때문에 되돌리면 안 되는 항목:

## Runtime / Data

- 900ms full polling 제거
- event/Observer refresh
- pending shortcode request dedupe
- renderKey same-value rewrite 방지
- React reused anchor shortcode 재검증
- Verified Store provenance/conflict 보호
- missing metric→0 금지
- actual snapshot 없는 24h 금지
- `ri311:*` cache/history migration 전 보존

## Grid

- Instagram 3열
- 하단 2줄 / 8 fixed slots
- no-flicker
- REEL/VIDEO verified views
- PHOTO/CAROUSEL bogus views 차단
- native media-type icon
- custom media action 1/card

## Media / Download

- Video/Reel actual cover
- music/audio/album/avatar reject
- Carousel individual batch / no ZIP
- Carousel prompt destination 1회
- directory failure silent fallback 금지
- Grid menu global folder setting 금지

## UI / Operations

- 기존 Reel RI visual identity
- Global RI single entry target
- CONTENT 6탭
- 큰 업데이트 바로가기
- raw userscript install/update URL
- no runtime `@require` hotfix chain

과거 실기기에서 확인된 좋은 사례:

- Grid no-flicker
- Video/Reel actual cover 저장 사례
- video directory save 동작 사례

---

# 2. Current Source Architecture

```text
src/
├ version.js
├ main.js
├ legacy-runtime.js
├ core/
│  ├ activity.js
│  ├ app.js
│  ├ capability.js
│  └ clipboard.js
├ migration/
│  └ legacy-store-adapter.js
├ store/
│  └ settings-store.js
├ metrics/
│  └ metrics.js
├ media/
│  ├ media-resolver.js
│  └ download-manager.js
└ ui/
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

Owner 상세는 `CODE_STRUCTURE.md`가 기준입니다.

---

# 3. Metrics / Live Store

Metrics owner:

```text
ER = (likes + comments + reposts) / views × 100
24h = actual 18~32h snapshot 중 24h closest
account relative = same account max20 / min5 / views median multiple
```

missing은 `—`이며 0으로 추정하지 않습니다.

Store binding:

```text
shared SPA activity
→ delayed legacy fingerprint check
→ actual key change
→ STORE_CHANGED
→ open research view scheduled render
```

second full DOM observer / interval polling 없음.

---

# 4. UI-B Foundation — Verified by code/CI

활성:

- `ui/ri-primitives.js`
- `ui/workspace-state.js`
- `ui/layout.js`

Workspace State:

```text
closed | compact | expanded
content | global
activeTab
contextKey/contextEpoch
```

Layout output:

```text
launcherAnchor
reelOverlayLane
sheetMetrics
feedbackAnchor
```

UI-B checkpoint에서 duplicate warning 0을 확보했습니다.

---

# 5. UI-C Launcher Restoration — Source Complete / Device Unverified

현재 source:

```text
44×44 actual touch target
└ 34×34 low-opacity legacy visual
  └ 21×21 original RI icon
```

- border 없음
- low-opacity circle
- drop-shadow
- Layout Manager anchor

Android Edge actual size/position/overlap/parity는 확인 전입니다.

---

# 6. UI-D Contextual Research Workspace — Source Complete / Device Unverified

`ui/research-workspace.js`가 DOM shell owner입니다.

```text
Global RI
  ↓
Workspace State
  ↓
Bottom Research Sheet
  ├ CONTENT
  │  └ 요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
  └ GLOBAL
     └ RI Home + Settings
```

구현:

- COMPACT / EXPANDED Layout Manager height
- explicit `확장 / 축소`
- close 항상 접근
- Compact no scrim + outside tap close
- Expanded soft scrim
- body만 scroll
- CONTENT에서만 6 tabs
- GLOBAL RI Home + global settings
- active body만 render
- contextEpoch change 시 body scroll reset
- big `업데이트 바로가기` 보존
- browser Back/history manipulation 없음

---

# 7. UI-E Feedback / Activity — Source Complete / Device Unverified

새 공용 경로:

```text
Download Manager
→ structured Activity event
→ core/activity.js
→ ui/activity-indicator.js / ui/toast.js
```

구현:

- `running | success | error` Activity model
- future `analysis | stt | ocr` 재사용 가능
- 동일 id progress merge
- Carousel `1/N ... N/N 저장 중`
- success/non-actionable error → transient Toast
- 동일 Toast 1.4초 내 duplicate suppression
- directory/permission/picker actionable error → persistent feedback
- persistent error의 `설정 열기` → RI Settings
- Workspace 닫힘 → global feedback anchor
- Workspace 열림 → 동일 Activity node를 `.ri32-activity-host`로 이동
- cancel → activity 제거
- launcher badge는 근거가 없어 추가하지 않음
- Settings presentation을 `ui/ri-settings.js`로 분리하여 `ri-panel.js` size warning 제거

기존 download destination 정책과 silent fallback 금지는 변경하지 않았습니다.

---

# 8. Update Preservation / Tests / Build

업데이트 gate:

- 큰 `업데이트 바로가기`
- `UPDATE_URL` single owner
- userscript `@updateURL / @downloadURL`
- raw install URL

UI-E 자동검증 checkpoint:

- unit tests: **26 / 26 pass**
- userscript build: **success**
- architecture/syntax check: **success**
- source files: **23**
- architecture warnings: **0**
- generated userscript syntax: **success**
- target generated userscript: **v3.2.4**

자동검증은 Android Edge visual/touch 검증을 대신하지 않습니다.

---

# 9. Current Device Validation Needed

## UI-C / UI-D / UI-E

- Global RI visible 1개
- 34px visual / 44px touch 체감
- bottom nav/app banner/right rail overlap
- COMPACT / EXPANDED usability
- close/expand/collapse
- CONTENT 6 tabs / GLOBAL RI Home
- keyboard/visualViewport
- route stale context
- Activity global/Workspace 위치
- Carousel progress 실제 표시
- persistent error → Settings action 실제 터치 흐름

## Download / Update

- update shortcut → Tampermonkey flow
- directory photo/cover CORS
- prompt mode
- Carousel same destination
- directory failure visible / no silent fallback

## Grid Regression

- 3 columns
- 8 slots
- no-flicker
- actual cover
- native media icon

실기기 확인 전 위 항목을 Verified로 기록하지 않습니다.

---

# 10. Next Development

정확한 순서는 `WORK_TRACK.md`가 owner입니다.

```text
UI-F Reel identity/native metrics + Metrics Overlay
↓
UI-G Data Engine / Research Tabs
```

UI-F에서는 current Reel identity와 native metric 결합 정확도를 먼저 audit하고, Reel overlay 계산을 기존 legacy formula가 아니라 `metrics/metrics.js` owner로 이동합니다.

Data Engine은 이후:

```text
Identity
→ Extractor
→ Verified Store
→ history
→ media[]
→ Grid/Reel renderer
→ legacy removal
```

STT/OCR/AI는 data foundation 전에 UI만 크게 만들지 않습니다.
