# Reels Inspector Regression Tests

현재 단계에서는 Android Edge + Tampermonkey 실기기 검증과 함께 사용할 회귀 기준/fixture를 보관합니다.

## fixture

- `fixtures/core-cases.json` — mediaType, Verified Store conflict, Grid 안전성 기준

## v3.1 Core 필수 회귀 항목

1. Reel: 조회수/좋아요/댓글/리포스트가 동일 shortcode에만 결합된다.
2. Photo/Carousel `/p/`: 조회수가 Store에 존재하더라도 Grid에 조회수/ER/24h/배수를 표시하지 않는다.
3. `media_type=1/2/8`, `product_type=clips`를 각각 PHOTO/VIDEO/CAROUSEL/REEL로 분류한다.
4. 동일 shortcode permalink 요청은 동시에 하나만 실행한다.
5. 같은 renderKey이면 Grid row text를 다시 쓰지 않는다.
6. React가 anchor DOM을 재사용해 href shortcode가 바뀌면 새 shortcode를 사용한다.
7. 짧은 시간 내 지표 급락 또는 비현실적인 급증은 verified 값으로 즉시 덮어쓰지 않고 conflict로 처리한다.
8. Instagram의 `앱 사용` 하단 배너와 겹치는 카드에는 RI 오버레이를 숨긴다.
9. 현재 Grid의 2줄 정보영역을 임의로 재설계하지 않는다.
10. 우리 Grid 액션 버튼은 카드당 **1개**만 존재한다.
11. 우리 스크립트는 Instagram 기본 미디어 표시와 중복되는 플레이 버튼을 만들지 않는다.
12. 미디어 메뉴는 버튼을 누른 **현재 카드 shortcode**의 media URL/링크만 사용한다.
13. 미디어 메뉴 클릭은 Instagram 카드 본문 이동을 발생시키지 않는다.
14. 카드 본문 클릭은 기존 Instagram 게시물 이동을 그대로 유지한다.
15. 메뉴 밖 탭, 스크롤, resize, route change 시 열린 Grid 메뉴가 닫힌다.
16. video URL이 없으면 임의 URL을 만들지 않고 `영상 준비중` 비활성 상태로 처리한다.
17. Carousel 전체 슬라이드 URL은 `media[]`가 검증되기 전에는 임의 생성하지 않는다.
18. 새 수정으로 숫자 깜빡임 제거/이벤트 기반 refresh/renderKey 최적화를 되돌리지 않는다.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
