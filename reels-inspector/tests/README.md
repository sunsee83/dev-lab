# Reels Inspector — Tests / Acceptance

제품 기준=`../BASELINE.md`, checkpoint=`../STATUS.md`.

## 1. Automated

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

주요 suites:

- `data-engine.test.mjs` — Identity/Extractor/Verified Store + legacy-shaped raw parity
- `data-runtime.test.mjs` — History/Verified Cache/media[]/raw+patch handoff
- `foundation.test.mjs` — AppContext/capability/settings/download/workspace/layout
- `migration.test.mjs` — legacy adapter/history/media resolver
- `metrics.test.mjs` — ER/24h/account relative
- `reel-context.test.mjs` / `reel-overlay.test.mjs` — active Reel/staged overlay
- `settings-media.test.mjs` / UI suites — media policy/launcher/workspace/activity/update

Data Engine acceptance:

- `code|shortcode|short_code` identity
- direct/nested verified metrics; missing 유지
- alternate video/image evidence
- `carousel_media|carouselMedia|edge_sidecar_to_children` + slide order/count
- source rank/provenance/conflict
- Verified Cache Store owns `ri311:items:v1`
- History Store owns snapshot/account history
- structured raw capture calls Extractor before legacy parser fallback
- compatibility patch handoff precedes legacy write side effects

## 2. Must-not-regress

- Grid 3 columns / 8 slots / no-flicker
- Photo/Carousel bogus views 금지
- native media-type icon + custom action 1/card
- actual Video/Reel cover; music/album/avatar reject
- Carousel individual files / no ZIP / slide order-count
- update shortcut / CONTENT 6 tabs / GLOBAL RI Home
- one Workspace/Layout/Activity owner; second full DOM observer 금지
- missing metric → zero 금지; provenance/conflict 유지

## 3. Active Reel / Overlay gate

- identity=`scoped → exact media → route`
- fuzzy owner/metric shortcode 추측 금지
- Korean/K/M/B/grouped count
- same-href 이동 shared observer
- staged overlay=`▶ / ER / 24h / × / date`
- device gate 전 new overlay mount/legacy overlay 삭제 금지

## 4. Android Edge device acceptance

- Global RI touch/collision `[전체 화면 · 하단 안전영역]`
- Grid `[카드·썸네일 내부]` 회귀 없음
- Reel `[Reel 영상 영역]` rail/caption 침범 없음
- Workspace compact/expanded/keyboard + CONTENT/GLOBAL
- active Reel identity/native metrics
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- directory photo-cover CORS / prompt Carousel destination 1회
- Grid 3열/8-slot/no-flicker/actual cover

실기기 전 `STATUS.md` Verified 승격 금지.

## 5. Architecture gate

version/update drift, canonical markers, UI storage/File System/network 직접 접근, metrics DOM 접근, circular import/runtime `@require`, line limit, duplicate block warning.
