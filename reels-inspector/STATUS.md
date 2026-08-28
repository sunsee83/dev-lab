# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. Grid UI 세부 기준은 `GRID_BASELINE.md`, 실제 코드 분류/의존성/런타임 구조 기준은 `CODE_STRUCTURE.md`, 회귀 기준은 `tests/README.md`를 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.6**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 현재 개발 단계: **v3.2 UI/Foundation 기반 구현 중**
- 현재 사용자-visible 동작: **v3.1.6과 동일하게 유지**

`ri-retry.user.js`는 이제 수작업 원본이 아니라 `src/*`에서 생성되는 **generated deployment artifact**입니다.

## 이번 구조 전환에서 실제 완료된 것

### Phase 1 — Source of Truth 전환 완료

완료 항목:

1. 기존 v3.1.6 실행 원본을 `src/legacy-runtime.js`로 옮김
2. `src/main.js`를 build entry로 생성
3. `package.json` + esbuild 기반 `scripts/build.mjs` 생성
4. `scripts/check.mjs` 생성
5. `.github/workflows/reels-inspector-build.yml` 생성
6. `ri-retry.user.js`를 generated artifact로 전환
7. generated userscript에 직접 수정 금지 header 추가

현재 generated header:

```text
// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Source: reels-inspector/src/*
// Build version: 3.1.6
```

현재 구조:

```text
src/main.js
   ↓ import
src/legacy-runtime.js
   ↓ esbuild
ri-retry.user.js
```

`src/legacy-runtime.js`는 backup 파일이 아닙니다. 현재 검증된 v3.1.6 runtime을 단계적으로 새 owner module로 이동하기 위한 **임시 canonical migration source**입니다.

규칙:

- 신규 기능을 `legacy-runtime.js`에 계속 추가하지 않음
- 기존 기능을 새 owner로 이동하면 legacy의 원래 구현 제거
- root `ri-retry.user.js` 직접 수정 금지
- migration 완료 후 `legacy-runtime.js` 삭제

### Build / Check 자동화 완료

GitHub Actions에서 다음 단계가 실제 실행됩니다.

```text
npm install
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
  ↓
변경된 generated userscript만 자동 commit
```

확인 결과:

- 최초 source-of-truth 전환 workflow: **success**
- v3.2 Foundation owner 추가 후 workflow: **success**
- build 성공
- architecture check 성공
- generated userscript `node --check` 성공

중요: 이는 **build/문법/구조 검사 통과**를 의미합니다. Android Edge 실기기에서 build 전환 후 동작 parity가 확인됐다는 뜻은 아닙니다. 실기기 동작은 별도로 확인해야 합니다.

### Phase 2 — Foundation owner 일부 구현 완료

실제 생성된 owner module:

```text
src/core/app.js
src/core/capability.js
src/store/settings-store.js
src/media/download-manager.js
```

현재 이 네 파일은 **owner API 구현까지 완료했지만 아직 `src/main.js`에서 활성화하지 않았습니다.** 따라서 현재 배포 동작은 legacy runtime과 동일하며, 새 Settings Store/Download Manager가 기존 Grid 저장경로를 아직 바꾸지 않습니다.

이 순서를 지키는 이유는 새 구조를 먼저 검증하고, 기존에 좋아진 Grid/cover/network 동작을 동시에 깨뜨리지 않기 위해서입니다.

## 신규 Foundation의 실제 책임

### `core/app.js`

AppContext와 공용 event/lifecycle 소유자.

공식 event:

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

포함:

- subscribe / unsubscribe
- event emit
- current route reference
- current identity reference
- frame 단위 `scheduleRender()` dedupe
- subsystem/service 연결점

여기에 Instagram parsing, metric 계산, 다운로드 구현을 넣지 않습니다.

### `core/capability.js`

플랫폼명 대신 실제 runtime API로 지원 여부를 판단합니다.

현재 probe:

- directory picker
- save file picker
- File System Access
- IndexedDB
- clipboard
- anchor download

FileSystem handle permission query/request도 이 owner에서 처리합니다.

### `store/settings-store.js`

전역 저장설정의 단일 owner입니다.

현재 상태 모델:

```text
downloadMode: default | directory | prompt
directoryName
directoryHandle
directoryPermission
schemaVersion
```

현재 구현:

- 일반 설정값 localStorage persistence
- directory handle은 가능하면 IndexedDB structured clone
- handle permission 복원/재확인
- 지정 폴더 선택/해제
- subscribe/unsubscribe

영상/사진/Carousel별 저장 위치 state는 만들지 않습니다.

### `media/download-manager.js`

모든 다운로드가 최종적으로 통과할 단일 owner입니다.

입력 개념:

```text
DownloadRequest
- kind
- shortcode
- url
- filename
- mimeHint
- slideIndex
```

출력 개념:

```text
DownloadResult
- ok
- code
- destinationMode
- folderName
- filename
- message
- error
```

현재 구현:

- default Downloads
- designated directory
- prompt/save picker
- single download
- batch download
- filename 정리
- destination resolution
- URL → Blob transport 경계
- directory/file writer
- 구조화된 실패 결과

Carousel `downloadBatch()`는 destination을 한 번만 결정하고 전체 slide에 동일 destination을 사용하도록 설계했습니다.

지정 폴더 저장 실패 시 **자동으로 default Downloads로 조용히 fallback하지 않습니다.**

## 누적 보존 대상

다음은 구조 전환 중에도 유지해야 합니다.

- 숫자 깜빡임 제거
- MutationObserver / History / scroll / media event 기반 갱신
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- 기존 3열 Grid 크기/배치
- 썸네일 위 하단 2줄 정보영역
- 8개 지표 독립 슬롯 구조
- REEL/VIDEO 검증 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram 기본 media-type 아이콘 유지
- 우리 Grid 액션은 카드당 단일 버튼
- 하단 Instagram 배너와 실제 겹치는 카드만 RI 영역 숨김
- `ri311:*` 캐시 유지
- 실제 Video/Reel cover 저장 개선
- Carousel parent slide 구조 지원 및 ZIP 없는 개별 저장 기반

## v3.1.6 실기기에서 확인된 것

확인된 개선:

- Video/Reel `썸네일 다운로드`가 실제 영상 cover로 정상 저장되는 사례 확인
- Grid 숫자 깜빡임 제거 상태 유지
- 사용 환경에서 영상 다운로드 시 폴더 선택이 실제 동작하는 사례 확인

현재 확인된 저장 구조 문제:

1. Grid 카드 팝업에서 폴더를 선택하면 해당 카드 설정처럼 보이지만 실제로는 이후 영상에도 전역 적용됨.
2. 영상은 선택한 폴더에 저장되지만 이미지가 기본 Downloads로 빠지는 사례가 있음.
3. 현재 legacy 저장경로가 미디어 종류별로 동일 manager를 통과하지 않음.
4. 카드별 메뉴에 전역 성격의 저장 위치 설정이 들어가 있어 UI 의미가 맞지 않음.

이 문제는 v3.2에서 새 `Settings Store + Download Manager`를 실제 runtime에 연결하면서 해결합니다.

## 확정된 전체 UI 역할

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

### 전역 RI 버튼

현재 Reel에서 사용하는 RI 도구 버튼을 모든 Instagram 화면의 전역 진입점으로 승격합니다.

대상:

- 프로필
- 검색
- 탐색
- Grid
- Reel
- 일반 Post 상세
- Photo / Video / Carousel

기본 위치는 우측 하단 safe area이며 Instagram 하단 navigation / `앱 사용` 배너와 충돌 시 위로 이동합니다.

### 공용 RI Panel

최종 탭 shell:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

- 현재 콘텐츠가 있으면 해당 콘텐츠 상세 정보 표시
- `설정`은 콘텐츠와 무관한 전역 설정
- Store 변경 시 필요한 값만 live update

## Grid 기준

### 8개 고정 슬롯

1줄:

`조회수 | 좋아요 | 댓글 | 리포스트`

2줄:

`ER | 24h | 계정 대비 | 날짜`

- 각 슬롯은 독립 고정 x 영역
- 다른 숫자 길이에 밀리지 않음
- 값이 없으면 `-`
- PHOTO/CAROUSEL은 `▶-`

### 카드 미디어 메뉴 목표

REEL / VIDEO:
- `영상 다운로드`
- `썸네일 다운로드`
- `링크 복사`

PHOTO:
- `이미지 다운로드`
- `링크 복사`

CAROUSEL:
- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- `링크 복사`

**저장 위치/폴더 설정은 카드 메뉴에서 제거**하고 전역 RI 설정으로 이동합니다.

## 공통 Download Manager 목표 흐름

```text
Grid / RI Panel
      ↓
Media Action
      ↓
Download Manager
      ↓
Settings Store
      ↓
capability / permission
      ↓
transport
      ↓
writer
```

지원 정책:

- 지정 폴더
- 기본 Downloads
- 매번 선택

적용 대상:

- 영상
- 영상 cover/썸네일
- 사진
- 캐러셀 전체 slide
- 향후 STT/OCR export

중요 규칙:

- 저장정책은 미디어 타입별로 갈라지지 않음
- 지정 폴더 실패 시 무단 fallback 금지
- 실패는 구조화된 `DownloadResult`로 UI에 전달
- capability는 플랫폼 문자열이 아니라 API/permission 기반
- Carousel batch는 목적지를 한 번만 결정
- transport 방식이 바뀌어도 Grid/Panel UI는 수정하지 않음

## Carousel 전체 다운로드

ZIP은 기본 방식으로 사용하지 않습니다.

지원 구조:

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

목표:

```text
slide_01 → slide_02 → ... → slide_N
```

을 동일 destination에 개별 파일로 저장합니다.

## 코드 구조 원칙

### Single Owner

```text
route/event/lifecycle      → core/app.js
capability/permission      → core/capability.js
전역 저장설정             → store/settings-store.js
다운로드/목적지/write      → media/download-manager.js
전역 RI UI                → ui/ri-panel.js
공용 CSS                  → ui/styles.js
```

Identity / Extractor / Verified Store / Metrics / Media Resolver / Grid / Reel은 현재 검증된 legacy runtime을 우선 보존하고 회귀검증을 붙여 단계적으로 이동합니다.

### 중복 방지

- 다른 모듈이 같은 책임이 필요하면 새 구현 대신 owner API 사용
- helper는 한 파일 private로 시작
- 두 번째 사용처가 생길 때 owner API 승격 여부 검토
- 복사 후 old/new 구현 동시 유지 금지
- 신규 `src/*`에서 override stack 금지
- 의미 없는 `utils.js`, `helpers.js` 금지

### 파일 크기 기준

```text
0~250줄      정상
250~350줄    책임 혼합 검토
350~500줄    분리 후보
500줄 초과   단일책임 근거 없으면 분리
```

`legacy-runtime.js`만 migration 기간 예외입니다.

### 자동 구조 검사

현재 `scripts/check.mjs`가 실제 검사하는 항목:

- source/script syntax
- 금지 backup/hotfix 계열 파일명
- UI에서 storage/File System API 직접 사용
- UI에서 network/media transport 직접 구현
- metrics에서 DOM 접근
- store → ui import
- 순환 import
- source 파일 350/500줄 기준
- 여러 source에 반복되는 긴 block 후보
- generated warning 존재 여부
- userscript/STATUS version 일치
- runtime `@require` 금지

## v3.2 남은 실행 순서

### Phase 2 계속 — Foundation 연결

1. `ui/styles.js` 구현
2. `ui/ri-panel.js` 구현
3. `src/main.js`에서 AppContext / capability / Settings Store / Download Manager를 실제 생성
4. Settings Store init 후 RI Panel에 주입
5. 아직 legacy runtime과 충돌하지 않도록 adapter 경계 설계

### Phase 3 — 저장경로 실제 통합

6. legacy에서 현재 shortcode/media를 읽기 위한 최소 adapter 공개
7. Grid 카드 저장 메뉴를 새 Download Manager 호출로 전환
8. 카드 메뉴의 폴더 설정 제거
9. video / cover / photo / carousel 모두 동일 manager 사용
10. 이미지 cross-origin transport가 directory 저장에서 실패하는지 실기기 확인
11. 필요할 때만 `media/transport.js`를 분리하고 Tampermonkey privileged transport 여부 검토
12. 지정 폴더 / 기본 Downloads / 매번 선택 실기기 확인
13. Carousel batch 동일 destination 확인

### Phase 4 — 전역 UI

14. 기존 Reel 전용 RI 버튼을 전역 RI 버튼으로 교체
15. 공용 RI Panel shell 연결
16. Grid / Reel / Post 상세에서 중복 RI 버튼이 생기지 않는지 확인
17. safe-area / 하단 배너 겹침 확인

### Phase 5 — Data engine migration

18. Identity
19. Extractor
20. Verified Store
21. Metrics
22. Media Resolver
23. Grid/Reel UI

순으로 하나씩 이동합니다.

한 단계가 회귀/실기기 확인되기 전에 다음 위험 계층을 동시에 대규모 이동하지 않습니다.

### Phase 6 — Legacy 제거

- legacy 구현이 새 owner로 모두 이동된 뒤 `src/legacy-runtime.js` 삭제
- migration adapter 제거
- `src/*`만 최종 개발 구조로 유지

## v3.3 이후

### v3.3 Content Types

- Reel
- Feed Video
- Photo
- Carousel + slide media
- Caption
- Hashtags
- Mentions
- collaborators/location
- 공통 `media[]`

### v3.4 Research Detail UI

- 요약/콘텐츠/미디어 실제 데이터 연결
- 콘텐츠 타입별 UI
- 상태표시

### v3.5 Comments

- 댓글/답글
- thread 보존
- low-value filter
- Research Score
- 참고 댓글 UI

### 이후

- v3.6 Research Features
- v4.x Analysis Server / STT / OCR / Alignment / AI
- v5.0 MV3 Extension

## 작업 규칙

- 기존 설계를 먼저 읽고 새 요구사항을 현재 구조에 통합한다.
- 바뀐 설계를 반영한다고 관련 없는 기존 설계를 삭제하지 않는다.
- 실기기에서 좋아졌다고 확인된 동작은 누적 보존한다.
- Grid Frozen UI를 관련 없는 기능 수정 때문에 되돌리지 않는다.
- 카드별 메뉴에 전역 설정을 반복 배치하지 않는다.
- 저장정책은 미디어 종류별로 분기하지 않고 공통 manager에서 처리한다.
- 실제 코드 ownership/API/event/migration 규칙은 `CODE_STRUCTURE.md`를 따른다.
- 테스트 fixture는 인증정보와 개인 raw dump를 제거한 sanitized data만 사용한다.
- 검증되지 않은 값을 만들지 않는다.
- hotfix `@require` 체인은 다시 만들지 않는다.
- 새 `src/*`에 override layer를 누적하지 않는다.
- 구조/UI/우선순위/파일 책임이 바뀌면 `PROJECT_PLAN.md`, `CODE_STRUCTURE.md`와 관련 문서를 코드보다 먼저 또는 같은 작업에서 갱신한다.
