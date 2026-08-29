# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.11**
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
- Data Engine: Verified Store + `media[]` + `ingest()` + `ingestPermalink()` + `ingestPatch()`
- structured JSON capture: legacy scan → raw handoff → Extractor → Data Engine
- **permalink HTML fallback: inline JSON raw scan → Data Engine permalink extractor → verified write**
- Data Engine read facade: route identity + exact media URL lookup
- Grid quick-save / RI Workspace / active Reel context read → Data Engine

Compatibility still active:

- legacy `parsePermalink()`은 handoff 부재 시 emergency fallback으로만 유지
- DOM/Reel identity patch는 `ingestPatch()` 경유
- legacy adapter는 cache/change-tracking migration boundary로만 유지
- legacy runtime Grid metric renderer / Reel overlay는 in-memory compatibility read 유지
- Android gate 전 새 Reel overlay mount 금지

## Automated Checkpoint

- unit: **50 / 50 pass**
- build: **v3.2.11 success**
- architecture/syntax: **success**
- source files: **35**
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
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- directory photo/cover CORS / prompt Carousel destination
- Grid 3열/8-slot/no-flicker/actual cover

실기기 전 Verified 승격 금지.

## Technical Debt

- verified cache/history writer cutover 완료
- structured JSON raw capture → Extractor cutover 완료
- permalink HTML normal path → Data Engine extractor cutover 완료
- Grid quick-save / RI Workspace / Reel context Data Engine read cutover 완료
- legacy permalink parser는 emergency fallback으로 남음
- DOM/Reel compatibility patch와 legacy runtime Grid metric/Reel overlay body 남음
- staged Reel overlay replacement 미완료
- Research Content/Comments/Analysis data model 미연결

Analysis 예정:

- 포맷: 문제제기형 / 리스트형 / Before/After / 튜토리얼 / 리뷰 / 스토리 / 비교 / 뉴스·정보
- 전환 장치: 댓글 유도 / 저장 유도 / 공유 유도 / 프로필 이동 / 링크 클릭 / 구매 / DM
- 보조: 훅 / CTA 위치 / 신뢰 장치 / 감정·긴급성

## Next Execution Order

1. **Device gate** — UI-C/D/E + Reel identity/native metrics + 저장설정
2. **UI-F2 Reel Overlay replacement** — evidence → mount → parity → legacy visual 제거
3. **UI-G1 DOM compatibility cleanup** — Reel identity patch를 active context owner와 합치고 fallback parser 제거 조건 정리
4. **Legacy renderer migration** — Grid metric/Reel compatibility read → Data Engine → legacy formula/renderer 제거
5. **Research data** — Content → Comments → Analysis → STT/OCR/AI

Device gate와 독립적인 parser/renderer 준비는 진행 가능. Grid Frozen renderer는 먼저 제거하지 않습니다.

## Work Protocol

```text
STATUS → BASELINE → ARCHITECTURE/PROJECT_PLAN → source/test
목적 → PRESERVE/REPLACE/REMOVE-APPROVED → owner/data-flow → code+test
→ build/check → STATUS → device 항목 Unverified
```

완료 조건: 회귀 없음 / owner 중복 없음 / test·build·check·generated syntax 통과 / version 일치 / Android는 실확인 전 완료 금지.
