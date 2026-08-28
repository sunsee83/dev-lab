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
12. 1줄 각 슬롯은 정해진 x 영역에 absolute position으로 고정된다.
13. 2줄 각 슬롯도 정해진 x 영역에 absolute position으로 고정된다.
14. 앞 슬롯 문자열 길이가 바뀌어도 다른 슬롯의 x 위치가 변하지 않는다.
15. 모든 슬롯 text는 자신의 영역 안에서 가운데 정렬된다.
16. 값이 없거나 해당되지 않는 경우 슬롯 자체를 제거하지 않고 `-`를 표시한다.
17. 우리 Grid 액션 버튼은 카드당 **1개**만 존재한다.
18. 우리 스크립트는 Instagram 기본 미디어 표시와 중복되는 플레이 버튼을 만들지 않는다.
19. 미디어 메뉴는 버튼을 누른 **현재 카드 shortcode**의 media URL/링크만 사용한다.
20. REEL/VIDEO에서 검증된 video URL이 있으면 `영상 다운로드`가 활성화된다.
21. Video/Reel cover 선택은 카드 내부 첫 번째 `img`가 아니라 카드와 넓게 겹치는 큰 본문 image를 우선한다.
22. 카드 폭/높이에 비해 작은 음악/앨범/프로필 이미지는 cover 후보에서 제외한다.
23. 실제 cover `img`에 `srcset`이 있으면 가장 큰 후보를 다운로드 대상으로 사용한다.
24. DOM cover가 없을 때 현재 shortcode media object에서 추출한 `coverUrl`을 사용한다.
25. 재귀 탐색에서 우연히 발견된 nested image를 video cover로 저장하지 않는다.
26. PHOTO에서는 `이미지 다운로드`를 제공한다.
27. CAROUSEL은 parent media의 `carousel_media[]`를 slide 목록으로 지원한다.
28. CAROUSEL은 GraphQL `edge_sidecar_to_children.edges[].node`도 slide 목록으로 지원한다.
29. CAROUSEL의 `전체 이미지 다운로드 (N)`에서 N은 확보된 parent slide image 수와 일치한다.
30. CAROUSEL 전체 다운로드는 slide 순서를 유지하고 다른 shortcode의 nested image를 섞지 않는다.
31. Carousel slide URL이 아직 확보되지 않았으면 임의 생성하지 않고 `전체 이미지 준비중`을 표시한다.
32. Carousel 전체 다운로드는 ZIP을 생성하지 않고 `slide_01`, `slide_02`... 개별 파일을 순차 저장한다.
33. Carousel batch 저장 중 `현재/N` 진행 상태를 표시한다.
34. download는 Blob 저장을 우선 시도하고 실패 시 direct download fallback을 사용한다.
35. `showDirectoryPicker()` 지원 환경에서는 사용자가 선택한 폴더에 Blob을 직접 쓸 수 있다.
36. `showDirectoryPicker()` 미지원 환경에서는 임의 폴더를 만들지 않고 브라우저 기본 Downloads로 저장한다.
37. 미지원 환경 메뉴에는 `저장 위치: 기본 Downloads`가 명확히 표시된다.
38. 미지원 환경 최초 다운로드에서 폴더 지정 불가 이유를 안내한다.
39. 선택 폴더 직접 쓰기가 CDN/CORS로 실패하면 기본 다운로드로 fallback한다.
40. 다운로드 파일명은 `Instagram_` 접두사와 shortcode를 포함한다.
41. video URL이 없으면 임의 URL을 만들지 않고 `영상 준비중` 비활성 상태로 처리한다.
42. 메뉴 클릭은 Instagram 카드 본문 이동을 발생시키지 않는다.
43. 카드 본문 클릭은 기존 Instagram 게시물 이동을 그대로 유지한다.
44. 메뉴 밖 탭, 스크롤, resize, route change 시 열린 Grid 메뉴가 닫힌다.
45. 새 수정으로 숫자 깜빡임 제거/이벤트 기반 refresh/renderKey 최적화를 되돌리지 않는다.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
