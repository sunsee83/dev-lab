# Instagram Content Research Tool — Mobile UI Baseline

이 문서는 Instagram 모바일 웹에서 사용하는 **전역 UI의 시각/상호작용 기준**입니다.

- `PROJECT_PLAN.md` — 제품/데이터/기능 구조
- `GRID_BASELINE.md` — Grid Frozen UI
- `PRESERVATION_BASELINE.md` — 기존 승인 기능 보존/교체/삭제 기준
- `UI_BASELINE.md` — 전역 RI / Reel / Panel / 모바일 조작성 기준
- `WORK_TRACK.md` — 현재 구현 순서

이 문서는 UI를 새로 예쁘게 만드는 문서가 아니라, **콘텐츠 발굴 → 확인 → 상세 조사 → 원본 확보 → 분석** 흐름을 모바일에서 빠르고 안전하게 수행하기 위한 기준입니다.

기존에 좋아진 기능과 익숙한 접근점을 버리지 않고, 필요한 부분만 모바일 사용성에 맞게 업그레이드합니다.

---

# 1. 제품 목적에서 파생되는 UI 원칙

사용자는 Instagram을 보면서 별도 앱으로 이동하지 않고 다음 행동을 빠르게 해야 합니다.

```text
발굴
  ↓
Grid 비교
  ↓
관심 콘텐츠 확인
  ↓
RI 상세 조사
  ↓
미디어 확보
  ↓
댓글/콘텐츠/분석 확인
```

따라서 UI 우선순위는 다음과 같습니다.

1. Instagram 원래 탐색 흐름을 방해하지 않는다.
2. 자주 쓰는 기능은 한 번의 탭으로 접근한다.
3. Grid는 비교에 집중하고 상세 기능을 넣지 않는다.
4. 상세 기능은 전역 RI 한 곳으로 모은다.
5. 저장 설정은 미디어별/카드별로 반복하지 않는다.
6. 모바일 한 손 조작을 우선한다.
7. 화면을 항상 덮는 큰 패널을 두지 않는다.
8. 사용자가 패널을 열었을 때는 작은 글씨를 억지로 우겨넣기보다 읽기 쉬운 공간을 준다.
9. 기존 승인 기능을 새 UI 때문에 삭제하지 않는다.
10. 데이터가 없으면 UI를 추측값으로 채우지 않는다.

---

# 2. 전체 UI 역할 — 고정

```text
Grid            = 빠른 비교 / 발굴
Grid 미디어 버튼 = 현재 카드 빠른 저장
Reel Overlay    = 영상 시청 중 핵심 파생지표 확인
전역 RI 버튼     = 전체 리서치 진입점
RI Research Sheet = 상세 조사 / 미디어 / 설정
```

같은 기능을 여러 화면에 별도로 만들지 않습니다.

---

# 3. Mobile Layout System

전역 UI는 고정 pixel 위치를 각 컴포넌트가 제각각 계산하지 않습니다.

향후 `UI Layout Manager`가 다음을 한 곳에서 계산합니다.

- `env(safe-area-inset-bottom)`
- Instagram 하단 navigation
- `앱 사용 / Open app / Use app` 고정 배너
- Reel 우측 native action rail
- 현재 viewport 높이
- 화면 회전/resize

개념:

```text
Instagram viewport
      ↓
UI Layout Manager
      ├ safeBottom
      ├ launcherBottom
      ├ launcherRight
      ├ reelOverlayRight
      └ sheetMaxHeight
```

규칙:

- 단순 user-agent/Android 문자열로 위치를 결정하지 않습니다.
- 실제 보이는 fixed UI와 bounding box를 기준으로 충돌을 피합니다.
- 같은 layout 계산을 RI button/Reel overlay/toast가 각각 복사하지 않습니다.
- DOM activity마다 전체 layout을 반복 계산하지 않고 route/resize/관련 UI 변화 때 schedule/dedupe합니다.

---

# 4. 전역 RI Launcher

## 4.1 역할

전역 RI 버튼은 Instagram 모든 주요 화면에서 **한 개만** 존재합니다.

표시 범위:

- Profile
- Search
- Explore
- Grid
- Reel
- 일반 Post 상세
- Photo
- Feed Video
- Carousel

동작:

```text
탭 → RI Research Sheet 열기
다시 탭 → 닫기
```

## 4.2 외형 — 기존 좋은 점 보존

새로운 브랜드 버튼을 임의로 디자인하지 않습니다.

**기존 Reel에서 사용하던 RI 리서치 도구의 아이콘/가벼운 시각 정체성을 전역 Launcher로 승격**합니다.

v3.1.6 source audit 결과 기존 `ri3-tool`과 현재 `researchIcon()`의 SVG path 자체는 동일했습니다. 실제 회귀는 icon 자체가 아니라 v3.2.3 Foundation launcher의 불필요하게 진한 배경·border·box-shadow·외곽 크기였습니다.

보존 기준:

- 기존 Reel RI SVG 계열 유지
- visual circle 약 `34×34px`
- icon 약 `21×21px`
- border 없음
- `rgba(0,0,0,.12)` 수준의 낮은 불투명도 원형 배경
- drop-shadow 정도의 가벼운 분리
- Instagram native action보다 강한 시각적 위계를 만들지 않음

UI-C source에서는 위 visual을 복원하고 실제 touch target만 `44×44px`로 확장했습니다. Android Edge 실기기에서의 체감 parity는 확인 전입니다.

## 4.3 크기와 터치 영역

- 시각 크기: 약 `32~36px`
- 현재 기준 visual circle: `34×34px`
- 실제 touch target: 약 `44×44px`
- 시각 요소를 크게 만들어 화면을 가리지 않고, invisible touch area로 조작성만 확보

## 4.4 위치

기본 위치:

- 우측 하단 thumb zone
- safe-area 위

그러나 다음과 겹치면 자동으로 위/안쪽으로 이동합니다.

- Instagram bottom navigation
- 앱 열기 배너
- Reel native right rail

Reel 전용으로 `...` 버튼 위치를 따라다니는 별도 구현은 만들지 않습니다.

---

# 5. Grid — Frozen UI 유지

Grid는 `GRID_BASELINE.md`를 그대로 따릅니다.

유지:

- Instagram 원래 3열 폭/높이
- 썸네일 위 하단 2줄 정보영역
- 8개 독립 고정 슬롯
- 숫자 깜빡임 제거
- 동일 값 DOM 재작성 방지
- Instagram native media-type icon 유지
- 카드당 커스텀 미디어 버튼 1개
- Photo/Carousel 잘못된 views 차단
- Video/Reel 실제 cover 우선
- 음악/앨범/avatar artwork 제외

Grid에 상세 탭/설정/분석을 넣지 않습니다.

## Grid media action

카드 좌측 상단의 기존 단일 미디어 버튼을 유지합니다.

시각 크기는 작게 유지하되 터치 영역은 가능한 범위에서 확보합니다.

메뉴:

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

저장 폴더/저장정책은 Grid에 두지 않습니다.

---

# 6. Reel Overlay

Instagram native 좋아요/댓글/리포스트/공유는 그대로 둡니다.

추가 표시하는 것은 조사에 필요한 파생지표만입니다.

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

규칙:

- 배경 박스 없음
- blur 없음
- 작은 흰색/회색 텍스트
- text-shadow 정도만 허용
- 값 없는 줄은 숨김
- native right rail/캡션을 가리지 않음
- 기존에 안정적이었던 `right ≈ 60px`, 상단 clamp 계열을 시작점으로 사용
- 실제 native rail과 충돌하면 Layout Manager가 조정

Reel Overlay는 상세 패널이 아닙니다. 시청 중 비교에 필요한 5개 값만 담당합니다.

---

# 7. RI Research Sheet — 모바일 상세 조사 UI

현재 v3.2.3의 우측 작은 floating panel은 기능 연결용 Foundation UI이며 최종 모바일 baseline으로 고정하지 않습니다.

상세 조사량을 고려하면 휴대폰에서는 **bottom research sheet**가 기본입니다.

## 7.1 기본 형태

```text
┌────────────────────────────┐
│ ── drag handle             │
│ RI · @username       v3.x ×│
│ 요약 콘텐츠 댓글 분석 미디어 설정 │
├────────────────────────────┤
│                            │
│ 현재 탭 내용               │
│                            │
└────────────────────────────┘
```

- 화면 좌우 margin 약 `8~10px`
- 하단 safe-area 반영
- 상단 모서리 round
- sheet 내부 body만 scroll
- header/tab은 sticky
- 닫기 `×`는 항상 접근 가능

## 7.2 두 단계 높이

모바일에서 정보량과 영상 가림을 동시에 해결하기 위해 두 상태를 사용합니다.

### Compact

- 최초 열림 상태
- viewport의 대략 `48~56vh`
- 요약/간단 저장/설정을 보기 충분한 높이

### Expanded

- 사용자가 확장했을 때
- 대략 `78~84vh`
- Caption/댓글/분석처럼 긴 내용을 읽는 상태

확장 방식은 구현 단계에서 drag 또는 명확한 expand control 중 실기기 조작성이 좋은 방식을 선택합니다.

중요:

- 자동으로 full screen을 강제하지 않음
- sheet가 닫혀 있을 때 Instagram 화면은 원래대로 사용 가능
- keyboard가 열리면 viewport와 충돌하지 않게 높이를 재계산

---

# 8. RI Header / Navigation

Header는 작은 공간에 현재 context만 보여줍니다.

권장:

```text
RI · @username   REEL   v3.2.3   ×
```

shortcode 전체를 항상 큰 텍스트로 노출할 필요는 없습니다. 상세 정보에서 확인 가능합니다.

6개 탭은 유지합니다.

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

규칙:

- 가로 스크롤 가능
- 현재 탭 명확히 표시
- 탭 높이/터치 target 충분히 확보
- 탭 내용이 길어져도 header/tab은 상단 유지
- route가 바뀌면 현재 identity와 함께 내용 갱신

---

# 9. 요약 탭

목표: 콘텐츠를 열었을 때 **10초 안에 성과를 판단**합니다.

상단 identity strip:

- username
- mediaType
- published date

핵심 raw metrics:

- views
- likes
- comments
- reposts

파생 metrics:

- ER
- 24h
- account relative

모바일에서는 지나치게 작은 8~10개 column table을 만들지 않습니다.

권장 layout:

```text
조회       좋아요
댓글       리포스트

ER         24h
계정대비    게시일
```

2열 metric grid 또는 읽기 쉬운 compact rows를 사용합니다.

상태:

- loading → `확인 중`
- no value → `—`
- unavailable → `사용 불가`
- conflict → `검증 중`

Grid의 `-` 정책과 상세 패널 상태는 구분합니다.

---

# 10. 콘텐츠 탭

목표: 콘텐츠 구성과 문구를 빠르게 재사용/분석할 수 있게 합니다.

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
- slide 1..N OCR
- 카드뉴스 구조

긴 텍스트는 sheet body에서 세로 스크롤하며, 복사 기능은 각 section 가까이에 둡니다.

---

# 11. 댓글 탭

목표: 단순 댓글 열람이 아니라 **소비자 니즈/콘텐츠 아이디어 발굴**입니다.

상단 horizontal filter chips:

- 유용
- 질문
- 구매의도
- 후기
- 불만
- 반론
- 팁
- 아이디어

본문은 comment thread를 유지합니다.

- 원댓글 + reply 관계 보존
- emoji-only/generic/spam은 우선순위 낮춤
- AI 분석 전 deterministic 후보 선별

필터가 많아도 한 화면에 모두 억지로 줄이지 않고 horizontal scroll을 허용합니다.

---

# 12. 분석 탭

Section 단위로 표시합니다.

- Hook
- 고정 제목
- CTA
- 강조어
- 숫자/가격
- 콘텐츠 구조
- 발화/속도

AI 결과와 deterministic 결과를 구분할 수 있어야 합니다.

분석 결과가 없는 상태에서는 빈 카드 여러 개를 만들지 않고 한 개의 명확한 empty state를 사용합니다.

---

# 13. 미디어 탭

미디어 탭은 원본 확보 중심입니다.

REEL / VIDEO:

- 영상 정보
- 실제 cover
- 영상 다운로드
- cover 다운로드

PHOTO:

- 원본 이미지
- 이미지 다운로드

CAROUSEL:

- slide 수
- 대표 이미지
- 전체 다운로드
- 향후 slide별 목록/개별 저장

다운로드 버튼은 모바일 터치 기준 최소 약 `44px` 높이를 권장합니다.

모든 저장은 Download Manager를 통과합니다.

---

# 14. 설정 탭

전역 설정만 둡니다.

저장 방식:

- 지정 폴더
- 기본 Downloads
- 매번 선택

표시:

- 현재 폴더 이름
- 권한 상태
- 폴더 선택/변경

영상/썸네일/사진/Carousel에 동일 정책을 적용합니다.

## 업데이트 접근

기존 `새 버전` 기능은 삭제하지 않습니다.

Settings 하단에 **full-width `업데이트 바로가기`**를 명확하게 유지합니다.

추가로 header의 version label은 보조 shortcut으로 사용할 수 있지만, 큰 업데이트 버튼을 대체하지 않습니다.

업데이트 버튼은 overflow menu 안에 숨기지 않습니다.

---

# 15. Toast / Error / Progress

성공/실패 feedback은 한 owner에서 표시합니다.

위치:

- sheet 닫힘: Instagram bottom navigation/배너 위
- sheet 열림: sheet 상단 또는 sheet 내부 하단과 충돌하지 않는 위치

규칙:

- 지정폴더 실패를 성공처럼 표시하지 않음
- silent fallback 금지
- Carousel batch는 `3/8 저장 중` 같은 진행상태를 향후 지원
- 같은 toast를 짧은 시간에 중복 생성하지 않음

---

# 16. 모바일 터치/가독성 규칙

- 주요 action 터치 target: 약 `44px` 권장
- Grid overlay처럼 공간이 극도로 작은 곳만 예외
- 9px 이하 텍스트를 핵심 정보에 사용하지 않음
- 긴 버튼 label은 두 줄보다 의미를 짧게 정리
- body text는 충분한 line-height 확보
- 스크롤 영역 안에 또 작은 nested scroll을 남발하지 않음
- 좌우 swipe를 Instagram navigation과 충돌하는 핵심 동작으로 사용하지 않음
- hover에 의존하지 않음
- color만으로 상태를 구분하지 않음

---

# 17. 현재 v3.2.3과 Target 비교

| 항목 | v3.2.3 source 현재 | Target |
|---|---|---|
| Global RI | v3.1.6 SVG + 34px legacy-style visual + 44px touch target, 실기기 미확인 | 기존 Reel RI visual identity + 한 손 조작성 유지 |
| RI 위치 | Layout Manager 변수 연결, blocker heuristic 실기기 미확인 | 실제 nav/banner/right rail 충돌 회피 |
| Panel | 우측 floating 70vw panel | 모바일 bottom Research Sheet |
| Panel 높이 | 단일 max-height | Compact / Expanded 2단계 |
| Tabs | 6탭 | 6탭 유지 |
| Update | panel 공통 하단 큰 버튼 | 큰 버튼 보존, Settings에서 안정적 접근 + version 보조 shortcut |
| Grid | 기존 구조 유지 | 그대로 Frozen |
| Reel overlay | legacy migration 중 | 5개 파생지표 + native UI 비침범 |
| 저장설정 | RI Settings | 유지 |

현재 launcher source 복원은 완료했지만 Android Edge 실제 시각/충돌 검증 전입니다. 현재 floating panel은 최종 디자인으로 간주하지 않습니다.

---

# 18. UI 코드 구조 계획

파일을 한꺼번에 늘리지 않습니다.

실제 독립 책임이 생기는 순서대로:

```text
ui/
├ ri-panel.js          # launcher + sheet lifecycle / tabs (초기)
├ ri-summary.js        # summary presentation
├ ri-primitives.js     # section/row/empty/action 공용 primitive
├ layout.js            # safe-area/native collision 계산
├ grid.js              # Grid quick media intent
├ reel.js              # Reel overlay migration 시 생성
├ toast.js
└ styles.js
```

`ri-panel.js`가 다시 커질 때만 다음 단계로 분리합니다.

```text
ui/ri/
├ launcher.js
├ sheet.js
└ tabs/...
```

처음부터 탭별 빈 파일을 만들지 않습니다.

---

# 19. UI Upgrade Migration Plan

## UI-0 — Baseline 재설계 — 완료

- 기존 합의/실기기 좋은 점 inventory
- `UI_BASELINE.md` 작성
- Preservation 목록 갱신
- 테스트 승인기준 갱신
- 현재 UI와 target 차이 명시

## UI-1 — Primitive + Layout Foundation — 완료

- `ri-panel.js / ri-summary.js` section/row 중복 제거
- `ri-primitives.js` 도입
- `layout.js` 도입
- safeBottom / launcher anchor / Reel rail collision API
- Workspace State owner 도입

## UI-2 — Global RI Launcher 복원/전역화 — source 완료 / 실기기 승인 대기

- v3.1.6 legacy source 재확인
- 기존 SVG가 이미 동일하다는 사실 확인
- 외곽 visual을 legacy 34px low-opacity circle로 복원
- 실제 touch target 44px 확보
- Layout Manager 위치 적용 유지
- current panel toggle/update/Grid 기능 유지

Replacement / Approval Gate:

```text
source visual 복원
→ Android Edge에서 click/open 동등성 확인
→ 모든 주요 화면 visible launcher 1개 확인
→ nav/banner/right rail overlap 확인
→ 그 다음 UI-D Workspace 교체 진행
```

## UI-3 — Mobile Research Sheet — 다음 구현

- 기존 6탭/summary/media/settings 기능 그대로 이관
- right floating panel → bottom sheet
- Compact / Expanded
- sticky close/tabs
- 업데이트 바로가기 보존
- 기존 panel 기능 inventory 대조 후 교체

## UI-4 — Reel Overlay 통합

- current Reel identity 정확도 개선
- native likes/comments/reposts 연결
- Metrics owner 사용
- 5개 파생지표 overlay
- native rail/caption collision 검증
- legacy Reel metric renderer 제거

## UI-5 — Data tabs 확장

Data Engine migration 이후 순서대로:

- 콘텐츠
- 댓글
- 분석
- media[] 상세

STT/OCR/AI는 데이터 기반이 준비되기 전에 UI만 먼저 크게 만들지 않습니다.

---

# 20. UI Definition of Done

UI step은 아래를 만족해야 완료입니다.

- `GRID_BASELINE.md` 승인 기능 유지
- `PRESERVATION_BASELINE.md` PRESERVE/REPLACE gate 통과
- 화면당 Global RI launcher 1개
- 기존 Reel RI visual identity 유지
- Instagram bottom nav/banner/right rail과 심각한 겹침 없음
- 주요 touch target 모바일 사용 가능
- RI close 항상 접근 가능
- 6개 탭 접근 가능
- 업데이트 바로가기 존재
- Grid card action에 저장설정 없음
- 미확보 데이터 추정 표시 없음
- build/check/unit regression 통과
- Android Edge 실기기 확인 전에는 시각/터치 동작을 Verified로 기록하지 않음

이 기준을 바꾸는 경우 코드보다 이 문서를 먼저 갱신합니다.
