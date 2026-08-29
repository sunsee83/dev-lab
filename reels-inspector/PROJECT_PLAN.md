# Instagram Content Research Tool — 개발 기준 문서

> 이 문서는 제품 목표와 장기 구조의 **상위 기준 문서**입니다.  
> 기능을 수정하거나 추가하기 전에 `STATUS.md`, `WORK_TRACK.md`, `CODE_STRUCTURE.md`, 관련 baseline과 현재 실행 소스를 함께 확인합니다.  
> 요구사항·구조·UI·우선순위가 바뀌면 기존 결정의 목적을 먼저 검토하고 **유지 / 수정 / 추가**를 구분해 통합합니다. 기존 좋은 결정을 이유 없이 삭제하거나 과거 상태로 되돌리지 않습니다.

## 0. 현재 상태

- 실행 환경: **Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹**
- 배포 파일: `ri-retry.user.js`
- 현재 배포 버전: **v3.2.5**
- 개발 원본: **`src/*`**
- 배포 방식: 단일 self-contained userscript
- runtime `@require` hotfix chain 없음
- 현재 단계: **v3.2 Active Reel Context + staged Metrics Overlay + Data migration 준비**
- Grid는 **Frozen UI + 누적 개선 원칙** 적용

현재 UI 관련 기준 문서:

```text
PROJECT_PLAN.md          = 제품/데이터/장기 기능
UI_BASELINE.md           = 사용자가 보게 되는 모바일 UI 기준
UI_ARCHITECTURE.md       = UI 계층/상태/컴포넌트/데이터 흐름
GRID_BASELINE.md         = Grid Frozen UI
PRESERVATION_BASELINE.md = 기존 기능/외형 보존·교체 gate
CODE_STRUCTURE.md        = 실제 파일/owner/dependency
STATUS.md                = 현재 구현/검증/미해결
WORK_TRACK.md            = 지금 구현할 순서
```

### 현재 v3.2 구현 상태

완료/활성:

- `src/version.js` → VERSION / UPDATE_URL 단일 owner
- AppContext / SPA route tracking
- capability detection
- Settings Store
- common Download Manager
- clipboard owner
- media resolver / filename owner
- legacy read adapter + store fingerprint live binding
- Metrics Engine owner
- RI Summary의 ER / 24h / 계정 대비
- Global RI entry point / CONTENT 6-tab IA
- Grid media action migration
- 업데이트 바로가기 복구 + preservation gate
- `UI_BASELINE.md` / `UI_ARCHITECTURE.md`
- UI 공용 primitive owner
- Workspace state owner
- Layout Manager foundation
- v3.1 RI launcher visual restoration source
- Contextual bottom Research Workspace source
- CONTENT / GLOBAL presentation split
- Activity Store / Activity Indicator
- Carousel batch progress
- persistent actionable download error → Settings 연결
- RI Settings presentation owner 분리
- active Reel Context migration adapter
- same-URL shared SPA activity identity refresh
- exact media URL Store bridge
- staged Reel Metrics Overlay source + shared metric formatter

아직 migration/실기기 검증 필요:

- Global RI launcher actual Android Edge 위치/충돌
- Contextual Research Workspace actual mobile usability
- Activity global/Workspace feedback actual visibility/touch flow
- active Reel identity/native metrics 실제 정확도
- staged Reel Overlay device comparison 및 replacement activation
- Identity / Extractor / Verified Store / common `media[]`
- photo/cover 지정폴더 cross-origin 저장 실기기 결과
- Carousel batch 실제 destination/progress 결과

**중요:** 새 Reel Overlay는 source/test만 준비하고 아직 runtime visual로 활성화하지 않습니다. 기존 Reel overlay는 Android Edge replacement 확인 전 숨기거나 삭제하지 않습니다.

### 이미 확보한 v3.1 개선사항 — 계속 보존

- 900ms 전체 polling 제거, event/Observer 기반 refresh
- 동일 shortcode pending request dedupe
- renderKey 기반 같은 값 DOM 재작성 방지
- React DOM 재사용 시 shortcode 재검증
- Verified Store source/confidence/status/conflict 보호
- PHOTO / VIDEO / CAROUSEL / REEL 구분
- Grid 숫자 깜빡임 제거
- Grid 3열 + 8개 고정 슬롯
- Photo/Carousel 잘못된 views 차단
- Instagram native media-type icon 유지
- 카드당 커스텀 media action 1개
- Video/Reel 실제 cover 우선
- music/audio/album/avatar artwork 제외
- Carousel parent slide + ZIP 없는 개별 batch 저장
- `ri311:*` cache/history migration 완료 전 보존
- RI 업데이트 바로가기
- 기존 Reel overlay의 가벼운 visual과 native Instagram action 보존

---

# 1. 제품 정의

이 프로젝트는 Reel Downloader나 단순 IG Sorter가 아닙니다.

**Instagram의 Reel·피드 동영상·사진·캐러셀·캡션·태그·댓글·성과 데이터를 수집하고, 좋은 콘텐츠를 발견하고, 원본과 대본을 확보하며, 댓글의 소비자 니즈와 Hook/CTA까지 분석하는 콘텐츠 리서치 시스템**을 목표로 합니다.

핵심 사용자 흐름:

```text
발굴
→ 콘텐츠 확인
→ 상세 조사
→ 원본 확보
→ 분석
→ 참고 소재 저장
```

지원 대상:

- Reel
- Feed Video
- Photo
- Carousel / 카드뉴스
- Caption
- Hashtags / Mentions
- Comments / Replies
- Profile / Account 단위 성과 비교
- Media download
- 향후 STT / OCR / AI 분석
- 향후 콘텐츠 소재 저장 / Library

---

# 2. 전체 시스템 구조

최종 구조는 3계층으로 둡니다.

```text
Instagram
   ↓
브라우저 클라이언트
   ↓
분석 서버
   ↓
STT / OCR / AI 파이프라인
```

## 2.1 브라우저 클라이언트

담당:

- 현재 콘텐츠 식별
- Reel/Video/Photo/Carousel 구분
- 공개 지표 수집
- 캡션/태그/멘션 수집
- 댓글/답글 수집
- 미디어 주소 확보
- Grid 비교 UI
- Reel 핵심지표 표시
- Global RI / Research Workspace
- 공용 설정
- 공통 Download Manager
- 공통 Activity/Feedback lifecycle
- 정렬/필터
- 로컬 snapshot/history
- 분석 서버 요청/결과 표시

## 2.2 분석 서버

담당:

- 미디어 수신 / 작업 관리
- FFmpeg
- 오디오 추출
- STT
- frame 추출
- OCR
- OCR 중복 병합
- STT/OCR 시간축 정렬
- 댓글 대량 전처리

비동기 Job:

```text
POST /analysis → jobId
GET /analysis/{jobId} → queued / processing / completed / failed
```

Instagram 로그인 cookie를 분석 서버에 보내는 구조를 기본으로 사용하지 않습니다.

## 2.3 AI

AI에 원본 영상 전체를 기본 입력으로 보내지 않습니다.

입력:

- STT + timestamp
- OCR + timestamp + 좌표
- deterministic matching 결과
- 중요 frame
- 선별 댓글

출력:

- 교정 대본
- 실제 발화
- 화면 자막
- Hook / 고정 제목
- CTA
- 강조어
- 숫자/금액
- 콘텐츠 구조
- 댓글 니즈/질문/불만/후기/아이디어

---

# 3. 브라우저 데이터 흐름 — 절대 규칙

```text
Instagram
   ↓
Identity
   ↓
Extractor
   ↓
Normalizer
   ↓
Verified Store
   ↓
Metrics Engine
   ↓
Research Read Model
   ↓
UI / Download Manager / Analysis Request
```

현재 migration 중에는 `legacy-store-adapter.js`가 Read Model 이전의 임시 read boundary 역할을 합니다. Active Reel에는 `reel-context-adapter.js`가 **current video/scope/native metric evidence만** 제공하는 임시 boundary로 추가됐습니다.

규칙:

1. UI마다 Instagram DOM을 제각각 읽지 않음
2. Instagram 읽기는 Identity/Extractor owner로 이동
3. Grid / Reel / RI / Media Action은 같은 Store를 공유
4. 충분히 식별되지 않은 콘텐츠끼리 값 병합 금지
5. missing을 추측하거나 `0`으로 만들지 않음
6. 같은 값이면 DOM 재작성 금지
7. 동일 shortcode 중복 fetch 금지
8. 새 override/hotfix chain 금지
9. 저장 위치 정책은 common Download Manager 사용
10. 지정폴더 실패 시 silent fallback 금지
11. UI는 storage/network/metric formula를 직접 소유하지 않음
12. 장기적으로 UI는 parser 대신 `ResearchReadModel`만 읽음
13. async progress/error를 각 UI가 별도 boolean/toast state로 복제하지 않고 Activity owner를 사용
14. Reel identity는 owner/likes/comments 유사값으로 fuzzy 선택하지 않고 scoped link / exact media mapping / exact route evidence 순으로 판단
15. same-URL Reel 이동은 기존 shared SPA observer activity를 재사용하며 second full DOM observer를 만들지 않음

---

# 4. Content Identity

```text
ContentIdentity
- shortcode
- mediaId / pk
- ownerId
- username
- mediaType
- productType
- canonicalUrl
- parentMediaId
- childMediaId
- slideIndex
```

표준 mediaType:

- `REEL`
- `VIDEO`
- `PHOTO`
- `CAROUSEL`

URL `/reel/`, `/p/`는 보조 근거이며 최종 mediaType 자체가 아닙니다.

상태:

- `DETECTED`
- `IDENTIFYING`
- `IDENTIFIED`
- `DATA_LOADING`
- `READY`
- `FAILED`

검증되지 않은 값을 READY 확정값처럼 표시하지 않습니다.

---

# 5. Verified Store

필드마다 provenance를 가집니다.

```text
views:
  value: 511000
  source: network
  confidence: high
  status: verified
  updatedAt: ...
```

status:

- `unknown`
- `loading`
- `verified`
- `unavailable`
- `conflict`

source:

- `network`
- `dom`
- `permalink`
- `embedded_json`
- `derived`

낮은 신뢰도의 새 값이 높은 신뢰도의 검증값을 무조건 덮어쓰지 못합니다.

UI 상태:

- Grid: 마지막 검증값 또는 `-`
- 상세 Workspace: `확인 중 / — / 사용 불가 / 검증 중` 구분

---

# 6. 공통 Post 모델

```text
Post
├ identity
│  ├ shortcode
│  ├ mediaId
│  ├ mediaType
│  ├ ownerId
│  └ username
├ content
│  ├ caption
│  ├ hashtags[]
│  ├ mentions[]
│  ├ collaborators[]
│  └ location
├ metrics
│  ├ views
│  ├ likes
│  ├ comments
│  ├ reposts
│  └ publishedAt
├ media[]
│  ├ mediaId
│  ├ type
│  ├ url
│  ├ thumbnail
│  ├ width
│  ├ height
│  ├ duration
│  ├ slideIndex
│  └ resolvedAt
└ analysis
   ├ er
   ├ growth24h
   ├ outlier
   └ rank
```

CDN URL은 영구 ID가 아닙니다.

- 영구 식별: `mediaId`, `shortcode`
- 임시 접근: `videoUrl`, `imageUrl`, `thumbnail`
- URL 확보시각: `resolvedAt`

Carousel은 최종적으로 임시 `carouselImages`가 아니라 공통 `media[]` slide 구조로 통합합니다.

---

# 7. 지표 정의

## ER

```text
(좋아요 + 댓글 + 리포스트) / 조회수 × 100
```

- 가중 ER 사용 안 함
- views/likes/comments/reposts가 실제 값일 때 계산
- Photo/Carousel에 조회수 기반 ER을 억지로 만들지 않음

## 24h 증가율

- 현재 views와 실제 snapshot 비교
- 허용 범위 약 18~32시간
- 24시간에 가장 가까운 snapshot
- snapshot 없으면 숫자를 만들지 않음

## 계정 대비 Outlier

- 동일 계정 최근 약 20개
- 현재 콘텐츠 제외
- 최소 비교 5개
- views 중앙값 대비 배수

## 만들지 않는 비공개 지표

- saves
- reach
- impressions
- average watch time
- completion/dropoff
- profile visits
- follow conversion

공개/확보되지 않은 값은 추정하지 않습니다.

---

# 8. UI 역할과 계층

사용자 역할은 고정합니다.

```text
Grid              = 빠른 비교 / 발굴
Grid media action = 현재 카드 빠른 저장
Reel Overlay      = 시청 중 핵심 파생지표
Global RI         = 전체 리서치 진입
Research Workspace= 상세 조사 / 미디어 / 설정
```

UI 계층:

```text
L0 Instagram Native
L1 Ambient Intelligence  → Grid 8-slot / Reel overlay
L2 Intent Entry          → Grid media action / Global RI
L3 Research Workspace    → 상세 조사
L4 Feedback & Activity   → toast/progress/error/job state
```

세부 시각/조작 기준은 `UI_BASELINE.md`, 상태·컴포넌트 구조는 `UI_ARCHITECTURE.md`를 따릅니다.

---

# 9. Grid Frozen UI

세부 기준은 `GRID_BASELINE.md`가 owner입니다.

## 9.1 3열 + 하단 2줄

- Instagram 원래 3열 폭/높이 유지
- 카드 밖 흰색/회색 정보바 금지
- 이미지 위 하단 정보영역
- no-flicker / renderKey 유지

## 9.2 8개 고정 슬롯

1줄:

```text
조회수 | 좋아요 | 댓글 | 리포스트
```

영역:

- views `0~32%`
- likes `32~59%`
- comments `59~79%`
- reposts `79~100%`

2줄:

```text
ER | 24h | 계정 대비 | 게시일
```

영역:

- ER `0~26%`
- 24h `26~51%`
- account `51~75%`
- date `75~100%`

- missing이면 슬롯 삭제가 아니라 `-`
- REEL/VIDEO 검증 views만 숫자
- PHOTO/CAROUSEL `▶-`
- 각 슬롯 독립 가운데 정렬
- tabular numeric

## 9.3 Grid action

카드당 우리 버튼 **1개**.

Instagram native media-type icon은 유지하고 우리 play/type icon은 만들지 않습니다.

REEL / VIDEO:

- 영상 다운로드
- 썸네일 다운로드
- 링크 복사

PHOTO:

- 이미지 다운로드
- 링크 복사

CAROUSEL:

- 전체 이미지 다운로드 (N)
- 대표 이미지 다운로드
- 링크 복사

폴더/저장정책은 카드 메뉴에 두지 않습니다.

---

# 10. Video/Reel Cover Identity

우선순위:

1. 현재 shortcode와 직접 연결된 media object cover
2. `image_versions2.candidates / display_resources / display_url / thumbnail_src`
3. 현재 Grid 카드와 넓게 겹치는 큰 본문 image
4. 큰 `srcset` 후보
5. 마지막에 검증된 legacy thumbnail fallback

제외:

- music/audio artwork
- album cover
- avatar/profile image
- 다른 nested shortcode image

해상도보다 **현재 콘텐츠 identity와 cover 일치**가 먼저입니다.

---

# 11. Carousel 미디어

지원 parent 구조:

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

규칙:

- parent shortcode 기준
- slide 순서 유지
- 각 slide의 가장 큰 원본 candidate
- 다른 shortcode/nested media 혼입 금지
- URL dedupe
- 목록 미확보 시 `전체 이미지 준비중`
- ZIP 기본 방식 사용 안 함

파일명:

```text
Instagram_<shortcode>_slide_01.*
Instagram_<shortcode>_slide_02.*
...
```

Carousel video child도 최종 `media[]`에서 별도 video media로 처리합니다.

---

# 12. Global RI Launcher

기존 Reel에서 사용하던 RI 리서치 도구의 **visual identity를 전역 Launcher로 승격**합니다.

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

규칙:

- 화면당 1개
- 시각 약 32~36px
- 실제 touch target 약 44×44px
- 우측 하단 thumb zone
- safe-area / bottom nav / app banner / Reel right rail 충돌 시 Layout Manager가 이동
- 현재 source는 34px low-opacity circle + 44px touch target으로 기존 RI visual identity를 복원
- Android Edge actual parity는 실기기 확인 전

Grid media action과 역할을 분리합니다.

---

# 13. Contextual Research Workspace

Global RI를 누르면 공용 Workspace를 엽니다.

상태:

```text
CLOSED
→ COMPACT  약 48~56vh
→ EXPANDED 약 78~84vh
```

- Compact: Instagram을 보면서 요약/미디어/설정 빠르게 사용
- Expanded: Caption/댓글/분석 등 긴 자료
- close 항상 접근 가능
- drag는 보조, 명시적 expand/collapse control 제공
- browser Back/history 임의 가로채기 금지
- header/tab/footer는 body scroll과 분리

## 13.1 CONTENT context

현재 콘텐츠가 식별된 경우:

```text
요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
```

6탭 구조를 유지합니다.

## 13.2 GLOBAL context

현재 콘텐츠 identity가 없는 Profile/Search/Explore 상태에서는 빈 6탭을 억지로 보여주지 않고 가벼운 `RI Home`을 사용합니다.

초기:

- 현재 콘텐츠 없음 안내
- 전역 설정
- 업데이트 바로가기

향후 account model이 준비되면 `ACCOUNT` context 추가를 검토합니다. 데이터 모델 없이 UI만 먼저 만들지 않습니다.

## 13.3 Route / Identity policy

route/identity가 바뀌면:

1. 이전 content view 즉시 invalidation
2. header를 새 identity 또는 `확인 중`으로 전환
3. detent는 유지
4. CONTENT→CONTENT에서 가능한 탭 유지
5. body scroll reset
6. CONTENT→GLOBAL이면 RI Home
7. active view만 새 데이터로 render

이전 shortcode의 지표/미디어/댓글을 새 shortcode와 혼합하지 않습니다.

---

# 14. Reel 화면 UI

Instagram native likes/comments/reposts/share를 제거하거나 중복하지 않습니다.

추가 overlay target:

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

규칙:

- box/blur 없음
- 작은 white/gray text + shadow
- missing line 숨김
- caption / native right rail 비침범
- 기존 안정적 위치를 시작점으로 사용
- Layout Manager가 collision 시 lane 조정
- 일반 Post 상세에서 immersive Reel overlay는 필수 아님

현재 UI-F source는 `reel-context-adapter.js → metrics/metrics.js → ui/metric-format.js → ui/reel-overlay.js` 경로를 준비했습니다.

Replacement gate:

```text
새 source/test
→ Android Edge current Reel identity/native metric 비교
→ 새 overlay placement 비교
→ 새 overlay runtime mount
→ 그 다음 legacy overlay hide/remove
```

따라서 현재 단계에서는 기존 `#ri3-reels-overlay`를 먼저 숨기거나 삭제하지 않습니다.

---

# 15. 공통 Download Manager / Activity

```text
Grid / Workspace
      ↓
Media Action
      ↓
Download Manager
      ├ Destination Policy
      └ Activity Event
             ↓
        Activity Store
             ↓
      Indicator / Toast
```

모든 media에 같은 전역 정책:

- video
- cover/thumbnail
- photo
- carousel slide
- 향후 STT/OCR export

## 지정 폴더

- browser directory handle이 있을 때만
- handle metadata는 가능하면 IndexedDB 보존
- permission 재확인
- 실패 시 silent fallback 금지

## 기본 Downloads

- browser/OS 기본 위치
- 임의 로컬 폴더 생성 강제 금지

## 매번 선택

- 지원 capability가 있을 때만
- Carousel batch는 destination 1회 선택 후 전체 사용

## Activity

공통 상태:

```text
running | success | error
progress { current, total }
persistent
action/actionLabel
```

- Carousel `1/N ... N/N 저장 중`
- success/non-actionable error는 transient toast
- 같은 toast 단시간 중복 억제
- directory/permission/picker 계열 사용자가 조치할 오류는 persistent
- `설정 열기` action으로 RI Settings 연결
- Workspace open 시 같은 Activity view를 Workspace host로 이동
- launcher badge는 근거가 있을 때만 추가
- 향후 STT/OCR/AI job도 같은 Activity model 재사용

플랫폼명으로 기능을 하드코딩하지 않고 runtime API/permission으로 판단합니다.

photo/cover cross-origin 문제가 실기기에서 확인될 때만 `media/transport.js` 또는 Tampermonkey privileged transport를 검토합니다. 확인 전 `@grant`를 선제 변경하지 않습니다.

---

# 16. 댓글 수집 / Research Score

```text
Instagram 댓글
→ thread 보존 수집
→ dedupe
→ 저가치 필터
→ Research Score
→ 상위 후보
→ AI 분류
```

Comment:

```text
id / postId / parentId / author / text
likes / replyCount / createdAt / flags
research.score / category / reason
```

낮은 가치:

- emoji only
- 단순 반응
- mention only
- duplicate/copypaste
- spam/ads

높은 가치:

- 질문
- 상세 경험
- 구매 의도
- 제품/가격/장소
- 불만/문제점
- 반론/대안
- practical tip
- highly liked/replied
- 반복되는 need/question
- 콘텐츠 아이디어

AI category:

- question
- purchase intent
- positive review
- negative review
- complaint/problem
- counterargument
- tip
- additional info
- content idea

원댓글과 reply thread 관계를 보존합니다.

---

# 17. STT / OCR / AI

## STT

- timestamp transcript
- 가능하면 word-level timestamp

## OCR

전체 frame 대상:

```text
text
start / end
x / y / width / height
confidence
```

중복 병합:

- string similarity
- position similarity
- time continuity

저밀도 frame scan → 변화구간 고밀도 분석으로 발전시킵니다.

## Alignment

AI 전에 deterministic matching:

- time overlap
- string similarity
- confidence

AI는 최종 교정/의미 분류를 담당합니다. 발화 transcript와 화면에만 있는 Hook/fixed title을 구분합니다.

---

# 18. 소스 / UI 구조

Source of Truth:

```text
src/*
  ↓ test/build/check
ri-retry.user.js
```

- generated userscript 직접 수정 금지
- Tampermonkey에는 하나의 userscript만 설치
- `legacy-runtime.js`는 migration runtime이며 backup 파일이 아님
- 새 기능을 legacy에 추가하지 않음
- 새 owner로 이동한 책임은 검증 후 legacy 구현 제거

현재 UI/Foundation의 실제 owner:

```text
core/
└ activity.js

migration/
├ legacy-store-adapter.js
└ reel-context-adapter.js

ui/
├ activity-indicator.js
├ grid.js
├ layout.js
├ metric-format.js
├ reel-overlay.js          # staged; replacement gate 전 runtime mount 안 함
├ workspace-state.js
├ research-workspace.js
├ ri-primitives.js
├ ri-panel.js
├ ri-settings.js
├ ri-summary.js
├ toast.js
└ styles.js
```

빈 tab 파일/placeholder를 미리 만들지 않습니다. 실제 책임이 커질 때만 분리합니다.

## UI Read Model 목표

```text
ResearchReadModel
- getContext()
- getSummary(identity)
- getMedia(identity)
- getCapabilities(identity)
- subscribe(listener)
```

구현 파일은 Data Engine migration에서 실제 필요가 생길 때 생성합니다.

---

# 19. 버전별 로드맵

## v3.1 — Core/Grid Stabilization

누적 보존:

- ContentIdentity
- mediaType
- Verified Store
- pending dedupe
- renderKey
- React DOM identity
- event/observer refresh
- Grid 8 fixed slots
- cover identity
- Carousel batch

## v3.2 — UI/Foundation

완료/진행:

1. source-of-truth/build gate — 완료
2. capability / Settings Store / Download Manager — 완료
3. Global RI Foundation / CONTENT 6-tab IA — 완료
4. Grid save action → common manager — 활성
5. Metrics Engine + RI Summary — 활성
6. update shortcut preservation — 완료
7. UI baseline/architecture — 완료
8. UI primitive + Workspace State + Layout foundation — source 완료, 실기기 검증 전
9. 기존 Reel RI visual의 Global Launcher — source 완료, 실기기 검증 전
10. Mobile Contextual Workspace — source 완료, 실기기 검증 전
11. Feedback / Activity — source 완료, 실기기 검증 전
12. Active Reel identity/native metric migration boundary — source 완료, 실기기 검증 전
13. Metrics Overlay replacement source — 준비 완료, runtime activation은 device gate 대기
14. Data Engine migration — 다음 코드 단계

## v3.3 — Content Types

- Reel / Feed Video / Photo / Carousel
- Caption / Hashtags / Mentions
- collaborators/location
- common `media[]`

## v3.4 — Research Detail UI

- 요약/콘텐츠/미디어 실제 데이터
- 상세 상태
- 콘텐츠 타입별 표현
- download/copy 완성

## v3.5 — Comments

- 댓글/답글
- thread
- dedupe/low-value filter
- Research Score
- 참고 댓글 UI

## v3.6 — Research Features

- views/ER/24h/outlier/latest
- load 범위
- 소재 저장
- tag/memo
- 계정 최근 콘텐츠 비교

## v4.0 — Analysis Server

- Python + FastAPI
- media upload/stream
- async jobs

## v4.1 — STT

- timestamp transcript

## v4.2 — OCR

- full-screen OCR / coordinates/time / merge

## v4.3 — Alignment

- deterministic STT/OCR matching

## v4.4 — AI Research

- corrected transcript
- Hook / CTA / emphasis / structure
- comments needs/ideas

## v5.0 — MV3 Extension

Tampermonkey에서 검증한 엔진을 정식 확장프로그램 구조로 이식합니다.

---

# 20. 설계 변경 관리 원칙

1. 기존 `PROJECT_PLAN.md`, `STATUS.md`, `WORK_TRACK.md`, `CODE_STRUCTURE.md`, 관련 baseline/test를 먼저 읽음
2. 새 요구가 제품 목표/데이터/UI 역할과 충돌하는지 확인
3. 기존 설계를 통째로 삭제하거나 과거 버전으로 rollback하지 않음
4. 유지 / 수정 / 추가를 분류해 현재 구조에 통합
5. UI 교체는 `PRESERVE / REPLACE / REMOVE-APPROVED` 결정 후 진행
6. REPLACE는 새 접근경로가 준비되기 전 기존 component를 먼저 숨기지 않음
7. REPLACE visual은 자동검증만으로 old visual을 선제 hide하지 않고, 필요한 실기기 확인을 통과한 뒤 전환
8. 구조/UI/우선순위/owner가 바뀌면 코드보다 문서를 먼저 또는 같은 작업에서 갱신
9. 실기기에서 좋아졌다고 확인된 동작은 누적 보존
10. 실기기 미확인 항목을 Verified라고 기록하지 않음
11. 현재 실행순서는 `WORK_TRACK.md`가 소유

---

# 21. 개발 중 금지사항

- 검증되지 않은 지표를 임의 숫자로 표시
- 공개되지 않은 지표 추정
- Reel native action 삭제/중복
- active Reel shortcode를 owner/metric similarity로 fuzzy 결정
- 관련 없는 작업으로 Grid Frozen UI 재설계
- Grid 카드 메뉴에 전역 설정 반복
- media별 서로 다른 저장 위치 정책
- 지정폴더 실패 silent fallback
- 새 hotfix `@require` chain
- `old/backup/final2/hotfix/copy` 소스
- UI별 별도 Instagram parser
- same-URL Reel 대응을 위해 second full DOM observer 추가
- 서버에 Instagram login cookie 기본 전송
- deterministic extraction보다 AI를 먼저 사용
- 기존 사용자 기능 inventory 없이 component 삭제/숨김
- current UI mismatch를 문서 없이 임의 디자인으로 교체

---

# 22. 작업 절차

작업 시작 전:

1. `PROJECT_PLAN.md`
2. `STATUS.md`
3. `WORK_TRACK.md`
4. `CODE_STRUCTURE.md`
5. 관련 `GRID_BASELINE.md / UI_BASELINE.md / UI_ARCHITECTURE.md / PRESERVATION_BASELINE.md`
6. tests와 현재 source

그 다음:

```text
기존 기능/외형 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ owner / data-flow 확인
→ 관련 문서 갱신
→ 코드 수정
→ unit/regression
→ build/check/node --check
→ 필요 시 version bump
→ generated artifact 검증
→ STATUS / WORK_TRACK 갱신
```

작업 보고에는 반드시 남깁니다.

- 변경 버전 또는 source checkpoint
- 변경 계층
- 변경 기능
- 유지 기능
- 자동 검증 결과
- 실기기 확인 여부
- 알려진 미해결
- 다음 정확한 단계
