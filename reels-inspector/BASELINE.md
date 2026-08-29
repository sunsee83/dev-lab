# Instagram Content Research Tool — Baseline

이 문서는 **바꾸면 안 되는 좋은 동작과 UI 승인 기준**을 모읍니다. 변경 전 반드시 `PRESERVE / REPLACE / REMOVE-APPROVED`로 분류합니다.

- `PRESERVE`: 그대로 유지
- `REPLACE`: 새 경로가 동등 이상이고 검증된 뒤 기존 경로 제거
- `REMOVE-APPROVED`: 명시 승인된 것만 제거

## 1. 공통 보존

- single self-contained userscript, runtime `@require` 없음
- raw install/update URL + 큰 **업데이트 바로가기** 유지
- one shared SPA observer/activity; 900ms full polling 복귀 금지
- pending shortcode dedupe / renderKey / same-value DOM rewrite 방지
- Verified Store provenance/conflict 보호 / missing metric을 `0`으로 추정 금지
- migration 전 `ri311:*` cache/history 유지
- Instagram native action을 제거하거나 custom UI로 불필요하게 복제하지 않음

## 2. Grid — Frozen

Grid 역할은 **발굴/비교**입니다.

```text
3 columns
row1: views | likes | comments | reposts
row2: ER    | 24h   | account  | date

row1  0–32% | 32–59% | 59–79% | 79–100%
row2  0–26% | 26–51% | 51–75% | 75–100%
```

보존:

- Instagram 원래 3열 / 하단 2줄 8 fixed slots / 숫자 길이로 slot 이동 금지
- missing = `-`; Photo/Carousel views = `▶-`
- no-flicker/renderKey / 카드당 custom media action 1개
- native media-type icon 유지 / custom duplicate play icon 금지
- Grid menu에 global folder setting 금지
- quick-save 위치 변경은 `[카드·썸네일 내부 · 위치]` 기준으로 기록하고 실기기 전 확정하지 않음

## 3. Global RI / Research Workspace

역할:

```text
Grid = 빠른 비교
Reel = 시청 방해 없는 핵심 파생지표
Global RI = 상세 리서치 진입
Research Workspace = 지표/콘텐츠/댓글/분석/미디어/설정
```

### 위치 표기

모든 새 UI 위치는 `[기준 영역 · 위치]`로 기록합니다.

- 전체 화면: Global RI 같은 fixed UI
- 카드·썸네일 내부: Grid custom UI
- Reel 영상 영역: Reel overlay
- Workspace 내부: header/tab/body/action/activity

### Launcher

기존 Reel RI visual identity 유지:

```text
44×44 touch target
└ 약 34×34 low-opacity circle
  └ 약 21×21 research icon
```

- 화면당 1개 / border 없는 가벼운 visual / Layout Manager anchor
- 기본 목표는 `[전체 화면 · 하단 안전영역]`; bottom nav/app banner/Reel rail을 회피
- Android Edge 실기기 검증 전 좌·우/offset을 고정 승인값으로 확정하지 않음

### Workspace

```text
CLOSED → COMPACT 약 48–56vh → EXPANDED 약 78–84vh
CONTENT → 요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정
GLOBAL  → RI Home + Settings + 업데이트 바로가기
```

- bottom Research Sheet / close 항상 header 접근 / explicit 확장·축소
- Compact full scrim 없음 + outside tap close, Expanded soft scrim 허용
- header/tab/footer 고정, body만 scroll / browser Back 가로채기 금지
- 콘텐츠 identity가 없으면 빈 6탭 금지 / route 변경 시 stale context 금지
- COMPACT는 중요지표 확인과 핵심 action 중심; 상세 데이터는 EXPANDED에서 처리

## 4. Reel Overlay

Instagram native likes/comments/reposts/share를 제거하거나 중복하지 않습니다.

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

- `[Reel 영상 영역 · caption/right rail 비침범 위치]`
- box/blur 없음 / 작은 white-gray text + shadow / missing line 숨김
- 기존 가벼운 geometry를 시작점으로 사용
- device gate 전 legacy `#ri3-reels-overlay`를 먼저 hide/delete하지 않음

## 5. Metrics / 상태 의미

```text
ER = (likes + comments + reposts) / views × 100
24h = actual 18–32h snapshot 중 24h closest
account relative = same account recent max20 / min5 / median views 대비 배수

Grid missing      = -
Workspace loading = 확인 중
Workspace missing = —
unavailable       = 사용 불가
conflict          = 검증 중
```

실제 raw input이 없는데 숫자를 생성하지 않습니다.

## 6. Media / Download

보존:

- Video/Reel actual cover 우선 / music·album·avatar artwork reject
- Photo original image / Carousel parent slide order·identity
- Carousel ZIP 금지, individual files
- filename convention은 media owner
- 저장정책은 **영상 / 사진·표지 / 슬라이드** 3개 profile이 각각 `directory | default | prompt`를 소유
- 기존 v1 전역 저장정책은 migration 시 세 profile에 동일값으로 승계
- prompt Carousel destination 1회 선택 후 batch 재사용
- 지정폴더 실패 시 **silent default fallback 금지**
- CORS 실기기 확인 전 `@grant`/privileged transport 선제 변경 금지

## 7. Feedback / Activity

- short success/non-actionable error → Toast / 단시간 중복 억제
- batch → persistent progress (`3/8 저장 중`)
- permission/directory/picker 오류 → persistent message + Settings
- Workspace가 열리면 같은 Activity node를 host로 이동; 중복 생성 금지
- Activity는 필요할 때만 표시하며 저장 action과 별도 owner 유지

## 8. Replacement gate

```text
inventory
→ PRESERVE / REPLACE / REMOVE-APPROVED
→ 새 owner/source
→ unit/build/architecture
→ 필요한 Android Edge 검증
→ runtime 연결
→ 동등 이상 확인
→ old path 제거
```

특히 Grid Frozen UI, 업데이트 바로가기, 기존 Reel RI visual identity, legacy Reel overlay는 대체 경로 확인 전에 선제 삭제하지 않습니다.

## 9. Android Edge 실기기 승인 항목

- Global RI 1개/touch/collision + `[기준 영역 · 위치]` 타당성
- COMPACT/EXPANDED/close/keyboard + CONTENT/GLOBAL presentation
- vertical Reel active shortcode / scoped native metrics / staged overlay placement
- update shortcut → Tampermonkey
- **영상 / 사진·표지 / 슬라이드별 저장 mode·폴더 선택/복원**
- directory photo/cover CORS / prompt Carousel same destination
- persistent error → Settings
- Grid 3열/8-slot/no-flicker/actual cover
