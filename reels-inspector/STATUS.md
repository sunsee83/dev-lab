# Instagram Content Research Tool — Status

**이 문서 하나가 현재 상태 + 다음 작업 + 작업 절차의 owner입니다.**

## Current Release

- Runtime version: **v3.2.6**
- Environment: Android Microsoft Edge + Tampermonkey + Instagram mobile web
- Source of truth: `src/*`
- Artifact: `ri-retry.user.js` (generated, 직접 수정 금지)
- Phase: **v3.2 Mobile UI/Foundation + Data Engine migration**

## Current Objective

Instagram 기본 사용 흐름을 방해하지 않고 중요 지표를 빠르게 확인하는 모바일 리서치 확장도구로 정리합니다.

```text
Grid 빠른 비교
→ Reel 최소 지표
→ Research Workspace 상세 확인/원본 확보
→ Reel overlay replacement
→ Data Engine
→ Content/Comments/Analysis
```

위치는 `[기준 영역 · 위치]`로 정의하며 실제 좌표/충돌은 Android gate 전 확정하지 않습니다.

## Current Source Checkpoint

Runtime/source active:

- AppContext + shared SPA activity
- Settings Store / Capability / Clipboard
- Download Manager + Activity Store
- **미디어별 저장 정책: 영상 / 사진·표지 / 슬라이드** (`directory | default | prompt` 독립)
- v1 전역 저장설정 → v2 미디어별 정책 migration
- Grid quick-save / Global RI launcher / Contextual Bottom Research Workspace
- CONTENT 6탭 / GLOBAL RI Home / persistent Activity + Toast dedupe
- Metrics Engine + RI Summary / legacy verified-cache-history adapter
- active Reel context adapter

Staged, runtime not switched:

- `data/identity.js` — shortcode/canonical/media identity normalization
- `data/extractor.js` — Instagram media payload → verified patch 후보
- `store/verified-store.js` — source rank/provenance/conflict 보호
- `ui/reel-overlay.js` + `ui/metric-format.js`
- legacy runtime write/renderer는 아직 active이며 새 Data Engine source를 runtime writer로 연결하지 않음
- Android gate 전 새 overlay mount 및 legacy `#ri3-reels-overlay` 선제 제거 금지

Active Reel evidence:

```text
scope shortcode → exact media URL → exact Reel route → unresolved
```

## Automated Checkpoint

- unit: **38 / 38 pass**
- build: **v3.2.6 success**
- architecture/syntax: **success**
- source files: **29**
- architecture warnings: **0**
- generated userscript: current

자동검증과 Android 실기기 검증은 분리합니다.

## Preserve

세부 기준은 `BASELINE.md`가 owner입니다. 특히:

- Grid 3열 / 8-slot / no-flicker / Photo·Carousel bogus views 차단
- actual Video/Reel cover / native media-type icon
- 기존 Reel RI visual identity와 legacy Reel overlay 선제 삭제 금지
- CONTENT 6탭 / 큰 업데이트 바로가기
- Carousel individual files / no ZIP / prompt destination 1회
- 지정 폴더 실패 시 silent default fallback 금지
- missing metric → fabricated zero 금지
- verified provenance/conflict 보호
- one shared SPA observer; 900ms full polling 복귀 금지

## Unverified / Device

Android Edge에서 아직 실제 확인이 필요한 것:

- Global RI 1개, 34px visual / 44px touch, bottom nav/app banner/Reel rail collision
- 위치 기준: 전체 화면 / 카드·썸네일 / Reel 영상 / Workspace 내부
- COMPACT/EXPANDED, CONTENT 6탭, GLOBAL RI Home, keyboard/visualViewport
- Activity progress/persistent error → Settings
- vertical Reel active shortcode / scoped native metrics / exact media mapping
- staged Reel Overlay rail/caption placement
- update shortcut → Tampermonkey
- 영상 / 사진·표지 / 슬라이드별 mode·폴더 선택 및 복원
- directory photo/cover CORS / prompt mode / Carousel same destination
- Grid 3열/8-slot/no-flicker/actual cover regression

실기기 확인 전 Verified로 기록하지 않습니다.

## Technical Debt

- **Identity / Extractor / Verified Store foundation source는 준비됐지만 runtime write owner는 아직 legacy runtime**
- history / media[] write owner 이동 전
- Grid/Reel legacy renderer와 compatibility metric body 남음
- `ri-panel.js`가 migration adapter를 직접 읽는 임시 coupling
- staged Reel overlay runtime replacement 미완료
- Research Content/Comments/Analysis 실제 data model 미연결

Research Analysis 예정 구조:

- 포맷: 문제제기형 / 리스트형 / Before/After / 튜토리얼 / 리뷰 / 스토리 / 비교 / 뉴스·정보
- 전환 장치: 댓글 유도 / 저장 유도 / 공유 유도 / 프로필 이동 / 링크 클릭 / 구매 / DM
- 보조: 훅 / CTA 위치 / 신뢰 장치 / 감정·긴급성

## Next Execution Order

순서를 바꾸면 이 문서를 먼저 수정합니다.

1. **Device gate** — UI-C/D/E + active Reel identity/native metrics + 새 저장설정 실기기 확인
2. **UI-F2 Reel Overlay replacement** — evidence → new overlay mount → parity → legacy visual 제거
3. **UI-G1 Data Engine migration** — staged Identity/Extractor/Verified Store → history → media[] owner 이동 → runtime wiring
4. **Renderer migration** — Grid/Reel callsite 전환 후 legacy formula/renderer 제거
5. **Research data** — Content → Comments → Analysis(포맷/전환 장치) → STT/OCR/AI

Device gate가 막혀 있어도 visual switch와 독립적인 Data Engine 작업은 진행할 수 있습니다. Grid Frozen renderer는 먼저 제거하지 않습니다.

## Work Protocol

작업 시작 전:

```text
STATUS.md → BASELINE.md → ARCHITECTURE.md / PROJECT_PLAN.md → source/test
```

변경 절차:

```text
목적 확인
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ owner/data-flow 확인
→ 코드 + test
→ build/check
→ STATUS 갱신
→ device 필요항목은 Unverified
```

완료 조건:

- 승인된 기능/접근경로 회귀 없음
- owner 중복 없음
- `npm test` / `npm run build` / `npm run check` / generated syntax 통과
- `src/version.js` ↔ generated ↔ STATUS version 일치
- Android Edge 항목은 실제 확인 전 완료 처리하지 않음
