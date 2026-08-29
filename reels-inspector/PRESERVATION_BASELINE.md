# Instagram Content Research Tool — Preservation Baseline

이 문서는 migration/refactor 중 **이미 존재하고 승인된 사용자 기능을 실수로 삭제하지 않기 위한 호환성 기준**입니다.

`PROJECT_PLAN.md`가 제품 설계, `CODE_STRUCTURE.md`가 코드 구조, `STATUS.md`가 현재 상태, `WORK_TRACK.md`가 작업 순서를 담당하고, 이 문서는 **교체하거나 숨기기 전에 반드시 보존 여부를 확인해야 하는 사용자 기능**을 고정합니다.

## 1. 기본 원칙

기존 UI/기능을 새 구조로 교체할 때는 먼저 기존 기능을 inventory 합니다.

각 항목은 반드시 다음 셋 중 하나로 분류합니다.

- `PRESERVE` — 기능/접근경로/핵심 동작을 유지한다.
- `REPLACE` — 새 구조로 옮기되 동등하거나 더 나은 접근경로를 먼저 만든 뒤 기존 것을 제거한다.
- `REMOVE-APPROVED` — 제품 결정으로 명시적으로 제거하기로 합의된 경우만 삭제한다.

분류 없이 기존 UI를 숨기거나 삭제하지 않습니다.

특히 migration에서 다음 순서를 지킵니다.

```text
기존 기능 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED 결정
→ 새 구현
→ 자동검증
→ 실기기 확인
→ 그 다음 기존 구현 제거/숨김
```

새 UI를 먼저 띄운다는 이유로 기존 UI를 통째로 숨긴 뒤, 그 안의 액션을 나중에 옮기는 방식은 금지합니다.

## 2. 이번에 확인된 실제 회귀

v3.1.6의 기존 `ri3-panel`에는 `새 버전` 액션이 있었고, 누르면 userscript raw update URL을 새 창으로 열었습니다.

v3.2 전역 RI Panel migration에서 구형 `ri3-panel`을 숨기면서 이 액션을 새 Panel로 먼저 이관하지 않아 **업데이트 바로가기 기능이 사라지는 회귀**가 발생했습니다.

이 항목은 `REMOVE-APPROVED`가 아니므로 삭제 대상이 아니었습니다.

복구 기준:

- 새 전역 RI Panel에서도 큰 `업데이트 바로가기` 버튼을 제공한다.
- userscript의 실제 `@updateURL/@downloadURL`과 같은 URL을 사용한다.
- URL은 한 owner에서 관리하여 UI/build metadata가 서로 다른 주소를 갖지 않게 한다.
- 새 버전 설치 페이지가 캐시된 파일을 열지 않도록 클릭 시 cache-busting query를 붙일 수 있다.
- 향후 Panel 구조를 다시 바꿔도 이 기능은 명시적 제거 승인 전까지 유지한다.

## 3. 현재 PRESERVE 목록

### 공통 접근/운영

- Tampermonkey raw userscript 직접 설치/업데이트 경로
- RI Panel의 업데이트 바로가기
- generated `ri-retry.user.js` 단일 배포
- runtime `@require` hotfix 체인 없음

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

## 4. Replacement Gate

기존 component를 숨기거나 제거하는 commit은 다음을 확인해야 합니다.

1. 그 component의 사용자 액션 목록을 확인했는가
2. 각 액션이 `PRESERVE / REPLACE / REMOVE-APPROVED` 중 하나로 기록됐는가
3. `PRESERVE/REPLACE` 기능의 새 접근경로가 먼저 존재하는가
4. 자동 regression check가 있는가
5. 실기기 확인이 필요한 경우 `Verified`라고 잘못 기록하지 않았는가

하나라도 아니면 기존 component 제거를 진행하지 않습니다.

## 5. 자동검사 대상

`check.mjs`에서 최소한 다음 critical affordance를 검사합니다.

- source의 update URL 존재
- generated userscript의 `@updateURL`과 `@downloadURL` 일치
- 전역 RI Panel의 `업데이트 바로가기` marker 존재
- 이 문서의 업데이트 바로가기 preservation 항목 존재

자동검사는 모든 UI 기능을 완전히 증명하지 못하므로, `WORK_TRACK.md`와 실기기 확인을 함께 사용합니다.

## 6. 앞으로의 작업 순서

이번 회귀 복구 후 원래 `WORK_TRACK.md` 실행순서로 돌아갑니다.

1. RI 공통 UI primitive 중복 제거
2. Reel identity/native metrics 정확도 개선
3. Reel Overlay와 RI Summary의 Metrics Engine 통합
4. legacy metric 계산 제거
5. Identity → Extractor → Verified Store 순 Data Engine migration

이 순서와 무관한 새 기능을 이유 없이 끼워 넣지 않습니다.
