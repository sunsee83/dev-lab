# Reels Inspector / Instagram Content Research Tool

Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹에서 Instagram 콘텐츠를 빠르게 발굴·비교·저장·조사하기 위한 프로토타입입니다.

## 기준 문서

개발 전 확인 순서:

1. `PROJECT_PLAN.md` — 제품 목표, 데이터 모델, UI 역할, 로드맵
2. `STATUS.md` — 현재 배포/실기기 상태와 다음 작업
3. `CODE_STRUCTURE.md` — 실제 소스 구조, owner, build/migration 규칙
4. `GRID_BASELINE.md` — Grid Frozen UI 회귀 기준
5. `tests/README.md` — unit/regression/실기기 승인 기준

설계가 바뀌면 기존 결정을 먼저 읽고 유지할 것과 바꿀 것을 구분해 문서와 코드에 통합합니다. 이미 좋아진 동작을 단순히 과거 상태로 되돌리지 않습니다.

## 현재 배포

- 버전: **v3.2.2**
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- root userscript는 generated artifact이며 직접 수정하지 않습니다.
- hotfix `@require` 체인을 사용하지 않습니다.

설치/업데이트:

`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

## 제품 흐름

`발굴 → 콘텐츠 확인 → 상세 조사 → 원본 확보 → 분석 → 참고 소재 저장`

지원/목표 대상:

- Reel / Feed Video / Photo / Carousel
- Caption / Hashtags / Mentions
- Comments / Replies
- 공개 성과 지표와 계정 상대 비교
- 원본 미디어 저장
- 향후 STT / OCR / AI 분석

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
Grid / Reel / RI Panel / Download Manager
```

UI가 별도로 raw Instagram 데이터를 파싱하거나 저장정책·Blob transport·지표공식을 재구현하지 않습니다.

## UI 역할

```text
Grid = 빠른 비교/발굴
Grid 카드 버튼 = 현재 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
RI 설정 = 전역 공용 설정
```

### Grid

- Instagram 3열 Grid 유지
- 하단 2줄 오버레이 유지
- 1줄: 조회수 / 좋아요 / 댓글 / 리포스트
- 2줄: ER / 24h / 계정 대비 / 게시일
- 8개 슬롯 고정
- 값이 없으면 `-`
- Photo/Carousel에 가짜 조회수 표시 금지
- 카드당 커스텀 미디어 버튼 1개
- Instagram native media-type 아이콘 유지

### 전역 RI

하나의 전역 RI 버튼과 공용 패널을 사용합니다.

탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

v3.2.2에서 `요약`은 현재 콘텐츠의 검증값과 Metrics Engine을 연결합니다.

- 조회수 / 좋아요 / 댓글 / 리포스트
- ER
- 실제 snapshot 기반 24h 증가율
- 동일 계정 최근 콘텐츠 중앙값 대비 배수
- 게시일

미확보 값은 숫자를 만들지 않고 `—`로 유지합니다.

## 공통 저장 구조

모든 새 Grid/RI 저장 액션은 `media/download-manager.js` 한 경로를 사용합니다.

```text
Grid / RI Panel
      ↓
Download Manager
      ↓
전역 저장정책
      ↓
지정 폴더 / 기본 Downloads / 매번 선택
```

영상·썸네일·사진·Carousel이 같은 전역 정책을 사용하며, 지정 폴더 저장 실패 시 조용히 기본 Downloads로 fallback하지 않습니다.

## 현재 소스 구조

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
   ├ ri-panel.js
   ├ ri-summary.js
   ├ toast.js
   └ styles.js
```

파일을 많이 만드는 것이 목적이 아닙니다. 실제 독립 책임이나 두 번째 사용처가 생길 때만 분리합니다. v3.2.2에서는 RI summary가 실제 지표 렌더 책임을 갖게 되어 `ri-panel.js`에서 `ri-summary.js`로 분리했습니다.

## build / gate

```text
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
```

- `src/version.js`가 버전 단일 원본
- CI가 generated userscript를 생성/검증 후 main에 반영
- 일반 source 350줄 이상은 책임 분리 검토
- 500줄 초과는 명확한 단일 책임 근거가 없으면 금지
- UI에서 storage/File System/network transport 직접 구현 금지
- 순환 import, backup/hotfix 파일, runtime `@require` 금지

## 현재 단계

**v3.2 UI/Foundation + Download/UI/Data migration 진행 중**

현재 새 owner로 활성화된 영역:

- AppContext / SPA route lifecycle
- capability
- clipboard
- Settings Store
- Download Manager
- migration store boundary
- media resolver / filename
- Metrics Engine
- global RI panel / summary

아직 legacy에 남아 있는 고위험 영역:

- Instagram Identity/Extractor
- Verified merge/conflict engine
- 기존 Grid renderer
- 기존 Reel renderer/native metric parsing

이 영역은 한꺼번에 재작성하지 않고 실기기 회귀를 확인하며 순차 이동합니다.
