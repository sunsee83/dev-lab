# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.8**
- Environment: Android Microsoft Edge + Tampermonkey + Instagram mobile web
- Source of truth: `src/*`
- Artifact: `ri-retry.user.js` (generated, 직접 수정 금지)
- Phase: **v3.2 Mobile UI/Foundation + Data Engine migration**

## Current Objective

Instagram 기본 흐름을 방해하지 않고 중요 지표 확인 → 원본 확보 → 상세 리서치로 이어집니다.

```text
Grid 비교 → Reel 최소 지표 → Research Workspace → Data Engine → Research data
```

위치는 `[기준 영역 · 위치]`; 실제 좌표/충돌은 Android gate 전 확정하지 않습니다.

## Current Source Checkpoint

Runtime/source active:

- AppContext + shared SPA activity
- Settings/Capability/Clipboard + Download/Activity
- 미디어별 저장 정책: 영상 / 사진·표지 / 슬라이드 (`directory | default | prompt` 독립)
- Grid quick-save / Global RI / Bottom Research Workspace / CONTENT 6탭
- **History Store** — `ri311` snapshot/account history read+write owner
- **Verified Cache Store** — `ri311:items:v1` compatibility cache persistence owner
- **Data Engine** — Verified Store + common `media[]` + raw `ingest()` + compatibility `ingestPatch()`
- **legacy capture handoff** — bootstrap seed 후 active `saveItem` write side-effect를 Data Engine으로 위임
- active Reel context adapter

Staged / not switched:

- legacy parser/DOM capture는 아직 payload patch 생성 담당; raw Extractor callsite 전환 전
- Grid/Reel renderer는 legacy adapter/in-memory compatibility 유지
- `ui/reel-overlay.js`는 Android gate 전 mount 금지

## Automated Checkpoint

- unit: **43 / 43 pass**
- build: **v3.2.8 success**
- architecture/syntax: **success**
- source files: **34**
- architecture warnings: **0**
- generated userscript: current

자동검증과 Android 실기기 검증은 분리합니다.

## Preserve

세부 owner=`BASELINE.md`.

- Grid 3열 / 8-slot / no-flicker / Photo·Carousel bogus views 차단
- actual Video/Reel cover / native media-type icon
- 기존 Reel RI visual + legacy overlay 선제 삭제 금지
- CONTENT 6탭 / 큰 업데이트 바로가기
- Carousel individual files / no ZIP / prompt destination 1회
- 지정폴더 실패 silent fallback 금지
- missing metric → fabricated zero 금지
- provenance/conflict + Carousel slide order/count 보존
- one shared SPA observer; 900ms full polling 복귀 금지

## Unverified / Device

Android Edge 실확인 필요:

- Global RI 34px visual / 44px touch + bottom nav/app banner/Reel rail collision
- COMPACT/EXPANDED, CONTENT/GLOBAL, keyboard/visualViewport
- active Reel shortcode/native metrics/exact media mapping
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택/복원
- directory photo/cover CORS / prompt Carousel same destination
- Grid 3열/8-slot/no-flicker/actual cover

실기기 전 Verified 승격 금지.

## Technical Debt

- **verified cache/history write owner는 Data Engine/Store로 cutover**
- legacy bootstrap 초기 seed와 payload parser/DOM capture는 남음
- Grid/Reel renderer와 compatibility metric body 남음
- `ri-panel.js` migration adapter 직접 coupling
- staged Reel overlay replacement 미완료
- Research Content/Comments/Analysis data model 미연결

Analysis 예정:

- 포맷: 문제제기형 / 리스트형 / Before/After / 튜토리얼 / 리뷰 / 스토리 / 비교 / 뉴스·정보
- 전환 장치: 댓글 유도 / 저장 유도 / 공유 유도 / 프로필 이동 / 링크 클릭 / 구매 / DM
- 보조: 훅 / CTA 위치 / 신뢰 장치 / 감정·긴급성

## Next Execution Order

1. **Device gate** — UI-C/D/E + Reel identity/native metrics + 저장설정
2. **UI-F2 Reel Overlay replacement** — evidence → new mount → parity → legacy visual 제거
3. **UI-G1 capture parser migration** — legacy raw capture → `data.ingest()`/Extractor parity → legacy parser/write 코드 제거
4. **Renderer migration** — Grid/Reel read → Data Engine 후 legacy formula/renderer 제거
5. **Research data** — Content → Comments → Analysis → STT/OCR/AI

Device gate와 독립적인 Data Engine parser 작업은 진행 가능. Grid Frozen renderer는 먼저 제거하지 않습니다.

## Work Protocol

```text
STATUS → BASELINE → ARCHITECTURE/PROJECT_PLAN → source/test
목적 → PRESERVE/REPLACE/REMOVE-APPROVED → owner/data-flow → code+test
→ build/check → STATUS → device 항목 Unverified
```

완료 조건: 회귀 없음 / owner 중복 없음 / test·build·check·generated syntax 통과 / version 일치 / Android는 실확인 전 완료 금지.
