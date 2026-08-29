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
├ data/ engine.js identity.js extractor.js media-model.js
├ migration/ legacy-store-adapter.js reel-context-adapter.js
├ store/ history-store.js settings-store.js verified-store.js
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
- Instagram media payload extraction → `data/extractor.js`
- **Data Engine runtime facade / legacy passive sync / ingest entry** → `data/engine.js`
- **common `media[]` role/order projection** → `data/media-model.js`
- **verified field provenance/source-rank/conflict** → `store/verified-store.js`
- **snapshot/account history API + legacy-compatible storage keys** → `store/history-store.js`
- 영상 / 사진·표지 / 슬라이드 저장정책·directory handle → `store/settings-store.js`
- legacy cache read/change tracking → `migration/legacy-store-adapter.js`
- active Reel identity/native metric evidence → `migration/reel-context-adapter.js`
- ER / 24h / account-relative → `metrics/metrics.js`
- cover/media/default filename → `media/media-resolver.js`
- media kind→저장 profile / destination/write/batch → `media/download-manager.js`
- Workspace/Layout/RI/UI owners → 각 `ui/*`

History read는 `history-store.js` 하나를 통해 Metrics와 migration adapter가 공유합니다. legacy runtime의 직접 history write는 writer cutover 전 임시 technical debt입니다.

## 4. Main flows

### Data / metrics

목표:

```text
Instagram
→ Identity → Extractor → Verified Store
→ History / media[]
→ Metrics Engine
→ Grid / Reel / Research Workspace
```

현재:

```text
legacy runtime writer
├→ ri311 cache → legacy adapter → data.syncLegacy()
│                              → Verified Store → media[]
└→ ri311 history → History Store → Metrics

UI renderer → legacy adapter (아직 유지)
```

`data.ingest()`는 검증된 writer 진입점으로 준비됐지만 Instagram capture callsite에는 아직 연결하지 않습니다. Verified Store는 `legacy < permalink < dom < embedded < network` rank와 provenance/conflict를 보존하며 missing=`0`을 만들지 않습니다.

### common media[]

```text
REEL/VIDEO → video + cover
PHOTO      → photo
CAROUSEL   → carousel-slide[] (원래 순서/개수 유지)
```

`kind`는 Download Manager의 `video | cover | photo | carousel-slide`와 동일 계약을 사용합니다.

### Workspace / 위치

CONTENT=`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`, GLOBAL=`RI Home + Settings + 업데이트 바로가기`.

```text
전체 화면        → Global RI fixed anchor
카드·썸네일 내부 → Grid custom action/metrics
Reel 영상 영역   → minimal overlay
Workspace 내부   → header/tab/body/action/activity
```

실제 offset/좌우 placement는 `ui/layout.js`와 Android evidence가 owner입니다.

### Download / Activity

```text
Grid / RI action → Download Manager → media kind profile
video → 영상 | cover/photo → 사진·표지 | carousel-slide → 슬라이드
→ directory/default/prompt → write → Activity Store
```

Carousel prompt는 destination 1회 선택 후 개별 저장, 지정폴더 실패는 silent fallback 금지.

### Active Reel

```text
shared SPA activity
→ reel-context-adapter
→ scoped Reel link → exact media URL → exact Reel route
→ scoped native likes/comments/reposts
```

fuzzy shortcode 추측 및 별도 full DOM observer 금지.

## 5. Staged Reel overlay replacement

`ui/reel-overlay.js`는 새 Metrics owner 기반 replacement source입니다.

```text
▶ views → ER → 24h → × account-relative → date
```

Android identity/native metric/placement 확인 뒤 mount하고, 그 이후에만 legacy `#ri3-reels-overlay`를 제거합니다.

## 6. Migration boundary

```text
[완료] Identity → Extractor → Verified Store foundation
[완료] History read owner → common media[] → passive runtime Data Engine wiring
[다음] legacy capture → data.ingest() + History Store write → parity → legacy writer 제거
→ Grid/Reel renderer read 전환 → legacy-runtime 제거
```

writer cutover 전 새 Data Engine과 legacy runtime이 같은 cache를 동시에 쓰지 않습니다. Research data는 이 경계 정리 후 연결합니다.

Analysis 목표:

```text
포맷 → 문제제기형 | 리스트형 | Before/After | 튜토리얼 | 리뷰 | 스토리 | 비교 | 뉴스·정보
전환 장치 → 댓글 유도 | 저장 유도 | 공유 유도 | 프로필 이동 | 링크 클릭 | 구매 | DM
보조 → 훅 | CTA 위치 | 신뢰 장치 | 감정/긴급성
```

근거 데이터가 없으면 분석값을 만들지 않습니다.

## 7. Build / architecture gate

```bash
npm test
npm run build
npm run check
node --check ri-retry.user.js
```

자동 gate: version/update drift, canonical docs, UI storage/File System/network 직접 접근, metrics DOM 접근, circular import, runtime `@require`, source line limit, duplicate block warning.

자동검증과 Android Edge 실기기 검증은 구분합니다.
