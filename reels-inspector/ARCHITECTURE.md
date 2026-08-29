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
├ data/ content-model.js engine.js identity.js extractor.js permalink-extractor.js media-model.js
├ migration/ capture-handoff.js legacy-store-adapter.js legacy-renderer-handoff.js
│             reel-context-adapter.js reel-context-handoff.js
├ store/ history-store.js settings-store.js verified-cache-store.js verified-store.js
├ metrics/ metrics.js
├ media/ media-resolver.js download-manager.js
└ ui/ activity-indicator.js grid.js grid-metrics-renderer.js layout.js metric-format.js
       reel-overlay.js research-workspace.js ri-panel.js ri-primitives.js ri-settings.js
       ri-summary.js styles.js toast.js workspace-state.js
```

`ri-retry.user.js`는 generated artifact, 직접 수정 금지.

## 3. Owner map

- version/update → `version.js`
- route/shared SPA → `core/app.js`; activity → `core/activity.js`
- identity → `data/identity.js`
- **caption/hashtags/mentions extraction contract → `data/content-model.js`**
- structured payload → `data/extractor.js`; permalink HTML fallback → `data/permalink-extractor.js`
- verified ingest + post/context read → `data/engine.js`
- common `media[]` → `data/media-model.js`
- provenance/rank/conflict + common post projection → `store/verified-store.js`
- cache persistence → `store/verified-cache-store.js`; history → `store/history-store.js`
- legacy bridges → `migration/*`
- ER/24h/account-relative → `metrics/metrics.js`
- staged Frozen Grid projection → `ui/grid-metrics-renderer.js`
- staged Reel overlay → `ui/reel-overlay.js`
- media resolution/filename → `media/media-resolver.js`; save → `media/download-manager.js`
- Workspace/Layout/RI/UI → 각 `ui/*`

## 4. Main flows

### Data / metrics

```text
Instagram structured payload
→ Extractor
   ├→ identity/metrics/media
   └→ Content Model → caption/hashtags/mentions
→ Data Engine → Verified Store
   ├→ Verified Cache Store
   ├→ History Store → Metrics
   ├→ common media[]
   └→ post.content
```

Caption/content fields는 Instagram에서 실제 evidence가 있을 때만 patch에 포함합니다. Caption edit가 가능한 점을 반영해 `caption|hashtags|mentions`는 replaceable verified fields이며, source rank가 더 약하면 기존 값을 덮지 못합니다.

```text
post.content
├ caption: string
├ hashtags: string[]
└ mentions: string[]
```

Hashtag는 Unicode 문자/숫자/underscore를 인식하고 원문 순서를 보존합니다. Mention은 Instagram username 문자집합을 사용하며 case-insensitive dedupe 후 첫 표기를 보존합니다.

missing=`0`/빈 문자열 생성으로 대체하지 않습니다.

### Active renderer migration

```text
Data Engine post + Metrics
→ legacy-renderer-handoff
→ current frozen Grid/Reel DOM
```

active visual은 device parity 전 유지. staged `ui/grid-metrics-renderer.js`, `ui/reel-overlay.js`는 `main.js`에서 아직 mount하지 않습니다.

### Workspace / 위치

```text
CLOSED | COMPACT | EXPANDED
GLOBAL | CONTENT
```

CONTENT=`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`, GLOBAL=`RI Home + Settings + 업데이트 바로가기`.

현재 `콘텐츠` 탭 UI는 placeholder지만 Data Engine `post.content`는 준비됐습니다. 향후 연결 순서:

```text
caption → 전체 본문
hashtags → 해시태그
mentions → 언급 계정
→ STT/OCR 추가 evidence는 별도 owner로 확장
```

실제 mobile density/scroll은 Android evidence가 owner입니다.

## 5. Staged visual replacements

- Grid: Frozen 4+4 slot source projection 준비, runtime 미전환.
- Reel: `▶ views → ER → 24h → × account-relative → date` source 준비, runtime 미전환.
- Android context/layout parity 뒤에만 active switch 및 legacy visual 제거.

## 6. Migration boundary

```text
[완료] Identity/Extractor/Verified Store/History/media[]
[완료] cache/history writer + structured/permalink capture
[완료] modern UI/context + legacy normal renderer reads → Data Engine/Metrics
[준비] Frozen Grid / Reel visual replacements — runtime 미전환
[완료] Research Content data foundation — UI 미연결
[다음] Device parity / Content UI → Comments → Analysis → STT/OCR/AI
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
