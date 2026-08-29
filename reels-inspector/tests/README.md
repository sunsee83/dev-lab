# Reels Inspector Regression / Acceptance Tests

Android Edge + Tampermonkey 실기기 검증과 자동 unit/build/check 기준을 함께 관리합니다.

UI 기준 문서:

- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — Global RI / Reel / Research Workspace 모바일 UI
- `UI_ARCHITECTURE.md` — UI state/component/data-flow
- `PRESERVATION_BASELINE.md` — 기존 승인 기능/외형 보존 gate

## 자동 테스트 파일

- `fixtures/core-cases.json` — mediaType / Verified Store conflict / Grid fixture
- `unit/foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `unit/migration.test.mjs` — legacy adapter/history/change tracker/media resolver
- `unit/metrics.test.mjs` — ER/24h/account relative Metrics Engine

현재 UI-B checkpoint 자동 unit: **18 tests**.

---

# 1. v3.1 Core/Grid 회귀 — 계속 유지

1. Reel 지표는 동일 shortcode에만 결합
2. Photo/Carousel에 검증되지 않은 view/ER/24h/outlier 생성 금지
3. media_type/product_type 분류 유지
4. 동일 shortcode pending request dedupe
5. same renderKey DOM rewrite 금지
6. React anchor 재사용 시 새 href shortcode
7. 비현실적 급변은 verified overwrite 대신 conflict
8. bottom banner와 실제 겹치는 카드만 overlay hide
9. Instagram 3열 유지
10. row1 `views/likes/comments/reposts` 4 fixed slots
11. row2 `ER/24h/account/date` 4 fixed slots
12. 문자열 길이가 다른 slot 위치를 밀지 않음
13. missing은 slot 삭제가 아니라 `-`
14. custom Grid media button 카드당 1개
15. native media icon과 중복 play button 금지
16. Video/Reel cover는 current large body/media 우선
17. small music/album/avatar artwork 제외
18. Photo image download
19. Carousel parent slide order/identity
20. Carousel ZIP 없이 individual slides
21. 카드 본문 navigation 유지
22. menu outside/scroll/route cleanup
23. no-flicker/event refresh rollback 금지

---

# 2. Contextual Mobile UI

## 5-Layer model

1. Instagram native UI 제거/복제 금지
2. Grid/Reel ambient layer는 가볍게 유지
3. Global RI / Grid media action은 entry/intent만 담당
4. 긴 조사 UI는 Research Workspace
5. Toast/download/future analysis는 공용 Feedback/Activity layer

## Global ownership

6. Global Launcher 화면당 1개
7. Research Workspace 동시 1개
8. Layout owner 1개
9. Workspace state owner 1개
10. Toast/feedback owner 1개
11. route/store listener 무분별한 중복 금지

---

# 3. Context Mode

## CONTENT

1. current identity가 있으면 6탭 유지
2. `요약/콘텐츠/댓글/분석/미디어/설정`
3. header/body/media가 같은 identity 사용

## GLOBAL

4. identity 없을 때 빈 6탭 강제 금지
5. RI Home 또는 equivalent lightweight global state
6. GLOBAL에서도 Settings/update 접근 유지
7. ACCOUNT mode는 data model 전에 placeholder-only로 만들지 않음

---

# 4. Workspace State Machine — UI-B

`ui/workspace-state.js` 기준:

1. initial = closed/global/summary
2. open → compact
3. expand → expanded
4. collapse → compact
5. close → closed
6. activeTab 단일 owner
7. mode = content/global
8. identity 실제 변경시에만 contextEpoch 증가
9. same identity rebind는 epoch 증가 금지
10. context key에 shortcode/mediaId/child/slide 반영 가능
11. launcher/panel이 별도 장기 open state 소유 금지
12. UI-D가 같은 state로 bottom sheet를 구현

현재 pure unit coverage 있음.

---

# 5. Route / Identity Rebind

1. route/identity change → 이전 context invalidation
2. 새 데이터 전 old shortcode 확정값 표시 금지
3. detent 유지 가능
4. CONTENT→CONTENT active tab 유지 가능
5. new content body scroll reset target
6. CONTENT→GLOBAL → RI Home target
7. 이전 media/comment/metric 혼입 금지
8. render schedule/dedupe 사용

---

# 6. Layout Manager — UI-B

`ui/layout.js` 기준:

1. pure `computeLayoutSnapshot` 존재
2. output = launcherAnchor / reelOverlayLane / sheetMetrics / feedbackAnchor
3. safe-bottom baseline 반영
4. bottom blocker 증가 시 launcher 위 이동
5. right blocker 시 right inset 이동 가능
6. route/resize/orientation/visualViewport trigger
7. 일반 DOM mutation마다 full layout scan 금지
8. CSS offsets는 shared variables 사용
9. launcher/panel/toast가 서로 독립 fixed offset owner로 발전하지 않음
10. actual Instagram blocker detection은 실기기 전 Verified 금지

현재 pure layout unit coverage 있음.

---

# 7. RI Primitive / Duplicate — UI-B

`ui/ri-primitives.js` owner:

- section
- row
- action
- empty

기준:

1. `ri-panel.js / ri-summary.js` 동일 DOM builder 복제 금지
2. 의미 없는 global utils/helpers 금지
3. architecture duplicate warning 목표 0
4. UI-B checkpoint 결과 = **19 source files / 0 warnings**

---

# 8. Research Workspace target

1. mobile target = bottom Research Workspace
2. COMPACT 약 48~56vh
3. EXPANDED 약 78~84vh
4. close 항상 접근
5. explicit expand/collapse
6. drag는 보조, 유일 조작법 금지
7. sticky header/tab target
8. active tab only mount target
9. inactive heavy tabs 동시 유지 금지
10. browser Back/history 임의 intercept 금지
11. current right floating panel 제거 전 기존 action 완전 이관

---

# 9. Global RI Launcher target

1. Profile/Search/Explore/Grid/Reel/Post same entry
2. 화면당 1개
3. 기존 Reel RI visual identity
4. 임의 새 icon identity drift 금지
5. visual small / touch target 약 44px
6. bottom nav/app banner/Reel rail serious overlap 없음
7. Layout owner anchor 사용
8. user-agent 문자열만으로 위치 결정 금지
9. 새 launcher 검증 후 임시 visual 제거

---

# 10. 업데이트 접근

1. 큰 `업데이트 바로가기` 유지
2. overflow menu 안에만 숨기지 않음
3. Settings에서 안정적 접근 target
4. version shortcut은 큰 버튼 대체 금지
5. `UPDATE_URL` single owner
6. Android Edge raw userscript→Tampermonkey flow 실기기 전 Verified 금지

---

# 11. Reel UI

1. Instagram native likes/comments/reposts/share 유지
2. native action 우리 UI 중복 금지
3. overlay = 핵심 파생지표
4. target `▶ / ER / 24h / account / date`
5. box/blur 없음
6. white/gray text + shadow
7. missing line hide
8. native rail/caption 비침범
9. existing stable geometry 시작점
10. Layout owner reel lane target

---

# 12. Grid Action / Global Role

1. Grid media button = quick save
2. card당 custom media button 1개
3. Grid menu save-location setting 없음
4. Global RI = detailed research/global settings
5. Grid에 6-tab analysis 반복 금지
6. native media icon 유지

---

# 13. Download Manager

1. video/cover/photo/carousel same manager
2. global save mode
3. default/directory/prompt capability 기반
4. directory failure silent fallback 금지
5. structured DownloadResult
6. runtime API/permission 판단
7. Carousel batch destination 1회
8. filename media owner
9. Grid/RI network/Blob 직접 구현 금지
10. transport 차이 때문에 UI save logic 복제 금지

---

# 14. Metrics

## ER

1. `(likes + comments + reposts) / views × 100`
2. views > 0
3. raw inputs 실제 값일 때 계산
4. missing→0 금지
5. insufficient → `—`

## 24h

6. actual snapshot only
7. 18~32h
8. closest to 24h
9. none → `—`
10. current < previous conflict → 숫자 금지

## account relative

11. same username
12. current shortcode 제외
13. max20
14. min5
15. median multiple
16. insufficient → `—`

---

# 15. Detailed State

Grid = last verified or `-`.

Workspace target:

1. loading → `확인 중`
2. missing → `—`
3. unavailable → `사용 불가`
4. conflict → `검증 중`
5. missing→0 금지

---

# 16. Live Store / Performance

1. second full DOM observer 금지
2. shared SPA observer activity
3. mutation마다 full JSON parse 금지
4. legacy raw fingerprint 변경시에만 STORE_CHANGED
5. delayed event-triggered one-shot
6. open summary render dedupe
7. same fingerprint unnecessary render 없음
8. listener cleanup
9. layout도 mutation마다 full run 금지
10. inactive heavy tab simultaneous mount 금지 target

---

# 17. Architecture / Source of Truth

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
12. mobile layout → `ui/layout.js`
13. RI primitives → `ui/ri-primitives.js`
14. RI summary → `ui/ri-summary.js`
15. UI storage/FileSystem/network direct 금지
16. metrics DOM 금지
17. circular import 금지
18. new override stack 금지

---

# 18. 파일 / 중복 관리

1. private helper one file first
2. second use → owner API 검토
3. same core implementation long-term duplicate 금지
4. meaningless utils/helpers 금지
5. old/backup/hotfix/final2/copy 금지
6. source >350 lines responsibility review
7. >500 lines explicit split unless clear single responsibility
8. legacy-runtime only migration size exception
9. `ri-primitives.js`는 실제 shared RI presentation만
10. `layout.js`는 layout collision owner
11. `workspace-state.js`는 DOM-independent state owner
12. legacy metric compatibility migration 후 제거

---

# 19. UI Upgrade 실기기 순서

UI-B 이후:

1. Grid 8-slot/no-flicker/cover 유지
2. launcher/panel open 유지
3. update shortcut 유지
4. layout 후 nav/banner overlap
5. route stale context

UI-C 이후:

6. 기존 Reel RI visual identity
7. Global RI 1개
8. nav/banner/right rail collision
9. one-hand touch

UI-D 이후:

10. Compact 크기
11. Expanded long content
12. close always available
13. 6 tabs access
14. GLOBAL RI Home
15. update shortcut
16. route context reset
17. keyboard/visualViewport

실기기 확인 전 Android Edge visual/touch behavior를 완료로 기록하지 않습니다.
