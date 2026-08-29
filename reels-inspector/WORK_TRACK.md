# Instagram Content Research Tool — Active Work Track

이 문서는 **작업 중 방향 이탈을 막기 위한 실행 통제 문서**입니다.

`PROJECT_PLAN.md`가 제품/전체 설계의 기준이고, `CODE_STRUCTURE.md`가 코드 구조 기준이며, `STATUS.md`가 배포/검증 상태를 기록한다면, 이 문서는 **지금 무엇을 하고 있는지 / 왜 하는지 / 다음에 무엇을 할지 / 무엇을 건드리면 안 되는지**를 항상 최신 상태로 유지합니다.

## 문서 역할

```text
PROJECT_PLAN.md          = 장기 제품/데이터/UI 설계
CODE_STRUCTURE.md        = 파일/owner/dependency/migration 설계
GRID_BASELINE.md         = Grid Frozen UI 기준
PRESERVATION_BASELINE.md = 기존 승인 기능 보존/교체/삭제 승인 기준
STATUS.md                = 현재 배포/실기기/완료 상태
WORK_TRACK.md            = 현재 작업 목표/진행/다음 순서/차단요소
```

새 요구사항이나 구현 중 발견사항이 생겨 계획이 바뀌면 기존 문서를 지우고 새로 쓰지 않습니다.

1. 기존 결정의 목적을 먼저 확인
2. 유지할 것 / 수정할 것 / 새로 추가할 것을 분류
3. 기존 사용자 기능은 `PRESERVE / REPLACE / REMOVE-APPROVED`로 분류
4. 전체 구조에 미치는 영향 재검토
5. 관련 기준 문서 갱신
6. `WORK_TRACK.md`의 현재 작업과 다음 순서를 갱신
7. 그 다음 코드 수정

---

# 1. Current Release

- Current version: **v3.2.3**
- Source of truth: `src/*`
- Deployment artifact: `ri-retry.user.js`
- Current phase: **v3.2 UI/Foundation + Download/UI/Data migration**

---

# 2. Current Objective

현재 목표는 **기존 v3.1에서 실기기로 확인된 Grid/미디어 개선과 기존 사용자 접근 기능을 유지하면서, v3.2의 공용 RI/Data 구조를 단일 owner 체계로 전환하는 것**입니다.

이번 작업에서 먼저 해결한 회귀:

- v3.1.6 RI 상세 Panel에 있던 `새 버전` 업데이트 액션이 v3.2 Panel 교체 과정에서 사라짐
- 해당 기능은 제거 승인된 적이 없었으므로 v3.2.3에서 `업데이트 바로가기`로 복구
- 같은 종류의 삭제를 막기 위해 `PRESERVATION_BASELINE.md`와 CI preservation gate 추가

현재 집중 범위:

1. 업데이트 바로가기 복구의 자동검증 완료
2. 남아 있는 신규 UI 중복코드 제거
3. Reel current identity 정확도 개선
4. Reel native likes/comments/reposts 수집 정확도 개선
5. Reel overlay와 RI Summary가 동일 Metrics Engine 사용
6. 기존 legacy metric 계산 함수 제거
7. 이후 Identity → Extractor → Verified Store 순으로 Data Engine migration

현재 범위를 벗어난 기능(STT/OCR/AI/댓글 대규모 분석)은 이 단계에서 선행 구현하지 않습니다.

---

# 3. Completed Foundation

완료된 구조:

- `src/*` source-of-truth 전환
- generated `ri-retry.user.js`
- AppContext / SPA route tracking
- Capability owner
- Settings Store
- common Download Manager
- global RI button / panel
- Grid save action migration
- shared Clipboard owner
- media filename owner
- legacy read adapter
- Metrics Engine owner
- RI Summary의 ER / 24h / 계정 대비 연결
- legacy store fingerprint 기반 live binding
- `PRESERVATION_BASELINE.md` 도입
- `VERSION / UPDATE_URL` 단일 owner 정리
- 전역 RI Panel의 큰 `업데이트 바로가기` 복구
- generated userscript에서 업데이트 바로가기와 metadata URL을 검사하는 CI gate 추가

현재 Metrics 공식:

```text
ER = (likes + comments + reposts) / views × 100
24h = 실제 18~32시간 snapshot 중 24시간에 가장 가까운 값 비교
계정 대비 = 동일 계정 최근 최대 20개, 최소 5개 표본 중앙값 대비 배수
```

미확보 값은 숫자로 추정하지 않습니다.

---

# 4. Preserve — 건드리면 안 되는 승인 개선

다음은 다른 작업 때문에 되돌리지 않습니다.

## 공통 접근/운영

- RI Panel의 **업데이트 바로가기**
- Tampermonkey raw userscript 직접 설치/업데이트 경로
- generated userscript 단일 배포
- runtime `@require` hotfix 체인 없음

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

기존 component를 숨기거나 제거하려면 먼저 `PRESERVATION_BASELINE.md`에서 `PRESERVE / REPLACE / REMOVE-APPROVED`를 확인합니다.

---

# 5. Current Known Issues / Unverified

실기기 확인이 아직 필요한 항목:

- v3.2.3 전역 RI Panel 하단에 큰 `업데이트 바로가기`가 의도한 크기/위치로 보이는지
- 업데이트 바로가기 클릭이 Android Edge + Tampermonkey에서 raw userscript 설치/업데이트 흐름으로 연결되는지
- 전역 RI 버튼의 Grid/Reel/Post 배치와 safe-area 충돌
- RI Panel 크기/닫기 접근성
- SPA 이동 후 stale shortcode가 남지 않는지
- live Store 변경이 열린 RI Summary에 실제 반영되는지
- 지정 폴더 mode의 photo/cover cross-origin 저장
- prompt mode 실제 동작
- Carousel batch 동일 destination 저장
- v3.2.x에서도 기존 Grid 8-slot/no-flicker/cover가 유지되는지

사진/cover cross-origin 문제가 확인되기 전에는 Tampermonkey `@grant` 변경이나 privileged transport를 선제 도입하지 않습니다.

업데이트 바로가기 복구는 코드/CI 수준에서만 확인하며, 실기기에서 버튼 표시와 설치 intercept가 확인되기 전에는 `Verified`로 올리지 않습니다.

---

# 6. Current Technical Debt

현재 CI architecture check는 성공하지만 다음 **중복 warning 4개**가 남아 있습니다.

- `ui/ri-panel.js`
- `ui/ri-summary.js`

중복 영역은 section/row DOM primitive입니다.

다음 일반 코드 작업의 첫 번째 항목으로 **작은 공용 RI UI primitive를 만들고 warning을 0으로 줄입니다.** 단, 의미 없는 거대한 `utils.js`는 만들지 않습니다.

이번 업데이트 바로가기 복구 때문에 이 중복 정리 순서를 건너뛰지 않습니다. 회귀 복구가 끝난 뒤 기존 Step A로 복귀합니다.

---

# 7. Next Execution Order

순서를 바꾸려면 이유를 이 문서에 먼저 기록합니다.

## Preservation Repair — v3.2.3

완료된 코드 작업:

- 기존 v3.1.6 `새 버전` 액션의 존재/동작 확인
- 새 RI Panel에 큰 `업데이트 바로가기` 추가
- `UPDATE_URL`을 `src/version.js` 단일 owner로 이동
- build metadata와 UI가 같은 update URL 사용
- `PRESERVATION_BASELINE.md` 추가
- check gate 추가

남은 확인:

- Android Edge에서 버튼 표시
- 클릭 시 Tampermonkey 업데이트 흐름 확인

## Step A — UI duplicate cleanup

- RI section/row/empty primitive 공통화
- `ri-panel.js` / `ri-summary.js` 중복 제거
- architecture duplicate warning 0 확인
- 기능/화면 동작은 변경하지 않음

## Step B — Reel identity/native metrics

- 현재 Reel shortcode/content identity 정확도 확인
- native likes/comments/reposts와 현재 shortcode 결합 강화
- 다른 Reel의 값 혼입 금지
- 미확보 값을 `0`으로 만들지 않음

## Step C — Reel Metrics unification

- Reel overlay가 `metrics/metrics.js` 사용
- RI Summary와 동일 공식/동일 source 사용
- legacy metric 계산 호출부 제거
- 회귀검증 후 legacy metric 함수 삭제

## Step D — Data Engine migration

순서 고정:

```text
instagram/identity.js
→ instagram/extractor.js
→ store/verified-store.js
→ common history
→ media[] model
→ Grid/Reel renderer
→ legacy-runtime 제거
```

한 단계가 검증되기 전에 다음 계층을 동시에 대규모 재작성하지 않습니다.

---

# 8. Work Update Protocol

모든 실제 작업은 아래 순서로 진행합니다.

## 작업 시작 전

`WORK_TRACK.md`에서 반드시 확인:

- Current Objective
- Preserve
- Current Known Issues
- Next Execution Order

그리고 기존 UI/component를 교체하거나 숨기는 작업이면 `PRESERVATION_BASELINE.md`를 반드시 확인합니다.

```text
기존 기능 inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ 새 구현
→ 자동검증
→ 필요 시 실기기 확인
→ 기존 구현 제거/숨김
```

`PRESERVE/REPLACE` 기능의 새 접근경로가 없는 상태에서 기존 component를 먼저 제거하거나 숨기지 않습니다.

작업이 기존 계획과 다르면 **코드보다 문서를 먼저 수정**합니다.

## 작업 중

새 사실이 발견되면 즉시 분류합니다.

```text
Verified     = 코드/CI 또는 실기기에서 확인
Unverified   = 구현됐지만 실기기 미확인
Blocked      = 외부 조건/실기기 결과 필요
Deferred     = 현재 단계 범위 밖
```

새 문제를 발견했다고 관련 없는 구조를 동시에 재작성하지 않습니다.

## 작업 종료 시

반드시 기록:

1. 무엇을 변경했는지
2. 무엇을 유지했는지
3. 자동 검증 결과
4. 실기기 확인 여부
5. 새로 발견된 문제
6. 다음 정확한 작업

제품/구조/기준 자체가 바뀌면 동시에 해당 문서도 갱신합니다.

- 제품/데이터/UI 설계 → `PROJECT_PLAN.md`
- 파일/owner/dependency → `CODE_STRUCTURE.md`
- Grid 표현 기준 → `GRID_BASELINE.md`
- 기존 사용자 기능 보존 기준 → `PRESERVATION_BASELINE.md`
- 테스트/승인 조건 → `tests/README.md`
- 배포/검증 현황 → `STATUS.md`
- 현재 작업 순서/방향 → `WORK_TRACK.md`

---

# 9. Definition of Done for Each Step

각 step은 다음을 만족하기 전에는 완료로 표시하지 않습니다.

- 관련 문서가 실제 구현과 일치
- owner 규칙 위반 없음
- 불필요한 중복코드 증가 없음
- 기존 사용자 기능 inventory 완료
- `PRESERVE/REPLACE` 기능 접근경로 유지
- `npm test` 통과
- `npm run build` 통과
- `npm run check` 통과
- `node --check ri-retry.user.js` 통과
- 실기기 항목은 실제 확인 전 `Verified`로 표시하지 않음
- 다음 작업이 `WORK_TRACK.md`에 명확히 남아 있음

이 문서는 매 작업의 **현재 위치를 확인하는 체크포인트**이며, 구현 진행 중 방향을 바꾸는 경우 반드시 먼저 갱신합니다.
