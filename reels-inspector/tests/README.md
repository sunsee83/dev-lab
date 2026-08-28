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
9. 현재 Grid의 2줄 정보영역과 이미지/영상 액션 위치를 임의로 재설계하지 않는다.

실기기 검증 결과는 `STATUS.md`에 기록합니다.
