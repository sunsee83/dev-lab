# Reels Inspector Regression Tests

현재 단계에서는 Android Edge + Tampermonkey 실기기 검증과 함께 사용할 회귀 기준/fixture를 보관합니다.

## fixture

- `fixtures/core-cases.json` — mediaType, Verified Store conflict, Grid 안전성 기준
- `unit/foundation.test.mjs` — AppContext/capability/settings/download policy
- `unit/migration.test.mjs` — legacy cache adapter와 migrated media resolver

## v3.1 Core/Grid 필수 회귀 항목 — v3.2에서도 계속 보존

1. Reel: 조회수/좋아요/댓글/리포스트가 동일 shortcode에만 결합된다.
2. Photo/Carousel: 검증되지 않은 조회수/ER/24h/배수의 숫자값은 표시하지 않고 해당 슬롯을 `-`로 유지한다.
3. `media_type=1/2/8`, `product_type=clips`를 각각 PHOTO/VIDEO/CAROUSEL/REEL로 분류한다.
4. 동일 shortcode permalink 요청은 동시에 하나만 실행한다.
5. 같은 renderKey이면 Grid text를 다시 쓰지 않는다.
6. React가 anchor DOM을 재사용해 href shortcode가 바뀌면 새 shortcode를 사용한다.
7. 짧은 시간 내 지표 급락 또는 비현실적인 급증은 verified 값을 즉시 덮어쓰지 않고 conflict로 처리한다.
8. Instagram의 `앱 사용` 하단 배너와 겹치는 카드에는 RI 오버레이를 숨긴다.
9. 현재 Grid의 2줄 정보영역을 임의로 재설계하지 않는다.
10. 1줄은 항상 `조회수 / 좋아요 / 댓글 / 리포스트` 4개 독립 슬롯을 유지한다.
11. 2줄은 항상 `ER / 24h / 계정 대비 / 날짜` 4개 독립 슬롯을 유지한다.
12. 1줄 각 슬롯은 정해진 x 영역에 고정된다.
13. 2줄 각 슬롯도 정해진 x 영역에 고정된다.
14. 앞 슬롯 문자열 길이가 바뀌어도 다른 슬롯의 x 위치가 변하지 않는다.
15. 모든 슬롯 text는 자신의 영역 안에서 가운데 정렬된다.
16. 값이 없거나 해당되지 않는 경우 슬롯 자체를 제거하지 않고 `-`를 표시한다.
17. 우리 Grid 액션 버튼은 카드당 **1개**만 존재한다.
18. 우리 스크립트는 Instagram 기본 미디어 표시와 중복되는 플레이 버튼을 만들지 않는다.
19. 미디어 메뉴는 버튼을 누른 **현재 카드 shortcode**의 media URL/링크만 사용한다.
20. REEL/VIDEO에서 검증된 video URL이 있으면 `영상 다운로드`가 활성화된다.
21. Video/Reel cover 선택은 카드 내부 첫 번째 `img`가 아니라 현재 media identity와 실제 큰 본문 image를 우선한다.
22. 작은 음악/앨범/프로필 이미지는 cover 후보에서 제외한다.
23. 실제 cover `img`에 `srcset`이 있으면 가장 큰 후보를 사용한다.
24. 재귀 탐색에서 우연히 발견된 nested image를 video cover로 저장하지 않는다.
25. PHOTO에서는 `이미지 다운로드`를 제공한다.
26. CAROUSEL은 parent media의 `carousel_media[]`를 slide 목록으로 지원한다.
27. CAROUSEL은 GraphQL `edge_sidecar_to_children.edges[].node`도 slide 목록으로 지원한다.
28. CAROUSEL의 `전체 이미지 다운로드 (N)`에서 N은 확보된 parent slide image 수와 일치한다.
29. CAROUSEL 전체 다운로드는 slide 순서를 유지하고 다른 shortcode의 nested image를 섞지 않는다.
30. Carousel slide URL이 아직 확보되지 않았으면 임의 생성하지 않고 `전체 이미지 준비중`을 표시한다.
31. Carousel 전체 다운로드는 ZIP을 생성하지 않고 `slide_01`, `slide_02`... 개별 파일을 순차 저장한다.
32. 메뉴 클릭은 Instagram 카드 본문 이동을 발생시키지 않는다.
33. 카드 본문 클릭은 기존 Instagram 게시물 이동을 그대로 유지한다.
34. 메뉴 밖 탭, 스크롤, resize, route change 시 열린 Grid 메뉴가 닫힌다.
35. 새 수정으로 숫자 깜빡임 제거/이벤트 기반 refresh/renderKey 최적화를 되돌리지 않는다.

## v3.2 UI/Foundation 승인 기준

### 전역 RI 버튼

1. 프로필/검색/탐색/Grid/Reel/Post 상세에서 동일 RI 버튼이 표시된다.
2. 화면마다 별도의 중복 RI 버튼을 만들지 않는다.
3. 새 전역 RI가 활성화되면 legacy Reel 전용 `#ri3-tool/#ri3-panel`은 사용자에게 동시에 보이지 않는다.
4. 기본 위치는 우측 하단 safe area이다.
5. Instagram 하단 navigation 또는 `앱 사용/Open app` 배너와 실제 충돌하지 않아야 한다.
6. Reel 전용 `...` 추적 위치와 전역 고정 위치가 동시에 남지 않는다.

### 공용 RI Panel

7. RI 버튼 하나가 동일한 공용 panel을 toggle한다.
8. panel shell은 `요약 / 콘텐츠 / 댓글 / 분석 / 미디어 / 설정` 탭 구조를 가진다.
9. 현재 URL에 shortcode가 있으면 migration adapter가 그 shortcode만 읽는다.
10. 현재 콘텐츠가 변경되면 이전 shortcode의 상세값을 계속 보여주지 않는다.
11. 미확보 조회수/좋아요/댓글/리포스트를 `0`으로 만들지 않는다.
12. Store 변경 시 panel은 필요한 값만 live update하는 구조로 진행한다.
13. `설정`은 현재 카드/콘텐츠와 무관한 전역 설정으로 동작한다.
14. `미디어` action은 자체 저장 구현이 아니라 Download Manager를 호출한다.

### Grid 카드 메뉴

15. 기존 카드당 단일 `.ri3-grid-media` 버튼 위치/개수는 유지한다.
16. 새 action layer가 button click을 처리할 때 legacy 저장 메뉴와 새 저장 메뉴가 동시에 열리지 않는다.
17. Grid card 메뉴에는 저장 위치/폴더 설정을 넣지 않는다.
18. Reel/Video 메뉴는 `영상 다운로드 / 썸네일 다운로드 / 링크 복사`를 제공한다.
19. Photo 메뉴는 `이미지 다운로드 / 링크 복사`를 제공한다.
20. Carousel 메뉴는 `전체 이미지 다운로드 / 대표 이미지 다운로드 / 링크 복사`를 제공한다.
21. 카드 메뉴 변경이 기존 Grid 8슬롯/3열/깜빡임 개선을 되돌리지 않는다.
22. 새 `media-resolver.js`도 큰 본문 image 우선/작은 album artwork 제외 규칙을 유지한다.

### 공통 Download Manager

23. 영상/썸네일/사진/Carousel이 동일 Download Manager를 사용한다.
24. 저장정책은 `지정 폴더 / 기본 Downloads / 매번 선택` 중 capability가 지원하는 것만 노출한다.
25. 저장정책은 미디어 종류가 아니라 전역 설정값으로 결정된다.
26. 지정 폴더 모드에서 영상과 이미지가 서로 다른 폴더로 갈라지지 않는다.
27. 지정 폴더 fetch/write 실패 시 조용히 기본 Downloads로 fallback하지 않는다.
28. 실패는 구조화된 `DownloadResult`로 반환되고 UI가 사용자에게 표시한다.
29. `Android` 문자열만으로 지원 여부를 결정하지 않고 실제 API/permission을 검사한다.
30. `매번 선택` 미지원 환경에서는 해당 옵션을 활성화하지 않는다.
31. Carousel batch는 destination을 한 번만 정하고 slide 1..N을 모두 같은 destination에 저장한다.
32. 다운로드 파일명은 `Instagram_` 접두사와 shortcode/slide index를 유지한다.
33. 이미지/영상 transport 방식이 달라져도 UI가 별도 Blob/network 저장 구현을 만들지 않는다.
34. 지정 폴더 image/cover가 cross-origin으로 실패하는 경우 UI/Settings를 재구현하지 않고 media transport 경계에서 해결한다.

## v3.2 Architecture / Source-of-Truth 승인 기준

### Source of Truth / Version

1. root `ri-retry.user.js`와 `src/*`를 동시에 수작업 수정하지 않는다.
2. `src/*`만 개발 원본이다.
3. `ri-retry.user.js`에는 generated warning/header가 포함된다.
4. 제품 version의 단일 원본은 `src/version.js`이다.
5. `src/version.js`, generated `@version`, generated Build version, `STATUS.md` version이 일치한다.
6. `src/legacy-runtime.js`는 migration용 canonical module이지 backup이 아니다.
7. 신규 기능을 `legacy-runtime.js`에 계속 추가하지 않는다.
8. migration 완료 후 `legacy-runtime.js`와 임시 migration adapter를 삭제한다.

### Single Owner / dependency

9. route/event/lifecycle은 `core/app.js`가 소유한다.
10. capability/permission probe는 `core/capability.js`가 소유한다.
11. 저장정책 state/persistence는 `store/settings-store.js`가 소유한다.
12. destination/file write는 `media/download-manager.js`가 소유한다.
13. legacy cache read boundary는 `migration/legacy-store-adapter.js`가 소유한다.
14. migrated Grid cover/media 선택은 `media/media-resolver.js`가 소유한다.
15. RI 전역 버튼/패널은 `ui/ri-panel.js`가 소유한다.
16. 같은 책임을 다른 신규 파일에서 별도 구현하지 않는다.
17. `store -> ui` import가 없다.
18. `metrics`에서 DOM 접근하지 않는다.
19. `ui`에서 File System Access/localStorage/IndexedDB를 직접 사용하지 않는다.
20. `ui`에서 fetch/XHR hook 또는 Blob transport를 만들지 않는다.
21. 순환 import가 없다.
22. 신규 `src/*`에서 `oldFn = fn; fn = override` 형태 patch stack을 만들지 않는다.

### Event / lifecycle

23. 공식 event는 `app.js`에서 한 곳에 정의한다.
24. subscribe API는 unsubscribe/cleanup을 반환한다.
25. route 전환 후 이전 화면 listener가 남지 않는다.
26. 동일 render key는 한 frame 안에서 dedupe된다.
27. MutationObserver가 변경마다 전체 Grid scan/전체 rerender를 반복하지 않는다.
28. 새 Grid action은 document-level listener를 한 세트만 등록하고 카드마다 global listener를 복제하지 않는다.

### 중복/크기 관리

29. private helper는 한 파일에서 시작하고 두 번째 사용처가 생길 때 owner API 승격 여부를 검토한다.
30. 같은 핵심 로직을 복사해서 두 구현을 영구 유지하지 않는다.
31. migration 중 일시적 중복은 새 호출부 전환 → 회귀 확인 → legacy 제거 순서로 해소한다.
32. 의미 없는 `utils.js`, `helpers.js`, `final2.js`, `hotfix.js`, `backup.js` 파일을 만들지 않는다.
33. 일반 source 파일이 350줄을 넘으면 책임 분리를 검토한다.
34. 일반 source 파일이 500줄을 넘으면 분리한다.
35. `legacy-runtime.js`는 migration 동안만 크기 예외다.
36. 약 8줄 이상의 동일/거의 동일한 로직이 반복되면 owner 공통화 여부를 검토한다.

### Build / Check

37. unit test/build/syntax/architecture check 실패 시 배포파일을 갱신하지 않는다.
38. `check.mjs`는 금지 의존성/API 사용, 순환 import, 파일 크기, version 일치를 검사한다.
39. 가능한 경우 긴 반복 code block도 check 단계에서 warning 처리한다.
40. 자동 검증 이후에만 generated `ri-retry.user.js`를 main에 반영한다.

## v3.2.0 실기기 확인 항목

코드/CI 통과와 실기기 승인은 분리합니다. Android Edge에서 다음을 확인합니다.

1. 전역 RI 버튼이 Grid/Reel/Post 상세에서 정확히 1개 보이는가.
2. RI Panel의 닫기와 탭이 정상 동작하는가.
3. Grid 카드 메뉴에서 저장 폴더 항목이 사라졌는가.
4. RI `설정`에서 지정 폴더 선택이 동작하는가.
5. 선택한 정책이 다른 카드의 영상/사진/썸네일에도 공통 적용되는가.
6. 지정 폴더 image/cover 저장이 CORS 때문에 실패하는가.
7. 실패할 경우 기본 Downloads로 몰래 저장되지 않고 오류가 표시되는가.
8. Carousel 전체 저장이 한 destination에 개별 파일로 저장되는가.
9. 기존 Grid 8-slot/no-flicker/cover가 유지되는가.
10. Instagram native media icon과 카드 click 동작이 유지되는가.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
