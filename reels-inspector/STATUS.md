# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.4**
- Environment: Android Microsoft Edge + Tampermonkey + Instagram mobile web
- Source of truth: `src/*`
- Artifact: `ri-retry.user.js` (generated, 직접 수정 금지)
- Phase: **v3.2 Mobile UI/Foundation + Active Reel Context migration**

## Current Objective

기존 Grid/미디어/업데이트/RI/Reel의 좋은 부분을 유지하면서:

```text
모바일 Workspace 안정화
→ current Reel identity/native metrics 정확도 확인
→ Metrics Overlay replacement
→ Data Engine migration
```

## Current Source Checkpoint

### Runtime/source active

- AppContext + shared SPA activity
- Settings Store / Capability / Clipboard
- Download Manager + Activity Store
- Grid quick-save migration
- Global RI launcher restoration source
- Contextual Bottom Research Workspace
- CONTENT 6탭 / GLOBAL RI Home
- persistent Activity + Toast dedupe
- Metrics Engine + RI Summary
- legacy verified-cache/history adapter
- active Reel context adapter

### Staged, not yet visual-switched

`ui/reel-overlay.js` + `ui/metric-format.js`는 새 Metrics 기반 replacement source입니다. **아직 `main.js`에서 새 Reel overlay를 mount하지 않습니다.** Android Edge replacement gate 전 기존 `#ri3-reels-overlay`를 먼저 제거하지 않습니다.

Active Reel evidence priority:

```text
scope 내부 shortcode
→ exact media URL mapping
→ exact Reel route
→ unresolved
```

같은 URL에서 vertical Reel 이동은 기존 SPA observer activity로 identity를 다시 확인합니다. fuzzy owner/metric 유사값 매칭은 새 경로에서 사용하지 않습니다.

## Automated Checkpoint

최근 source test/build 단계에서:

- unit: **32 / 32 pass**
- build: v3.2.4 생성 성공
- staged Reel context/overlay tests pass

직전 CI 실패 원인은 runtime 오류가 아니라 **문서가 v3.2.5로 먼저 올라가 source v3.2.4와 불일치한 것**이었습니다. 문서 체계를 이번 압축에서 `STATUS.md` 단일 version owner로 정리합니다. 최종 green CI가 다시 확인되기 전에는 architecture gate를 성공으로 기록하지 않습니다.

## Preserve

세부 기준은 `BASELINE.md`가 owner입니다. 특히:

- Grid 3열 / 8-slot / no-flicker
- Photo/Carousel bogus views 차단
- actual Video/Reel cover
- native media-type icon
- 기존 Reel RI visual identity
- 기존 Reel overlay를 replacement 검증 전에 선제 삭제 금지
- CONTENT 6탭
- 큰 업데이트 바로가기
- Carousel individual files / no ZIP
- directory failure silent fallback 금지
- missing metric → fabricated zero 금지
- one shared SPA observer; 900ms full polling 복귀 금지

## Unverified / Device

Android Edge에서 아직 실제 확인이 필요한 것:

- Global RI 정확히 1개, 34px visual / 44px touch 체감
- bottom nav / app banner / Reel rail collision
- COMPACT / EXPANDED Workspace 사용성
- CONTENT 6탭 / GLOBAL RI Home / keyboard visualViewport
- Activity progress/persistent error → Settings flow
- vertical Reel 이동 시 active shortcode 정확도
- scoped likes/comments/reposts가 같은 Reel인지
- exact media mapping 실제 적중률
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey install/update
- directory photo/cover CORS
- prompt mode / Carousel same destination
- Grid 3열/8-slot/no-flicker/actual cover regression

실기기 확인 전 위 항목을 Verified로 기록하지 않습니다.

## Technical Debt

- Identity / Extractor / Verified Store write owner가 아직 legacy runtime에 남음
- Grid/Reel legacy renderer와 compatibility metric body 남음
- `ri-panel.js`가 migration adapter를 직접 읽는 임시 coupling
- staged Reel overlay runtime replacement 미완료
- Research Content/Comments/Analysis 실제 data model 미연결

## Next Execution Order

순서를 바꾸면 이 문서를 먼저 수정합니다.

1. **Docs consolidation / CI recovery** — 5 canonical docs로 축소, version drift 제거
2. **Device gate** — UI-C/D/E + active Reel identity/native metrics 확인
3. **UI-F2 Reel Overlay replacement** — device evidence 후 new overlay mount → parity 확인 → legacy visual 제거
4. **UI-G1 Data Engine foundation** — Identity → Extractor → Verified Store → history/media[] owner 이동
5. **Renderer migration** — Grid/Reel callsite 전환 후 legacy formula/renderer 제거
6. **Research data** — Content → Comments → Analysis → STT/OCR/AI

Device gate가 막혀 있어도 Data Engine foundation처럼 visual switch와 독립적인 작업은 진행할 수 있습니다. 단 Grid Frozen renderer를 먼저 제거하지 않습니다.

## Work Protocol

작업 시작 전:

```text
STATUS.md
→ BASELINE.md
→ 관련 ARCHITECTURE.md / PROJECT_PLAN.md
→ source/test
```

변경 절차:

```text
목적 확인
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ owner/data-flow 확인
→ 코드 + test
→ build/check
→ STATUS 갱신
→ device 필요항목은 Unverified로 남김
```

완료 조건:

- 좋은 동작/접근경로 회귀 없음
- owner 중복 없음
- `npm test` / `npm run build` / `npm run check` / generated syntax 통과
- runtime version은 `src/version.js` ↔ generated ↔ 이 문서가 일치
- Android Edge 항목은 실제 확인 전 완료 처리하지 않음
