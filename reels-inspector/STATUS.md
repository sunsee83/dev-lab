# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. Grid UI 세부 기준은 `GRID_BASELINE.md`, 실제 코드 분류/의존성/런타임 구조 기준은 `CODE_STRUCTURE.md`, 회귀 기준은 `tests/README.md`를 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.6**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 현재 코드 단계: **v3.1 Core/Grid 안정화**
- 다음 구현 단계: **v3.2 UI/Foundation + source-of-truth 전환**

## 누적 보존 대상

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

## v3.1.6 실기기 확인

확인된 개선:

- Video/Reel `썸네일 다운로드`가 실제 영상 cover로 정상 저장되는 사례 확인
- Grid 숫자 깜빡임 제거 상태 유지

현재 확인된 저장 구조 문제:

1. Grid 카드 팝업에서 폴더를 선택하면 그 설정이 해당 카드만의 설정처럼 보이지만 실제로는 이후 영상 다운로드에도 공통으로 사용됨.
2. 영상은 선택한 폴더에 저장되지만 이미지 다운로드는 기존 기본 Downloads로 빠지는 사례가 있음.
3. 즉 저장정책이 미디어 종류별로 동일한 경로를 거치지 않고 있어 결과가 일관되지 않음.
4. 카드별 메뉴에 전역 성격의 저장 위치 설정이 들어가 있어 UI 의미도 맞지 않음.

이 문제는 개별 patch로 계속 보정하지 않고 v3.2에서 **공통 Download Manager + 전역 설정**으로 구조를 정리한다.

## 확정된 전체 UI 역할

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

### 전역 RI 버튼

현재 Reel에서 사용하는 RI 도구 버튼을 모든 Instagram 화면에 표시하는 전역 진입점으로 승격한다.

표시 대상:

- 프로필
- 검색
- 탐색
- Grid
- Reel
- 일반 Post 상세
- Photo / Video / Carousel

기본 위치는 **우측 하단 safe area**이며 Instagram 하단 navigation / `앱 사용` 배너와 겹치면 자동으로 위로 이동한다.

### 공용 RI Panel

탭 shell:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

- 현재 콘텐츠가 있으면 해당 콘텐츠의 상세 조사 정보를 표시
- `설정`은 콘텐츠와 무관한 전역 설정
- 패널은 Store 변경을 구독하여 live update

## Grid 기준

### 8개 고정 슬롯

1줄:

`조회수 | 좋아요 | 댓글 | 리포스트`

2줄:

`ER | 24h | 계정 대비 | 날짜`

- 각 슬롯은 독립된 고정 x 영역
- 다른 숫자 길이에 위치가 밀리지 않음
- 값이 없으면 해당 자리 `-`
- PHOTO/CAROUSEL은 `▶-`

### 카드 미디어 메뉴

v3.2에서 카드 메뉴에서는 **저장 위치 설정을 제거**하고 해당 콘텐츠의 액션만 둔다.

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

## 공통 Download Manager 설계

모든 저장 액션은 하나의 manager를 통과한다.

```text
Grid / RI Panel
      ↓
Media Action
      ↓
Download Manager
      ↓
전역 저장정책
```

설정 탭에서 capability에 따라 제공:

- `지정 폴더`
- `기본 Downloads`
- `매번 선택`

적용 대상:

- 영상
- 영상 cover/썸네일
- 사진
- 캐러셀 전체 slide
- 향후 STT/OCR export

중요 규칙:

- 영상만 지정 폴더, 사진만 Downloads처럼 미디어별로 저장정책이 갈라지지 않음
- 지정 폴더 모드에서 쓰기 실패 시 조용히 기본 Downloads로 fallback하지 않음
- 실패를 구조화된 result로 반환하고 사용자가 재시도/기본 다운로드를 명시적으로 선택하게 함
- 기능 지원 여부는 `Android` 같은 플랫폼명으로 단정하지 않고 실제 API/권한을 runtime에서 검사
- Carousel batch는 destination을 한 번만 결정하고 slide 전체에 동일하게 적용
- CDN URL → Blob 획득은 transport 경계로 두어 향후 cross-origin 대응을 UI와 분리

## Carousel 전체 다운로드

ZIP은 기본 방식으로 사용하지 않는다.

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

에서 parent shortcode의 slide를 순서대로 구성한다.

`전체 이미지 다운로드 (N)` 한 번으로:

`slide_01 → slide_02 → ... → slide_N`

개별 파일을 저장한다.

## 코드/런타임 구조 — 시스템 설계 확정

`CODE_STRUCTURE.md`를 단순 파일목록이 아니라 **실제 runtime architecture와 ownership 계약 문서**로 확장했다.

### Single Owner

각 기능은 하나의 owner만 가진다.

```text
route/event/lifecycle      → core/app.js
capability/permission      → core/capability.js
전역 저장설정             → store/settings-store.js
다운로드/목적지/write      → media/download-manager.js
전역 RI UI                → ui/ri-panel.js
공용 CSS                  → ui/styles.js
```

Identity / Extractor / Verified Store / Metrics / Media Resolver / Grid / Reel은 현재 검증된 monolith를 우선 보존하고 안정화된 순서대로 owner module로 이동한다.

### AppContext + Dependency Injection

`src/main.js`가 subsystem을 한 번만 생성하고 의존성을 주입한다.

```text
main.js
  ├ createApp()
  ├ detectCapabilities()
  ├ createSettingsStore()
  ├ createDownloadManager()
  ├ bootLegacyRuntime()
  └ mountRiPanel()
```

하위 모듈이 상위 UI나 전역 객체를 뒤져서 dependency를 찾는 구조를 사용하지 않는다.

### Event 계약

공식 event를 제한한다.

```text
route:changed
identity:changed
store:changed
settings:changed
download:changed
```

동일 render는 frame 단위로 dedupe하고 subscribe는 cleanup 경로를 가진다.

### Migration source

v3.2 첫 구조 작업에서 현재 검증된 runtime을 `src/legacy-runtime.js`라는 **임시 canonical migration module**로 이동한다.

이 파일은 backup/hotfix가 아니다.

- 새 기능 추가 금지
- 기존 기능을 새 owner module로 옮길수록 내용 제거
- migration 종료 후 파일 자체 삭제
- root `ri-retry.user.js`는 generated artifact로 전환

이 방법으로 `src`와 userscript를 동시에 수작업 수정하는 이중 원본 문제를 끊는다.

### 중복 방지 시스템

- 같은 로직이 필요하면 Single Owner API를 호출
- helper는 한 파일에서 private로 시작하고 두 번째 사용처가 생길 때만 승격
- 기존 코드 복사 후 두 구현을 남기는 방식 금지
- 신규 `src/*`에서 `oldFn = fn; fn = override` 식 patch stack 금지
- `utils.js` 같은 무책임 공용 파일 금지

### 파일 크기 기준

```text
0~250줄      정상
250~350줄    책임 혼합 검토
350~500줄    분리 후보
500줄 초과   단일책임 근거 없으면 분리
```

`legacy-runtime.js`만 migration 동안 예외다.

함수는 약 60줄 이상, 3단계 이상 중첩 지속, 서로 다른 side effect 혼합, 8줄 이상 중복 블록 반복 시 리팩터링 검토한다.

### 자동 구조 검사

향후 `scripts/check.mjs`는 다음을 실제로 검사한다.

- 금지 파일명
- UI에서 File System/localStorage/IndexedDB 직접 접근
- UI에서 fetch/XHR hook 구현
- metrics에서 DOM 접근
- store → ui import
- 순환 import
- source 파일 과대화 warning/error
- 긴 반복 코드 block
- version/build 불일치
- syntax/bundle 실패

즉 코드 규칙을 문서에만 두지 않고 가능한 부분은 build/check에서 강제한다.

현재 v3.1.6 실행 코드 자체는 이번 시스템 설계 문서 정리에서 변경하지 않았다.

## v3.2 — 실행 순서

### Phase 0 — 기준선 freeze

1. 현재 v3.1.6 runtime과 실기기 승인 기능 고정
2. 관련 regression 기준 확인

### Phase 1 — source-of-truth 전환

3. 현재 runtime body를 `src/legacy-runtime.js`로 이동
4. `src/main.js`, build/check 기반 생성
5. `ri-retry.user.js`를 generated artifact로 전환
6. 기존 동작 parity 확인

이 시점부터 root userscript 직접 수정 금지.

### Phase 2 — Foundation

7. `core/app.js` AppContext/event
8. `core/capability.js`
9. `store/settings-store.js`
10. `media/download-manager.js`
11. `ui/ri-panel.js`
12. `ui/styles.js`

### Phase 3 — 저장 통합

13. Grid 카드 저장 위치 설정 제거
14. video/cover/photo/carousel 기존 호출을 Download Manager로 전환
15. 지정 폴더 / 기본 Downloads / 매번 선택 정책 통합
16. 영상·이미지 destination consistency 실기기 확인
17. Carousel batch 저장 확인

### Phase 4 — UI/Data migration

18. 전역 RI 버튼/공용 panel 안정화
19. 필요 시 Grid/Reel UI 분리
20. 마지막에 Identity → Extractor → Verified Store → Metrics → Media Resolver 순으로 이동
21. migration 완료 시 `legacy-runtime.js` 삭제

그 다음 `v3.3 Content Types`로 진행한다.

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
