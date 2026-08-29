# Reels Inspector — Tests / Acceptance

제품 기준=`../BASELINE.md`, 현재 checkpoint=`../STATUS.md`. 자동/실기기 확인 범위만 정리합니다.

## 1. Automated

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

주요 suites:

- `activity.test.mjs` — Activity merge/progress/actionable error
- `data-engine.test.mjs` — Identity/Extractor/Verified Store
- `data-runtime.test.mjs` — History/Verified Cache/common media/Data Engine writer handoff
- `foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `migration.test.mjs` — legacy adapter/history/media resolver
- `metrics.test.mjs` — ER/24h/account relative
- `reel-context.test.mjs` — active Reel evidence/native count/exact media
- `reel-overlay.test.mjs` — staged overlay/replacement gate
- `route-identity.test.mjs` — same-URL SPA identity refresh
- `settings-media.test.mjs` — v1→v2 save policy/media destination
- `ui-launcher.test.mjs` / `ui-workspace.test.mjs` — launcher/workspace/settings/activity/update

Data Engine acceptance:

- route identity / exact payload extraction / missing 유지
- source rank/provenance/conflict / weaker overwrite 차단
- History Store positive real views only
- common `media[]` role + Carousel order/count
- Verified Cache Store owns `ri311:items:v1` persistence
- active legacy `saveItem` handoff occurs before legacy cache/history side effects
- raw `ingest()` + migration `ingestPatch()` both record through Data Engine/History Store

## 2. Must-not-regress

- Grid 3 columns / 8 slots / no-flicker
- Photo/Carousel bogus views 금지
- native media-type icon + custom media action 1/card
- actual Video/Reel cover; music/album/avatar reject
- Carousel individual files / no ZIP
- 큰 update shortcut / CONTENT 6 tabs / GLOBAL RI Home
- one Workspace/Layout/Activity owner
- second full DOM observer 금지
- missing metric → fabricated zero 금지
- provenance/conflict + media save filename/action 회귀 금지

## 3. Active Reel / Overlay gate

- shortcode evidence: `scoped → exact media → route`
- fuzzy owner/metric shortcode 추측 금지
- Korean/K/M/B/grouped native count parsing
- same-href 이동도 shared observer 사용
- staged overlay=`metrics.summarize()`, `▶ / ER / 24h / × / date`
- device gate 전 new overlay mount 및 legacy overlay hide/delete 금지

## 4. Android Edge device acceptance

- Global RI 1개, touch/collision, `[전체 화면 · 하단 안전영역]`
- Grid `[카드·썸네일 내부]` 회귀 없음
- Reel `[Reel 영상 영역]` rail/caption 침범 없음
- Workspace compact/expanded/keyboard + CONTENT/GLOBAL
- active Reel shortcode/native metrics 동일성
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- profile별 다른 destination / directory photo-cover CORS / prompt Carousel destination 1회
- Grid 3열/8-slot/no-flicker/actual cover

실기기 전 `STATUS.md` Verified 승격 금지.

## 5. Architecture gate

`npm run check`: version/update drift, canonical markers, UI storage/File System/network 직접 접근, metrics DOM 접근, circular import/runtime `@require`, source line limit, duplicate block warning.
