# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. Grid UI 세부 기준은 `GRID_BASELINE.md`, 코드 ownership/build/migration 기준은 `CODE_STRUCTURE.md`, 회귀 기준은 `tests/README.md`를 함께 확인합니다.

## 현재 배포

- 버전: **v3.2.0**
- 실행 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 개발 원본: `src/*`
- 현재 단계: **v3.2 UI/Foundation + Download migration 진행 중**

`ri-retry.user.js`는 generated artifact이며 직접 수정하지 않습니다.

## v3.2.0에서 실제 활성화한 구조

### Source of Truth / Build

현재 흐름:

```text
src/*
  ↓
esbuild
  ↓
ri-retry.user.js
```

자동 검증 순서:

```text
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
```

버전의 단일 원본은 `src/version.js`입니다. Build가 legacy metadata의 다른 userscript 항목은 유지하되 `@version`은 `src/version.js` 값으로 생성합니다.

### 현재 runtime 조립

```text
main.js
  ├ version.js
  ├ core/app.js
  ├ core/capability.js
  ├ store/settings-store.js
  ├ media/download-manager.js
  ├ migration/legacy-store-adapter.js
  ├ media/media-resolver.js
  ├ ui/grid.js
  ├ ui/ri-panel.js
  ├ ui/toast.js
  ├ ui/styles.js
  └ legacy-runtime.js
```

`legacy-runtime.js`는 backup이 아니라 migration 동안만 유지하는 기존 검증 runtime입니다. 신규 기능은 legacy에 추가하지 않고 새 owner module에서 구현합니다.

## v3.2.0 사용자-visible 변경

### 1. 전역 RI 버튼 활성화

기존 Reel 전용 RI 버튼은 새 공용 스타일에서 숨기고, 동일 연구 아이콘의 **전역 RI 버튼 1개**를 모든 Instagram 화면에 표시합니다.

대상:

- 프로필
- 검색/탐색
- Grid
- Reel
- 일반 Post 상세
- Photo / Video / Carousel 상세

기본 위치는 우측 하단 safe-area 위입니다. 실제 Android Edge에서 Instagram 하단 navigation/배너/오른쪽 Reel rail과 충돌 여부는 실기기 확인이 필요합니다.

### 2. 공용 RI Panel 활성화

탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

현재 연결 상태:

- `요약`: 현재 URL shortcode를 migration adapter로 식별하고 legacy Verified Store의 조회수/좋아요/댓글/리포스트/게시일을 읽음
- `미디어`: 확보된 video/cover/photo/carousel URL을 공통 Download Manager로 전달
- `설정`: 공용 저장정책 실제 runtime과 연결
- `콘텐츠 / 댓글 / 분석`: shell만 유지하며 이후 단계에서 연결

Panel은 기존 Reel 상세 패널보다 작게 유지하여 영상 가림을 줄였습니다. 실기기에서 크기/위치 적합성은 아직 미확인입니다.

### 3. Grid 카드 저장 메뉴를 새 경로로 전환

Grid의 기존 카드당 단일 미디어 버튼은 그대로 유지합니다. 버튼 click을 `ui/grid.js`가 capture하여 legacy 저장 메뉴 대신 새 메뉴를 엽니다.

새 메뉴에는 저장 위치 설정을 넣지 않습니다.

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

즉 역할은 다음으로 분리됩니다.

```text
Grid 카드 버튼 = 현재 콘텐츠 빠른 저장
전역 RI 버튼 = 리서치 + 공용 설정
```

### 4. 공통 저장정책 실제 연결

모든 새 Grid/RI 미디어 액션은 `media/download-manager.js`를 통과합니다.

지원 mode:

- `default` = 기본 Downloads
- `directory` = 지정 폴더
- `prompt` = 매번 선택

Settings Store가 전역 mode와 directory handle/permission을 소유합니다.

중요 규칙:

- 영상/썸네일/사진/캐러셀이 동일 저장정책을 사용
- 지정 폴더 실패 시 기본 Downloads로 조용히 fallback하지 않음
- 실패는 `DownloadResult`로 반환하고 toast에 표시
- Carousel batch는 destination을 한 번 결정하여 전체 slide에 재사용
- 플랫폼 문자열이 아니라 실제 API/permission을 확인

## Migration adapter

`migration/legacy-store-adapter.js`는 현재 `ri311:items:v1` cache를 읽어 새 UI/Download 계층에 필요한 최소 snapshot만 제공합니다.

제공 정보:

- shortcode / mediaId / owner
- mediaType / productType / canonicalUrl
- views / likes / comments / reposts / date
- videoUrl / coverUrl / thumbUrl / carouselImages

이 adapter는 영구 architecture가 아닙니다. Verified Store migration이 완료되면 제거합니다.

## Media Resolver migration 시작

`media/media-resolver.js`가 새 Grid 저장 경로에서 미디어 선택을 소유하기 시작했습니다.

Video/Reel cover 선택 시 현재 승인된 규칙을 보존합니다.

- 카드와 크게 겹치는 본문 image 우선
- music/audio/album/avatar/profile 계열 작은 이미지 제외
- `srcset`에서 큰 후보 우선
- legacy Store의 `coverUrl` / `thumbUrl` fallback

현재 legacy 내부에도 같은 계열의 resolver가 남아 있지만 새 Grid 저장 경로에서는 `media/media-resolver.js`가 사용됩니다. 이후 Grid migration이 끝나면 legacy의 중복 구현을 제거합니다.

## 누적 보존 대상

다음은 v3.2 구조 전환 때문에 되돌리면 안 됩니다.

- 숫자 깜빡임 제거
- MutationObserver / History / scroll / media event 기반 갱신
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
- `ri311:*` cache 유지
- Video/Reel 실제 cover 저장 개선
- Carousel parent slide 구조 지원
- ZIP 없이 개별 slide 저장

## v3.1.6까지 실기기에서 확인된 사실

확인됨:

- Video/Reel `썸네일 다운로드`가 실제 영상 cover로 정상 저장되는 사례
- Grid 숫자 깜빡임 제거 상태
- 사용 환경에서 영상 다운로드의 폴더 선택이 실제 동작하는 사례

기존 문제:

- 카드 메뉴의 폴더 설정이 실제로는 전역인데 카드별 설정처럼 보였음
- 영상은 선택 폴더, 이미지는 기본 Downloads로 갈라지는 사례가 있었음

v3.2.0은 이 문제를 새 Settings Store + Download Manager + 공용 RI 설정으로 구조적으로 교체한 첫 배포입니다.

## 아직 실기기 확인이 필요한 v3.2.0 항목

다음은 코드/CI 통과와 별개로 Android Edge에서 확인이 필요합니다.

1. 전역 RI 버튼이 Grid/Reel/Post 상세에서 정확히 1개만 보이는지
2. 버튼이 Instagram navigation/배너/Reel rail을 가리지 않는지
3. RI Panel 크기와 닫기 접근성이 적절한지
4. Grid 카드 메뉴에서 `저장 폴더 선택/변경` 항목이 사라졌는지
5. RI `설정`에서 지정 폴더를 선택하면 이후 다른 영상에도 공통 적용되는지
6. 지정 폴더 mode에서 사진/썸네일 fetch가 CDN CORS 때문에 실패하는지
7. 실패할 경우 기본 Downloads로 몰래 떨어지지 않고 오류가 표시되는지
8. `매번 선택` mode가 실제 지원 API에 맞게 동작하는지
9. Carousel 전체 다운로드가 한 destination에 개별 파일로 저장되는지
10. 기존 Grid 8-slot/cover/no-flicker가 그대로인지

특히 **사진/썸네일의 지정 폴더 저장**은 cross-origin Blob 획득이 브라우저 정책에 따라 실패할 수 있습니다. 실제 실패가 확인되면 UI를 다시 건드리지 않고 `media` transport 경계만 교체하며 Tampermonkey privileged transport 도입 여부를 검토합니다.

## 다음 작업 순서

### Phase 3 계속 — 실기기 회귀 + transport

1. v3.2.0 Grid/RI/저장정책 실기기 확인
2. 지정 폴더 image/cover fetch 결과 확인
3. 필요 시 `media/transport.js` 분리
4. 필요할 때만 Tampermonkey cross-origin transport를 안전하게 도입
5. Carousel batch 실기기 확인

### Phase 4 — UI/Data 연결

6. 전역 RI 버튼 safe-area 충돌 보정
7. 요약에 Metrics Engine의 ER/24h/계정 대비 연결
8. Reel 상세 identity/native metrics 정확도 개선
9. 기존 Reel 전용 UI 잔여 구현 제거

### Phase 5 — Data Engine migration

10. Identity
11. Extractor
12. Verified Store
13. Metrics
14. Media Resolver
15. Grid/Reel UI

순으로 하나씩 이동합니다.

### Phase 6 — Legacy 제거

새 owner로 모두 이동한 뒤:

- `src/legacy-runtime.js` 삭제
- `migration/legacy-store-adapter.js` 삭제
- legacy CSS/UI/다운로드 중복 제거

## 장기 로드맵

- v3.3 Content Types
- v3.4 Research Detail UI
- v3.5 Comments
- v3.6 Research Features
- v4.x Analysis Server / STT / OCR / Alignment / AI
- v5.0 MV3 Extension

## 작업 규칙

- 기존 설계를 먼저 읽고 새 요구사항을 현재 구조에 통합합니다.
- 바뀐 요구만 추가하고 관련 없는 승인 개선을 되돌리지 않습니다.
- root generated userscript를 직접 수정하지 않습니다.
- 신규 기능을 `legacy-runtime.js`에 추가하지 않습니다.
- UI에서 저장정책/persistence/Blob fetch를 독자 구현하지 않습니다.
- 카드별 메뉴에 전역 설정을 다시 넣지 않습니다.
- 검증되지 않은 지표를 추측하지 않습니다.
- hotfix `@require` 체인을 만들지 않습니다.
- 실기기 확인 전에는 Android Edge에서 고쳐졌다고 단정하지 않습니다.
