# Instagram Content Research Tool — Architecture

이 문서는 **현재 코드 구조와 owner**만 다룹니다. 제품 목표는 `PROJECT_PLAN.md`, 보존 기준은 `BASELINE.md`, 현재 상태/다음 작업은 `STATUS.md`가 기준입니다.

## 1. 원칙

- **Single Owner**: 한 책임은 한 모듈이 소유합니다.
- **Single Data Flow**: UI마다 Instagram parsing/metric 계산을 복제하지 않습니다.
- **Single Side-Effect Path**: 저장·clipboard·activity는 지정 owner만 수행합니다.
- **Progressive Migration**: 새 경로를 검증한 뒤 기존 경로를 제거합니다.
- **No rollback-by-refactor**: 구조 변경 때문에 승인된 동작을 되돌리지 않습니다.
- 빈 `utils.js`, `backup.js`, `hotfix.js`, override stack을 만들지 않습니다.

## 2. 현재 source

```text
src/
├ version.js
├ main.js
├ legacy-runtime.js
├ core/
│  ├ activity.js
│  ├ app.js
│  ├ capability.js
│  └ clipboard.js
├ migration/
│  ├ legacy-store-adapter.js
│  └ reel-context-adapter.js
├ store/
│  └ settings-store.js
├ metrics/
│  └ metrics.js
├ media/
│  ├ media-resolver.js
│  └ download-manager.js
└ ui/
   ├ activity-indicator.js
   ├ grid.js
   ├ layout.js
   ├ metric-format.js
   ├ reel-overlay.js
   ├ research-workspace.js
   ├ ri-panel.js
   ├ ri-primitives.js
   ├ ri-settings.js
   ├ ri-summary.js
   ├ styles.js
   ├ toast.js
   └ workspace-state.js
```

`ri-retry.user.js`는 generated artifact이며 직접 수정하지 않습니다.

## 3. Owner map

| 책임 | Owner |
|---|---|
| VERSION / UPDATE_URL | `version.js` |
| route/event/shared SPA activity | `core/app.js` |
| async activity state | `core/activity.js` |
| capability/permission | `core/capability.js` |
| clipboard | `core/clipboard.js` |
| global save settings / directory handle | `store/settings-store.js` |
| legacy verified cache/history read | `migration/legacy-store-adapter.js` |
| active Reel identity/native metric evidence | `migration/reel-context-adapter.js` |
| ER / 24h / account-relative formula | `metrics/metrics.js` |
| cover/media/default filename | `media/media-resolver.js` |
| destination/write/batch activity | `media/download-manager.js` |
| Workspace state | `ui/workspace-state.js` |
| viewport/safe-area/collision | `ui/layout.js` |
| Research Sheet DOM shell | `ui/research-workspace.js` |
| RI controller/actions | `ui/ri-panel.js` |
| RI settings presentation | `ui/ri-settings.js` |
| RI summary | `ui/ri-summary.js` |
| shared RI DOM primitives | `ui/ri-primitives.js` |
| Grid quick-save UI | `ui/grid.js` |
| metric display formatting | `ui/metric-format.js` |
| staged Reel overlay | `ui/reel-overlay.js` |
| persistent/running feedback | `ui/activity-indicator.js` |
| transient feedback | `ui/toast.js` |
| shared CSS | `ui/styles.js` |

## 4. Main flows

### Data / metrics

```text
Instagram
→ Identity / Extractor (legacy migration 중)
→ Verified Store
→ Metrics Engine
→ Grid / Reel / Research Workspace
```

미확보 값을 `0`으로 만들지 않습니다. UI는 metric formula를 재구현하지 않습니다.

### Workspace

```text
AppContext identity
→ Workspace State
   CLOSED | COMPACT | EXPANDED
   GLOBAL | CONTENT
→ Research Workspace View
→ active body 1개만 render
```

CONTENT 탭은 `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`입니다. GLOBAL은 빈 6탭 대신 RI Home/Settings를 사용합니다. browser Back/history를 Workspace 닫기용으로 조작하지 않습니다.

### Download / Activity

```text
Grid / RI action
→ Download Manager
→ destination policy
→ write
→ Activity event
→ Activity Store
→ persistent indicator 또는 Toast
```

Carousel은 destination을 한 번 정하고 개별 파일을 순차 처리합니다. 지정폴더 실패 시 default Downloads로 silent fallback하지 않습니다.

### Active Reel

```text
shared SPA activity
→ reel-context-adapter
   scoped Reel link
   → exact media URL mapping
   → exact Reel route
→ scoped native likes/comments/reposts
```

owner+metric 유사값으로 shortcode를 fuzzy 추측하지 않습니다. 같은 URL에서 세로 Reel 이동도 기존 SPA observer activity를 재사용합니다.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`는 새 Metrics owner 기반 replacement source입니다.

```text
▶ views
ER
24h
× account-relative
date
```

현재 원칙:

1. 새 source/test 준비
2. Android Edge에서 identity/native metric/placement 확인
3. 새 overlay mount
4. 그 뒤에만 legacy `#ri3-reels-overlay` hide/remove
5. legacy metric compatibility body는 renderer/Data Engine migration 뒤 제거

즉 **새 source가 존재한다는 이유만으로 기존 좋은 visual을 먼저 삭제하지 않습니다.**

## 6. Migration boundary

`legacy-runtime.js`에는 아직 Identity/Extractor/Verified Store/Grid/Reel renderer 고위험 경로가 남아 있습니다.

목표 순서:

```text
Identity
→ Extractor
→ Verified Store
→ history
→ media[]
→ Grid/Reel renderer
→ legacy-runtime 제거
```

각 owner를 옮길 때 호출부와 test를 먼저 준비하고 old path를 마지막에 제거합니다.

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
- UI의 storage/File System/network 직접 접근 금지
- metrics DOM 접근 금지
- circular import 금지
- runtime `@require` 금지
- 일반 source 500줄 초과 금지, 350줄 초과 책임 분리 warning
- 중복 block warning
- canonical docs의 필수 보존/작업 marker 확인

자동검증과 Android Edge 실기기 검증은 구분합니다.
