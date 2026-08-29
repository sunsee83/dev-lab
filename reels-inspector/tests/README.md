# Reels Inspector Regression / Acceptance Tests

Android Edge + Tampermonkey 실기기 검증과 자동 unit/build/check 기준을 함께 관리합니다.

UI 기준:

- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — Global RI / Reel / Research Workspace
- `UI_ARCHITECTURE.md` — UI state/component/data-flow
- `PRESERVATION_BASELINE.md` — 기존 승인 기능/외형 보존 gate

## 자동 테스트 파일

- `fixtures/core-cases.json` — mediaType / Verified Store conflict / Grid fixture
- `unit/foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `unit/migration.test.mjs` — legacy adapter/history/change tracker/media resolver
- `unit/metrics.test.mjs` — ER/24h/account relative Metrics Engine
- `unit/ui-launcher.test.mjs` — v3.1 RI icon + 34px visual / 44px touch geometry preservation
- `unit/ui-workspace.test.mjs` — Compact/Expanded bottom sheet + CONTENT/GLOBAL + update preservation

UI-D source checkpoint 예상 unit count: **21 tests**.

---

# 1. Core / Grid Frozen Regression

1. Reel metrics는 동일 shortcode에만 결합
2. Photo/Carousel bogus views/ER/24h/outlier 금지
3. media type 분류 유지
4. pending shortcode request dedupe
5. same renderKey DOM rewrite 금지
6. React anchor reuse 시 current href shortcode 재검증
7. suspicious metric conflict 보호
8. Instagram 3열 유지
9. row1 `views/likes/comments/reposts` fixed slots
10. row2 `ER/24h/account/date` fixed slots
11. missing slot = `-`
12. 숫자 길이가 다른 slot을 밀지 않음
13. Grid custom media button 카드당 1개
14. native media-type icon 유지
15. duplicate custom play icon 금지
16. Video/Reel current large cover 우선
17. music/album/avatar artwork reject
18. Photo image download
19. Carousel parent order/identity
20. Carousel individual files / no ZIP
21. card navigation 유지
22. menu outside/scroll/route cleanup
23. no-flicker/event refresh rollback 금지

---

# 2. UI Ownership / 5-Layer Model

1. Instagram native UI 제거/복제 금지
2. Grid/Reel ambient layer는 가볍게 유지
3. Global RI / Grid media button = entry/intent
4. 긴 조사 = Research Workspace
5. Toast/download/future analysis = Feedback/Activity layer
6. Global Launcher 화면당 1개
7. Research Workspace 동시 1개
8. Workspace State owner 1개
9. Layout owner 1개
10. route/store listener 무분별한 중복 금지

---

# 3. Workspace State

`ui/workspace-state.js`:

1. initial = closed/global/summary
2. open → compact
3. expand → expanded
4. collapse → compact
5. close → closed
6. activeTab single owner
7. mode = content/global
8. identity 실제 변경시에만 contextEpoch 증가
9. same identity rebind는 epoch 증가 금지
10. context key에 shortcode/mediaId/child/slide 반영 가능
11. launcher/view가 별도 장기 open/detent state 소유 금지

---

# 4. UI-D Contextual Research Workspace

`ui/research-workspace.js` + `ui/ri-panel.js` 기준:

## Bottom Sheet

1. current workspace는 right floating panel이 아니라 viewport bottom sheet
2. horizontal margin 약 8px
3. COMPACT height는 Layout Manager `sheetMetrics.compactHeight` 사용
4. EXPANDED height는 `sheetMetrics.expandedHeight` 사용
5. explicit `확장 / 축소` control 존재
6. close control 항상 header에 존재
7. drag handle은 visual affordance이며 유일한 control이 아님
8. body만 vertical scroll
9. header/tab/update footer는 body scroll 밖에 유지
10. Expanded에서 soft scrim 존재
11. Compact에서 full scrim 강제 금지
12. Compact outside tap은 workspace close 가능
13. browser Back/history push로 닫기 구현 금지
14. reduced-motion 환경에서 transition 비활성 가능

## CONTENT mode

15. 기존 6탭 유지: `요약/콘텐츠/댓글/분석/미디어/설정`
16. tab rail은 CONTENT에서만 노출
17. selected tab aria state 유지
18. 현재 active body만 render
19. Summary/Media/Settings 기존 action 보존
20. Content/Comments/Analysis는 데이터 migration 전 placeholder만 명확히 표시
21. context header는 current username/mediaType과 같은 identity 사용

## GLOBAL mode

22. content identity가 없으면 빈 6탭 표시 금지
23. `RI Home` 표시
24. global Settings 직접 접근 가능
25. 큰 update shortcut 유지
26. ACCOUNT mode는 실제 model 전 placeholder-only로 만들지 않음

## Route / Identity

27. context actual change → contextEpoch 증가
28. old body scroll reset
29. stale shortcode/media/metric을 새 content 확정값처럼 유지 금지
30. route/identity/store event render dedupe
31. CONTENT↔GLOBAL presentation 전환

---

# 5. Global RI Launcher

1. v3.1.6 research SVG identity 보존
2. visual circle 약 34×34
3. icon 약 21×21
4. border 없음
5. low-opacity dark circle + drop shadow
6. actual touch target 약 44×44
7. Layout Manager anchor 사용
8. Profile/Search/Explore/Grid/Reel/Post에서 visible launcher 1개 target
9. bottom nav/app banner/right rail serious overlap 금지
10. Android Edge 실기기 전 visual parity Verified 금지

---

# 6. Layout Manager

1. pure `computeLayoutSnapshot` 존재
2. output = launcherAnchor / reelOverlayLane / sheetMetrics / feedbackAnchor
3. safeBottom 반영
4. bottom blocker 시 launcher 위 이동
5. right blocker 시 right inset 이동 가능
6. route/resize/orientation/visualViewport triggers
7. ordinary DOM mutation마다 full layout scan 금지
8. CSS custom properties shared
9. sheet compact/expanded height owner는 layout
10. Instagram actual blocker heuristic은 실기기 전 Verified 금지

---

# 7. Update Preservation

1. 큰 `업데이트 바로가기` 존재
2. overflow menu 안에만 숨기지 않음
3. CONTENT/GLOBAL 모두 workspace footer에서 접근 가능
4. `UPDATE_URL` single owner
5. generated @updateURL / @downloadURL 같은 owner
6. raw userscript→Tampermonkey flow는 Android Edge 실기기 확인 전 Verified 금지

---

# 8. Download Manager

1. video/cover/photo/carousel same manager
2. save mode = global
3. default/directory/prompt capability 기반
4. directory failure silent fallback 금지
5. structured DownloadResult
6. runtime API/permission 판단
7. Carousel batch destination 1회
8. filename media owner
9. UI network/Blob direct 구현 금지
10. CORS가 확인되기 전 privileged transport 선제 도입 금지

---

# 9. Metrics

## ER

1. `(likes + comments + reposts) / views × 100`
2. views > 0
3. raw inputs 실제 값일 때만 계산
4. missing→0 금지
5. insufficient → `—`

## 24h

6. actual snapshot only
7. 18~32h
8. closest to 24h
9. none → `—`
10. current < previous이면 숫자 생성 금지

## Account Relative

11. same username
12. current shortcode 제외
13. max20
14. min5
15. median multiple
16. insufficient → `—`

---

# 10. Detailed State

Grid는 last verified 또는 `-`.

Research Workspace:

1. loading → `확인 중`
2. missing → `—`
3. unavailable → `사용 불가`
4. conflict → `검증 중`
5. missing→0 금지

---

# 11. Live Store / Performance

1. second full DOM observer 금지
2. shared SPA observer activity
3. mutation마다 full JSON parse 금지
4. legacy raw fingerprint 변경시에만 STORE_CHANGED
5. delayed event-triggered one-shot
6. open research view render dedupe
7. same fingerprint unnecessary render 없음
8. listener cleanup
9. layout도 mutation마다 full run 금지
10. inactive heavy content body 동시 render 금지

---

# 12. Architecture / Source of Truth

1. `src/*` only development source
2. generated userscript warning
3. VERSION/UPDATE_URL → `version.js`
4. route/event/lifecycle → `core/app.js`
5. clipboard → `core/clipboard.js`
6. settings → `store/settings-store.js`
7. legacy read/history → `migration/legacy-store-adapter.js`
8. metrics → `metrics/metrics.js`
9. media/cover/filename → `media/media-resolver.js`
10. file write → `media/download-manager.js`
11. Workspace state → `ui/workspace-state.js`
12. Research Workspace DOM shell → `ui/research-workspace.js`
13. mobile layout → `ui/layout.js`
14. RI primitives → `ui/ri-primitives.js`
15. RI controller/actions → `ui/ri-panel.js`
16. RI summary → `ui/ri-summary.js`
17. UI storage/FileSystem/network direct 금지
18. metrics DOM 금지
19. circular import 금지
20. new override stack 금지

---

# 13. 파일 / 중복 관리

1. private helper first
2. second real use → owner API 검토
3. same core implementation long-term duplicate 금지
4. meaningless utils/helpers 금지
5. old/backup/hotfix/final2/copy 금지
6. source >350 lines responsibility review
7. >500 lines 일반 source error
8. legacy-runtime only migration size exception
9. workspace state와 workspace DOM shell을 합치지 않음
10. legacy metric compatibility는 Reel/Grid migration 후 제거

---

# 14. 실기기 승인 순서

UI-C/UI-D source 이후 Android Edge에서 반드시 확인:

1. Global RI visible 1개
2. original RI visual identity 체감 유지
3. 44px touch target 조작성
4. bottom nav/app banner/right rail overlap
5. COMPACT가 화면을 과도하게 가리지 않음
6. EXPANDED에서 긴 내용 읽기 가능
7. `확장/축소/닫기` 항상 사용 가능
8. CONTENT 6탭 이동
9. GLOBAL RI Home + settings
10. 큰 update shortcut
11. route 이동 시 stale context 없음
12. keyboard/visualViewport
13. Grid 8-slot/no-flicker/cover regression 없음
14. update shortcut → Tampermonkey install/update flow

실기기 확인 전 Android Edge visual/touch behavior를 완료로 기록하지 않습니다.
