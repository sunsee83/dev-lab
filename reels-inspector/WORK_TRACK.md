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

새 요구사항이나 구현 중 발견사항으로 계획이 바뀌면 기존 문서를 지우고 새로 쓰지 않습니다.

1. 기존 결정의 목적을 먼저 확인
2. 유지할 것 / 수정할 것 / 새로 추가할 것을 분류
3. 기존 사용자 기능은 `PRESERVE / REPLACE / REMOVE-APPROVED`로 분류
4. UI 변경이면 `UI_BASELINE.md`, `UI_ARCHITECTURE.md`, `GRID_BASELINE.md`를 대조
5. 전체 구조와 data flow 영향을 재검토
6. 관련 기준 문서 갱신
7. `WORK_TRACK.md` 실행순서 갱신
8. 그 다음 코드 수정

---

# 1. Current Release

- Current version: **v3.2.3**
- Source of truth: `src/*`
- Deployment artifact: `ri-retry.user.js`
- Current phase: **v3.2 UI/Foundation + Contextual Mobile Research Workspace 설계/전환**

현재 v3.2.3 runtime UI는 기능 연결용 Foundation 상태이며 최종 모바일 UI로 확정하지 않습니다.

이번 문서 작업에서는 runtime을 변경하지 않았습니다.

---

# 2. Current Objective

현재 최우선 목표는 **기존에 좋아진 Grid/미디어/업데이트 접근 기능을 보존하면서, 모바일에서 한 손으로 빠르게 조사할 수 있는 Contextual Research Workspace 구조로 전환하는 것**입니다.

제품 흐름:

```text
발굴
→ Grid 비교
→ 콘텐츠 확인
→ RI 상세 조사
→ 원본 확보
→ 분석
```

## 반드시 유지

- Instagram 3열 Grid / 8-slot 비교 UI
- 숫자 깜빡임 제거 / renderKey 개선
- Video/Reel 실제 cover 저장
- music/album/avatar artwork 제외
- Carousel ZIP 없는 개별 batch 저장
- Grid 카드당 미디어 액션 1개
- 기존 Reel RI 리서치 버튼 visual identity
- Global RI 화면당 1개
- CONTENT research의 `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` 6탭
- 큰 업데이트 바로가기
- 공용 Download Manager / Settings Store
- 미확보 데이터 추정 금지

## 이번 구조 개선에서 추가한 핵심

- UI를 `Native / Ambient / Entry / Workspace / Feedback` 5계층으로 분리
- `CONTENT`와 `GLOBAL` context 구분
- 콘텐츠가 없는 화면에서는 빈 6탭 대신 가벼운 `RI Home`
- `CLOSED / COMPACT / EXPANDED` Workspace state machine
- route/identity change 시 stale view 즉시 invalidate
- active tab만 mount하는 lazy Tab Host
- Layout Manager 단일 owner
- Compact는 non-modal, Expanded는 semi-modal
- drag gesture에만 의존하지 않고 명시적 expand/collapse 제공
- 브라우저 Back/history 비침범
- download/향후 STT·OCR·AI용 공용 Activity layer
- UI가 legacy adapter/parser에 직접 강결합되지 않도록 향후 Research Read Model boundary 정의

현재 범위를 벗어난 STT/OCR/AI/대규모 댓글 분석은 데이터 계층이 준비되기 전에 UI만 먼저 만들지 않습니다.

---

# 3. Completed Foundation

이미 완료되어 재사용할 구조:

- `src/*` source-of-truth
- generated `ri-retry.user.js`
- AppContext / SPA route tracking
- Capability owner
- Settings Store
- common Download Manager
- global RI entry point
- Grid save action migration
- shared Clipboard owner
- media filename owner
- legacy read adapter
- Metrics Engine owner
- RI Summary ER / 24h / 계정 대비
- legacy store fingerprint live binding
- `PRESERVATION_BASELINE.md`
- `VERSION / UPDATE_URL` single owner
- 업데이트 바로가기 복구 + CI preservation gate
- `UI_BASELINE.md` mobile baseline
- `UI_ARCHITECTURE.md` contextual workspace/state/data-flow 설계

현재 Metrics 공식:

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32시간 snapshot 중 24시간에 가장 가까운 값 비교
계정 대비 = 동일 계정 최근 최대 20개, 최소 5개 표본 중앙값 대비 배수
```

---

# 4. Preserve — 건드리면 안 되는 승인 개선

## 공통 접근/운영

- 큰 **업데이트 바로가기**
- Tampermonkey raw userscript 직접 설치/업데이트 경로
- generated userscript 단일 배포
- runtime `@require` hotfix chain 없음
- Global RI 화면당 1개
- 기존 Reel RI visual identity를 Global Launcher 기준으로 사용
- CONTENT research 6탭 정보구조

## Grid / Data

- Instagram 3열 Grid
- 하단 2줄 정보영역
- 8개 독립 고정 슬롯
- 숫자 깜빡임 제거
- 같은 값 DOM 재작성 방지
- pending shortcode request dedupe
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram native media-type icon
- 카드당 커스텀 media button 1개
- Verified Store source/confidence/status/conflict 보호
- `ri311:*` cache/history migration 완료 전 보존
- missing metric을 `0`으로 만들지 않음

## Reel / Media / Settings

- Instagram native likes/comments/reposts/share 제거·중복 금지
- Reel overlay의 box/blur 없는 가벼운 표현
- Video/Reel 실제 cover
- music/audio/album/avatar 제외
- Carousel individual files / ZIP 미사용
- 지정 폴더 실패 시 silent fallback 금지
- Grid menu에 전역 folder setting 재도입 금지

기존 component를 숨기거나 제거하려면 `PRESERVATION_BASELINE.md`의 replacement gate를 먼저 통과합니다.

---

# 5. Current Known Issues / Unverified

현재 확인된 UI mismatch:

- v3.2.3 launcher icon이 기존 Reel RI visual identity와 다름
- launcher 위치가 실제 Instagram bottom nav/banner/right rail collision을 계산하지 않음
- right floating panel이 모바일 research workspace 최종 형태가 아님
- 현재 panel은 CONTENT/GLOBAL context를 구분하지 않아 content가 없을 때 빈 상태가 어색함
- panel 내부 tab을 모두 구조적으로 분리한 lazy host가 아직 없음
- layout owner/workspace state owner/activity owner가 아직 runtime에 없음
- panel close/size/touch 사용성 실기기 재검증 필요
- 업데이트 바로가기 Android Edge → Tampermonkey 실제 intercept 미확인

기존 실기기 미확인:

- SPA 이동 후 stale shortcode 여부
- live Store 변경이 열린 RI Summary에 실제 반영되는지
- 지정 폴더 photo/cover cross-origin 저장
- prompt mode
- Carousel batch 동일 destination 저장
- v3.2.x Grid 8-slot/no-flicker/cover 유지 여부

사진/cover CORS가 확인되기 전에는 `@grant`나 privileged transport를 선제 도입하지 않습니다.

---

# 6. Current Technical Debt

현재 우선 정리 대상:

- `ui/ri-panel.js` / `ui/ri-summary.js` section/row primitive 중복
- layout/safe-area 계산 owner 부재
- workspace open/detent/mode/tab state가 명확한 controller로 분리되지 않음
- `ri-panel.js`가 migration adapter를 직접 읽는 결합
- v3.2.3 임시 launcher visual/fixed positioning
- toast만으로 batch/long-running activity를 표현하는 한계
- legacy Reel renderer metric compatibility 함수

원칙:

- UI 구조 개선 때문에 Data Engine을 동시에 대규모 재작성하지 않음
- Read Model boundary는 contract부터 정의하고 실제 구현 파일은 Data Engine migration 시 필요할 때 생성
- 의미 없는 `utils.js`/빈 tab file 생성 금지

---

# 7. Next Execution Order

순서를 바꾸려면 이유를 이 문서와 관련 baseline/architecture에 먼저 기록합니다.

## UI-A — Contextual UI Architecture Freeze — 완료

- 기존 UI/기능/visual inventory 재확인
- `UI_BASELINE.md` 유지
- `UI_ARCHITECTURE.md` 신규 작성
- 5-layer model 정의
- CONTENT/GLOBAL context 정의
- Workspace state machine 정의
- route rebind / lazy tab / activity / layout owner 정의
- 현재 v3.2.3 ↔ target 차이 기록

runtime visual은 아직 변경하지 않음.

## UI-B — Primitive + Layout + Workspace State Foundation — 다음 작업

1. `ri-panel.js / ri-summary.js` 공통 section/row/empty/action primitive 추출
2. `ui/ri-primitives.js` 생성
3. `ui/layout.js` 생성
4. `LayoutSnapshot` / launcherAnchor / reelOverlayLane / sheetMetrics API 구현
5. Workspace state `open / detent / mode / activeTab / contextKey` owner 정리
6. route/identity 변경 시 stale view invalidation 규칙 구현
7. 기존 화면 visual/기능은 가능한 한 동일 유지
8. architecture duplicate warning 재검증

## UI-C — Global RI Launcher Replacement

1. v3.1 계열 기존 Reel RI visual/icon 재확인
2. 새 launcher에 visual identity 적용
3. 시각 32~36px + touch target 약 44px
4. Layout Manager anchor 적용
5. Grid/Reel/Post에서 정확히 1개
6. 새 launcher 동등성 확인 후 v3.2.3 임시 icon 제거

## UI-D — Contextual Research Workspace

1. 기존 panel 사용자 action inventory
2. bottom sheet COMPACT 약 48~56vh
3. EXPANDED 약 78~84vh
4. 명시적 expand/collapse + 항상 접근 가능한 close
5. CONTENT mode → 기존 6탭
6. GLOBAL mode → RI Home + Settings/Update 접근
7. active tab lazy mount
8. sticky header/tab rail
9. Settings 큰 update shortcut 보존
10. route/store live update 유지
11. 새 workspace 기능 확인 후 old floating panel 제거

## UI-E — Feedback / Activity

- toast dedupe
- Carousel batch progress (`3/8 저장 중`)
- actionable persistent error
- 향후 STT/OCR/AI job extension point

## UI-F — Reel Identity + Metrics Overlay

1. current Reel identity 정확도
2. native likes/comments/reposts 결합
3. Metrics owner 사용
4. `▶ / ER / 24h / × / date` 5개 overlay
5. Layout Manager rail/caption collision 회피
6. legacy metric renderer 호출 제거
7. 회귀 확인 후 compatibility 함수 삭제

## UI-G — Data Engine / Research Tabs

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[]
→ Grid/Reel renderer
→ Content/Comments/Analysis 실제 데이터
→ legacy-runtime 제거
```

그 후 STT/OCR/AI를 연결합니다.

---

# 8. Work Update Protocol

## 작업 시작 전

반드시 확인:

- `WORK_TRACK.md` Current Objective / Preserve / Known Issues / Next Order
- UI 작업 → `UI_BASELINE.md` + `UI_ARCHITECTURE.md`
- Grid 작업 → `GRID_BASELINE.md`
- 기존 component 교체/숨김 → `PRESERVATION_BASELINE.md`
- owner/dependency 변경 → `CODE_STRUCTURE.md`

```text
기존 기능/외형 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ baseline + architecture 대조
→ 새 구현
→ 자동검증
→ 필요 시 실기기 확인
→ 그 다음 기존 구현 제거/숨김
```

`PRESERVE/REPLACE`의 새 접근경로가 없는 상태에서 기존 component를 먼저 제거하거나 숨기지 않습니다.

작업이 기존 계획과 다르면 **코드보다 문서를 먼저 수정**합니다.

## 작업 중

새 사실은 즉시 분류합니다.

```text
Verified     = 코드/CI 또는 실기기에서 확인
Unverified   = 구현됐지만 실기기 미확인
Blocked      = 외부 조건/실기기 결과 필요
Deferred     = 현재 단계 범위 밖
```

새 문제 하나 때문에 관련 없는 구조까지 동시에 재작성하지 않습니다.

## 작업 종료 시

반드시 기록:

1. 무엇을 변경했는지
2. 무엇을 유지했는지
3. baseline/architecture와 달라진 부분이 있는지
4. 자동 검증 결과
5. 실기기 확인 여부
6. 새로 발견된 문제
7. 다음 정확한 작업

관련 문서 owner:

- 제품/데이터/기능 → `PROJECT_PLAN.md`
- 현재 파일/owner/dependency → `CODE_STRUCTURE.md`
- Grid → `GRID_BASELINE.md`
- 모바일 시각/조작 기준 → `UI_BASELINE.md`
- UI 계층/상태/data flow → `UI_ARCHITECTURE.md`
- 기존 기능 보존 → `PRESERVATION_BASELINE.md`
- 테스트 → `tests/README.md`
- 배포/검증 → `STATUS.md`
- 실행순서 → `WORK_TRACK.md`

---

# 9. Definition of Done for Each Step

각 step은 다음을 만족하기 전 완료로 표시하지 않습니다.

- 관련 문서가 실제 구현과 일치
- `UI_BASELINE.md` + `UI_ARCHITECTURE.md`와 구현 비교 완료
- owner 규칙 위반 없음
- 불필요한 중복 증가 없음
- 기존 사용자 기능 inventory 완료
- `PRESERVE/REPLACE` 접근경로 유지
- 주요 모바일 action touch target 검토
- Instagram native UI collision 검토
- stale context 혼입 없음
- UI layout/state/activity owner 중복 없음
- `npm test` 통과
- `npm run build` 통과
- `npm run check` 통과
- `node --check ri-retry.user.js` 통과
- 실기기 항목은 실제 확인 전 `Verified`로 표시하지 않음
- 다음 작업이 `WORK_TRACK.md`에 명확히 남아 있음

이 문서는 매 작업의 현재 위치를 확인하는 체크포인트이며, 방향을 바꾸는 경우 반드시 먼저 갱신합니다.
