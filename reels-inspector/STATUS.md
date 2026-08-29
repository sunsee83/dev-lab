# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황입니다. 코드 ownership/build/migration은 `CODE_STRUCTURE.md`, Grid 세부 기준은 `GRID_BASELINE.md`, 검증 기준은 `tests/README.md`를 함께 봅니다.

## 현재 배포

- 버전: **v3.2.2**
- 실행 대상: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 개발 원본: `src/*`
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 현재 단계: **v3.2 UI/Foundation + Download/UI/Data migration 진행 중**

`ri-retry.user.js`는 build에서 생성되는 artifact이며 직접 수정하지 않습니다.

---

# 1. v3.2에서 유지하는 v3.1 승인 기능

다음은 구조 전환 때문에 되돌리면 안 됩니다.

- 900ms 전체 polling 제거
- MutationObserver / History / scroll / media event 기반 refresh
- 동일 shortcode pending request dedupe
- renderKey 기반 같은 값 DOM 재작성 방지
- React DOM 재사용 시 shortcode 재검증
- Verified Store source/confidence/status/conflict 보호
- 3열 Instagram Grid 유지
- 하단 2줄 정보영역
- 8개 독립 고정 슬롯
- REEL/VIDEO의 검증 조회수
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram native media-type 아이콘 유지
- 카드당 커스텀 미디어 버튼 1개
- Video/Reel 실제 cover 저장 개선
- music/album/avatar artwork 제외
- Carousel parent slide 구조 지원
- ZIP 없이 개별 slide 저장
- `ri311:*` 기존 cache/history 보존

실기기에서 이전에 확인된 사실:

- Grid 숫자 깜빡임 제거 상태
- Video/Reel 썸네일이 실제 영상 cover로 정상 저장된 사례
- 사용 환경에서 영상의 폴더 선택 저장이 실제 동작한 사례

---

# 2. Source of Truth / Build

```text
src/*
  ↓
esbuild
  ↓
ri-retry.user.js
```

자동 gate:

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

---

# 3. v3.2.0~3.2.1까지 활성화된 구조

## 공통 Runtime

- `core/app.js` — event/lifecycle/SPA route tracking
- `core/capability.js` — 실제 browser API 기반 capability
- `core/clipboard.js` — Grid/RI 공용 clipboard owner
- `store/settings-store.js` — 전역 저장정책/persistence
- `media/download-manager.js` — 모든 새 미디어 저장 단일 진입점
- `media/media-resolver.js` — migrated Grid media/cover/filename owner
- `migration/legacy-store-adapter.js` — 기존 `ri311:*` cache read boundary

## 전역 RI

- Reel 전용 도구와 별도로 중복 버튼을 만들지 않고 전역 RI 버튼 하나 사용
- 탭: `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`
- `미디어`는 Download Manager 사용
- `설정`은 Settings Store 사용
- `콘텐츠/댓글/분석`은 이후 데이터 계층 연결 예정

## Grid 저장 메뉴

- 기존 카드당 단일 미디어 버튼 유지
- 카드 메뉴에서 전역 폴더 설정 제거
- Video/Reel: 영상 / 썸네일 / 링크
- Photo: 이미지 / 링크
- Carousel: 전체 이미지 / 대표 이미지 / 링크
- 저장 위치는 RI 설정에서만 관리

## 저장정책

- `default` = 기본 Downloads
- `directory` = 지정 폴더
- `prompt` = 매번 선택
- 영상/썸네일/사진/Carousel 동일 정책
- 지정 폴더 실패 시 silent fallback 금지
- Carousel batch는 destination을 한 번 결정
- Android 문자열이 아니라 실제 API/permission으로 지원 여부 판단

---

# 4. v3.2.2 변경 — Metrics + live store binding

이번 단계는 RI 요약을 실제 연구 지표와 연결하면서, 같은 화면에서 새 데이터가 들어올 때 stale snapshot을 계속 보여주지 않도록 migration store binding을 추가한 단계입니다.

## 4.1 Metrics Engine owner 활성화

새 파일:

`src/metrics/metrics.js`

새 RI 요약의 지표 공식은 이 owner만 사용합니다.

### ER

```text
(likes + comments + reposts) / views × 100
```

v3.2.2 RI 요약에서는 다음 네 원시값이 모두 확보됐을 때만 계산합니다.

- views > 0
- likes >= 0
- comments >= 0
- reposts >= 0

미확보 항목을 `0`으로 가정하지 않습니다.

### 24h

- 현재 views와 실제 저장 snapshot 비교
- 18~32시간 범위만 허용
- 24시간에 가장 가까운 snapshot 선택
- 과거 값이 없거나 현재 값보다 커지는 conflict 상황이면 `—`

### 계정 대비

- 동일 account의 다른 콘텐츠만 사용
- 최근 최대 20개
- 최소 비교표본 5개
- views 중앙값 대비 현재 views 배수

## 4.2 RI 요약 연결

`요약` 탭에 다음이 실제 연결됩니다.

- 계정
- shortcode
- media type
- views / likes / comments / reposts
- ER
- 24h
- 계정 대비
- 게시일

값이 확보되지 않으면 `—`를 표시합니다.

## 4.3 RI Summary 파일 분리

`ri-panel.js`가 350줄 경고구간을 넘기기 시작하기 전에 실제 독립 책임이 생긴 summary 렌더를 `ui/ri-summary.js`로 분리했습니다.

이 분리는 파일 수를 늘리기 위한 것이 아니라:

- panel shell/tabs/settings/media lifecycle
- summary metrics presentation

의 변경 이유가 달라졌기 때문에 수행했습니다.

## 4.4 Live legacy-store binding

`legacy-store-adapter.js`가 기존 cache/history에 대한 읽기 API를 확장했습니다.

- `getSnapshots(shortcode)`
- `getAccountPosts(username)`
- `createChangeTracker(listener)`

중요: 새 독립 전체 DOM observer를 추가하지 않았습니다.

기존 `AppContext.startRouteTracking()`이 이미 보고 있는 Instagram SPA DOM activity를 `onActivity` callback으로 공유하고, Change Tracker는 그 activity를 받아 약 360ms 뒤 `ri311:items/snap/posts` raw fingerprint만 비교합니다.

```text
기존 SPA MutationObserver
        ↓
AppContext onActivity
        ↓
legacy change tracker
        ↓
changed key fingerprint only
        ↓
STORE_CHANGED
        ↓
열린 RI Panel 필요한 render만 갱신
```

즉 전체 Store JSON을 mutation마다 반복 파싱하거나 별도 interval polling을 추가하지 않습니다.

`storage/focus/pageshow`도 보조 trigger로 사용합니다.

---

# 5. 현재 runtime 조립

```text
main.js
  ├ version.js
  ├ core/app.js
  ├ core/capability.js
  ├ core/clipboard.js
  ├ store/settings-store.js
  ├ migration/legacy-store-adapter.js
  ├ metrics/metrics.js
  ├ media/media-resolver.js
  ├ media/download-manager.js
  ├ ui/grid.js
  ├ ui/ri-panel.js
  ├ ui/ri-summary.js
  ├ ui/toast.js
  ├ ui/styles.js
  └ legacy-runtime.js
```

`legacy-runtime.js`는 backup 파일이 아니라 기존 승인 데이터/renderer를 단계적으로 옮기기 위한 migration runtime입니다.

---

# 6. 현재 migration 중복에 대한 처리

새 RI 요약은 `metrics/metrics.js`를 사용합니다.

기존 Grid/Reel renderer 안에는 v3.1 계열의 ER/24h/account 계산 함수가 아직 남아 있습니다. 이 함수들은 **새 기능의 owner가 아니며 기존 renderer parity를 위한 임시 compatibility 코드**입니다.

다음 Grid/Reel renderer migration에서:

1. 새 Metrics owner API로 호출부 전환
2. 회귀 확인
3. legacy metric 함수 제거

순서로 없앱니다. 새 지표 공식을 legacy 쪽에 추가하거나 두 군데서 따로 발전시키지 않습니다.

---

# 7. 아직 실기기 검증이 필요한 항목

v3.2.2 설치 후 확인 대상:

1. 전역 RI 버튼이 화면당 정확히 1개인지
2. RI Panel이 Reel/Grid/Post 이동 뒤 이전 shortcode를 계속 표시하지 않는지
3. 열린 `요약`에서 새 network/cache 데이터가 들어온 뒤 값이 갱신되는지
4. ER이 원시 지표가 모두 있을 때만 표시되는지
5. 실제 약 24h snapshot이 없는 콘텐츠에는 24h가 `—`인지
6. 동일 계정 비교표본 5개 미만이면 계정 대비가 `—`인지
7. Grid 3열/8-slot/no-flicker/cover가 그대로인지
8. Grid 저장 메뉴에 폴더설정이 다시 생기지 않았는지
9. 지정 폴더 mode의 사진/썸네일 cross-origin 저장 결과
10. Carousel batch 저장 결과

특히 사진/썸네일 지정폴더의 CORS 문제는 아직 실기기 결과가 없으므로 해결됐다고 단정하지 않습니다.

---

# 8. 다음 작업

## Phase 4 계속 — RI/Data 연결

1. v3.2.2 Metrics/live binding 실기기 확인
2. Reel current identity/native likes/comments/reposts 정확도 개선
3. Reel overlay와 RI summary가 같은 Metrics owner를 사용하도록 renderer 호출부 migration
4. 그 시점에 legacy metrics 함수 제거

## Phase 5 — Data Engine migration

5. `instagram/identity.js`
6. `instagram/extractor.js`
7. `store/verified-store.js`
8. legacy cache adapter 제거 방향으로 공통 Store 전환
9. media resolver를 공통 `media[]` 모델로 전환
10. Grid/Reel renderer migration

## Download transport 분기

사진/썸네일 지정 폴더 CORS 실패가 실기기에서 확인될 때만 `media/transport.js`를 추가하고 Tampermonkey privileged transport 필요성을 검토합니다. 선제적으로 `@grant`를 바꾸지 않습니다.

---

# 9. 작업 규칙

- 기존 설계/STATUS/CODE_STRUCTURE/baseline을 먼저 확인
- 관련 없는 승인 기능 삭제/rollback 금지
- 새 책임은 owner module에 구현
- UI에서 raw Instagram parsing/storage/File System/Blob transport 직접 구현 금지
- 미확보 지표 추정 금지
- 새 전체 polling 금지
- 같은 핵심 코드를 두 곳에서 독립적으로 발전시키지 않음
- 파일이 커지면 줄 수 자체가 아니라 실제 변경 책임을 기준으로 분리
- 실기기 검증 전에는 동작 해결을 단정하지 않음
