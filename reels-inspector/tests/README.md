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
- `foundation.test.mjs` — AppContext/capability/clipboard/settings/download/workspace/layout
- `migration.test.mjs` — legacy adapter/history/media resolver
- `metrics.test.mjs` — ER/24h/account relative
- `reel-context.test.mjs` — active Reel evidence/native count/exact media mapping
- `reel-overlay.test.mjs` — staged overlay/Metrics owner/replacement gate
- `route-identity.test.mjs` — same-URL SPA identity refresh
- `settings-media.test.mjs` — v1→v2 save policy migration / media profile destination
- `ui-launcher.test.mjs` — RI visual/touch geometry
- `ui-workspace.test.mjs` — Bottom Sheet/CONTENT-GLOBAL/Settings/Activity/update

Settings/download 자동검증:

- v1 global setting → v2 `video | image | carousel` policy migration
- profile별 mode 독립 유지
- photo/cover는 image, video는 video, carousel-slide는 carousel destination 사용
- directory failure silent fallback 금지
- prompt Carousel destination 1회 선택

## 2. Must-not-regress

- Grid 3 columns, 2 rows / 8 fixed slots / no-flicker
- Photo/Carousel bogus views 금지
- native media-type icon + custom media action 1/card
- actual Video/Reel cover, music/album/avatar reject
- Carousel individual files / no ZIP
- 큰 update shortcut 보존
- CONTENT 6 tabs / GLOBAL RI Home
- one Workspace State / Layout / Activity owner
- second full DOM observer 금지
- missing metric → fabricated zero 금지
- media별 저장정책 분리 때문에 기존 download action/filename 규칙 회귀 금지

## 3. Active Reel / Overlay gate

자동검증:

- shortcode evidence: `scoped → exact media → route`
- fuzzy owner/metric shortcode 추측 금지
- Korean/K/M/B/grouped native count parsing
- same-href Reel 이동도 shared observer activity로 identity refresh
- staged overlay는 `metrics.summarize()` 사용
- output `▶ / ER / 24h / × / date`, missing line hide
- 별도 MutationObserver 없음
- device gate 전 new overlay runtime mount 금지
- device gate 전 legacy `#ri3-reels-overlay` hide/delete 금지

## 4. Android Edge device acceptance

자동 test와 별도로 실제 확인:

- Global RI 1개, touch/collision, `[전체 화면 · 하단 안전영역]` 배치 타당성
- Grid custom UI `[카드·썸네일 내부]` 회귀 없음
- Reel overlay `[Reel 영상 영역]` rail/caption 침범 없음
- Workspace compact/expanded/close/keyboard + CONTENT/GLOBAL
- Activity progress + persistent error → Settings
- vertical Reel active shortcode / scoped native metrics 동일성
- update shortcut → Tampermonkey
- **영상 / 사진·표지 / 슬라이드별 mode·지정폴더 선택·복원**
- 서로 다른 profile에 서로 다른 폴더 지정 후 올바른 destination 사용
- directory photo/cover CORS
- prompt / Carousel same destination
- Grid 3열/8-slot/no-flicker/actual cover

실기기 확인 전 `STATUS.md`에서 Verified로 승격하지 않습니다.

## 5. Architecture gate

`npm run check`는 최소한 다음을 막습니다.

- version/update URL drift / 업데이트 바로가기 삭제
- canonical docs marker 누락
- UI의 storage/File System/network 직접 접근
- metrics DOM 접근 / circular import / runtime `@require`
- 일반 source >500 lines / >350 lines warning
- duplicate block warning
