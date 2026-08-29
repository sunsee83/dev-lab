# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.12**
- Environment: Android Microsoft Edge + Tampermonkey + Instagram mobile web
- Source of truth: `src/*`
- Artifact: `ri-retry.user.js` (generated, 직접 수정 금지)
- Phase: **v3.2 Mobile UI/Foundation + Data Engine migration**

## Current Objective

```text
Grid 비교 → Reel 최소 지표 → Research Workspace → Data Engine → Research data
```

위치는 `[기준 영역 · 위치]`; 실제 좌표/충돌은 Android gate 전 확정하지 않습니다.

## Current Source Checkpoint

Active:

- AppContext/shared SPA + Settings/Download/Activity
- 미디어별 저장: 영상 / 사진·표지 / 슬라이드 (`directory | default | prompt` 독립)
- Grid quick-save / Global RI / Bottom Workspace / CONTENT 6탭
- History Store + Verified Cache Store read/write owner
- Data Engine: Verified Store + `media[]` + structured/permalink/patch ingest
- structured JSON capture → Extractor → Data Engine
- permalink inline JSON → raw Extractor; HTML fallback → Permalink Extractor
- Data Engine read facade: route identity + exact media URL lookup
- Grid quick-save / RI Workspace / active Reel context read → Data Engine
- **legacy Reel visual context → modern reel-context-adapter handoff**
- **DOM owner/mediaType/canonical enrichment → Data Engine `ingestPatch()` once per stable Reel identity**

Compatibility still active:

- legacy `reelContext()` fuzzy/DOM branch는 context handoff 부재 시 emergency fallback
- legacy `parsePermalink()`은 permalink handoff 부재 시 emergency fallback
- legacy adapter는 cache/change-tracking migration boundary로만 유지
- legacy runtime Grid metric renderer / Reel overlay visual body는 아직 유지
- Android gate 전 새 Reel overlay mount 금지

## Automated Checkpoint

- unit: **52 / 52 pass**
- build: **v3.2.12 success**
- architecture/syntax: **success**
- source files: **36**
- architecture warnings: **0**
- generated userscript: current

## Preserve

세부 owner=`BASELINE.md`.

- Grid 3열 / 8-slot / no-flicker / Photo·Carousel bogus views 차단
- actual Video/Reel cover / native media-type icon
- 기존 Reel visual/legacy overlay 선제 삭제 금지
- CONTENT 6탭 / 큰 업데이트 바로가기
- Carousel individual files / no ZIP / slide 순서·개수 보존
- 지정폴더 실패 silent fallback 금지
- missing metric → fabricated zero 금지
- provenance/conflict 보호
- one shared SPA observer

## Unverified / Device

Android Edge 실확인 필요:

- Global RI touch/collision
- COMPACT/EXPANDED, CONTENT/GLOBAL, keyboard/visualViewport
- active Reel shortcode/native metrics/exact media mapping
- **modern context handoff가 vertical Reel 전환마다 legacy visual과 동일 콘텐츠를 유지하는지**
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- directory photo/cover CORS / prompt Carousel destination
- Grid 3열/8-slot/no-flicker/actual cover

실기기 전 Verified 승격 금지.

## Technical Debt

- verified cache/history writer cutover 완료
- structured JSON + permalink HTML normal capture cutover 완료
- Grid quick-save / RI Workspace / Reel context Data Engine read cutover 완료
- legacy Reel visual context normal path를 modern context owner로 통합 완료
- legacy Reel fuzzy context branch / permalink parser는 emergency fallback으로 남음
- legacy Grid metric renderer + Reel metric formula/visual body 남음
- staged Reel overlay replacement 미완료
- Research Content/Comments/Analysis data model 미연결

## Next Execution Order

1. **Device gate** — UI-C/D/E + Reel identity/native metrics + 저장설정 + context handoff
2. **UI-F2 Reel Overlay replacement** — evidence → mount → parity → legacy Reel visual/fuzzy fallback 제거
3. **Legacy Grid metric renderer migration** — Data Engine/Metrics read → frozen parity → legacy formula 제거
4. **Fallback cleanup** — device evidence 후 legacy permalink/Reel emergency parser 제거
5. **Research data** — Content → Comments → Analysis → STT/OCR/AI

Device gate와 독립적인 Grid renderer 준비는 진행 가능. Frozen visual은 parity 전 제거하지 않습니다.

## Work Protocol

```text
STATUS → BASELINE → ARCHITECTURE/PROJECT_PLAN → source/test
목적 → PRESERVE/REPLACE/REMOVE-APPROVED → owner/data-flow → code+test
→ build/check → STATUS → device 항목 Unverified
```

완료 조건: 회귀 없음 / owner 중복 없음 / test·build·check·generated syntax 통과 / version 일치 / Android는 실확인 전 완료 금지.
