# Reels Inspector — Tests / Acceptance

세부 제품 기준=`../BASELINE.md`, 현재 checkpoint=`../STATUS.md`. 이 문서는 자동/실기기 확인 범위만 정리합니다.

## 1. Automated

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

현재 unit suites:

- `activity.test.mjs` — Activity merge/progress/actionable error
- `data-engine.test.mjs` — Identity/Extractor/Verified Store foundation
- `data-runtime.test.mjs` — History Store/common `media[]`/passive Data Engine runtime
- `foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `migration.test.mjs` — legacy adapter/history delegation/media resolver
- `metrics.test.mjs` — ER/24h/account relative
- `reel-context.test.mjs` — active Reel evidence/native count/exact media mapping
- `reel-overlay.test.mjs` — staged overlay/Metrics owner/replacement gate
- `route-identity.test.mjs` — same-URL SPA identity refresh
- `settings-media.test.mjs` — v1→v2 save policy migration / media profile destination
- `ui-launcher.test.mjs` — RI visual/touch geometry
- `ui-workspace.test.mjs` — Bottom Sheet/CONTENT-GLOBAL/Settings/Activity/update

Data Engine:

- route/canonical identity normalization, exact payload extraction
- source rank/provenance/confidence/conflict, missing metric 유지
- History Store는 기존 `ri311` history를 읽고 real positive views만 기록
- Metrics history read owner=`History Store`
- `media[]`: video/cover/photo/carousel-slide, Carousel 순서/개수 보존
- passive `data.syncLegacy()`는 legacy cache를 read-model로 동기화
- `data.ingest()`는 단위검증하지만 Instagram capture callsite는 아직 미전환

Settings/download:

- v1 global → v2 `video | image | carousel`
- profile별 mode/directory 독립
- photo/cover→image, video→video, carousel-slide→carousel
- directory failure silent fallback 금지
- prompt Carousel destination 1회

## 2. Must-not-regress

- Grid 3 columns, 2 rows / 8 fixed slots / no-flicker
- Photo/Carousel bogus views 금지
- native media-type icon + custom media action 1/card
- actual Video/Reel cover, music/album/avatar reject
- Carousel individual files / no ZIP / slide order-count 유지
- 큰 update shortcut / CONTENT 6 tabs / GLOBAL RI Home
- one Workspace State / Layout / Activity owner
- second full DOM observer 금지
- missing metric → fabricated zero 금지
- verified provenance/conflict 보호
- media별 저장정책 때문에 기존 action/filename 회귀 금지

## 3. Active Reel / Overlay gate

- shortcode evidence: `scoped → exact media → route`
- fuzzy owner/metric shortcode 추측 금지
- Korean/K/M/B/grouped native count parsing
- same-href 이동도 shared observer로 identity refresh
- staged overlay=`metrics.summarize()`, `▶ / ER / 24h / × / date`
- missing line hide / 별도 MutationObserver 금지
- device gate 전 new overlay mount 및 legacy `#ri3-reels-overlay` hide/delete 금지

## 4. Android Edge device acceptance

- Global RI 1개, touch/collision, `[전체 화면 · 하단 안전영역]`
- Grid custom UI `[카드·썸네일 내부]` 회귀 없음
- Reel overlay `[Reel 영상 영역]` rail/caption 침범 없음
- Workspace compact/expanded/close/keyboard + CONTENT/GLOBAL
- Activity progress + persistent error → Settings
- vertical Reel active shortcode / scoped native metrics 동일성
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·지정폴더 선택·복원
- profile별 서로 다른 폴더 destination
- directory photo/cover CORS / prompt Carousel same destination
- Grid 3열/8-slot/no-flicker/actual cover

실기기 확인 전 `STATUS.md`에서 Verified로 승격하지 않습니다.

## 5. Architecture gate

`npm run check`: version/update drift, canonical docs, UI direct side effect, metrics DOM, circular import, runtime `@require`, source line limit, duplicate block warning.
