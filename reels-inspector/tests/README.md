# Reels Inspector Regression Tests

현재 단계에서는 Android Edge + Tampermonkey 실기기 검증과 함께 사용할 회귀 기준/fixture를 보관합니다.

## fixture

- `fixtures/core-cases.json` — mediaType, Verified Store conflict, Grid 안전성 기준

## v3.1 Core/Grid 필수 회귀 항목

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
3. 기본 위치는 우측 하단 safe area이다.
4. Instagram 하단 navigation 또는 `앱 사용/Open app` 배너와 겹치면 자동으로 위로 이동한다.
5. Reel 전용 `...` 추적 위치와 전역 고정 위치가 동시에 남지 않는다.

### 공용 RI Panel

6. RI 버튼 하나가 동일한 공용 panel을 toggle한다.
7. panel shell은 `요약 / 콘텐츠 / 댓글 / 분석 / 미디어 / 설정` 탭 구조를 가진다.
8. 현재 콘텐츠가 변경되면 이전 shortcode의 상세값을 계속 보여주지 않는다.
9. Store 변경 시 panel은 필요한 값만 live update한다.
10. `설정`은 현재 카드/콘텐츠와 무관한 전역 설정으로 동작한다.

### Grid 카드 메뉴

11. Grid card 메뉴에는 저장 위치/폴더 설정을 넣지 않는다.
12. Reel/Video 메뉴는 `영상 다운로드 / 썸네일 다운로드 / 링크 복사`만 제공한다.
13. Photo 메뉴는 `이미지 다운로드 / 링크 복사`를 제공한다.
14. Carousel 메뉴는 `전체 이미지 다운로드 / 대표 이미지 다운로드 / 링크 복사`를 제공한다.
15. 카드 메뉴 변경이 기존 Grid 8슬롯/3열/깜빡임 개선을 되돌리지 않는다.

### 공통 Download Manager

16. 영상/썸네일/사진/Carousel이 동일 Download Manager를 사용한다.
17. 저장정책은 `지정 폴더 / 기본 Downloads / 매번 선택` 중 capability가 지원하는 것만 노출한다.
18. 저장정책은 미디어 종류가 아니라 전역 설정값으로 결정된다.
19. 지정 폴더 모드에서 영상과 이미지가 서로 다른 폴더로 갈라지지 않는다.
20. 지정 폴더 쓰기 실패 시 조용히 기본 Downloads로 fallback하지 않는다.
21. 실패는 구조화된 `DownloadResult`로 반환되고 UI가 사용자에게 표시한다.
22. `Android` 문자열만으로 지원 여부를 결정하지 않고 실제 API/permission을 검사한다.
23. `매번 선택` 미지원 환경에서는 해당 옵션을 활성화하지 않는다.
24. Carousel batch는 destination을 한 번만 정하고 slide 1..N을 모두 같은 destination에 저장한다.
25. 다운로드 파일명은 `Instagram_` 접두사와 shortcode/slide index를 유지한다.
26. 이미지/영상 transport 방식이 달라져도 UI가 별도 다운로드 구현을 만들지 않는다.

## v3.2 Architecture / Source-of-Truth 승인 기준

### Source of Truth

1. module 전환 시 root `ri-retry.user.js`와 `src/*`를 동시에 수작업 수정하지 않는다.
2. build 전환 후 `src/*`만 개발 원본이다.
3. `ri-retry.user.js`에는 generated warning/header가 포함된다.
4. current runtime을 옮긴 `src/legacy-runtime.js`는 migration용 canonical module이지 backup이 아니다.
5. 신규 기능을 `legacy-runtime.js`에 계속 추가하지 않는다.
6. migration 완료 후 `legacy-runtime.js`를 삭제한다.

### Single Owner / dependency

7. route/event/lifecycle은 `core/app.js`가 소유한다.
8. capability/permission probe는 `core/capability.js`가 소유한다.
9. 저장정책 state/persistence는 `store/settings-store.js`가 소유한다.
10. destination/file write는 `media/download-manager.js`가 소유한다.
11. RI 전역 버튼/패널은 `ui/ri-panel.js`가 소유한다.
12. 같은 책임을 다른 파일에서 별도 구현하지 않는다.
13. `store -> ui` import가 없다.
14. `metrics`에서 DOM 접근하지 않는다.
15. `ui`에서 File System Access/localStorage/IndexedDB를 직접 사용하지 않는다.
16. `ui`에서 fetch/XHR hook을 만들지 않는다.
17. 순환 import가 없다.
18. 신규 `src/*`에서 `oldFn = fn; fn = override` 형태 patch stack을 만들지 않는다.

### Event / lifecycle

19. 공식 event는 `app.js`에서 한 곳에 정의한다.
20. subscribe API는 unsubscribe/cleanup을 반환한다.
21. route 전환 후 이전 화면 listener가 남지 않는다.
22. 동일 render key는 한 frame 안에서 dedupe된다.
23. MutationObserver가 변경마다 전체 Grid scan/전체 rerender를 반복하지 않는다.

### 중복/크기 관리

24. private helper는 한 파일에서 시작하고 두 번째 사용처가 생길 때 owner API 승격 여부를 검토한다.
25. 같은 핵심 로직을 복사해서 두 구현을 동시에 유지하지 않는다.
26. 의미 없는 `utils.js`, `helpers.js`, `final2.js`, `hotfix.js`, `backup.js` 파일을 만들지 않는다.
27. 일반 source 파일이 350줄을 넘으면 책임 분리를 검토한다.
28. 일반 source 파일이 500줄을 넘으면 단일책임 근거가 없을 경우 분리한다.
29. `legacy-runtime.js`는 migration 동안만 크기 예외다.
30. 약 8줄 이상의 동일/거의 동일한 로직이 반복되면 owner 공통화 여부를 검토한다.

### Build / Check

31. bundle/syntax check 실패 시 배포파일을 갱신하지 않는다.
32. build version과 userscript metadata/STATUS version이 일치한다.
33. `check.mjs`는 금지 의존성/API 사용과 파일 크기 규칙을 검사한다.
34. 가능한 경우 긴 반복 code block도 check 단계에서 warning 처리한다.
35. build/check/regression 이후에만 generated `ri-retry.user.js`를 main에 반영한다.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
