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

- 버전: **v3.2.3**
- 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- single self-contained userscript
- 현재 단계: **v3.2 Contextual Mobile Research Workspace 전환**

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
   ├ grid.js
   ├ layout.js
   ├ workspace-state.js
   ├ research-workspace.js
   ├ ri-primitives.js
   ├ ri-panel.js
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

v3.1.6 audit 결과 research SVG는 이미 같은 아이콘이었습니다. 회귀 지점은 wrapper visual이었습니다.

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

이번 checkpoint에서 `ui/research-workspace.js`를 실제 DOM shell owner로 추가했습니다.

## 구조

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

## 구현

- 기존 right floating shell 대신 bottom sheet source
- COMPACT / EXPANDED Layout Manager height
- explicit `확장 / 축소`
- close header에 항상 존재
- Compact: no scrim + outside tap close
- Expanded: soft scrim
- body만 scroll
- header/tab/footer는 scroll 밖
- CONTENT에서만 6 tabs
- GLOBAL은 RI Home + global settings
- active body만 render
- contextEpoch change 시 body scroll reset
- big `업데이트 바로가기` footer 보존
- Summary / Media / Settings action 보존
- browser Back/history manipulation 추가 없음

자동검증은 source/구조를 확인할 뿐 Android Edge 조작성을 의미하지 않습니다.

---

# 7. Update Preservation

기존 v3.1.6 `새 버전` action 누락 회귀 이후 다음을 gate로 유지합니다.

- 큰 `업데이트 바로가기`
- `UPDATE_URL` single owner
- userscript `@updateURL / @downloadURL`
- raw install URL

Android Edge → Tampermonkey install/update intercept는 실기기 Unverified.

---

# 8. Current Tests / Build

UI-D 최종 자동검증 checkpoint:

- unit tests: **21 / 21 pass**
- userscript build: **success**
- architecture/syntax check: **success**
- source files: **20**
- architecture warnings: **0**
- generated userscript syntax: **success**
- generated userscript: **v3.2.3**

추가 UI guards:

- launcher visual geometry preservation
- Research Workspace compact/expanded structure
- CONTENT/GLOBAL split
- update shortcut preservation

자동검증은 Android Edge visual/touch 검증을 대신하지 않습니다.

---

# 9. Current Device Validation Needed

## UI-C / UI-D

- Global RI visible 1개
- 34px visual / 44px touch 체감
- bottom nav/app banner/right rail overlap
- COMPACT 화면 가림
- EXPANDED long-content usability
- expand/collapse/close accessibility
- CONTENT 6 tabs
- GLOBAL RI Home + Settings
- keyboard/visualViewport
- route stale context

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
UI-E Feedback / Activity
↓
UI-F Reel identity/native metrics + Metrics Overlay
↓
UI-G Data Engine / Research Tabs
```

UI-E에서는 short toast와 long-running/persistent activity를 분리하고, Carousel progress와 actionable directory error를 Workspace에 연결합니다.

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
