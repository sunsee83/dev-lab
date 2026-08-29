# Reels Inspector Regression / Acceptance Tests

Android Edge + Tampermonkey 실기기 검증과 자동 unit/build/check 기준을 함께 관리합니다.

UI 관련 기준 문서:

- `GRID_BASELINE.md` — Grid Frozen UI
- `UI_BASELINE.md` — Global RI / Reel / Research Sheet 모바일 UI
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

# 2. Mobile UI Baseline 승인 기준

## Global RI Launcher

1. Profile/Search/Explore/Grid/Reel/Post 상세에서 같은 Global RI entry point 사용
2. 화면당 정확히 1개
3. 기존 Reel RI 리서치 버튼의 visual identity를 기준으로 함
4. 임의의 새 icon으로 visual identity를 바꾸지 않음
5. 시각 크기는 화면을 과하게 가리지 않음
6. 실제 touch target은 모바일에서 누르기 충분한 크기 권장
7. bottom navigation / app banner / Reel native rail과 심각하게 겹치지 않음
8. 위치 계산은 한 Layout owner를 사용
9. user-agent 문자열만으로 위치를 결정하지 않음

## RI Research Sheet

10. 탭은 `요약/콘텐츠/댓글/분석/미디어/설정`
11. 모바일 기본은 bottom Research Sheet
12. Compact 상태에서 약 절반 화면 수준으로 시작
13. 긴 콘텐츠용 Expanded 상태 제공
14. close control은 항상 접근 가능
15. header/tab은 content scroll 중에도 접근 가능
16. body scroll이 Instagram page scroll과 과도하게 충돌하지 않음
17. route change 뒤 stale shortcode/context 표시 금지
18. panel이 닫혀 있을 때 Instagram 원래 화면을 계속 사용할 수 있음
19. current v3.2.3 right floating panel을 교체할 때 기존 기능을 먼저 삭제하지 않음

## 업데이트 접근

20. 큰 `업데이트 바로가기` 존재
21. overflow menu 안에만 숨기지 않음
22. `UPDATE_URL` single owner 사용
23. Android Edge에서 raw userscript → Tampermonkey install/update 흐름 실기기 확인 전 Verified 금지

---

# 3. Reel UI 승인 기준

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

# 4. Grid Action / 전역 역할 분리

1. Grid 카드 미디어 버튼은 빠른 저장만 담당
2. Grid 카드당 커스텀 미디어 버튼 1개
3. Grid menu에 저장 위치 설정 없음
4. Global RI는 상세 리서치/공용 설정 담당
5. Grid에 6탭/상세 분석 UI를 반복하지 않음
6. Instagram native media icon 유지

---

# 5. Download Manager

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

# 6. Metrics 승인 기준

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

# 7. Detailed Panel 상태 표현

Grid는 마지막 검증값 또는 `-` 정책을 유지합니다.

RI 상세 UI는 다음을 구분할 수 있어야 합니다.

1. loading → `확인 중`
2. no value → `—`
3. unavailable → `사용 불가`
4. conflict → `검증 중`
5. missing 값을 `0`으로 바꿔 표시하지 않음

---

# 8. Live Store Binding / 성능

1. store live binding 때문에 두 번째 전체 DOM MutationObserver를 만들지 않음
2. 기존 SPA observer activity를 AppContext에서 공유
3. activity마다 즉시 전체 JSON parse하지 않음
4. `ri311:items/snap/posts` raw fingerprint가 달라질 때만 STORE_CHANGED
5. delayed check는 event-triggered one-shot이며 interval polling이 아님
6. 열린 RI summary는 STORE_CHANGED를 renderKey로 dedupe해 갱신
7. fingerprint가 같으면 불필요한 render 없음
8. route/identity/store listener는 destroy cleanup 경로 보유
9. Layout 계산도 mutation마다 무조건 전체 실행하지 않음

---

# 9. Architecture / Source of Truth

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
14. UI에서 localStorage/IndexedDB/File picker/network transport 직접 사용 금지
15. metrics에서 DOM 접근 금지
16. circular import 금지
17. 새 override stack 금지

---

# 10. 파일/중복 관리

1. private helper는 한 파일에서 시작
2. 두 번째 사용처가 생기면 owner API 승격 검토
3. 동일 핵심 구현을 장기 복제 금지
4. 의미 없는 `utils.js/helpers.js` 금지
5. `old/backup/hotfix/final2/copy` 금지
6. 일반 source 350줄 초과 시 responsibility split 검토
7. 500줄 초과 시 명확한 단일책임 근거 없으면 실패
8. `legacy-runtime.js`만 migration 기간 크기 예외
9. `ri-primitives.js`는 section/row/empty/action 같이 실제 중복되는 RI 표현 primitive만 소유
10. `layout.js`는 safe-area/native collision 계산만 소유
11. legacy metric compatibility 함수는 Reel/Grid migration 후 제거

---

# 11. UI Upgrade 실기기 확인 순서

UI-1 이후:

1. 현재 기능이 시각적으로 망가지지 않았는지
2. Grid 8-slot/no-flicker/cover 유지
3. launcher/panel open 기능 유지
4. update shortcut 유지

UI-2 이후:

5. 기존 Reel RI visual identity가 느껴지는지
6. Global RI가 화면당 1개인지
7. 하단 nav/app banner/right rail과 겹치지 않는지
8. 한 손으로 누르기 쉬운지

UI-3 이후:

9. Compact sheet 크기가 과도하게 화면을 가리지 않는지
10. Expanded 상태에서 긴 콘텐츠 읽기가 가능한지
11. close가 항상 가능한지
12. 6탭 이동이 쉬운지
13. update shortcut 접근 가능
14. route 이동 시 stale context 없음

실기기 확인 전에는 Android Edge UI 동작을 완료로 기록하지 않습니다.
