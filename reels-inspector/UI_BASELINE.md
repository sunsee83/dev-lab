# Instagram Content Research Tool — Mobile UI Baseline

이 문서는 Instagram 모바일 웹에서 사용하는 **전역 UI의 시각/상호작용 기준**입니다.

- `PROJECT_PLAN.md` — 제품/데이터/기능 구조
- `GRID_BASELINE.md` — Grid Frozen UI
- `PRESERVATION_BASELINE.md` — 기존 승인 기능 보존/교체/삭제 기준
- `UI_ARCHITECTURE.md` — UI state/component/data-flow
- `WORK_TRACK.md` — 현재 구현 순서

목적은 UI를 임의로 새로 꾸미는 것이 아니라 **발굴 → 확인 → 상세 조사 → 원본 확보 → 분석** 흐름을 모바일에서 빠르고 안전하게 수행하는 것입니다.

기존에 좋아진 기능과 익숙한 접근점을 버리지 않고 필요한 부분만 모바일 사용성에 맞게 업그레이드합니다.

---

# 1. 제품 목적에서 파생되는 UI 원칙

```text
발굴
→ Grid 비교
→ 관심 콘텐츠 확인
→ RI 상세 조사
→ 미디어 확보
→ 댓글/콘텐츠/분석 확인
```

원칙:

1. Instagram 원래 탐색 흐름을 방해하지 않는다.
2. 자주 쓰는 기능은 한 번의 탭으로 접근한다.
3. Grid는 비교에 집중하고 상세 기능을 넣지 않는다.
4. 상세 기능은 Global RI 한 곳으로 모은다.
5. 저장 설정은 카드마다 반복하지 않는다.
6. 모바일 한 손 조작을 우선한다.
7. 닫혀 있을 때 화면을 계속 덮지 않는다.
8. 열었을 때는 억지로 작은 글씨를 우겨넣지 않는다.
9. 기존 승인 기능을 새 UI 때문에 삭제하지 않는다.
10. 데이터가 없으면 추측값으로 채우지 않는다.

---

# 2. 전체 UI 역할 — 고정

```text
Grid               = 빠른 비교 / 발굴
Grid 미디어 버튼    = 현재 카드 빠른 저장
Reel Overlay       = 영상 시청 중 핵심 파생지표
Global RI Launcher = 전체 리서치 진입점
Research Workspace = 상세 조사 / 미디어 / 설정
```

같은 기능을 여러 화면에 별도로 만들지 않습니다.

---

# 3. Mobile Layout System

전역 UI는 고정 pixel 위치를 각 컴포넌트가 따로 계산하지 않습니다.

`UI Layout Manager`가 다음을 한 곳에서 계산합니다.

- safe-area
- Instagram bottom navigation
- 앱 사용/Open app 배너
- Reel right action rail
- visual viewport
- keyboard
- orientation/resize

```text
Instagram viewport
      ↓
Layout Manager
      ├ launcherAnchor
      ├ reelOverlayLane
      ├ sheetMetrics
      └ feedbackAnchor
```

규칙:

- user-agent 문자열만으로 위치 결정 금지
- 실제 blocker rect 기반
- 동일 layout 계산 복제 금지
- ordinary DOM mutation마다 전체 layout scan 금지
- route/resize/visualViewport 변화에서 schedule/dedupe

---

# 4. 전역 RI Launcher

## 4.1 역할

Instagram 주요 화면에서 하나의 전역 entry를 사용합니다.

- Profile
- Search
- Explore
- Grid
- Reel
- Post detail
- Photo
- Feed Video
- Carousel

동작:

```text
tap → Research Workspace open
다시 tap → close
```

## 4.2 기존 Reel RI visual identity 보존

새 브랜드 버튼을 임의로 만들지 않습니다.

v3.1.6 source audit 결과 기존 `ri3-tool`과 현재 `researchIcon()`의 SVG는 동일했습니다. 회귀는 icon path가 아니라 v3.2.3 Foundation wrapper의 진한 background/border/box-shadow였습니다.

보존 baseline:

- 기존 Reel RI SVG
- visual circle 약 `34×34px`
- icon 약 `21×21px`
- border 없음
- `rgba(0,0,0,.12)` 정도의 낮은 불투명도 원형
- drop-shadow 정도
- Instagram native action보다 강한 시각 위계 금지

UI-C source는 visual을 복원하고 actual touch target만 `44×44px`로 확장했습니다.

## 4.3 위치

- 우측 하단 thumb zone
- safe-area 위
- bottom nav/banner/right rail과 겹치면 최소 이동
- legacy Reel `...` button following 방식은 Global RI에 재도입하지 않음

Android Edge actual parity는 실기기 확인 전입니다.

---

# 5. Grid — Frozen UI 유지

`GRID_BASELINE.md`가 상세 owner입니다.

유지:

- Instagram 3열
- thumbnail 하단 2줄
- 8 fixed slots
- no-flicker
- same-value DOM rewrite 방지
- native media-type icon
- custom media button 1/card
- Photo/Carousel bogus views 차단
- Video/Reel actual cover
- music/album/avatar reject

Grid에 상세 탭/설정/분석을 넣지 않습니다.

Grid media menu:

### REEL / VIDEO
- 영상 다운로드
- 썸네일 다운로드
- 링크 복사

### PHOTO
- 이미지 다운로드
- 링크 복사

### CAROUSEL
- 전체 이미지 다운로드 (N)
- 대표 이미지 다운로드
- 링크 복사

저장 위치 정책은 Grid menu에 두지 않습니다.

---

# 6. Reel Overlay

Instagram native likes/comments/reposts/share는 유지합니다.

추가 표시:

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

규칙:

- box 없음
- blur 없음
- 작은 white/gray text
- text-shadow 정도
- missing line hide
- native rail/caption 비침범
- 기존 안정적 geometry를 시작점으로 사용
- 실제 collision은 Layout Manager 조정

Reel Overlay는 상세 패널이 아닙니다.

---

# 7. RI Research Sheet — 모바일 상세 조사 UI

모바일 상세조사의 기본 형태는 **bottom Research Sheet**입니다.

현재 UI-D source에서 기존 right floating shell을 bottom sheet 구조로 교체했습니다. Android Edge visual/touch 결과는 아직 Unverified입니다.

## 7.1 기본 형태

```text
┌────────────────────────────┐
│ ──                         │
│ RI · @username  REEL  확장 ×│
│ 요약 콘텐츠 댓글 분석 미디어 설정 │
├────────────────────────────┤
│                            │
│ active body                │
│                            │
├────────────────────────────┤
│ 업데이트 바로가기          │
└────────────────────────────┘
```

- 좌우 margin 약 8px
- safe-area 반영
- rounded top
- body만 vertical scroll
- header/tab/footer는 body scroll 밖
- close 항상 접근 가능

## 7.2 COMPACT

- 최초 open
- 약 `48~56vh`
- Instagram background를 상당 부분 계속 확인
- full-screen scrim 없음
- outside tap close 가능

## 7.3 EXPANDED

- 약 `78~84vh`
- 긴 Caption/댓글/분석용
- soft scrim 허용
- explicit collapse control
- full screen 자동 강제 금지

## 7.4 조작 규칙

- explicit `확장 / 축소`
- drag handle은 visual/보조 affordance
- drag-only interaction 금지
- body swipe dismiss 강제 금지
- browser Back/history push로 workspace close를 구현하지 않음
- keyboard/visualViewport에 따라 height 재계산

---

# 8. Context Header / Navigation

CONTENT header 예:

```text
RI · @username   REEL   v3.2.x   확장  ×
```

GLOBAL header:

```text
RI Research      v3.2.x   확장  ×
```

CONTENT 6탭:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

규칙:

- horizontal scroll 허용
- selected tab 명확
- touch target 충분히 확보
- header/tab은 body scroll 밖
- active tab만 body render
- route identity가 바뀌면 stale content invalidation
- new content에서 body scroll top reset

GLOBAL에서는 빈 CONTENT 6탭을 표시하지 않습니다.

---

# 9. 요약 탭

목표: **10초 안에 성과 판단**.

identity:

- username
- media type
- published date

raw metrics:

- views
- likes
- comments
- reposts

-derived:

- ER
- 24h
- account relative

모바일에서는 작은 8~10열 table을 만들지 않습니다.

권장:

```text
조회       좋아요
댓글       리포스트

ER         24h
계정대비    게시일
```

상태:

- loading → `확인 중`
- missing → `—`
- unavailable → `사용 불가`
- conflict → `검증 중`

---

# 10. 콘텐츠 탭

REEL / VIDEO:

- Caption
- Hashtags / Mentions
- STT
- OCR
- corrected transcript

PHOTO:

- Caption
- Hashtags / Mentions
- OCR

CAROUSEL:

- Caption
- Hashtags / Mentions
- slide OCR
- 카드뉴스 구조

긴 text는 body scroll, copy action은 section 가까이에 둡니다.

Data Engine이 준비되기 전에는 빈 세부 UI를 과도하게 만들지 않습니다.

---

# 11. 댓글 탭

목표: 소비자 니즈/콘텐츠 아이디어 발굴.

filter chips:

- 유용
- 질문
- 구매의도
- 후기
- 불만
- 반론
- 팁
- 아이디어

- horizontal scroll 허용
- thread 관계 보존
- low-value deterministic filter 후 AI

---

# 12. 분석 탭

- Hook
- 고정 제목
- CTA
- 강조어
- 숫자/가격
- 콘텐츠 구조
- 발화/속도

AI와 deterministic 결과를 구분합니다.

결과가 없으면 빈 카드 여러 개 대신 clear empty state 하나를 사용합니다.

---

# 13. 미디어 탭

REEL / VIDEO:

- video
- actual cover
- video download
- cover download

PHOTO:

- original image
- image download

CAROUSEL:

- slide count
- representative
- whole batch
- 향후 slide별 item

주요 action height 약 44px 권장.

모든 저장은 Download Manager 사용.

---

# 14. 설정 탭 / GLOBAL Settings

전역 설정:

- 지정 폴더
- 기본 Downloads
- 매번 선택
- current folder name
- permission
- folder select/change

영상/cover/photo/carousel에 같은 정책 적용.

GLOBAL context에서는 빈 6탭 대신 RI Home과 함께 global Settings를 바로 제공합니다.

## 업데이트 접근

기존 `새 버전` 기능은 삭제하지 않습니다.

**큰 full-width `업데이트 바로가기`를 지속적으로 접근 가능하게 유지**합니다.

UI-D source에서는 CONTENT/GLOBAL 모두 Workspace footer에 보존했습니다. 향후 Settings 내부 배치로 정리하더라도 replacement 없이 제거하거나 overflow 안에만 숨기지 않습니다.

---

# 15. Toast / Error / Progress

짧은 성공과 긴 작업상태를 분리하는 것이 target입니다.

- short success → Toast
- actionable error → persistent Workspace message
- Carousel batch → `3/8 저장 중`
- future STT/OCR/AI → same Activity presentation

규칙:

- directory failure를 success처럼 표시 금지
- silent fallback 금지
- duplicate toast 금지
- 위치는 Layout Manager feedbackAnchor 사용

현재 full Activity owner 구현은 UI-E 대상입니다.

---

# 16. 모바일 터치 / 가독성

- major action touch target 약 44px
- Grid overlay처럼 극소 공간만 예외
- 핵심 text 9px 이하 지양
- body line-height 확보
- nested scroll 남발 금지
- Instagram horizontal navigation과 충돌하는 swipe를 핵심 동작으로 사용 금지
- hover 의존 금지
- color만으로 상태 구분 금지
- prefers-reduced-motion 고려

---

# 17. 현재 v3.2.3과 Target 비교

| 항목 | 현재 source | Target / Validation |
|---|---|---|
| Global RI | v3.1.6 SVG + 34px visual + 44px touch | Android Edge visual/touch parity 확인 |
| RI 위치 | Layout Manager anchor | nav/banner/right rail 실제 collision 확인 |
| Workspace | bottom Research Sheet source 활성 | Android Edge size/scroll/collision 확인 |
| Height | COMPACT / EXPANDED source 활성 | 48~56vh / 78~84vh 체감 검증 |
| Context | CONTENT 6탭 / GLOBAL RI Home+Settings source | route transition 검증 |
| Close/Detent | explicit close + 확장/축소 | one-hand accessibility 검증 |
| Update | full-width footer 보존 | Tampermonkey install/update 검증 |
| Grid | frozen legacy renderer 유지 | regression 검증 |
| Reel Overlay | legacy migration 중 | UI-F에서 Metrics owner 통합 |
| Activity | Toast 중심 | UI-E에서 progress/persistent state |

현재 source 구현을 최종 실기기 완료로 간주하지 않습니다.

---

# 18. UI 코드 구조

현재 실제 책임:

```text
ui/
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

- `workspace-state.js` = DOM-independent state
- `research-workspace.js` = bottom sheet shell/header/tabs/detent/outside close
- `ri-panel.js` = controller + summary/media/settings wiring
- `layout.js` = layout/collision owner

처음부터 빈 tab files를 만들지 않습니다.

책임이 실제 커질 때만 추가 분리합니다.

---

# 19. UI Upgrade Migration Plan

## UI-0 — Baseline 재설계 — 완료

- 기존 좋은 점 inventory
- UI baseline/preservation/test 정리

## UI-1 — Primitive + Layout Foundation — 완료

- RI primitive common owner
- Workspace State owner
- Layout Manager foundation
- duplicate warnings 0 checkpoint

## UI-2 — Global RI Launcher — source 완료 / device validation pending

- v3.1.6 source audit
- original SVG 확인
- 34px visual / 44px touch
- Layout Manager anchor

## UI-3 — Mobile Research Workspace — source 완료 / device validation pending

- `research-workspace.js` shell owner
- right floating → bottom sheet source
- COMPACT / EXPANDED
- explicit expand/collapse
- CONTENT 6 tabs
- GLOBAL RI Home + Settings
- active body only render
- context change scroll reset
- big update shortcut 보존
- Summary/Media/Settings actions 유지

## UI-4 — Feedback / Activity — 다음 구현

- toast dedupe
- batch progress
- persistent actionable error
- future STT/OCR/AI activity extension

## UI-5 — Reel Overlay 통합

- current Reel identity/native metrics
- Metrics owner
- `▶ / ER / 24h / × / date`
- Layout Manager reel lane
- legacy metric renderer 제거

## UI-6 — Data / Research Tabs

- Identity
- Extractor
- Verified Store
- history
- media[]
- actual Content/Comments/Analysis
- 이후 STT/OCR/AI

---

# 20. UI Definition of Done

UI step은 아래를 만족하기 전 완료가 아닙니다.

- Grid Frozen UI 유지
- Preservation gate 통과
- Global RI visible 1개
- 기존 Reel RI visual identity 유지
- bottom nav/banner/right rail serious overlap 없음
- major touch targets mobile usable
- close 항상 접근 가능
- COMPACT가 화면을 과도하게 가리지 않음
- EXPANDED 긴 내용 읽기 가능
- CONTENT 6 tabs 접근 가능
- GLOBAL empty-tab 문제 없음
- big update shortcut 존재
- Grid menu에 save-location setting 없음
- missing data 추정 없음
- unit/build/check 통과
- Android Edge 실기기 확인 전 visual/touch behavior를 Verified로 기록하지 않음

이 기준을 바꾸는 경우 코드보다 문서를 먼저 갱신합니다.
