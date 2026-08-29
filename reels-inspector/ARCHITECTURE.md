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
├ migration/ capture-handoff.js legacy-store-adapter.js reel-context-adapter.js
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
- structured Instagram payload extraction/evidence → `data/extractor.js`
- **permalink HTML meta/near-metric fallback → `data/permalink-extractor.js`**
- **verified ingest + renderer/context read facade → `data/engine.js`**
- common `media[]` → `data/media-model.js`
- provenance/rank/conflict → `store/verified-store.js`
- compatibility cache persistence → `store/verified-cache-store.js`
- snapshot/account history → `store/history-store.js`
- **legacy raw/permalink/patch bridge → `migration/capture-handoff.js`**
- legacy cache/change tracking only → `migration/legacy-store-adapter.js`
- active Reel DOM evidence/context → `migration/reel-context-adapter.js`
- ER/24h/account-relative → `metrics/metrics.js`
- media resolution/filename → `media/media-resolver.js`; save → `media/download-manager.js`
- Workspace/Layout/RI/UI → 각 `ui/*`

## 4. Main flows

### Data / metrics

```text
structured JSON network/embedded scan
→ raw capture handoff
→ Extractor
→ Data Engine
→ Verified Store
├→ Verified Cache Store
├→ History Store → Metrics
├→ common media[]
└→ read facade → Grid quick-save / RI Workspace / Reel context
```

Permalink fetch는 inline JSON을 먼저 같은 raw path로 흘린 뒤 HTML fallback만 별도 owner로 처리합니다.

```text
permalink HTML
├→ inline JSON scan → raw handoff → Extractor
└→ HTML meta/near metric → permalink handoff → Permalink Extractor → Data Engine
```

legacy `parsePermalink()`은 handoff 부재 시 emergency fallback일 뿐 normal owner가 아닙니다.

Data Engine read facade가 shortcode route identity와 normalized exact media URL lookup을 소유합니다. UI는 migration adapter의 `getPost()`/`getCurrentIdentity()`를 직접 호출하지 않습니다.

Compatibility:

```text
DOM/Reel identity patch
→ legacy saveItem
→ patch handoff
→ data.ingestPatch()
```

모든 ongoing cache/history side effect는 Data Engine/Store owner이며 legacy 직접 write는 handoff 성공 시 실행되지 않습니다. missing=`0` 금지, source rank=`legacy < permalink < dom < embedded < network`.

legacy adapter는 cache fingerprint/change tracking 및 external/compatibility sync 경계로만 남습니다. legacy runtime 내부 Grid metric/Reel overlay renderer는 아직 자체 in-memory `items`를 읽으므로 별도 migration 대상입니다.

### common media[]

```text
REEL/VIDEO → video + cover
PHOTO      → photo
CAROUSEL   → carousel-slide[] (원래 순서/개수 유지)
```

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

### Active Reel / Download

```text
shared SPA → reel-context-adapter → scoped → Data Engine exact media → route
Grid/RI → Data Engine post → Download Manager → video|image|carousel policy → Activity
```

fuzzy shortcode/별도 full DOM observer/silent directory fallback 금지.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`: `▶ views → ER → 24h → × account-relative → date`.
Android placement/identity 확인 뒤 mount, 이후에만 legacy `#ri3-reels-overlay` 제거.

## 6. Migration boundary

```text
[완료] Identity → Extractor → Verified Store
[완료] History/media[]/runtime wiring
[완료] cache/history writer handoff
[완료] structured JSON raw capture → Extractor
[완료] Grid quick-save / RI Workspace / Reel context → Data Engine read
[완료] permalink HTML normal fallback → Permalink Extractor
[다음] DOM/Reel compatibility patch 정리
→ legacy Grid metric/Reel renderer read 전환 → legacy-runtime 제거
```

Analysis 목표: 포맷=`문제제기형|리스트형|Before/After|튜토리얼|리뷰|스토리|비교|뉴스·정보`; 전환=`댓글|저장|공유|프로필|링크|구매|DM`; 보조=`훅|CTA 위치|신뢰|감정·긴급성`. 근거 없으면 생성 금지.

## 7. Build / architecture gate

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate와 Android Edge 실기기 검증은 분리합니다.
