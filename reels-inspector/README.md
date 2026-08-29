# Reels Inspector / Instagram Content Research Tool

Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹에서 Instagram 콘텐츠를 빠르게 발굴·비교·저장·조사하기 위한 프로토타입입니다.

## 기준 문서

개발 전 확인 순서:

1. `PROJECT_PLAN.md` — 제품 목표/데이터 모델/로드맵
2. `STATUS.md` — 현재 배포/검증/미해결
3. `WORK_TRACK.md` — 현재 목표/다음 실행순서
4. `CODE_STRUCTURE.md` — 실제 owner/dependency/migration
5. `UI_BASELINE.md` — 모바일 UI visual/interaction 기준
6. `UI_ARCHITECTURE.md` — UI context/state/component/data flow
7. `GRID_BASELINE.md` — Grid Frozen UI
8. `PRESERVATION_BASELINE.md` — PRESERVE/REPLACE/REMOVE gate
9. `tests/README.md` — regression/실기기 승인 기준

설계가 바뀌면 기존 결정을 먼저 읽고 유지/수정/추가를 구분해 문서와 코드에 통합합니다. 승인된 좋은 동작을 구조 전환 때문에 되돌리지 않습니다.

## 현재 배포

- 버전: **v3.2.3**
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- 단일 self-contained userscript
- root userscript는 generated artifact이며 직접 수정하지 않음
- runtime hotfix `@require` 체인 없음

설치/업데이트:

`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

## 제품 흐름

`발굴 → 콘텐츠 확인 → 상세 조사 → 원본 확보 → 분석 → 참고 소재 저장`

지원/목표:

- Reel / Feed Video / Photo / Carousel
- Caption / Hashtags / Mentions
- Comments / Replies
- 공개 성과 지표와 계정 상대 비교
- 원본 미디어 저장
- 향후 STT / OCR / AI 분석
- 향후 소재 Library

## 데이터 흐름

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
Grid / Reel / Research Workspace / Download Manager
```

UI가 raw Instagram parser, 저장정책, Blob transport, metric formula를 제각각 재구현하지 않습니다.

## UI 역할

```text
Grid               = 빠른 비교/발굴
Grid media action  = 현재 카드 빠른 저장
Reel Overlay       = 시청 중 핵심 파생지표
Global RI          = 전체 리서치 진입
Research Workspace = 상세 조사/미디어/설정
```

### Grid — Frozen

- Instagram 3열 유지
- 하단 2줄 / 8 fixed slots
- 1줄: 조회수 / 좋아요 / 댓글 / 리포스트
- 2줄: ER / 24h / 계정 대비 / 게시일
- 값이 없으면 `-`
- Photo/Carousel bogus views 금지
- no-flicker/renderKey 보존
- 카드당 custom media action 1개
- native media-type icon 유지
- Video/Reel actual cover 우선
- music/album/avatar artwork 제외

### Global RI Launcher

v3.1.6 Reel RI visual identity를 전역 launcher 기준으로 사용합니다.

현재 source 기준:

```text
44×44 touch target
└ 34×34 light visual circle
  └ 21×21 original research icon
```

Layout Manager가 launcher anchor를 소유합니다. Android Edge 실제 시각/충돌 parity는 실기기 확인 전입니다.

### Contextual Research Workspace

UI-D source checkpoint에서 기존 우측 작은 panel을 모바일 bottom Research Sheet 구조로 전환했습니다.

State:

```text
CLOSED
→ COMPACT  약 48~56vh
→ EXPANDED 약 78~84vh
```

Context:

```text
CONTENT
→ 요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정

GLOBAL
→ RI Home + 전역 설정 + 업데이트 바로가기
```

구조 원칙:

- 명시적 확장/축소
- 닫기 항상 접근 가능
- CONTENT tab rail 유지
- active body만 render
- route/identity 변경 시 stale context invalidation + scroll reset
- Compact는 배경을 과도하게 막지 않음
- Expanded는 soft scrim 허용
- browser Back/history를 별도 닫기 동작으로 가로채지 않음
- 큰 `업데이트 바로가기` 보존

이 source 구조는 자동검증 대상이지만 Android Edge 시각/터치/Instagram UI 충돌은 실기기 확인 전입니다.

## Metrics

새 Metrics owner는 `src/metrics/metrics.js`입니다.

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32시간 snapshot 중 24시간에 가장 가까운 값 비교
계정 대비 = 동일 account 최근 최대 20개, 최소 5개, views median 대비 배수
```

missing 값을 0으로 가정해 숫자를 만들지 않습니다.

## 공통 저장 구조

```text
Grid / Research Workspace
      ↓
Download Manager
      ↓
global save policy
      ↓
지정 폴더 / 기본 Downloads / 매번 선택
```

- video/cover/photo/carousel 동일 manager
- Carousel ZIP 없이 개별 파일
- batch destination 한 번 선택
- 지정 폴더 실패 시 silent Downloads fallback 금지
- photo/cover CORS가 실기기에서 확인되기 전 privileged Tampermonkey transport를 선제 도입하지 않음

## 현재 source 구조

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

빈 placeholder 파일을 미리 만들지 않습니다.

## Build / Test

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate는 다음을 포함합니다.

- source/generated/doc version alignment
- update URL / 업데이트 바로가기 preservation
- UI storage/network/direct clipboard 금지
- Metrics DOM 독립
- circular dependency
- source size/duplicate warning
- UI baseline/architecture/work-track checkpoint
- runtime `@require` 금지

## 현재 다음 단계

정확한 owner는 `WORK_TRACK.md`입니다.

현재 순서:

```text
UI-D Android Edge validation
→ UI-E Feedback / Activity
→ UI-F Reel identity/native metrics + Metrics Overlay
→ UI-G Data Engine / Research tabs
```

실기기 확인 전 UI 동작을 완료됐다고 기록하지 않습니다.
