# Reels Inspector Regression / Acceptance Tests

Android Edge + Tampermonkey 실기기 검증과 자동 unit/build/check 기준을 함께 관리합니다.

UI 관련 기준 문서:

- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — Global RI / Reel / Research Sheet 모바일 UI
- `UI_ARCHITECTURE.md` — UI 계층/상태/Context/데이터 흐름
- `PRESERVATION_BASELINE.md` — 기존 승인 기능 보존/교체 gate

## 자동 테스트 파일

- `fixtures/core-cases.json` — mediaType / Verified Store conflict / Grid 기준 fixture
- `unit/foundation.test.mjs` — AppContext/capability/clipboard/settings/download policy
- `unit/migration.test.mjs` — legacy adapter/history/change tracker/media resolver
- `unit/metrics.test.mjs` — ER/24h/account relative Metrics Engine

---

# 1. v3.1 Core/Grid 회귀 — 계속 유지

1. Reel 지표는 동일 shortcode에만 결합
2. Photo/Carousel에 검증되지 않은 view/ER/24h/outlier 숫자 생성 금지
3. media_type/product_type → PHOTO/VIDEO/CAROUSEL/REEL 분류 유지
4. 동일 shortcode pending request dedupe
5. 같은 renderKey DOM 재작성 금지
6. React anchor 재사용 시 새 href shortcode 사용
7. 비현실적 metric 급변은 verified 값을 즉시 덮어쓰지 않고 conflict 처리
8. Instagram 하단 배너와 실제 겹치는 카드만 overlay 숨김
9. 3열 Grid 유지
10. 1줄 `조회수/좋아요/댓글/리포스트` 4개 고정 슬롯
11. 2줄 `ER/24h/계정대비/날짜` 4개 고정 슬롯
12. 앞 숫자 길이가 다른 슬롯 위치를 밀지 않음
13. missing은 슬롯 제거가 아니라 `-`
14. 커스텀 Grid media button 카드당 1개
15. Instagram native media-type icon과 중복 play button 금지
16. Video/Reel cover는 큰 본문 image 우선
17. 작은 music/album/avatar artwork 제외
18. Photo image download 제공
19. Carousel parent slide 순서/identity 유지
20. Carousel ZIP 없이 개별 slide 저장
21. 카드 본문 navigation 유지
22. 메뉴 외부/스크롤/route change 시 메뉴 정리
23. no-flicker/event refresh 개선 rollback 금지

---

# 2. Contextual Mobile UI Architecture 승인 기준

## 5-Layer model

1. Instagram native UI를 제거/복제하지 않음
2. Grid/Reel ambient 정보는 가벼운 read-only layer 유지
3. Global RI Launcher와 Grid media action은 진입/intent만 담당
4. 긴 조사 UI는 Research Workspace에만 위치
5. Toast/download/future analysis 상태는 공용 Feedback/Activity layer 사용

## UI Root / ownership

6. Global Launcher는 화면당 1개
7. Research Workspace도 동시에 1개
8. Layout collision 계산 owner는 1개
9. Toast/feedback owner는 1개
10. route/store event를 component마다 무분별하게 중복 subscribe하지 않음
11. launcher/tab/toast가 각자 별도의 sheet open/layout state를 소유하지 않음

---

# 3. Context Mode 승인 기준

## CONTENT

1. 현재 shortcode/media identity가 확보된 Content context에서 기존 6탭 유지
2. 탭: `요약/콘텐츠/댓글/분석/미디어/설정`
3. CONTENT mode에서 mediaType/username/context가 header와 body에 같은 identity로 연결

## GLOBAL

4. 현재 콘텐츠 identity가 없는 화면에서 6개 빈 Content tab을 억지로 보여주지 않음
5. `RI Home` 또는 equivalent lightweight global state 제공
6. GLOBAL에서도 Settings와 업데이트 접근 유지
7. 향후 ACCOUNT mode는 실제 account data model이 생기기 전에 placeholder UI만 먼저 만들지 않음

---

# 4. Workspace State Machine 승인 기준

1. 기본 상태: `CLOSED`
2. launcher tap → `COMPACT`
3. COMPACT → 명시적 expand → `EXPANDED`
4. EXPANDED → 명시적 collapse → `COMPACT`
5. close는 COMPACT/EXPANDED 모두 항상 접근 가능
6. drag handle은 보조 기능이며 유일한 expand/dismiss 방식이 아님
7. body 전체 swipe dismiss 금지
8. tab change를 Instagram과 충돌하는 좌우 swipe gesture에 의존하지 않음
9. 브라우저 Back을 닫기 전용으로 만들기 위해 임의 history entry를 push하지 않음
10. COMPACT는 약 48~56vh target
11. EXPANDED는 약 78~84vh target
12. full screen을 자동 강제하지 않음

---

# 5. Route / Identity Rebind 승인 기준

1. route/identity change 시 이전 content view model을 즉시 invalidation
2. 새 데이터가 아직 없으면 이전 shortcode 값 대신 `확인 중/—` 등 상태 표시
3. detent(COMPACT/EXPANDED)는 유지 가능
4. CONTENT → CONTENT에서 active tab은 지원되면 유지 가능
5. 새 content context에서는 body scroll을 top으로 reset
6. CONTENT → GLOBAL이면 RI Home으로 전환
7. 이전 content의 media/comment/metric을 새 context에 잠깐이라도 확정값처럼 표시하지 않음
8. route/store update render는 schedule/dedupe 사용

---

# 6. Active Tab Host / Navigation 승인 기준

1. CONTENT 6탭은 sticky navigation 영역에서 접근 가능
2. horizontal scroll 허용
3. selected tab은 보이는 영역으로 자동 이동 가능
4. tab touch target 높이 약 44px 권장
5. active tab만 mount하는 구조를 목표로 함
6. inactive Content/Comments/Analysis heavy DOM 동시 유지 금지
7. tab unmount 시 listener cleanup
8. context가 바뀌면 이전 content tab cache/scroll을 그대로 재사용하지 않음
9. color만으로 selected state를 구분하지 않음

---

# 7. Global RI Launcher 승인 기준

1. Profile/Search/Explore/Grid/Reel/Post 상세에서 같은 Global RI entry point 사용
2. 화면당 정확히 1개
3. 기존 Reel RI 리서치 버튼의 visual identity를 기준으로 함
4. 임의의 새 icon으로 visual identity를 바꾸지 않음
5. 시각 크기는 화면을 과하게 가리지 않음
6. 실제 touch target은 모바일에서 누르기 충분한 약 44×44px 권장
7. bottom navigation / app banner / Reel native rail과 심각하게 겹치지 않음
8. 위치 계산은 Layout owner 사용
9. user-agent 문자열만으로 위치를 결정하지 않음
10. status badge를 넣더라도 상시 시각 소음을 만들지 않음

---

# 8. RI Research Workspace 승인 기준

1. 모바일 기본은 bottom Research Sheet
2. COMPACT에서 Instagram 화면을 상당 부분 계속 볼 수 있음
3. EXPANDED에서 긴 Caption/댓글/분석 읽기가 가능
4. close control 항상 접근 가능
5. header/tab은 content scroll 중에도 접근 가능
6. COMPACT는 불필요한 full-screen scrim을 강제하지 않음
7. EXPANDED는 accidental background tap 방지를 위한 soft scrim 허용
8. keyboard/visualViewport 변화에 높이 대응
9. current v3.2.3 right floating panel을 교체할 때 기존 기능을 먼저 삭제하지 않음
10. Settings/Media/Summary/update가 새 Workspace에 완전 이관된 후 old panel 제거

---

# 9. 업데이트 접근

1. 큰 `업데이트 바로가기` 존재
2. overflow menu 안에만 숨기지 않음
3. Settings에서 안정적으로 접근 가능
4. version shortcut이 추가돼도 큰 버튼을 대체하지 않음
5. `UPDATE_URL` single owner 사용
6. Android Edge에서 raw userscript → Tampermonkey install/update 흐름 실기기 확인 전 Verified 금지

---

# 10. Reel UI 승인 기준

1. Instagram native 좋아요/댓글/리포스트/공유 UI 유지
2. native action을 우리 UI가 중복 생성하지 않음
3. 추가 overlay는 핵심 파생지표 중심
4. target: `▶ / ER / 24h / 계정대비 / 날짜`
5. 배경 박스/blur 없음
6. 작은 흰색/회색 text + shadow 수준
7. 값이 없으면 해당 line 숨김
8. native rail/캡션을 가리지 않음
9. 기존 안정적 overlay geometry를 시작점으로 사용
10. Layout owner가 native rail 충돌을 조정

---

# 11. Grid Action / 전역 역할 분리

1. Grid 카드 media button은 빠른 저장만 담당
2. Grid 카드당 custom media button 1개
3. Grid menu에 저장 위치 설정 없음
4. Global RI는 상세 research/공용 setting 담당
5. Grid에 6탭/상세 분석 UI를 반복하지 않음
6. Instagram native media icon 유지

---

# 12. Layout Manager 승인 기준

1. 입력은 viewport/visualViewport/safe-area/blocker rect 기반
2. bottom blocker: Instagram nav/app banner 고려
3. right blocker: Reel native rail 고려
4. launcher/reel overlay/toast가 같은 layout source 사용
5. 단일 `bottom: Npx` 값을 모든 화면에 고정하지 않음
6. route/resize/orientation/visualViewport 변화에 재계산
7. 일반 DOM mutation마다 무조건 전체 layout scan 금지
8. 동일 frame layout request dedupe

---

# 13. Feedback / Activity 승인 기준

1. 짧은 성공은 Toast 사용 가능
2. 사용자가 조치해야 하는 오류는 persistent message 제공 가능
3. Carousel batch 진행은 향후 `3/8 저장 중` 같은 progress 표현 지원
4. 지정 folder 실패를 success처럼 표시하지 않음
5. 같은 toast를 짧은 시간에 중복 생성하지 않음
6. future STT/OCR/AI job도 같은 activity presentation 확장점 사용

---

# 14. Download Manager

1. video/cover/photo/carousel 동일 manager
2. 저장 mode는 global setting
3. mode: default/directory/prompt 중 capability 지원값만 사용
4. 지정 폴더 실패 시 silent fallback 금지
5. 실패는 구조화된 DownloadResult
6. platform 문자열이 아니라 runtime API/permission 판단
7. Carousel batch destination 1회 선택
8. filename은 media owner에서 생성
9. Grid/RI가 Blob/network transport 직접 구현하지 않음
10. 이미지/영상 transport가 달라도 UI 저장 로직을 복제하지 않음

---

# 15. Metrics 승인 기준

## ER

1. formula는 `(likes + comments + reposts) / views × 100`
2. views는 0보다 커야 함
3. RI summary에서는 likes/comments/reposts가 모두 실제 값일 때만 계산
4. missing 값을 0으로 가정하지 않음
5. 값이 부족하면 `—`

## 24h

6. 실제 snapshot만 사용
7. snapshot age 18~32시간 범위
8. 24시간에 가장 가까운 snapshot 선택
9. snapshot 없으면 `—`
10. current views < previous snapshot이면 숫자를 만들지 않음

## account relative

11. 동일 username만 비교
12. 현재 shortcode 제외
13. 최근 최대 20개
14. 최소 5개 sample
15. 중앙값 대비 배수
16. sample 부족 시 `—`

---

# 16. Detailed 상태 표현

Grid는 마지막 검증값 또는 `-` 정책 유지.

RI 상세 UI:

1. loading → `확인 중`
2. no value → `—`
3. unavailable → `사용 불가`
4. conflict → `검증 중`
5. missing 값을 `0`으로 바꿔 표시하지 않음

---

# 17. Live Store Binding / 성능

1. store binding 때문에 두 번째 전체 DOM MutationObserver 생성 금지
2. 기존 SPA observer activity 공유
3. activity마다 즉시 전체 JSON parse 금지
4. `ri311:items/snap/posts` raw fingerprint가 달라질 때만 STORE_CHANGED
5. delayed check는 event-triggered one-shot
6. 열린 RI summary는 renderKey로 dedupe
7. fingerprint 같으면 불필요한 render 없음
8. route/identity/store listener cleanup 경로 필수
9. Layout 계산도 mutation마다 전체 실행 금지
10. active tab 이외 heavy panel DOM 동시 render 금지

---

# 18. Architecture / Source of Truth

1. `src/*`만 개발 원본
2. `ri-retry.user.js` generated warning 포함
3. version/update URL 단일 원본 `src/version.js`
4. generated metadata/build/STATUS version 일치
5. route/event/lifecycle → `core/app.js`
6. clipboard → `core/clipboard.js`
7. settings persistence → `store/settings-store.js`
8. legacy read/history boundary → `migration/legacy-store-adapter.js`
9. metrics formula → `metrics/metrics.js`
10. media/cover/filename → `media/media-resolver.js`
11. file write → `media/download-manager.js`
12. RI summary presentation → `ui/ri-summary.js`
13. UI layout collision 계산은 단일 owner
14. Workspace state도 단일 owner
15. UI에서 localStorage/IndexedDB/File picker/network transport 직접 사용 금지
16. metrics에서 DOM 접근 금지
17. circular import 금지
18. 새 override stack 금지
19. UI target 구조는 `UI_ARCHITECTURE.md` 기준

---

# 19. 파일/중복 관리

1. private helper는 한 파일에서 시작
2. 두 번째 사용처가 생기면 owner API 승격 검토
3. 동일 핵심 구현 장기 복제 금지
4. 의미 없는 `utils.js/helpers.js` 금지
5. `old/backup/hotfix/final2/copy` 금지
6. 일반 source 350줄 초과 시 responsibility split 검토
7. 500줄 초과 시 명확한 단일책임 근거 없으면 실패
8. `legacy-runtime.js`만 migration 기간 크기 예외
9. `ri-primitives.js`는 실제 중복되는 RI presentation primitive만 소유
10. `layout.js`는 safe-area/native collision 계산만 소유
11. Research Read Model 구현은 실제 Data Engine migration 시 필요할 때 생성
12. legacy metric compatibility 함수는 Reel/Grid migration 후 제거

---

# 20. UI Upgrade 실기기 확인 순서

UI-B 이후:

1. 현재 기능이 시각적으로 망가지지 않았는지
2. Grid 8-slot/no-flicker/cover 유지
3. launcher/panel open 기능 유지
4. update shortcut 유지
5. route change stale value가 더 나빠지지 않았는지

UI-C 이후:

6. 기존 Reel RI visual identity가 느껴지는지
7. Global RI 화면당 1개인지
8. bottom nav/app banner/right rail과 겹치지 않는지
9. 한 손으로 누르기 쉬운지

UI-D 이후:

10. COMPACT가 과도하게 화면을 가리지 않는지
11. EXPANDED에서 긴 콘텐츠 읽기가 가능한지
12. close/expand/collapse가 항상 쉬운지
13. CONTENT 6탭 이동이 쉬운지
14. GLOBAL RI Home이 빈 Content tab보다 자연스러운지
15. update shortcut 접근 가능
16. route 이동 시 stale context 없음
17. keyboard가 sheet를 심하게 가리지 않는지

UI-E 이후:

18. Carousel batch progress가 이해되는지
19. 오류가 toast로 사라져 원인을 놓치지 않는지

실기기 확인 전 Android Edge UI 동작을 완료로 기록하지 않습니다.
