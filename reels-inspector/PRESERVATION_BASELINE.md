# Instagram Content Research Tool — Preservation Baseline

이 문서는 migration/refactor 중 **이미 존재하고 승인된 사용자 기능을 실수로 삭제하지 않기 위한 호환성 기준**입니다.

`PROJECT_PLAN.md`가 제품 설계, `CODE_STRUCTURE.md`가 코드 구조, `GRID_BASELINE.md`가 Grid 기준, `UI_BASELINE.md`가 전역 모바일 UI 기준, `STATUS.md`가 현재 상태, `WORK_TRACK.md`가 작업 순서를 담당합니다.

## 1. 기본 원칙

기존 UI/기능을 새 구조로 교체할 때는 먼저 기존 기능을 inventory 합니다.

각 항목은 반드시 다음 셋 중 하나로 분류합니다.

- `PRESERVE` — 기능/접근경로/핵심 동작 또는 승인된 시각 정체성을 유지한다.
- `REPLACE` — 새 구조로 옮기되 동등하거나 더 나은 접근경로를 먼저 만든 뒤 기존 것을 제거한다.
- `REMOVE-APPROVED` — 제품 결정으로 명시적으로 제거하기로 합의된 경우만 삭제한다.

분류 없이 기존 UI를 숨기거나 삭제하지 않습니다.

```text
기존 기능/외형 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED 결정
→ 새 구현
→ 자동검증
→ 실기기 확인
→ 그 다음 기존 구현 제거/숨김
```

새 UI를 먼저 띄운다는 이유로 기존 UI를 통째로 숨긴 뒤, 그 안의 액션을 나중에 옮기는 방식은 금지합니다.

---

## 2. 확인된 실제 회귀

### 2.1 업데이트 바로가기 누락

v3.1.6의 기존 `ri3-panel`에는 `새 버전` 액션이 있었고 raw userscript update URL을 열었습니다.

v3.2 전역 RI Panel migration에서 구형 panel을 숨기면서 이 액션을 새 panel로 먼저 이관하지 않아 **업데이트 바로가기 기능이 사라지는 회귀**가 발생했습니다.

이 항목은 `REMOVE-APPROVED`가 아니므로 삭제 대상이 아니었습니다.

복구 기준:

- 새 전역 RI에서도 큰 `업데이트 바로가기`를 제공
- userscript 실제 `@updateURL/@downloadURL`과 같은 owner 사용
- cache-busting query 허용
- 명시적 제거 승인 전까지 유지

### 2.2 RI Launcher visual drift

원래 제품 방향은 **기존 Reel에서 사용하던 RI 리서치 버튼의 visual identity를 전역 RI launcher로 승격**하는 것이었습니다.

v3.2 Foundation에서 새 막대그래프+돋보기 icon을 별도로 만들면서 기존 visual continuity가 끊겼습니다.

이건 기능 삭제는 아니지만, 기존 좋은 UI를 임의 재설계한 사례로 기록합니다.

복구 기준은 `UI_BASELINE.md`를 따릅니다.

- 기존 Reel RI icon/가벼운 visual identity를 global launcher 기준으로 사용
- 화면당 launcher 1개
- mobile touch target 개선은 허용
- safe-area/native UI collision 개선은 허용
- visual identity를 이유 없이 다른 icon으로 바꾸지 않음

---

## 3. 현재 PRESERVE 목록

### 공통 접근/운영

- Tampermonkey raw userscript 직접 설치/업데이트 경로
- RI Panel/Research Sheet의 큰 업데이트 바로가기
- generated `ri-retry.user.js` 단일 배포
- runtime `@require` hotfix 체인 없음
- Global RI entry point 화면당 1개
- 기존 Reel RI 리서치 버튼 visual identity를 global launcher 기준으로 사용
- `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` 6탭 정보구조

### Grid

- Instagram 3열 Grid
- 썸네일 하단 2줄 정보영역
- 8개 독립 고정 슬롯
- 숫자 깜빡임 제거
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram native media-type 아이콘
- 카드당 커스텀 미디어 버튼 1개

### Reel

- Instagram native 좋아요/댓글/리포스트/공유 UI를 제거/중복하지 않음
- Reel overlay는 파생 핵심지표 중심
- 배경 박스/blur 없이 가벼운 텍스트 표현
- 기존 안정적 Reel overlay 위치/가독성을 새 layout system의 시작점으로 사용

### Media

- Video/Reel 실제 cover 저장 개선
- music/audio/album/avatar artwork를 cover로 잘못 선택하지 않는 규칙
- Carousel 개별 slide 저장
- ZIP 미사용
- 지정 폴더 실패 시 기본 Downloads로 silent fallback 금지
- Grid 카드 메뉴에 전역 폴더 설정을 다시 넣지 않음

### Data

- `ri311:*` cache/history는 migration 완료 전까지 보존
- Verified Store source/confidence/status/conflict 보호
- 미확보 지표를 임의의 `0`으로 만들지 않음
- 실제 snapshot 없는 24h 값을 만들지 않음

---

## 4. REPLACE 대상 — 현재 UI Upgrade

다음은 제거가 아니라 **동등 기능을 먼저 준비한 뒤 교체**합니다.

### v3.2.3 임시 Global RI visual

현재:

- 새 막대그래프+돋보기 icon
- fixed CSS 위치

교체 목표:

- 기존 Reel RI visual identity
- Layout Manager 기반 safe/native collision 위치

### v3.2.3 right floating panel

현재:

- 우측 작은 floating panel
- 단일 max-height

교체 목표:

- 모바일 bottom Research Sheet
- Compact / Expanded
- 동일 6탭/summary/media/settings/update 기능 먼저 완전 이관

교체 과정에서 현재 기능을 먼저 삭제하지 않습니다.

---

## 5. Replacement Gate

기존 component를 숨기거나 제거하는 commit은 다음을 확인해야 합니다.

1. 그 component의 사용자 액션과 중요한 시각/조작 affordance를 확인했는가
2. 각 항목이 `PRESERVE / REPLACE / REMOVE-APPROVED` 중 하나로 기록됐는가
3. UI 변경이면 `UI_BASELINE.md` target과 비교했는가
4. `PRESERVE/REPLACE` 기능의 새 접근경로가 먼저 존재하는가
5. 자동 regression check가 있는가
6. 실기기 확인이 필요한 경우 `Verified`라고 잘못 기록하지 않았는가

하나라도 아니면 기존 component 제거를 진행하지 않습니다.

---

## 6. 자동검사 대상

`check.mjs`에서 최소한 다음 critical affordance/document를 검사합니다.

- source update URL 존재
- generated `@updateURL` / `@downloadURL` 일치
- generated userscript의 업데이트 바로가기 marker
- 이 문서의 업데이트 바로가기 preservation 항목
- `UI_BASELINE.md` 존재
- `UI_BASELINE.md`에 Global RI Launcher / Research Sheet / UI Definition of Done 기준 존재

자동검사는 모든 시각/터치 동작을 증명하지 못하므로 Android Edge 실기기 확인을 별도로 유지합니다.

---

## 7. 앞으로의 작업 순서

상세 순서는 `WORK_TRACK.md`가 소유합니다.

현재 UI upgrade 순서:

1. UI primitive 중복 제거 + Layout Foundation
2. Global RI launcher visual 복원/전역화
3. Mobile Research Sheet
4. Reel identity/native metrics + Metrics overlay
5. Data Engine migration
6. Research tabs 확장

이 순서와 무관한 새 기능을 이유 없이 끼워 넣지 않습니다.
