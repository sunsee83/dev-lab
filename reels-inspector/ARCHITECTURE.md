# Instagram Content Research Tool — Architecture

현재 코드 구조와 owner만 다룹니다. 제품 목표=`PROJECT_PLAN.md`, 보존=`BASELINE.md`, 현재 상태/순서=`STATUS.md`.

## 1. 원칙

- **Single Owner / Single Data Flow / Single Side-Effect Path**
- **Progressive Migration**: 새 경로 검증 후 기존 경로 제거
- **No rollback-by-refactor**
- 빈 `utils.js`, `backup.js`, `hotfix.js`, runtime override stack 금지

## 2. 현재 source

```text
src/
├ version.js
├ main.js
├ legacy-runtime.js
├ core/ activity.js app.js capability.js clipboard.js
├ data/ engine.js identity.js extractor.js media-model.js
├ migration/ capture-handoff.js legacy-store-adapter.js reel-context-adapter.js
├ store/ history-store.js settings-store.js verified-cache-store.js verified-store.js
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
- identity normalization/key → `data/identity.js`
- Instagram raw payload extraction → `data/extractor.js`
- **Data Engine facade / verified ingest entry** → `data/engine.js`
- common `media[]` role/order → `data/media-model.js`
- verified provenance/source-rank/conflict → `store/verified-store.js`
- **compatibility item-cache persistence** → `store/verified-cache-store.js`
- **snapshot/account history read+write** → `store/history-store.js`
- **legacy capture write handoff** → `migration/capture-handoff.js`
- legacy cache read/change tracking → `migration/legacy-store-adapter.js`
- active Reel evidence → `migration/reel-context-adapter.js`
- ER / 24h / account-relative → `metrics/metrics.js`
- media resolution/filename → `media/media-resolver.js`
- media save destination/write → `media/download-manager.js`
- Workspace/Layout/RI/UI → 각 `ui/*`

## 4. Main flows

### Data / metrics

목표:

```text
Instagram
→ Identity → Extractor → Verified Store
→ Verified Cache / History / media[]
→ Metrics
→ Grid / Reel / Research Workspace
```

현재 writer cutover:

```text
legacy bootstrap scan
→ ri311 cache seed
→ main creates Data Engine from seed
→ capture-handoff install
→ legacy saveItem patch
→ data.ingestPatch()
→ Verified Store
├→ Verified Cache Store → ri311:items:v1
└→ History Store → snapshot/account history
```

handoff 설치 뒤 legacy `saveItem`는 Data Engine 결과를 in-memory `items`에 반영하고 return합니다. 따라서 기존 renderer parity는 유지하면서 legacy `scheduleStoreWrite()/recordSnapshot()/recordPost()` side-effect 경로를 건너뜁니다.

`data.ingest()`는 raw payload용, `data.ingestPatch()`는 migration compatibility용입니다. 다음 단계에서 legacy parser를 raw Extractor로 이동합니다.

Verified Store는 `legacy < permalink < dom < embedded < network` rank, provenance/conflict를 유지하며 missing=`0`을 만들지 않습니다.

### common media[]

```text
REEL/VIDEO → video + cover
PHOTO      → photo
CAROUSEL   → carousel-slide[] (순서/개수 유지)
```

`kind`는 Download Manager의 `video | cover | photo | carousel-slide`와 동일 계약입니다.

### Workspace / 위치

Workspace State:

```text
CLOSED | COMPACT | EXPANDED
GLOBAL | CONTENT
```

CONTENT=`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`, GLOBAL=`RI Home + Settings + 업데이트 바로가기`.

```text
전체 화면        → Global RI fixed anchor
카드·썸네일 내부 → Grid custom action/metrics
Reel 영상 영역   → minimal overlay
Workspace 내부   → header/tab/body/action/activity
```

실제 placement는 `ui/layout.js` + Android evidence owner.

### Download / Activity

```text
Grid / RI → Download Manager → media kind profile
video → 영상 | cover/photo → 사진·표지 | carousel-slide → 슬라이드
→ directory/default/prompt → write → Activity Store
```

Carousel prompt destination 1회, 지정폴더 실패 silent fallback 금지.

### Active Reel

```text
shared SPA activity
→ reel-context-adapter
→ scoped Reel link → exact media URL → exact Reel route
→ scoped native likes/comments/reposts
```

fuzzy shortcode 추측 / 별도 full DOM observer 금지.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`:

```text
▶ views → ER → 24h → × account-relative → date
```

Android identity/native metric/placement 확인 뒤 mount, 이후에만 legacy `#ri3-reels-overlay` 제거.

## 6. Migration boundary

```text
[완료] Identity → Extractor → Verified Store
[완료] History read owner → common media[] → passive Data Engine
[완료] verified cache/history write owner → Data Engine/Stores handoff
[다음] legacy parser/raw capture → data.ingest() parity
→ Grid/Reel renderer read 전환 → legacy-runtime 제거
```

bootstrap seed는 renderer 호환을 위해 남아 있으며 capture-handoff 이후에는 새 Store만 persistence/history side-effect를 소유합니다. Research data는 이 경계 정리 후 연결합니다.

Analysis 목표:

```text
포맷 → 문제제기형 | 리스트형 | Before/After | 튜토리얼 | 리뷰 | 스토리 | 비교 | 뉴스·정보
전환 장치 → 댓글 유도 | 저장 유도 | 공유 유도 | 프로필 이동 | 링크 클릭 | 구매 | DM
보조 → 훅 | CTA 위치 | 신뢰 장치 | 감정/긴급성
```

근거 없으면 분석값 생성 금지.

## 7. Build / architecture gate

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate: version/update drift, canonical docs markers, UI storage/File System/network 직접 접근, metrics DOM 접근, circular import, runtime `@require`, source line limit, duplicate block warning.

자동검증과 Android 실기기 검증은 분리합니다.
