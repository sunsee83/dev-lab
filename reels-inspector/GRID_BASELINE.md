# Grid Frozen UI Baseline

이 문서는 Instagram 프로필/검색 Grid에서 **유지해야 하는 현재 UI 기준**을 기록합니다. Core/Identity/Store를 수정하더라도 아래 표현은 명시적 UI 변경 요청이 없는 한 유지합니다.

## 누적 개선 원칙 — 최우선

Grid 개발은 **rollback 방식이 아니라 cumulative 방식**으로 진행합니다.

- 이미 실기기에서 좋아졌다고 확인된 동작/표현은 다음 수정에서 유지합니다.
- 한 항목이 누락되었다고 해서 이전 버전 전체 UI나 로직으로 되돌리지 않습니다.
- 수정은 항상 **현재 승인된 baseline + 필요한 delta만 추가**하는 방식으로 합니다.
- 숫자 깜빡임 제거, 이벤트 기반 갱신, 동일 값 DOM 재작성 방지 등 이미 좋아진 구조는 유지합니다.
- 새 버전에서 기존 승인 항목이 사라지면 회귀(regression)로 간주합니다.

현재 누적 승인 상태:

1. 숫자 깜빡임 제거
2. 이벤트 기반 갱신 + 동일 값 DOM 재작성 방지
3. 3열 Instagram Grid 크기 유지
4. 썸네일 위 하단 2줄 정보영역 유지
5. REEL/VIDEO의 검증된 조회수 및 파생지표 유지
6. PHOTO/CAROUSEL의 잘못된 조회수 차단
7. 하단 Instagram 배너와 실제 겹치는 영역만 숨김
8. Instagram 기본 media-type 아이콘은 그대로 유지
9. 우리 Grid 액션은 **단일 미디어 메뉴 버튼**으로 유지
10. 하단 8개 지표는 각각 독립된 고정 슬롯 사용

## 정보영역 — 8개 고정 슬롯

썸네일 하단에 별도 카드나 흰색/회색 정보바를 만들지 않고, **이미지 위 하단 정보영역**을 유지합니다.

두 줄은 각각 4개의 독립된 Grid cell을 사용하며 앞 항목 문자열 길이가 뒤 항목 위치를 밀지 않습니다.

column 비율:

`30% / 24% / 23% / 23%`

### 1줄

`조회수 | 좋아요 | 댓글 | 리포스트`

예:

`▶805.8만 | ♥1.9만 | ●157 | ↻955`

- REEL/VIDEO의 검증된 조회수만 숫자로 표시
- PHOTO/CAROUSEL은 `▶-`
- 좋아요/댓글/리포스트 미확보 시 각각 `♥- / ●- / ↻-`
- 한 슬롯 값이 길어도 다른 슬롯의 시작 위치는 변경하지 않음

### 2줄

`ER | 24h 증가율 | 계정 대비 배수 | 게시일`

예:

`0.29% | +5.5% | ×4.2 | 08/21`

- 값 미확보 시 해당 셀은 `-`
- ER/24h/계정대비는 조회수가 확인된 REEL/VIDEO에서만 계산
- 24h는 실제 과거 snapshot이 있을 때만 숫자 표시
- 계정 대비는 동일 계정 비교 데이터가 최소 5개일 때만 숫자 표시
- 날짜가 없으면 마지막 셀 `-`

## Grid 액션 — 단일 진입점

Instagram이 이미 Reel/Video/Carousel 종류를 자체 아이콘으로 표시하므로 우리 스크립트는 미디어 종류를 다시 나타내는 **플레이 버튼을 만들지 않습니다.**

우리 액션은 카드당 **미디어 메뉴 버튼 1개**만 둡니다.

- 위치: 카드 좌측 상단
- 크기: 약 28px
- 아이콘: 다운로드/미디어 액션 의미
- Instagram 기본 우측 상단 미디어 아이콘은 그대로 둠
- 카드 자체 클릭은 원래 Instagram 게시물 이동 유지

## 미디어 메뉴

### REEL / VIDEO

- `영상 다운로드`
- `썸네일 다운로드`
- 저장 폴더 항목
- `링크 복사`

### PHOTO

- `이미지 다운로드`
- 저장 폴더 항목
- `링크 복사`

### CAROUSEL

- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- 저장 폴더 항목
- `링크 복사`

## 썸네일 identity 규칙

Video/Reel 썸네일은 단순히 Store의 첫 번째 image URL을 사용하지 않습니다.

우선순위:

1. **현재 Grid 카드 DOM의 `img/srcset`**
2. `srcset`에서 가장 큰 후보
3. 현재 media object의 `image_versions2.candidates`, `display_resources`, `display_url`, `thumbnail_src`
4. Verified Store `thumbUrl` fallback

목적은 해상도보다 먼저 **현재 shortcode의 실제 cover와 identity가 맞는지**를 보장하는 것입니다.

## Carousel 전체 이미지 규칙

전체 다운로드용 이미지 목록은 parent media의 `carousel_media[]`에서만 만듭니다.

- slide 순서 유지
- 각 slide에서 가장 큰 image candidate 선택
- 중복 URL 제거
- 다른 shortcode의 nested image를 합치지 않음
- 확보되지 않았으면 임의 생성하지 않고 `전체 이미지 준비중`

파일명은 slide 순서를 포함합니다.

`Instagram_<shortcode>_slide_01.*`
`Instagram_<shortcode>_slide_02.*`
...

## 다운로드 경로 규칙

웹 페이지/userscript는 브라우저 sandbox 밖의 파일시스템을 임의로 제어하지 않습니다.

- `showDirectoryPicker()` 지원 환경: 사용자가 직접 저장 폴더 선택 가능
- 선택한 폴더는 현재 세션의 다운로드 대상으로 사용
- 미지원 환경: 브라우저/OS 기본 Downloads 경로 사용
- 파일명은 `Instagram_` 접두사 사용
- 브라우저가 지원하지 않는데 임의로 `Instagram/` 하위 폴더를 강제 생성하지 않음
- CDN CORS로 선택 폴더 직접 쓰기가 실패하면 기본 다운로드로 fallback 가능

## mediaType 판정

Grid는 URL만으로 미디어 종류를 결정하지 않습니다.

우선 근거:

1. network/embedded JSON의 `media_type`, `product_type`
2. Verified Store의 `mediaType`
3. 현재 카드 DOM의 video/Reel indicator
4. `/reel/`, `/p/` URL은 보조 근거

표준값:

- `REEL`
- `VIDEO`
- `PHOTO`
- `CAROUSEL`

## 가시영역

- 검색창/상단 영역과 하단 네비게이션을 침범하지 않습니다.
- Instagram의 `앱 사용`, `Open app`, `Use app` 같은 하단 고정 배너와 **실제로 겹치는 카드만** RI 정보/액션을 숨깁니다.

## 회귀 기준

- 기존 3열 Grid 폭/높이를 변경하지 않음
- 숫자 깜빡임 없음
- 같은 값이면 DOM text 재작성 없음
- React DOM 재사용 시 shortcode 혼입 없음
- PHOTO/CAROUSEL에 잘못된 조회수 없음
- REEL/VIDEO의 검증된 조회수가 누락되지 않음
- 8개 슬롯의 x 위치가 다른 슬롯 문자열 길이에 따라 움직이지 않음
- 미확보 값은 슬롯 삭제가 아니라 `-`
- 우리 Grid 버튼은 카드당 1개만 보임
- 우리 플레이/영상종류 표시 버튼은 없음
- Instagram 기본 미디어 아이콘은 그대로임
- Video/Reel 썸네일 다운로드가 현재 카드 cover와 일치함
- Carousel 전체 이미지 다운로드가 parent shortcode의 slide만 사용함
- 미디어 메뉴가 다른 카드의 URL을 열지 않음
- 정보영역을 카드 밖 별도 영역으로 이동하지 않음
- **새 수정 때문에 기존 승인 개선사항이 다시 나빠지지 않음**
