# Reels Inspector

Instagram 모바일 웹에서 콘텐츠를 빠르게 조사하기 위한 Tampermonkey 기반 Instagram Content Research Tool 프로토타입입니다.

## 기준 문서

개발 전에 아래 순서로 확인합니다.

1. `PROJECT_PLAN.md` — 제품 구조, 데이터 모델, 전체 UI, 다운로드 구조, 개발 로드맵의 단일 기준
2. `STATUS.md` — 현재 배포 버전, 실기기 확인사항, 다음 구현 순서
3. `GRID_BASELINE.md` — Grid Frozen UI 세부 기준
4. `CODE_STRUCTURE.md` — 실제 코드 파일 분류, 모듈 책임, 의존성, build/migration 기준
5. `tests/README.md` — Core/Grid/UI/Foundation 회귀검증 기준

요구사항·구조·UI·우선순위가 바뀌면 기존 설계를 먼저 참고한 뒤 새 결정을 현재 구조에 통합하고 관련 문서를 갱신합니다. 관련 없는 기존 설계를 통째로 삭제하거나 과거 방식으로 되돌리지 않습니다.

## 현재 배포

- 버전: **v3.1.6**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 별도 hotfix `@require` 체인 사용 안 함

## 설치/업데이트

`https://github.com/sunsee83/dev-lab/raw/refs/heads/main/reels-inspector/ri-retry.user.js`

## 현재 개발 단계

**v3.1 Core/Grid 안정화 → v3.2 UI/Foundation 준비**

v3.1에서 확보한 기반:

- ContentIdentity
- PHOTO / VIDEO / CAROUSEL / REEL mediaType
- Verified Store + source/confidence/status/conflict
- pending request dedupe
- Event/Observer 기반 refresh
- Grid renderKey
- 숫자 깜빡임 제거
- Grid 8개 고정 슬롯
- Video/Reel cover identity
- Carousel 개별 batch 다운로드 기반

## 확정된 UI 역할

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

### Grid

- 썸네일 위 하단 정보영역 유지
- 1줄: 조회수 · 좋아요 · 댓글 · 리포스트
- 2줄: ER · 24h · 계정 대비 · 게시일
- 값이 없으면 슬롯을 없애지 않고 `-`
- 각 슬롯은 다른 값 길이에 밀리지 않는 고정 x 영역
- 카드당 우리 미디어 버튼은 1개
- Instagram 기본 media-type 아이콘 유지

### 전역 RI 버튼

현재 Reel RI 도구 버튼을 모든 Instagram 화면의 공용 진입점으로 확장합니다.

- 프로필 / 검색 / 탐색 / Grid
- Reel
- 일반 Post / Photo / Video / Carousel 상세

전역 RI Panel 목표 탭:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

## 저장 구조

Grid 카드 메뉴에는 저장 위치 설정을 두지 않습니다.

카드 메뉴는 현재 콘텐츠 액션만 제공합니다.

- Reel/Video: 영상 다운로드 / 썸네일 다운로드 / 링크 복사
- Photo: 이미지 다운로드 / 링크 복사
- Carousel: 전체 이미지 다운로드 / 대표 이미지 다운로드 / 링크 복사

저장 위치는 전역 RI `설정`에서 관리하고, 영상·썸네일·사진·Carousel이 하나의 **공통 Download Manager**를 사용하도록 통합합니다.

지원 가능한 저장정책:

- 지정 폴더
- 기본 Downloads
- 매번 선택

실제 브라우저 API/permission을 확인해 가능한 옵션만 노출합니다.

## 코드 작성 구조

현재 `ri-retry.user.js`는 실기기 동작을 보존하기 위해 그대로 유지하면서 신규 v3.2 Foundation부터 `src/` 모듈로 작성합니다.

핵심 계층:

```text
src/
├ core/        # capability/event/route 공통 기반
├ instagram/   # identity/extractor/normalizer
├ store/       # Verified Store/Settings/Snapshot/Persistence
├ metrics/     # ER/24h/account-relative 순수 계산
├ media/       # resolver/cover/carousel/Download Manager
├ ui/          # global RI/Grid/Reel/Panel
├ comments/    # 댓글 연구 로직
└ analysis/    # 향후 분석 서버 client/job
```

세부 파일 책임과 의존성, monolith → module 전환 순서는 `CODE_STRUCTURE.md`를 기준으로 합니다.

v3.2에서 먼저 분리할 코드는 **capability / Settings Store / Download Manager / 전역 RI button / RI Panel shell / settings tab**입니다. 기존 Grid 데이터엔진과 cover/network/store는 첫 단계에서 대규모 재작성하지 않습니다.

## 다음 구현 — v3.2 UI/Foundation

1. 신규 Foundation 소스 모듈 생성
2. 전역 RI 버튼
3. 공용 RI Panel shell
4. 설정 탭 / Settings Store
5. 공통 Download Manager
6. 카드 메뉴에서 폴더 설정 제거
7. 영상·썸네일·사진·Carousel 저장정책 통합
8. Grid 8슬롯/cover/Carousel 회귀 마감
9. 실기기 검증

이후 `v3.3 Content Types → v3.4 Research Detail UI → v3.5 Comments → v3.6 Research Features → v4.x STT/OCR/AI → v5.0 MV3` 순서로 진행합니다.

## 개발 원칙

- Identity → Extractor → Normalizer → Verified Store → Metrics → UI 흐름을 지킵니다.
- UI마다 별도 데이터 parser를 만들지 않습니다.
- 값이 확인되지 않으면 임의 수치를 만들지 않습니다.
- 같은 값이면 DOM을 다시 그리지 않습니다.
- Grid Frozen UI는 관련 없는 기능 때문에 되돌리지 않습니다.
- 실기기에서 좋아진 동작은 누적 보존합니다.
- 실제 개발 원본을 모듈화한 뒤에도 Tampermonkey 배포는 self-contained `ri-retry.user.js` 하나로 유지합니다.
- 설계 변경 시 `PROJECT_PLAN.md`, `CODE_STRUCTURE.md`와 관련 문서를 코드보다 먼저 또는 같은 작업에서 갱신합니다.
