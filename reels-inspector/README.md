# Reels Inspector

Instagram 모바일 웹에서 Reel·영상·사진·캐러셀·캡션·댓글·성과를 조사하기 위한 Tampermonkey 기반 **Instagram Content Research Tool** 프로토타입입니다.

## 기준 문서

개발 전 확인 순서:

1. `PROJECT_PLAN.md` — 제품/데이터/UI/로드맵
2. `STATUS.md` — 현재 배포/실기기 상태/다음 작업
3. `GRID_BASELINE.md` — Grid Frozen UI 회귀 기준
4. `CODE_STRUCTURE.md` — 실제 파일 구조/owner/API/build/migration 규칙
5. `tests/README.md` — 회귀/실기기 승인 기준

새 요구사항은 기존 설계를 먼저 검토한 뒤 현재 구조에 통합합니다. 관련 없는 기존 결정을 통째로 삭제하거나 좋아진 동작을 되돌리지 않습니다.

## 현재 배포

- 버전: **v3.2.1**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 개발 원본: `src/*`
- 배포 방식: self-contained userscript 1개
- runtime `@require` hotfix 체인 없음

설치/업데이트:

`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

`ri-retry.user.js`는 generated artifact입니다. 직접 수정하지 않습니다.

## 현재 UI 역할

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

### Grid

- Instagram 기존 3열 유지
- 썸네일 하단 2줄 정보영역
- 1줄: 조회수 · 좋아요 · 댓글 · 리포스트
- 2줄: ER · 24h · 계정 대비 · 게시일
- 값 없으면 `-`
- 각 지표 독립 고정 x 영역
- 카드당 우리 미디어 버튼 1개
- Instagram 기본 media-type 아이콘 유지

### 전역 RI

모든 Instagram 화면에서 같은 RI 버튼 1개를 사용합니다.

- 프로필 / 검색 / 탐색 / Grid
- Reel
- 일반 Post / Photo / Video / Carousel 상세

Panel 탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

현재 `요약 / 미디어 / 설정`부터 실제 데이터/서비스와 연결되어 있고 나머지는 단계적으로 연결합니다.

## 저장 구조

Grid 카드 메뉴는 **무엇을 저장할지**만 결정합니다.

- Reel/Video: 영상 / 썸네일 / 링크
- Photo: 이미지 / 링크
- Carousel: 전체 이미지 / 대표 이미지 / 링크

저장 위치는 RI `설정`의 전역 정책입니다.

- 지정 폴더
- 기본 Downloads
- 매번 선택

영상·썸네일·사진·Carousel은 모두 같은 `Download Manager`를 사용합니다. 지정 폴더 저장 실패 시 기본 Downloads로 조용히 바꾸지 않습니다.

## v3.2.1 구조 개선

### SPA context

`core/app.js`가 Instagram SPA route lifecycle을 관리합니다.

- URL 변경 시 current identity 갱신
- 열린 RI Panel도 route/identity event에 따라 갱신
- Grid의 열린 action menu는 route 변경 시 닫힘
- history override를 새로 겹쳐 쌓지 않음

### 중복 제거

두 번째 사용처가 실제 생긴 기능만 공통 owner로 승격했습니다.

```text
링크 복사        → core/clipboard.js
미디어 파일명    → media/media-resolver.js
저장 destination → media/download-manager.js
저장 설정        → store/settings-store.js
```

Grid/RI Panel이 각자 clipboard fallback이나 `Instagram_<shortcode>_...` 파일명 조립을 다시 만들지 않습니다.

`check.mjs`도 이를 강제합니다.

## 실제 소스 구조

```text
src/
├ version.js
├ main.js
├ legacy-runtime.js
├ migration/
│  └ legacy-store-adapter.js
├ core/
│  ├ app.js
│  ├ capability.js
│  └ clipboard.js
├ store/
│  └ settings-store.js
├ media/
│  ├ media-resolver.js
│  └ download-manager.js
└ ui/
   ├ grid.js
   ├ ri-panel.js
   ├ toast.js
   └ styles.js
```

`legacy-runtime.js`는 backup이 아니라 migration용 기존 검증 runtime입니다. 새 owner로 책임이 이동하면 기존 구현을 제거하고, migration 종료 후 파일 자체를 삭제합니다.

## Build / Test

```text
src/*
  ↓
npm test
  ↓
npm run build
  ↓
npm run check
  ↓
node --check ri-retry.user.js
  ↓
generated deployment artifact
```

버전 단일 원본은 `src/version.js`입니다.

자동 구조 검사는 다음을 포함합니다.

- 금지 backup/hotfix/copy 계열 파일명
- UI의 storage/File System API 직접 사용
- UI의 fetch/XHR/Blob transport 직접 구현
- UI의 clipboard fallback 직접 구현
- UI의 기본 media filename 직접 조립
- metrics의 DOM 접근
- store → ui import
- 순환 import
- source/generated/STATUS version 불일치
- 일반 source 파일 크기 기준
- 긴 duplicate block 후보

## 파일 관리

Progressive Modularization 원칙을 사용합니다.

- 실제 책임/두 번째 사용처가 생길 때만 파일 생성
- 빈 placeholder 파일/폴더를 미리 만들지 않음
- `old`, `backup`, `hotfix`, `final2`, `copy` 파일 금지
- 과거 버전은 Git history 사용
- 350줄부터 책임 분리 검토, 500줄 초과는 원칙적으로 분리
- `legacy-runtime.js`만 migration 기간 크기 예외

Git에 넣지 않는 것:

- 다운로드한 Instagram 영상/사진
- HAR/network raw capture
- `.env`/secret
- cookie/token/private header
- debug dump/log/cache
- 개인 계정 raw fixture

테스트 fixture는 sanitized data만 저장합니다.

## 현재 실기기 검증이 필요한 것

- v3.2.x 전역 RI 버튼/Panel 실제 배치
- Grid 메뉴에서 폴더 설정 제거 여부
- 지정 폴더가 video/photo/cover/carousel에 공통 적용되는지
- image/cover의 cross-origin directory 저장 여부
- prompt mode
- Carousel batch
- SPA Reel/Post 이동 시 이전 shortcode가 RI Panel에 남지 않는지
- 기존 Grid 8-slot/no-flicker/cover 개선 유지

cross-origin image 문제가 실제 확인되면 UI를 다시 만들지 않고 `media transport` 계층만 분리합니다.

## 다음 개발

1. v3.2 저장정책/SPA UI 실기기 검증
2. 필요 시 media transport 분리
3. Store live binding 강화
4. RI safe-area 보정
5. Metrics Engine → ER/24h/계정 대비 연결
6. Reel identity/native metrics 개선
7. Identity → Extractor → Verified Store → Metrics → renderer 순으로 legacy migration

이후:

`v3.3 Content Types → v3.4 Research Detail UI → v3.5 Comments → v3.6 Research Features → v4.x STT/OCR/AI → v5.0 MV3`
