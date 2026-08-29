# Reels Inspector Regression / Acceptance Tests

Android Edge + Tampermonkey 실기기 검증과 자동 unit/build/check 기준을 함께 관리합니다.

## 자동 테스트 파일

- `fixtures/core-cases.json` — mediaType / Verified Store conflict / Grid 기준 fixture
- `unit/foundation.test.mjs` — AppContext/capability/clipboard/settings/download policy
- `unit/migration.test.mjs` — legacy adapter/history/change tracker/media resolver
- `unit/metrics.test.mjs` — ER/24h/account relative Metrics Engine

---

# 1. v3.1 Core/Grid 회귀 — v3.2에서도 유지

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

# 2. v3.2 전역 UI

1. Grid/Reel/Post 상세에서 같은 전역 RI 버튼 1개
2. legacy Reel-only tool/panel이 동시에 보이지 않음
3. RI button safe area가 native navigation/rail을 가리지 않음
4. panel 탭: `요약/콘텐츠/댓글/분석/미디어/설정`
5. route change 뒤 이전 shortcode stale 표시 금지
6. 설정은 현재 카드와 무관한 global state
7. 미디어 action은 Download Manager 사용
8. Grid card menu에 저장 위치 설정 없음

---

# 3. Download Manager

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

# 4. v3.2.2 Metrics 승인 기준

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

# 5. Live Store Binding / 성능

1. store live binding 때문에 두 번째 전체 DOM MutationObserver를 만들지 않음
2. 기존 SPA observer activity를 AppContext에서 공유
3. activity마다 즉시 전체 JSON parse하지 않음
4. `ri311:items/snap/posts` raw fingerprint가 달라질 때만 STORE_CHANGED
5. delayed check는 event-triggered one-shot이며 interval polling이 아님
6. 열린 RI summary는 STORE_CHANGED를 renderKey로 dedupe해 갱신
7. fingerprint가 같으면 불필요한 render 없음
8. route/identity/store listener는 destroy cleanup 경로 보유

---

# 6. Architecture / Source of Truth

1. `src/*`만 개발 원본
2. `ri-retry.user.js` generated warning 포함
3. version 단일 원본 `src/version.js`
4. generated metadata/build/STATUS version 일치
5. route/event/lifecycle → `core/app.js`
6. clipboard → `core/clipboard.js`
7. settings persistence → `store/settings-store.js`
8. legacy read/history boundary → `migration/legacy-store-adapter.js`
9. metrics formula → `metrics/metrics.js`
10. media/cover/filename → `media/media-resolver.js`
11. file write → `media/download-manager.js`
12. RI summary presentation → `ui/ri-summary.js`
13. UI에서 localStorage/IndexedDB/File picker/network transport 직접 사용 금지
14. metrics에서 DOM 접근 금지
15. circular import 금지
16. 새 override stack 금지

---

# 7. 파일/중복 관리

1. private helper는 한 파일에서 시작
2. 두 번째 사용처가 생기면 owner API 승격 검토
3. 동일 핵심 구현을 장기 복제 금지
4. 의미 없는 `utils.js/helpers.js` 금지
5. `old/backup/hotfix/final2/copy` 금지
6. 일반 source 350줄 초과 시 responsibility split 검토
7. 500줄 초과 시 명확한 단일책임 근거 없으면 실패
8. `legacy-runtime.js`만 migration 기간 크기 예외
9. `ri-panel.js` summary 분리는 실제 독립 책임 발생에 따른 분리여야 함
10. legacy metric compatibility 함수는 Reel/Grid migration 후 제거

---

# 8. v3.2.2 실기기 확인

1. 전역 RI 버튼 1개
2. RI panel open 상태에서 다른 Post/Reel 이동 후 context 변경
3. 새 지표가 뒤늦게 수집되면 열린 summary가 갱신
4. ER missing 처리
5. 24h 실제 snapshot 여부에 따른 표시
6. account sample 부족 처리
7. Grid 8-slot/no-flicker/cover 유지
8. 영상 다운로드/썸네일 다운로드 유지
9. 지정 폴더 photo/cover 저장 결과
10. Carousel batch 결과

실기기 확인 전에는 Android Edge 동작을 완료로 기록하지 않습니다.
