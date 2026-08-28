# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. Grid UI 세부 기준은 `GRID_BASELINE.md`, 코드 ownership/build/migration 기준은 `CODE_STRUCTURE.md`, 회귀 기준은 `tests/README.md`를 함께 확인합니다.

## 현재 배포

- 버전: **v3.2.1**
- 실행 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 개발 원본: `src/*`
- 현재 단계: **v3.2 UI/Foundation + Download/UI migration 진행 중**

`ri-retry.user.js`는 generated artifact이며 직접 수정하지 않습니다.

## Source of Truth / Build

```text
src/*
  ↓
esbuild
  ↓
ri-retry.user.js
```

검증 gate:

```text
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
```

버전 단일 원본은 `src/version.js`입니다.

## 현재 runtime 조립

```text
main.js
  ├ version.js
  ├ core/app.js
  ├ core/capability.js
  ├ core/clipboard.js
  ├ store/settings-store.js
  ├ media/media-resolver.js
  ├ media/download-manager.js
  ├ migration/legacy-store-adapter.js
  ├ ui/grid.js
  ├ ui/ri-panel.js
  ├ ui/toast.js
  ├ ui/styles.js
  └ legacy-runtime.js
```

`legacy-runtime.js`는 backup이 아니라 migration 동안만 유지하는 기존 검증 runtime입니다. 신규 제품 기능은 새 owner module에서 구현합니다.

---

# v3.2.0에서 활성화된 구조 — 계속 유지

## 전역 RI 버튼

기존 Reel 전용 RI 버튼은 사용자에게 중복 표시되지 않게 숨기고, 같은 연구 아이콘의 전역 RI 버튼 1개를 사용합니다.

대상:

- 프로필
- 검색/탐색
- Grid
- Reel
- 일반 Post 상세
- Photo / Video / Carousel 상세

## 공용 RI Panel

탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

현재 연결:

- `요약`: 현재 shortcode와 legacy Verified cache snapshot
- `미디어`: 공통 Download Manager
- `설정`: 공용 Settings Store
- `콘텐츠 / 댓글 / 분석`: shell, 이후 data engine migration에서 연결

## Grid 저장 메뉴

기존 카드당 단일 미디어 버튼은 유지하고 새 action layer가 click intent를 처리합니다.

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

저장 위치 설정은 Grid 카드 메뉴에 두지 않습니다.

## 공통 저장정책

모든 새 Grid/RI 미디어 액션은 `media/download-manager.js`를 통과합니다.

- `default` = 기본 Downloads
- `directory` = 지정 폴더
- `prompt` = 매번 선택

규칙:

- video / cover / photo / carousel 동일 저장정책
- 지정 폴더 실패 시 default Downloads로 조용히 fallback하지 않음
- 실패는 `DownloadResult`로 UI에 전달
- Carousel batch는 destination을 한 번만 결정
- 플랫폼 문자열이 아니라 실제 API/permission 기준

---

# v3.2.1 실제 변경

이번 단계는 새 기능을 넓히기보다 **SPA context 안정화 + 중복 코드 제거**에 집중했습니다.

## 1. SPA route/current identity tracking을 AppContext로 통합

`core/app.js`에 `startRouteTracking()`을 추가했습니다.

동작:

- `popstate / hashchange / pageshow` 감지
- Instagram DOM mutation은 URL 변경 확인 trigger로만 사용
- URL이 실제 변경됐을 때만 route/identity 갱신
- history API에 새 override layer를 추가하지 않음
- cleanup 시 observer/listener 제거

목적:

- Reel/Post 상세에서 다음 콘텐츠로 SPA 이동했는데 RI Panel이 이전 shortcode를 계속 보여주는 문제 방지
- route/lifecycle 책임을 UI마다 복제하지 않음

## 2. 열린 RI Panel이 route/identity event를 구독

`ui/ri-panel.js`가 `route:changed`, `identity:changed`를 구독합니다.

- 패널이 열린 상태에서 콘텐츠가 바뀌면 다음 animation frame에 context를 다시 읽음
- 같은 frame의 route/identity 연속 event는 `scheduleRender()`로 합침
- `설정` 탭은 콘텐츠와 무관하므로 route 변경으로 불필요하게 다시 그리지 않음
- 요약에 현재 계정 username도 표시
- 미확보 media는 임의 URL을 만들지 않고 준비 상태를 표시

## 3. Grid 메뉴 lifecycle 정리

`ui/grid.js`는 route change 시 열린 메뉴를 즉시 닫습니다.

이전 콘텐츠의 메뉴가 새 화면에 남아 stale action을 실행하지 않도록 합니다.

## 4. 링크 복사 중복 제거

Grid와 RI Panel이 각각 clipboard fallback을 구현하던 구조를 제거했습니다.

새 owner:

```text
core/clipboard.js
```

흐름:

```text
Grid / RI Panel
      ↓
copyText()
      ├ navigator.clipboard
      └ textarea fallback
```

UI에 동일 clipboard 구현을 다시 넣지 못하게 `check.mjs` rule도 추가했습니다.

## 5. 기본 미디어 파일명 중복 제거

기존에는 Grid/RI Panel/Download Manager에 `Instagram_<shortcode>_...` 조립 코드가 반복됐습니다.

이제 기본 filename owner는:

```text
media/media-resolver.js → mediaFilename()
```

Download Manager가 request normalize 단계에서 사용합니다.

UI는 기본 filename을 직접 만들지 않습니다.

규칙:

```text
video          → Instagram_<code>_video.*
cover          → Instagram_<code>_thumb.*
photo          → Instagram_<code>_image.*
carousel-slide → Instagram_<code>_slide_01.*
```

`check.mjs`는 `src/ui/*`에서 `Instagram_` 기본 filename을 직접 조립하면 error로 처리합니다.

## 6. Unit gate 확대

추가/강화한 검사:

- SPA URL 변경 → current identity 변경
- route tracker cleanup
- clipboard API 우선 + DOM fallback
- Download Manager가 default filename owner를 사용
- Carousel slide filename index 유지
- media filename convention

---

# Migration adapter

`migration/legacy-store-adapter.js`는 현재 `ri311:items:v1` cache의 최소 snapshot만 읽습니다.

제공:

- shortcode / mediaId / owner
- mediaType / productType / canonicalUrl
- views / likes / comments / reposts / date
- videoUrl / coverUrl / thumbUrl / carouselImages

영구 구조가 아니며 Verified Store migration 후 제거합니다.

---

# 누적 보존 대상

v3.2.1 때문에 다음을 되돌리면 안 됩니다.

- 숫자 깜빡임 제거
- 기존 MutationObserver / History / scroll / media event 기반 데이터 갱신
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- 기존 3열 Grid 크기/배치
- 썸네일 위 하단 2줄 정보영역
- 8개 지표 독립 슬롯
- REEL/VIDEO 검증 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram 기본 media-type 아이콘 유지
- 카드당 우리 액션 버튼 1개
- 하단 Instagram 배너와 실제 겹치는 카드만 RI 정보영역 숨김
- `ri311:*` cache
- Video/Reel 실제 cover 저장 개선
- Carousel parent slide 구조
- ZIP 없는 개별 slide 저장

---

# 실기기에서 이미 확인된 사실

v3.1.6 계열에서 확인됨:

- Video/Reel 썸네일이 실제 영상 cover로 저장되는 사례
- Grid 숫자 깜빡임 제거 상태
- 사용 환경에서 영상 다운로드 폴더 선택이 실제 동작하는 사례
- source-of-truth 전환 직후 Instagram 표시가 직전 상태와 동일한 parity 확인

이 확인사항은 이후 migration에서도 보존 대상입니다.

---

# 아직 실기기 확인이 필요한 항목

v3.2.x는 코드/CI 결과와 별개로 다음을 확인해야 합니다.

1. 전역 RI 버튼이 각 화면에서 정확히 1개만 보이는지
2. Instagram navigation/배너/Reel rail과 충돌하지 않는지
3. RI Panel 크기/닫기 접근성
4. Grid 메뉴에 저장 폴더 설정이 제거됐는지
5. RI 설정의 지정 폴더가 video/photo/cover/carousel에 공통 적용되는지
6. 지정 폴더 image/cover가 CDN CORS 때문에 `fetch-failed`가 되는지
7. 실패 시 기본 Downloads로 몰래 빠지지 않는지
8. `prompt` mode 실제 동작
9. Carousel batch 동일 destination/개별 파일 저장
10. 기존 Grid 8-slot/cover/no-flicker 보존
11. Reel/Post 상세 SPA 이동 중 열린 RI Panel이 이전 shortcode를 남기지 않는지

특히 **사진/썸네일 지정 폴더 저장**의 cross-origin Blob 획득은 아직 실기기 검증 전입니다. 실패가 확인되면 UI가 아니라 media transport만 교체합니다.

---

# 다음 작업 순서

## Phase 3 계속 — Download transport 실기기 확인

1. directory mode video/photo/cover 실기기 비교
2. image/cover CORS 실패 여부 확인
3. 필요 시 `media/transport.js` 분리
4. 필요성이 확인될 때만 Tampermonkey privileged transport 검토
5. prompt/Carousel batch 확인

## Phase 4 — UI/Data 연결

6. Store 변경 live binding 강화
7. 전역 RI button safe-area/Reel rail 충돌 보정
8. Metrics Engine owner 생성 및 ER/24h/계정 대비 연결
9. Reel 상세 identity/native metrics 정확도 개선
10. 기존 Reel 전용 UI 잔여 구현 제거

## Phase 5 — Data Engine migration

11. Identity
12. Extractor
13. Verified Store
14. Metrics
15. Media Resolver 완전 전환
16. Grid/Reel renderer

## Phase 6 — Legacy 제거

- `src/legacy-runtime.js` 삭제
- `migration/legacy-store-adapter.js` 삭제
- legacy CSS/UI/download 중복 제거

---

# 장기 로드맵

- v3.3 Content Types
- v3.4 Research Detail UI
- v3.5 Comments
- v3.6 Research Features
- v4.x Analysis Server / STT / OCR / Alignment / AI
- v5.0 MV3 Extension

---

# 작업 규칙

- 기존 설계를 먼저 읽고 새 요구를 현재 구조에 통합한다.
- 관련 없는 승인 개선을 되돌리지 않는다.
- root generated userscript를 직접 수정하지 않는다.
- 신규 기능을 legacy runtime에 쌓지 않는다.
- UI에서 storage/File System/Blob transport/clipboard fallback/default filename을 독자 구현하지 않는다.
- 카드 메뉴에 전역 설정을 다시 넣지 않는다.
- 검증되지 않은 지표를 추측하지 않는다.
- hotfix `@require` 체인을 만들지 않는다.
- 실기기 확인 전에는 Android Edge에서 고쳐졌다고 단정하지 않는다.
