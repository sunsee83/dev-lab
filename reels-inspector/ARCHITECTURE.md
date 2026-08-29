# Instagram Content Research Tool — Architecture

현재 코드 구조와 owner만 다룹니다. 제품 목표=`PROJECT_PLAN.md`, 보존=`BASELINE.md`, 현재 상태/순서=`STATUS.md`.

## 1. 원칙

- **Single Owner / Single Data Flow / Single Side-Effect Path**
- **Progressive Migration**: 새 경로 검증 후 기존 경로 제거
- **No rollback-by-refactor**: 구조 변경 때문에 승인 동작을 되돌리지 않음
- 빈 `utils.js`, `backup.js`, `hotfix.js`, override stack 금지

## 2. 현재 source

```text
src/
├ version.js
├ main.js
├ legacy-runtime.js
├ core/ activity.js app.js capability.js clipboard.js
├ migration/ legacy-store-adapter.js reel-context-adapter.js
├ store/ settings-store.js
├ metrics/ metrics.js
├ media/ media-resolver.js download-manager.js
└ ui/
   activity-indicator.js grid.js layout.js metric-format.js
   reel-overlay.js research-workspace.js ri-panel.js ri-primitives.js
   ri-settings.js ri-summary.js styles.js toast.js workspace-state.js
```

`ri-retry.user.js`는 generated artifact이며 직접 수정하지 않습니다.

## 3. Owner map

- VERSION / UPDATE_URL → `version.js`
- route/event/shared SPA activity → `core/app.js`
- async activity → `core/activity.js`
- capability/permission → `core/capability.js`
- clipboard → `core/clipboard.js`
- **영상 / 사진·표지 / 슬라이드 저장정책·directory handle·v1→v2 migration** → `store/settings-store.js`
- legacy verified cache/history read → `migration/legacy-store-adapter.js`
- active Reel identity/native metric evidence → `migration/reel-context-adapter.js`
- ER / 24h / account-relative → `metrics/metrics.js`
- cover/media/default filename → `media/media-resolver.js`
- media kind→저장 profile 선택 / destination/write/batch → `media/download-manager.js`
- Workspace state → `ui/workspace-state.js`
- viewport/safe-area/collision → `ui/layout.js`
- Research Sheet shell → `ui/research-workspace.js`
- RI controller/actions → `ui/ri-panel.js`
- RI settings presentation → `ui/ri-settings.js`
- RI summary → `ui/ri-summary.js`
- Grid quick-save → `ui/grid.js`
- metric formatting / staged Reel overlay → `ui/metric-format.js` / `ui/reel-overlay.js`
- persistent / transient feedback → `ui/activity-indicator.js` / `ui/toast.js`
- shared CSS → `ui/styles.js`

## 4. Main flows

### Data / metrics

```text
Instagram
→ Identity / Extractor (legacy migration 중)
→ Verified Store
→ Metrics Engine
→ Grid / Reel / Research Workspace
```

미확보 값을 `0`으로 만들지 않고 UI가 metric formula를 재구현하지 않습니다.

### Workspace / 위치

```text
AppContext identity
→ Workspace State
   CLOSED | COMPACT | EXPANDED
   GLOBAL | CONTENT
→ Research Workspace View
→ active body 1개
```

CONTENT=`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`, GLOBAL=`RI Home + Settings + 업데이트 바로가기`.

UI 위치 계약은 숫자 좌표보다 `[기준 영역 · 위치]`를 먼저 사용합니다.

```text
전체 화면        → Global RI fixed anchor
카드·썸네일 내부 → Grid custom action/metrics
Reel 영상 영역   → minimal overlay
Workspace 내부   → header/tab/body/action/activity
```

실제 offset/좌우 placement는 `ui/layout.js`와 Android evidence가 owner입니다.

### Download / Activity

```text
Grid / RI action
→ Download Manager
→ media kind profile
   video          → 영상 정책
   cover / photo  → 사진·표지 정책
   carousel-slide → 슬라이드 정책
→ directory | default | prompt
→ write
→ Activity Store
→ indicator / Toast
```

각 profile은 독립 mode/directory handle을 가집니다. v1 전역 설정은 처음 migration 때 세 profile에 승계합니다. Carousel prompt는 destination 1회 선택 후 개별 파일을 순차 저장하며 지정폴더 실패를 silent fallback하지 않습니다.

### Active Reel

```text
shared SPA activity
→ migration/reel-context-adapter.js
   scoped Reel link
   → exact media URL mapping
   → exact Reel route
→ scoped native likes/comments/reposts
```

fuzzy owner/metric shortcode 추측 금지. 같은 URL 세로 이동도 shared observer를 재사용합니다.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`는 새 Metrics owner 기반 replacement source입니다.

```text
▶ views → ER → 24h → × account-relative → date
```

1. source/test 준비
2. Android identity/native metric/placement 확인
3. 새 overlay mount
4. 이후에만 legacy `#ri3-reels-overlay` hide/remove
5. renderer/Data Engine migration 뒤 compatibility metric body 제거

## 6. Migration boundary

`legacy-runtime.js`에는 Identity/Extractor/Verified Store/Grid/Reel renderer 고위험 경로가 남아 있습니다.

```text
Identity → Extractor → Verified Store → history → media[]
→ Grid/Reel renderer → legacy-runtime 제거
```

Research data는 Data Engine 이후 연결합니다. Analysis 목표 schema는 런타임 값이 확보된 뒤 owner를 추가합니다.

```text
포맷
→ 문제제기형 | 리스트형 | Before/After | 튜토리얼 | 리뷰 | 스토리 | 비교 | 뉴스·정보
전환 장치
→ 댓글 유도 | 저장 유도 | 공유 유도 | 프로필 이동 | 링크 클릭 | 구매 | DM
보조
→ 훅 | CTA 위치 | 신뢰 장치 | 감정/긴급성
```

현재 `analysis` 탭에 가짜 결과를 생성하지 않습니다.

## 7. Build / architecture gate

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate:

- source/generated/`STATUS.md` version 일치
- update URL/업데이트 바로가기 보존
- UI storage/File System/network 직접 접근 금지
- metrics DOM 접근 금지 / circular import / runtime `@require` 금지
- 일반 source 500줄 초과 금지, 350줄 초과 warning
- canonical docs marker/크기, duplicate block warning

자동검증과 Android Edge 실기기 검증은 구분합니다.
