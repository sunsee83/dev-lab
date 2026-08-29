# Instagram Content Research Tool — Active Work Track

이 문서는 **작업 중 방향 이탈을 막기 위한 실행 통제 문서**입니다.

문서 역할:

```text
PROJECT_PLAN.md          = 장기 제품/데이터/기능 설계
CODE_STRUCTURE.md        = 현재 파일/owner/dependency/migration 설계
GRID_BASELINE.md         = Grid Frozen UI 기준
UI_BASELINE.md           = 사용자가 보게 되는 모바일 UI 기준
UI_ARCHITECTURE.md       = UI 계층/상태/컴포넌트/데이터 흐름
PRESERVATION_BASELINE.md = 기존 승인 기능 보존/교체/삭제 승인 기준
STATUS.md                = 현재 배포/실기기/완료 상태
WORK_TRACK.md            = 현재 작업 목표/진행/다음 순서/차단요소
```

계획이 바뀌면:

1. 기존 결정의 목적 확인
2. 유지 / 수정 / 추가 분류
3. 기존 기능/외형 `PRESERVE / REPLACE / REMOVE-APPROVED` 분류
4. UI 작업이면 `UI_BASELINE.md / UI_ARCHITECTURE.md / GRID_BASELINE.md` 대조
5. data flow / owner 영향 검토
6. 관련 문서 먼저 또는 동시에 갱신
7. 이 문서 실행순서 갱신
8. 코드 수정

---

# 1. Current Release

- Current version: **v3.2.3**
- Source of truth: `src/*`
- Deployment artifact: `ri-retry.user.js`
- Current phase: **v3.2 UI/Foundation + Contextual Mobile Research Workspace 전환**

현재 v3.2.3 runtime visual은 아직 Foundation UI입니다. UI-B에서 내부 구조와 layout owner를 연결했지만 **Global Launcher visual / bottom Research Workspace 교체는 아직 하지 않았습니다.**

---

# 2. Current Objective

현재 최우선 목표:

**기존 Grid/미디어/업데이트 접근/기존 Reel RI visual identity를 보존하면서, 모바일 한 손 조작에 맞는 Contextual Research Workspace로 단계적으로 전환한다.**

제품 흐름:

```text
발굴
→ Grid 비교
→ 콘텐츠 확인
→ RI 상세 조사
→ 원본 확보
→ 분석
```

이번 전환에서 반드시 유지:

- Instagram 3열 Grid / 8-slot
- 숫자 깜빡임 제거 / renderKey
- Video/Reel actual cover
- music/album/avatar artwork 제외
- Carousel ZIP 없는 개별 batch
- Grid 카드당 media action 1개
- 기존 Reel RI visual identity
- Global RI 화면당 1개
- CONTENT 6탭 `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`
- 큰 업데이트 바로가기
- common Download Manager / Settings Store
- missing metric 추정 금지
- 지정폴더 실패 silent fallback 금지

---

# 3. Completed Foundation

이미 완료/활성:

- `src/*` source-of-truth
- generated userscript
- AppContext / SPA route tracking
- Capability owner
- Settings Store
- Download Manager
- Grid save action migration
- Clipboard owner
- media filename/cover owner
- legacy read adapter
- Metrics Engine owner
- RI Summary ER/24h/account relative
- store fingerprint live binding
- Preservation Baseline
- VERSION / UPDATE_URL single owner
- 업데이트 바로가기 복구 + CI gate
- `UI_BASELINE.md`
- `UI_ARCHITECTURE.md`

## UI-A — Contextual UI Architecture Freeze — 완료

완료:

- 5-layer UI model
- CONTENT / GLOBAL context
- CLOSED / COMPACT / EXPANDED state model
- route/identity rebind rule
- active-tab lazy mount 목표
- non-modal Compact / semi-modal Expanded 정책
- Layout Manager / Activity / Research Read Model boundary 설계

runtime visual 변경 없음.

## UI-B — Primitive + Layout + Workspace State Foundation — 코드 완료

이번 checkpoint에서 실제 반영:

### `ui/ri-primitives.js`

공통화:

- `createSection()`
- `addRow()`
- `addAction()`
- `renderEmpty()`

`ri-panel.js / ri-summary.js`가 section/row/empty DOM 구현을 중복하지 않게 변경.

### `ui/workspace-state.js`

단일 state owner:

```text
open
detent: closed | compact | expanded
mode: content | global
activeTab
contextKey
contextEpoch
```

- open/close/tab/context state를 panel closure에서 분리
- identity key가 실제 바뀔 때만 contextEpoch 증가
- route/identity rebind 기반 마련

### `ui/layout.js`

Layout Manager foundation:

```text
input
- viewport / visualViewport
- safeBottom
- bottom blockers
- right blockers
- keyboard

output
- launcherAnchor
- reelOverlayLane
- sheetMetrics
- feedbackAnchor
```

현재 runtime에서는 CSS variables로 기존 UI baseline을 기본 유지하면서 launcher/panel/toast 위치를 한 owner에 연결.

```text
--ri-launcher-right
--ri-launcher-bottom
--ri-panel-bottom
--ri-feedback-bottom
--ri-sheet-compact-height
--ri-sheet-expanded-height
```

route/resize/orientation/visualViewport 변화에서 schedule하며 일반 DOM mutation마다 전체 layout scan하지 않음.

### composition

`main.js`가 Workspace State와 Layout Manager를 생성해 RI Panel에 주입.

### 검증

자동검증 checkpoint:

- unit test **18/18 pass**
- build pass
- architecture/syntax pass
- **19 source files / 0 warnings**
- generated userscript syntax pass

UI-B는 **코드/CI Verified**. Android Edge 시각/터치 결과는 아직 Unverified.

---

# 4. Preserve — 건드리면 안 되는 승인 개선

## 공통 접근/운영

- 큰 업데이트 바로가기
- raw userscript 설치/업데이트 경로
- single generated userscript
- runtime `@require` chain 없음
- Global RI 1개
- 기존 Reel RI visual identity
- CONTENT 6탭

## Grid / Data

- 3열 Grid
- 하단 2줄 8-slot
- no-flicker
- same-value DOM rewrite 방지
- pending request dedupe
- PHOTO/CAROUSEL bogus views 차단
- Instagram native media icon
- 카드당 media button 1개
- Verified Store provenance/conflict
- `ri311:*` migration 완료 전 보존
- missing→0 금지

## Reel / Media / Settings

- native likes/comments/reposts/share 유지
- box/blur 없는 Reel overlay 방향
- actual video cover
- music/audio/album/avatar 제외
- Carousel individual files / ZIP 미사용
- directory failure silent fallback 금지
- Grid menu에 global folder setting 금지

기존 component 제거/숨김은 `PRESERVATION_BASELINE.md` replacement gate 이후에만 수행.

---

# 5. Current Known Issues / Unverified

현재 UI mismatch:

- v3.2.3 launcher icon은 기존 Reel RI visual identity와 다름
- 현재 right floating panel은 target Research Workspace가 아님
- Layout Manager blocker heuristic은 Foundation 단계이며 Android Edge/Instagram 실제 구조 검증 필요
- Reel right rail 세부 collision은 UI-C/UI-F에서 보강 필요
- panel Compact/Expanded visual은 아직 미구현
- GLOBAL RI Home 미구현
- active tab lazy mount 미구현
- Activity/progress persistent UI 미구현

실기기 미확인:

- UI-B layout 적용 후 nav/banner collision
- SPA 이동 후 stale shortcode
- live Store → 열린 Summary 갱신
- 업데이트 바로가기 → Tampermonkey install/update intercept
- directory photo/cover cross-origin save
- prompt mode
- Carousel batch same destination
- Grid 8-slot/no-flicker/cover regression 여부

photo/cover CORS 확인 전 `@grant` / privileged transport 선제 도입 금지.

---

# 6. Current Technical Debt

UI-B에서 해결:

- `ri-panel.js / ri-summary.js` section/row/empty 중복 → 해결
- layout offset owner 부재 → foundation owner 생성
- workspace open/tab/context state owner 부재 → 해결
- architecture duplicate warnings 4 → **0**

남음:

- v3.2.3 임시 launcher visual
- right floating Foundation panel
- GLOBAL/CONTENT 실제 presentation 분리
- active-tab lazy host
- Activity owner
- `ri-panel.js`가 migration adapter를 직접 읽는 coupling
- legacy Reel metric compatibility functions

Read Model implementation은 Data Engine migration 시 실제 필요가 생겼을 때 생성.

---

# 7. Next Execution Order

순서를 바꾸려면 이 문서와 관련 baseline/architecture를 먼저 갱신합니다.

## UI-C — Global RI Launcher Replacement — 다음 작업

1. v3.1 계열 기존 Reel RI icon/visual 실제 source 재확인
2. 현재 임시 막대+돋보기 icon과 차이 inventory
3. 새 Global Launcher에 기존 visual identity 적용
4. 시각 32~36px, touch target 약 44px
5. Layout Manager `launcherAnchor` 적용
6. Profile/Search/Explore/Grid/Reel/Post에서 화면당 정확히 1개
7. bottom nav/app banner/Reel rail collision 검토
8. 새 launcher 기능/접근 동등성 확인
9. 그 다음 임시 visual 제거

**기존 업데이트 shortcut / Grid / panel action은 이 단계에서 삭제하지 않음.**

## UI-D — Contextual Research Workspace

1. 기존 panel 사용자 action inventory
2. bottom Research Sheet 구현
3. COMPACT 약 48~56vh
4. EXPANDED 약 78~84vh
5. close 항상 접근
6. 명시적 expand/collapse
7. CONTENT → 기존 6탭
8. GLOBAL → RI Home + Settings/Update
9. sticky header/tab
10. active tab lazy mount
11. route identity rebind / scroll reset
12. 기존 summary/media/settings/update 완전 이관
13. 새 workspace 검증 후 old floating panel 제거

## UI-E — Feedback / Activity

- toast dedupe
- Carousel batch progress `3/8`
- persistent actionable error
- future STT/OCR/AI job extension point

## UI-F — Reel identity + Metrics Overlay

1. current Reel identity 정확도
2. native likes/comments/reposts 결합
3. Metrics owner 사용
4. `▶ / ER / 24h / × / date`
5. Layout Manager reel lane
6. native rail/caption collision 검증
7. legacy metric renderer 제거
8. regression 후 compatibility function 삭제

## UI-G — Data Engine / Research Tabs

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[]
→ Grid/Reel renderer
→ legacy runtime 제거
```

이후 실제 데이터가 준비된 순서:

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
- UI 작업이면 `UI_BASELINE.md / UI_ARCHITECTURE.md`
- Grid 작업이면 `GRID_BASELINE.md`
- 기존 component 교체면 `PRESERVATION_BASELINE.md`

```text
기존 기능/외형 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ target baseline 비교
→ owner/data flow 확인
→ 문서 갱신
→ 새 구현
→ 자동검증
→ 필요 시 실기기 확인
→ 그 다음 기존 구현 제거/숨김
```

## 작업 중

```text
Verified   = 코드/CI 또는 실기기 확인
Unverified = 구현됐지만 실기기 미확인
Blocked    = 외부 조건/실기기 결과 필요
Deferred   = 현재 범위 밖
```

관련 없는 subsystem을 한 문제 때문에 동시에 재작성하지 않습니다.

## 작업 종료 시

반드시 기록:

1. 변경 내용
2. 유지 내용
3. baseline 차이
4. 자동검증 결과
5. 실기기 여부
6. 새 문제
7. 다음 정확한 작업

---

# 9. Definition of Done for Each Step

- 관련 문서와 실제 구현 일치
- baseline/architecture 비교 완료
- owner 위반 없음
- 불필요한 중복 증가 없음
- existing feature/visual inventory 완료
- PRESERVE/REPLACE 접근경로 유지
- 주요 mobile touch target 검토
- Instagram native UI collision 검토
- `npm test` pass
- `npm run build` pass
- `npm run check` pass
- `node --check ri-retry.user.js` pass
- 실기기 항목은 확인 전 Verified 금지
- 다음 작업이 이 문서에 명확히 남아 있음

현재 다음 정확한 작업은 **UI-C Global RI Launcher Replacement**입니다.
