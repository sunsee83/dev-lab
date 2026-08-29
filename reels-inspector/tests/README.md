# Reels Inspector — Tests / Acceptance

세부 제품 기준은 `../BASELINE.md`, 현재 checkpoint는 `../STATUS.md`가 owner입니다. 이 문서는 **무엇을 자동/실기기로 확인할지**만 정리합니다.

## 1. Automated

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

현재 unit suites:

- `activity.test.mjs` — Activity merge/progress/actionable error
- `foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `migration.test.mjs` — legacy adapter/history/media resolver
- `metrics.test.mjs` — ER/24h/account relative
- `reel-context.test.mjs` — active Reel evidence/native count/exact media mapping
- `reel-overlay.test.mjs` — staged overlay/Metrics owner/replacement gate
- `route-identity.test.mjs` — same-URL SPA activity identity refresh
- `ui-launcher.test.mjs` — RI visual/touch geometry
- `ui-workspace.test.mjs` — Bottom Sheet/CONTENT-GLOBAL/Settings/Activity/update

## 2. Must-not-regress

- Grid 3 columns, 2 rows / 8 fixed slots
- no-flicker / same renderKey rewrite 방지
- Photo/Carousel bogus views 금지
- native media-type icon + custom media action 1/card
- actual Video/Reel cover, music/album/avatar reject
- Carousel individual files / no ZIP / destination 1회
- directory failure silent fallback 금지
- update shortcut 보존
- CONTENT 6 tabs / GLOBAL RI Home
- one Workspace State / Layout / Activity owner
- second full DOM observer 금지
- missing metric → fabricated zero 금지

## 3. Active Reel / Overlay gate

자동검증:

- shortcode evidence: `scoped → exact media → route`
- fuzzy owner/metric shortcode 추측 금지
- Korean/K/M/B/grouped native count parsing
- same-href Reel 이동에서도 shared observer activity로 identity refresh
- staged overlay는 `metrics.summarize()` 사용
- output `▶ / ER / 24h / × / date`, missing line hide
- staged overlay에 별도 MutationObserver 없음
- device gate 전 new overlay를 runtime mount하지 않음
- device gate 전 legacy `#ri3-reels-overlay` 선제 hide/delete 금지

## 4. Android Edge device acceptance

자동 test와 별도로 실제 확인:

- Global RI 1개, touch/collision
- Workspace compact/expanded/close/keyboard
- CONTENT/GLOBAL presentation
- Activity progress + persistent error → Settings
- vertical Reel active shortcode / scoped native metrics 동일성
- staged overlay rail/caption placement
- Grid 3열/8-slot/no-flicker/cover
- update shortcut → Tampermonkey
- directory photo/cover CORS
- prompt / Carousel same destination

실기기 확인 전 `STATUS.md`에서 Verified로 승격하지 않습니다.

## 5. Architecture gate

`npm run check`는 최소한 다음을 막습니다.

- version/update URL drift
- 업데이트 바로가기 삭제
- canonical docs 핵심 marker 누락
- UI의 storage/File System/network 직접 접근
- metrics의 DOM 접근
- circular import
- runtime `@require`
- 일반 source >500 lines
- duplicate block / >350 lines warning
