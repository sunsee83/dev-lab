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

- 버전: **v3.2.5**
- 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- single self-contained userscript
- 현재 단계: **v3.2 Active Reel Context + staged Metrics Overlay / Data migration 준비**

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

## Reel

- 기존 Reel RI visual identity
- 기존 Reel overlay의 가벼운 위치/표현
- Instagram native likes/comments/reposts/share 유지
- 새 overlay를 실기기 검증하기 전 legacy overlay를 먼저 숨기거나 삭제하지 않음

## Media / Download

- Video/Reel actual cover
- music/audio/album/avatar reject
- Carousel individual batch / no ZIP
- Carousel prompt destination 1회
- directory failure silent fallback 금지
- Grid menu global folder setting 금지

## UI / Operations

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
│  ├ legacy-store-adapter.js
│  └ reel-context-adapter.js
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
   ├ metric-format.js
   ├ reel-overlay.js
   ├ workspace-state.js
   ├ research-workspace.js
   ├ ri-primitives.js
   ├ ri-panel.js
   ├ ri-settings.js
   ├ ri-summary.js
   ├ toast.js
   └ styles.js
```

`ui/reel-overlay.js`는 replacement source로 준비돼 있지만 아직 `main.js`에 mount하지 않습니다. 기존 visual을 먼저 제거하지 않는 preservation gate 때문입니다.

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

공용 경로:

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

# 8. UI-F Active Reel Context — Source Complete / Device Unverified

새 owner:

`migration/reel-context-adapter.js`

현재 active Reel 식별 순서:

```text
현재 Reel scope 내부 shortcode link
→ active video/poster와 Store exact media URL mapping
→ exact /reel|reels/<shortcode> route
→ unresolved
```

핵심 변경:

- legacy의 owner + likes/comments 유사값 fuzzy shortcode 선택을 새 경로에서 사용하지 않음
- 현재 화면의 active video를 viewport/playing 기준으로 선택
- native likes/comments/reposts는 그 video 주변 Reel scope 안에서만 읽음
- `천/만/억`, `K/M/B`, comma grouped count parser 추가
- `legacy-store-adapter.js`에 exact `findPostByMediaUrls()` bridge 추가
- CDN query token 차이는 무시하지만 path가 다른 미디어를 추측 매칭하지 않음

SPA identity:

- AppContext의 기존 단일 MutationObserver activity 재사용
- URL이 그대로여도 vertical Reel 이동 activity에서 `resolveActivityIdentity()` 가능
- second full DOM observer 없음
- `undefined`이면 기존 identity를 임의로 지우지 않음

Android Edge vertical Reels에서 실제 동일 콘텐츠 결합 정확도는 확인 전입니다.

---

# 9. UI-F Metrics Overlay — Source Staged / Replacement Gate

준비된 source:

```text
ui/metric-format.js
ui/reel-overlay.js
```

새 overlay source는:

- ER/24h/account relative를 `metrics.summarize()` owner에서만 계산
- live scoped native metric이 있으면 동일 Reel post에 합성
- `▶ / ER / 24h / × / date` 5-line baseline
- missing line hide
- renderKey same-value rewrite 방지
- Layout Manager `--ri-reel-overlay-right` 사용 준비
- 별도 MutationObserver 없음

하지만 현재 **runtime visual switch는 하지 않았습니다.**

```text
새 source 구현
→ 자동검증
→ Android Edge identity/native metric/placement 확인
→ 새 overlay mount
→ 그 다음 legacy overlay hide/remove
```

따라서 `#ri3-reels-overlay`는 현재 보존합니다. legacy formula body도 Data Engine/renderer migration 전까지 compatibility code로 남깁니다.

---

# 10. Update Preservation / Tests / Build

업데이트 gate:

- 큰 `업데이트 바로가기`
- `UPDATE_URL` single owner
- userscript `@updateURL / @downloadURL`
- raw install URL

UI-F source checkpoint 자동검증 기준:

- unit tests: **32 / 32 pass**
- userscript build: **success**
- staged overlay/source syntax: **success**
- architecture warnings: **0 목표**
- generated userscript target: **v3.2.5**

추가 test coverage:

- same URL shared SPA activity identity refresh
- scoped/media/route shortcode evidence priority
- native metric compact/grouped parser
- exact normalized media URL mapping
- staged Reel overlay Metrics owner / 5-line presentation
- replacement gate에서 legacy overlay를 선제 hide하지 않음

자동검증은 Android Edge visual/identity accuracy 검증을 대신하지 않습니다.

---

# 11. Current Device Validation Needed

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

## UI-F Reel

- vertical Reel 이동 시 current active shortcode 동일성
- scoped likes/comments/reposts가 같은 Reel인지
- exact media URL mapping 실제 적중률
- route shortcode가 active media와 충돌할 때 scoped/media evidence 우선 동작
- staged Metrics 값이 현재 Reel과 일치하는지
- 새 overlay 60px lane 시작점의 rail/caption collision

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

# 12. Next Development

정확한 순서는 `WORK_TRACK.md`가 owner입니다.

```text
UI-F2 Reel visual replacement gate = device validation 대기

동시에 가능한 다음 코드 작업:
UI-G1 Data Engine foundation
↓
Identity
→ Extractor
→ Verified Store
→ history
→ media[]
→ Grid/Reel renderer
→ legacy removal
```

UI-G1은 legacy runtime의 Identity/Extractor/Verified Store contract를 먼저 inventory하고, provenance/conflict/no-fabricated-zero 규칙을 새 owner와 test로 옮깁니다. Grid renderer는 Frozen 상태로 유지하고 replacement callsite 준비 전 legacy write path를 제거하지 않습니다.

STT/OCR/AI는 data foundation 전에 UI만 크게 만들지 않습니다.
