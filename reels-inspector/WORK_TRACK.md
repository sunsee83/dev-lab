# Instagram Content Research Tool — Active Work Track

이 문서는 **작업 중 방향 이탈을 막기 위한 실행 통제 문서**입니다.

문서 역할:

```text
PROJECT_PLAN.md          = 장기 제품/데이터/기능 설계
CODE_STRUCTURE.md        = 파일/owner/dependency/migration 설계
GRID_BASELINE.md         = Grid Frozen UI 기준
UI_BASELINE.md           = 전역 RI/Reel/Panel 모바일 UI 기준
PRESERVATION_BASELINE.md = 기존 승인 기능 보존/교체/삭제 승인 기준
STATUS.md                = 현재 배포/실기기/완료 상태
WORK_TRACK.md            = 현재 작업 목표/진행/다음 순서/차단요소
```

새 요구사항이나 구현 중 발견사항으로 계획이 바뀌면 기존 문서를 지우고 새로 쓰지 않습니다.

1. 기존 결정의 목적을 먼저 확인
2. 유지할 것 / 수정할 것 / 새로 추가할 것을 분류
3. 기존 사용자 기능은 `PRESERVE / REPLACE / REMOVE-APPROVED`로 분류
4. UI 변경이면 `UI_BASELINE.md`와 `GRID_BASELINE.md`를 대조
5. 전체 구조에 미치는 영향 재검토
6. 관련 기준 문서 갱신
7. `WORK_TRACK.md` 실행순서 갱신
8. 그 다음 코드 수정

---

# 1. Current Release

- Current version: **v3.2.3**
- Source of truth: `src/*`
- Deployment artifact: `ri-retry.user.js`
- Current phase: **v3.2 UI/Foundation + Mobile UI redesign + Data migration**

현재 v3.2.3 UI는 기능 연결용 Foundation 상태이며 최종 모바일 UI로 확정하지 않습니다.

---

# 2. Current Objective

현재 최우선 목표는 **기존에 좋아진 Grid/미디어/업데이트 접근 기능을 보존하면서, Android 모바일에서 한 손으로 사용하기 쉬운 RI UI 구조를 다시 정렬하는 것**입니다.

이번 재설계에서 유지하는 핵심:

- Instagram 3열 Grid와 8-slot 비교 UI
- 숫자 깜빡임 제거
- Video/Reel 실제 cover 저장
- Carousel 개별 batch 저장
- Grid 카드당 미디어 액션 1개
- 전역 RI 1개
- `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` 6탭
- 업데이트 바로가기
- 공용 Download Manager / Settings Store
- 미확보 데이터 추정 금지

이번 재설계에서 수정하는 핵심:

- 현재 v3.2.3 임시 RI icon → 기존 Reel RI visual identity 복원
- 단순 고정 bottom 위치 → 실제 Instagram UI 충돌을 피하는 Layout Manager
- 우측 작은 floating panel → 모바일 bottom Research Sheet
- 단일 높이 panel → Compact / Expanded 2단계
- UI primitive 중복 제거

현재 범위를 벗어난 STT/OCR/AI/대규모 댓글 분석은 UI shell만 먼저 과도하게 만들지 않습니다.

---

# 3. Completed Foundation

이미 완료되어 재사용할 구조:

- `src/*` source-of-truth
- generated `ri-retry.user.js`
- AppContext / SPA route tracking
- Capability owner
- Settings Store
- common Download Manager
- global RI entry point
- Grid save action migration
- shared Clipboard owner
- media filename owner
- legacy read adapter
- Metrics Engine owner
- RI Summary ER / 24h / 계정 대비
- legacy store fingerprint live binding
- `PRESERVATION_BASELINE.md`
- `VERSION / UPDATE_URL` single owner
- RI Panel 업데이트 바로가기 복구
- preservation CI gate
- `UI_BASELINE.md` mobile-first redesign 문서

현재 Metrics 공식:

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32시간 snapshot 중 24시간에 가장 가까운 값 비교
계정 대비 = 동일 계정 최근 최대 20개, 최소 5개 표본 중앙값 대비 배수
```

---

# 4. Preserve — 건드리면 안 되는 승인 개선

## 공통 접근/운영

- RI Panel의 **업데이트 바로가기**
- Tampermonkey raw userscript 직접 설치/업데이트 경로
- generated userscript 단일 배포
- runtime `@require` hotfix 체인 없음
- Global RI는 화면당 1개
- 기존 Reel RI 리서치 버튼의 visual identity를 전역 launcher 기준으로 사용

## Grid / Data

- Instagram 3열 Grid
- 하단 2줄 정보영역
- 8개 독립 고정 슬롯
- 숫자 깜빡임 제거
- 같은 값 DOM 재작성 방지
- pending shortcode request dedupe
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram native media-type 아이콘
- 카드당 커스텀 미디어 버튼 1개
- Verified Store source/confidence/status/conflict 보호
- `ri311:*` cache/history는 migration 완료 전까지 보존
- 미확보 지표를 `0`으로 만들지 않음

## Media / Settings

- Video/Reel 실제 cover 저장 개선
- music/audio/album/avatar artwork 제외
- Carousel 개별 파일 저장 / ZIP 미사용
- 지정 폴더 실패 시 silent fallback 금지
- Grid 카드 메뉴에 전역 폴더 설정 재도입 금지

기존 component를 숨기거나 제거하려면 먼저 `PRESERVATION_BASELINE.md`에서 분류하고, UI 변경이면 `UI_BASELINE.md`의 replacement 순서를 따릅니다.

---

# 5. Current Known Issues / Unverified

현재 확인된 UI mismatch:

- v3.2.3 RI launcher icon이 기존 Reel RI visual identity와 다름
- launcher가 실제 Instagram bottom nav/banner/right rail을 감지하지 않고 CSS 고정값 위주
- 현재 right floating panel은 모바일 상세 리서치에 비해 좁고 최종 baseline이 아님
- panel 크기/닫기 접근성은 실기기 기준 재검증 필요
- 업데이트 바로가기 코드 복구는 완료했지만 Android Edge/Tampermonkey 실제 install intercept는 미확인

기존 실기기 미확인 항목:

- SPA 이동 후 stale shortcode 여부
- live Store 변경이 열린 RI Summary에 실제 반영되는지
- 지정 폴더 photo/cover cross-origin 저장
- prompt mode
- Carousel batch 동일 destination 저장
- v3.2.x에서도 Grid 8-slot/no-flicker/cover 유지 여부

사진/cover CORS 문제가 확인되기 전에는 `@grant` 변경이나 privileged transport를 선제 도입하지 않습니다.

---

# 6. Current Technical Debt

현재 architecture check의 주요 정리 대상:

- `ui/ri-panel.js` / `ui/ri-summary.js` section/row primitive 중복
- layout/safe-area 계산의 명확한 owner 부재
- v3.2.3 launcher의 임시 icon/고정 positioning
- legacy Reel renderer의 metric compatibility 함수

UI 재설계가 확정됐으므로 단순 중복 제거만 하고 바로 Data migration으로 넘어가지 않습니다. **중복 정리와 Layout Foundation을 같은 UI-1 단계에서 해결**합니다.

---

# 7. Next Execution Order

순서를 바꾸려면 이유를 이 문서와 관련 baseline에 먼저 기록합니다.

## UI-0 — Mobile UI Baseline 재설계 — 완료

- 기존 UI/기능 inventory 재확인
- `UI_BASELINE.md` 작성
- current v3.2.3 ↔ target 차이 명시
- 기존 좋은 점 preserve 목록 유지
- 구현 전에 문서 기준을 먼저 고정

## UI-1 — Primitive + Layout Foundation

1. `ri-panel.js / ri-summary.js` 중복 primitive 공통화
2. 의미 있는 `ui/ri-primitives.js` 생성
3. `ui/layout.js` 생성
4. safe-area / bottom navigation / app banner / Reel rail collision 계산 owner화
5. toast/launcher/Reel이 같은 layout 결과 사용하도록 API 설계
6. 기능 동작은 가능한 한 그대로 유지
7. architecture warning/중복 재확인

## UI-2 — Global RI Launcher 복원

1. v3.1 계열 기존 Reel RI visual/icon 확인
2. 새 launcher에 동일 visual identity 적용
3. 시각 크기 약 32~36px, touch target 약 44px 확보
4. Layout Manager anchor 적용
5. Grid/Reel/Post에서 정확히 1개 확인
6. 새 launcher 동등성 확인 후 v3.2.3 임시 visual 제거

## UI-3 — Mobile Research Sheet

1. 기존 panel 사용자 액션 inventory
2. 6탭/summary/media/settings/update 기능 먼저 새 sheet에 완전 이관
3. bottom sheet Compact 약 48~56vh
4. Expanded 약 78~84vh
5. sticky header/tabs/close
6. Settings에 큰 업데이트 바로가기 보존
7. route/store live update 유지
8. 새 sheet 기능 확인 후 old floating panel 제거

## UI-4 — Reel identity + Metrics Overlay

1. current Reel shortcode/content identity 정확도
2. native likes/comments/reposts 결합
3. Metrics owner 사용
4. `▶ / ER / 24h / × / date` 5개 overlay
5. Layout Manager로 native rail/caption 충돌 방지
6. legacy metric renderer 호출 제거
7. 회귀 후 compatibility 함수 삭제

## UI-5 — Data Engine migration

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[] model
→ Grid/Reel renderer
→ legacy-runtime 제거
```

## UI-6 — Research tabs 확장

Data Engine이 준비된 순서대로:

- 콘텐츠
- 댓글
- 분석
- media[] 상세
- 이후 STT/OCR/AI

한 단계가 검증되기 전에 다음 계층을 동시에 대규모 재작성하지 않습니다.

---

# 8. Work Update Protocol

## 작업 시작 전

반드시 확인:

- `WORK_TRACK.md` Current Objective / Preserve / Known Issues / Next Order
- UI 작업이면 `UI_BASELINE.md`
- Grid 작업이면 `GRID_BASELINE.md`
- 기존 component 교체/숨김이면 `PRESERVATION_BASELINE.md`

```text
기존 기능/외형 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ target baseline 대조
→ 새 구현
→ 자동검증
→ 필요 시 실기기 확인
→ 그 다음 기존 구현 제거/숨김
```

`PRESERVE/REPLACE` 기능의 새 접근경로가 없는 상태에서 기존 component를 먼저 제거하거나 숨기지 않습니다.

작업이 기존 계획과 다르면 **코드보다 문서를 먼저 수정**합니다.

## 작업 중

새 사실은 즉시 분류합니다.

```text
Verified     = 코드/CI 또는 실기기에서 확인
Unverified   = 구현됐지만 실기기 미확인
Blocked      = 외부 조건/실기기 결과 필요
Deferred     = 현재 단계 범위 밖
```

새 문제 하나 때문에 관련 없는 구조까지 동시에 재작성하지 않습니다.

## 작업 종료 시

반드시 기록:

1. 무엇을 변경했는지
2. 무엇을 유지했는지
3. baseline과 달라진 부분이 있는지
4. 자동 검증 결과
5. 실기기 확인 여부
6. 새로 발견된 문제
7. 다음 정확한 작업

관련 문서 owner:

- 제품/데이터/기능 → `PROJECT_PLAN.md`
- 파일/owner/dependency → `CODE_STRUCTURE.md`
- Grid → `GRID_BASELINE.md`
- 전역 모바일 UI → `UI_BASELINE.md`
- 기존 기능 보존 → `PRESERVATION_BASELINE.md`
- 테스트 → `tests/README.md`
- 배포/검증 → `STATUS.md`
- 현재 실행순서 → `WORK_TRACK.md`

---

# 9. Definition of Done for Each Step

각 step은 다음을 만족하기 전에는 완료로 표시하지 않습니다.

- 관련 문서가 실제 구현과 일치
- `UI_BASELINE.md` 또는 관련 baseline과 구현 비교 완료
- owner 규칙 위반 없음
- 불필요한 중복코드 증가 없음
- 기존 사용자 기능 inventory 완료
- `PRESERVE/REPLACE` 기능 접근경로 유지
- 주요 모바일 action touch target 검토
- Instagram native UI와 충돌 검토
- `npm test` 통과
- `npm run build` 통과
- `npm run check` 통과
- `node --check ri-retry.user.js` 통과
- 실기기 항목은 실제 확인 전 `Verified`로 표시하지 않음
- 다음 작업이 `WORK_TRACK.md`에 명확히 남아 있음

이 문서는 매 작업의 현재 위치를 확인하는 체크포인트이며, 방향을 바꾸는 경우 반드시 먼저 갱신합니다.
