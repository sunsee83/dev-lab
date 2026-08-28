# Reels Inspector Regression Tests

현재 단계에서는 Android Edge + Tampermonkey 실기기 검증과 함께 사용할 회귀 기준/fixture를 보관합니다.

## fixture

- `fixtures/core-cases.json` — mediaType, Verified Store conflict, Grid 안전성 기준

## v3.1 Core 필수 회귀 항목

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
12. 앞 슬롯 문자열 길이가 바뀌어도 다른 슬롯의 x 위치가 변하지 않는다.
13. 값이 없거나 해당되지 않는 경우 슬롯 자체를 제거하지 않고 `-`를 표시한다.
14. 우리 Grid 액션 버튼은 카드당 **1개**만 존재한다.
15. 우리 스크립트는 Instagram 기본 미디어 표시와 중복되는 플레이 버튼을 만들지 않는다.
16. 미디어 메뉴는 버튼을 누른 **현재 카드 shortcode**의 media URL/링크만 사용한다.
17. REEL/VIDEO에서 검증된 video URL이 있으면 `영상 다운로드`가 활성화된다.
18. REEL/VIDEO `썸네일 다운로드`는 Store의 임의 image보다 현재 카드 DOM `img/srcset`을 우선한다.
19. 현재 카드 `srcset`이 있으면 가장 큰 후보를 썸네일 다운로드 대상으로 사용한다.
20. PHOTO에서는 `이미지 다운로드`를 제공한다.
21. CAROUSEL은 parent media의 `carousel_media[]`에서 slide 이미지를 순서대로 수집한다.
22. CAROUSEL의 `전체 이미지 다운로드 (N)`에서 N은 확보된 parent slide image 수와 일치한다.
23. CAROUSEL 전체 다운로드는 slide 순서를 유지하고 다른 shortcode의 nested image를 섞지 않는다.
24. Carousel slide URL이 아직 확보되지 않았으면 임의 생성하지 않고 `전체 이미지 준비중`을 표시한다.
25. download는 Blob 저장을 우선 시도하고 실패 시 direct download fallback을 사용한다.
26. `showDirectoryPicker()` 지원 환경에서는 사용자가 선택한 폴더에 Blob을 직접 쓸 수 있다.
27. File System Access 미지원 환경에서는 임의 폴더를 강제하지 않고 브라우저 기본 Downloads로 fallback한다.
28. 선택 폴더 직접 쓰기가 CDN/CORS로 실패하면 기본 다운로드로 fallback한다.
29. 다운로드 파일명은 `Instagram_` 접두사와 shortcode를 포함한다.
30. video URL이 없으면 임의 URL을 만들지 않고 `영상 준비중` 비활성 상태로 처리한다.
31. 메뉴 클릭은 Instagram 카드 본문 이동을 발생시키지 않는다.
32. 카드 본문 클릭은 기존 Instagram 게시물 이동을 그대로 유지한다.
33. 메뉴 밖 탭, 스크롤, resize, route change 시 열린 Grid 메뉴가 닫힌다.
34. 새 수정으로 숫자 깜빡임 제거/이벤트 기반 refresh/renderKey 최적화를 되돌리지 않는다.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
