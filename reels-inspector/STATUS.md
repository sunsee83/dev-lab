# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.15**
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
- structured JSON + permalink normal capture → Data Engine
- Grid quick-save / RI Workspace / active Reel context read → Data Engine
- legacy Reel context + Grid/Reel metric normal path → modern owners/Data Engine/Metrics
- **Research Content foundation: caption + hashtags + mentions extraction/provenance/store projection**

Staged, runtime not switched:

- `ui/grid-metrics-renderer.js` — Frozen Grid 2행/8-slot markup + label contract
- `ui/reel-overlay.js` — Android gate 전 mount 금지
- Research Workspace `콘텐츠` 탭은 아직 placeholder; Content data는 post model에만 연결

Content data contract:

```text
post.content
├ caption   → 전체 본문
├ hashtags  → 순서 보존 + 중복 제거
└ mentions  → 순서 보존 + 대소문자 중복 제거
```

Caption은 편집 가능하므로 같은/더 강한 verified source의 변경은 갱신하고, 더 약한 source rollback은 차단합니다. 근거 없는 text/entity는 생성하지 않습니다.

## Automated Checkpoint

- unit: **61 / 61 pass**
- build: **v3.2.15 success**
- architecture/syntax: **success**
- source files: **39**
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
- modern context + renderer handoff vertical Reel parity
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- directory photo/cover CORS / prompt Carousel destination
- Grid 3열/8-slot/no-flicker/actual cover + staged renderer label parity
- Content tab 실제 모바일 밀도/스크롤은 UI 연결 후 device 확인

실기기 전 Verified 승격 금지.

## Technical Debt

- cache/history writer + structured/permalink capture cutover 완료
- modern UI/context + legacy normal renderer data path Data Engine 전환 완료
- Frozen Grid renderer source extraction 완료, runtime switch 전
- Research Content data foundation 완료, Workspace renderer 미연결
- legacy DOM visual body와 emergency formulas/parsers 남음
- staged Reel overlay replacement 미완료
- Comments/Analysis/STT/OCR data model 미연결

## Next Execution Order

1. **Device gate** — UI-C/D/E + Reel identity/native metrics + 저장설정 + context/renderer parity
2. **UI-F2 Reel Overlay replacement** — evidence → mount → parity → legacy Reel fallback 제거
3. **Grid renderer replacement** — staged 8-slot source → device parity → active switch
4. **Research Content UI** — post.content → 콘텐츠 탭; 이후 Comments → Analysis → STT/OCR/AI
5. **Fallback cleanup** — evidence 후 legacy emergency parser/formula 제거 → legacy-runtime 축소

Device gate 전에도 visual switch와 독립적인 Research data source/test 작업은 진행할 수 있습니다.

## Work Protocol

```text
STATUS → BASELINE → ARCHITECTURE/PROJECT_PLAN → source/test
목적 → PRESERVE/REPLACE/REMOVE-APPROVED → owner/data-flow → code+test
→ build/check → STATUS → device 항목 Unverified
```

완료 조건: 회귀 없음 / owner 중복 없음 / test·build·check·generated syntax 통과 / version 일치 / Android는 실확인 전 완료 금지.
