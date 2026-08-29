# Instagram Content Research Tool — Baseline

이 문서는 **바꾸면 안 되는 좋은 동작과 UI 승인 기준**을 한곳에 모읍니다. 변경 전 반드시 `PRESERVE / REPLACE / REMOVE-APPROVED` 중 하나로 분류합니다.

- `PRESERVE`: 그대로 유지
- `REPLACE`: 새 경로가 동등 이상이고 검증된 뒤 기존 경로 제거
- `REMOVE-APPROVED`: 명시적으로 제거하기로 결정된 것만 삭제

## 1. 공통 보존

- single self-contained userscript, runtime `@require` 없음
- raw install/update URL 유지
- RI의 큰 **업데이트 바로가기** 유지
- 900ms full polling 복귀 금지
- shared SPA observer/activity 재사용, 같은 DOM용 second full observer 금지
- pending shortcode request dedupe
- renderKey/same-value DOM rewrite 방지
- Verified Store provenance/conflict 보호
- missing metric을 `0`으로 추정 금지
- migration 전 `ri311:*` cache/history 유지

## 2. Grid — Frozen

Grid 역할은 **발굴/비교**입니다. 상세 조사/전역 설정을 카드마다 반복하지 않습니다.

```text
3 columns
row1: views | likes | comments | reposts
row2: ER    | 24h   | account  | date
```

고정 슬롯:

```text
row1  0–32% | 32–59% | 59–79% | 79–100%
row2  0–26% | 26–51% | 51–75% | 75–100%
```

보존:

- Instagram 원래 3열 크기
- 하단 2줄/8 fixed slots
- 숫자 길이가 달라도 slot 위치 유지
- missing = `-`
- Photo/Carousel bogus views 금지 (`▶-`)
- no-flicker/renderKey
- 카드당 custom media action 1개
- Instagram native media-type icon 유지
- custom duplicate play icon 금지
- Grid menu에는 global folder setting을 넣지 않음

## 3. Global RI / Research Workspace

역할:

```text
Grid = 비교
Grid media action = 빠른 저장
Global RI = 상세 조사 진입
Research Workspace = 조사/미디어/설정
```

### Launcher

기존 Reel RI visual identity를 유지합니다.

```text
44×44 touch target
└ 약 34×34 low-opacity circle
  └ 약 21×21 research icon
```

- 화면당 1개 target
- border 없는 가벼운 visual
- Layout Manager anchor 사용
- bottom nav/app banner/Reel rail과 심각한 겹침 금지
- 실기기 검증 전 임의 위치 확정 금지

### Workspace

```text
CLOSED
→ COMPACT  약 48–56vh
→ EXPANDED 약 78–84vh
```

- bottom Research Sheet
- close 항상 header에서 접근
- explicit 확장/축소; drag만 유일 조작법으로 사용 금지
- Compact는 full scrim 없음, outside tap close 가능
- Expanded는 soft scrim 허용
- header/tab/footer 고정, body만 scroll
- browser Back/history를 닫기용으로 가로채지 않음

Context:

```text
CONTENT → 요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
GLOBAL  → RI Home + Settings + 업데이트 바로가기
```

콘텐츠가 없을 때 빈 6탭을 보여주지 않습니다. route/identity가 바뀌면 이전 context를 stale 확정값처럼 남기지 않습니다.

## 4. Reel Overlay

Instagram native likes/comments/reposts/share는 제거하거나 중복하지 않습니다.

목표 overlay:

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

- box/blur 없음
- 작은 white/gray text + shadow
- missing line 숨김
- caption/right action rail 침범 금지
- 기존 가벼운 geometry를 시작점으로 사용
- new overlay device gate 전 legacy `#ri3-reels-overlay`를 먼저 hide/delete하지 않음

## 5. Metrics / 상태 의미

Metrics owner 공식식:

```text
ER = (likes + comments + reposts) / views × 100
24h = actual 18–32h snapshot 중 24h closest
account relative = same account recent max20 / min5 / median views 대비 배수
```

상태:

```text
Grid verified/missing = 실제 값 / -
Workspace loading     = 확인 중
Workspace missing     = —
unavailable           = 사용 불가
conflict              = 검증 중
```

실제 raw input이 없는데 숫자를 생성하지 않습니다.

## 6. Media / Download

보존:

- Video/Reel actual cover 우선
- small music/audio/album/avatar/profile artwork reject
- Photo original image
- Carousel parent slide order/identity
- Carousel ZIP 금지, individual files
- filename convention은 media owner
- save policy는 전역 1개: `directory | default | prompt`
- prompt Carousel destination 1회 선택 후 batch 재사용
- 지정폴더 실패 시 silent default fallback 금지
- CORS가 실기기에서 확인되기 전 `@grant`/privileged transport 선제 변경 금지

## 7. Feedback / Activity

- short success/non-actionable error → Toast
- 동일 Toast 단시간 중복 억제
- long-running batch → persistent progress (`3/8 저장 중`)
- directory/permission/picker처럼 사용자 조치가 필요한 오류 → persistent message
- persistent error에서 Settings 접근 가능
- Workspace가 열리면 같은 Activity node를 Workspace host로 이동; global/embedded 복제 금지
- 향후 STT/OCR/AI도 같은 Activity model 재사용

## 8. Replacement gate

기존 기능/visual을 교체할 때 순서:

```text
inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ 새 owner/source 구현
→ unit/build/architecture 검증
→ 필요한 Android Edge 실기기 검증
→ 새 경로를 runtime에 연결
→ 동등 이상 확인
→ old path 제거
```

특히 **Grid Frozen UI, 업데이트 바로가기, 기존 Reel RI visual identity, legacy Reel overlay**는 대체 경로 확인 전에 선제 삭제하지 않습니다.

## 9. Android Edge 실기기 승인 항목

자동 test로 완료 처리하지 않는 항목:

- Global RI 1개/터치감/하단 UI collision
- COMPACT/EXPANDED 크기와 close/expand/collapse
- CONTENT 6탭 / GLOBAL RI Home
- keyboard/visualViewport
- vertical Reel 이동 시 active shortcode 정확도
- scoped native likes/comments/reposts가 같은 Reel인지
- staged Reel overlay의 rail/caption collision
- update shortcut → Tampermonkey install/update 흐름
- directory photo/cover CORS
- prompt mode / Carousel same destination
- persistent error → Settings 터치 흐름
- Grid 3열/8-slot/no-flicker/actual cover 회귀
