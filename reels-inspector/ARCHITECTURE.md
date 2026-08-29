# Instagram Content Research Tool — Architecture

현재 코드 구조와 owner만 다룹니다. 제품 목표=`PROJECT_PLAN.md`, 보존=`BASELINE.md`, 현재 상태/순서=`STATUS.md`.

## 1. 원칙

- **Single Owner / Single Data Flow / Single Side-Effect Path**
- **Progressive Migration** / **No rollback-by-refactor**
- 빈 `utils.js`, `backup.js`, `hotfix.js`, runtime override stack 금지

## 2. 현재 source

```text
src/
├ version.js main.js legacy-runtime.js
├ core/ activity.js app.js capability.js clipboard.js
├ data/ engine.js identity.js extractor.js permalink-extractor.js media-model.js
├ migration/ capture-handoff.js legacy-store-adapter.js legacy-renderer-handoff.js
│             reel-context-adapter.js reel-context-handoff.js
├ store/ history-store.js settings-store.js verified-cache-store.js verified-store.js
├ metrics/ metrics.js
├ media/ media-resolver.js download-manager.js
└ ui/ activity-indicator.js grid.js layout.js metric-format.js reel-overlay.js
       research-workspace.js ri-panel.js ri-primitives.js ri-settings.js
       ri-summary.js styles.js toast.js workspace-state.js
```

`ri-retry.user.js`는 generated artifact, 직접 수정 금지.

## 3. Owner map

- version/update → `version.js`
- route/shared SPA → `core/app.js`; activity → `core/activity.js`
- identity → `data/identity.js`
- structured payload → `data/extractor.js`; permalink HTML fallback → `data/permalink-extractor.js`
- verified ingest + post/context read → `data/engine.js`
- common `media[]` → `data/media-model.js`
- provenance/rank/conflict → `store/verified-store.js`
- cache persistence → `store/verified-cache-store.js`; history → `store/history-store.js`
- legacy raw/permalink/patch bridge → `migration/capture-handoff.js`
- legacy cache/change tracking → `migration/legacy-store-adapter.js`
- **Data Engine post + Metrics summary → legacy Grid/Reel visual bridge → `migration/legacy-renderer-handoff.js`**
- active Reel DOM evidence/context → `migration/reel-context-adapter.js`
- modern Reel context → legacy visual bridge/DOM enrichment → `migration/reel-context-handoff.js`
- ER/24h/account-relative → `metrics/metrics.js`
- media resolution/filename → `media/media-resolver.js`; save → `media/download-manager.js`
- Workspace/Layout/RI/UI → 각 `ui/*`

## 4. Main flows

### Data / metrics

```text
structured JSON → Extractor ┐
permalink HTML → Permalink Extractor ├→ Data Engine → Verified Store
DOM identity enrichment → ingestPatch ┘

Verified Store
├→ Verified Cache Store
├→ History Store → Metrics
├→ common media[]
├→ modern UI/context
└→ legacy-renderer-handoff → frozen legacy Grid/Reel DOM visual
```

legacy-renderer-handoff는 Grid에서는 stored post를, Reel에서는 scoped native likes/comments/reposts를 stored post에 merge한 뒤 **동일 Metrics Engine**으로 ER/24h/account-relative를 계산합니다. legacy 시각 markup/position/string은 바꾸지 않습니다.

missing=`0` 금지, source rank=`legacy < permalink < dom < embedded < network`.

### Active Reel

```text
shared SPA → reel-context-adapter
  scoped link → Data Engine exact media → exact route
  + scoped native metrics
→ reel-context-handoff
  ├→ Data Engine DOM enrichment
  ├→ App identity
  └→ legacy Reel visual context
→ legacy-renderer-handoff
  └→ Data Engine post + live metrics → Metrics
→ existing legacy Reel overlay DOM
```

정상 경로에서 fuzzy context와 legacy metric formula는 사용하지 않습니다. 둘 다 hook 부재/실패 시 emergency fallback입니다.

### Grid

```text
legacy Grid DOM discovery/card markup (Frozen)
→ renderer handoff(code)
→ Data Engine post + Metrics
→ 기존 2행/8-slot 문자열 렌더
```

Grid 구조/slot 좌표/no-flicker는 그대로 유지합니다. source renderer extraction은 별도 parity 단계입니다.

### Workspace / 위치

```text
CLOSED | COMPACT | EXPANDED
GLOBAL | CONTENT
```

CONTENT=`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`, GLOBAL=`RI Home + Settings + 업데이트 바로가기`.

```text
전체 화면 → Global RI
카드·썸네일 내부 → Grid
Reel 영상 영역 → minimal overlay
Workspace 내부 → header/tab/body/action/activity
```

실제 placement=`ui/layout.js` + Android evidence.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`: `▶ views → ER → 24h → × account-relative → date`.
Android context/renderer handoff와 placement 확인 뒤 mount, 이후에만 legacy `#ri3-reels-overlay`와 fallback formula/context 제거.

## 6. Migration boundary

```text
[완료] Identity/Extractor/Verified Store/History/media[]
[완료] cache/history writer + structured/permalink capture
[완료] modern Grid quick-save / RI Workspace / Reel context → Data Engine read
[완료] legacy Reel context normal path → modern context
[완료] legacy Grid/Reel metric normal path → Data Engine + Metrics
[다음] Device parity → Reel overlay replacement
→ Frozen Grid DOM source renderer extraction
→ emergency fallback 제거 → legacy-runtime 축소
```

## 7. Build / architecture gate

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate와 Android Edge 실기기 검증은 분리합니다.
