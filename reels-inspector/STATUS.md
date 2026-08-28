# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.5**
- 실행: Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹
- 배포 파일: `ri-retry.user.js`
- 배포 방식: 단일 self-contained userscript
- 그리드 UI: **Frozen UI + 누적 개선 원칙**

## 누적 보존 대상

- 숫자 깜빡임 제거
- MutationObserver / History / scroll / media event 기반 갱신
- 같은 값 DOM 재작성 방지
- 동일 shortcode pending request dedupe
- 기존 3열 Grid 크기/배치
- 썸네일 위 하단 2줄 정보영역
- REEL/VIDEO 검증 조회수 및 파생지표
- PHOTO/CAROUSEL 잘못된 조회수 차단
- Instagram 기본 media-type 아이콘 유지
- 우리 Grid 액션은 카드당 단일 버튼
- 하단 Instagram 배너와 실제 겹치는 카드만 RI 영역 숨김
- `ri311:*` 캐시 유지

## v3.1.5 — Grid 슬롯/썸네일/Carousel/저장 경로

### 1. 8개 지표 슬롯의 위치 고정

하단 2줄은 단순 문자열 나열이 아니라 **각 항목이 독립된 고정 셀**을 사용합니다.

1줄 4셀:

`조회수 | 좋아요 | 댓글 | 리포스트`

2줄 4셀:

`ER | 24h | 계정 대비 | 날짜`

규칙:

- 앞 슬롯 숫자가 길어져도 뒤 슬롯 시작 위치를 밀지 않음
- 각 줄은 `30% / 24% / 23% / 23%` 고정 Grid column 사용
- 미확보 값은 `-`
- PHOTO/CAROUSEL은 조회수 추정 없이 `▶-`
- 값이 같으면 기존 renderKey로 DOM 갱신하지 않음

### 2. Video/Reel 썸네일 정확도 개선

기존에는 Store에서 수집된 `thumbUrl`을 먼저 사용하여 다른 nested media의 이미지가 섞일 가능성이 있었습니다.

v3.1.5에서는 Grid 다운로드 시:

1. **현재 카드 DOM의 실제 `img` / `srcset`**을 최우선 사용
2. `srcset`이 있으면 가장 큰 후보를 선택
3. DOM 이미지가 없을 때만 Verified Store `thumbUrl` fallback

Extractor에서도 `image_versions2.candidates`, `display_resources`, `display_url`, `thumbnail_src` 등 현재 media object의 직접 이미지 후보를 먼저 사용합니다.

### 3. Carousel 전체 이미지 수집/다운로드

`carousel_media[]`가 확보되면 parent shortcode에 연결하여 순서대로 `carouselImages`에 저장합니다.

Grid 메뉴:

- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- `링크 복사`

파일명:

`Instagram_<shortcode>_slide_01.jpg`
`Instagram_<shortcode>_slide_02.jpg`
...

- 슬라이드 순서 유지
- 중복 URL 제거
- 아직 `carousel_media[]`가 확보되지 않았으면 `전체 이미지 준비중`으로 표시
- permalink HTML 내부 JSON도 추가 스캔하여 Carousel slide 확보 가능성을 높임

현재 구현은 **Carousel 이미지/포스터** 전체를 대상으로 합니다. Carousel 안의 video child를 원본 영상으로 일괄 저장하는 기능은 공통 `media[]` 모델 단계에서 확장합니다.

### 4. 다운로드 폴더

브라우저가 File System Access API의 `showDirectoryPicker()`를 제공하면 Grid 메뉴에:

- `저장 폴더 선택`
- 선택 후 `저장 폴더 변경`

을 표시합니다. 선택한 폴더는 현재 페이지 세션의 다운로드 대상이 됩니다.

지원하지 않는 브라우저에서는:

- `저장 폴더: 브라우저 기본` 비활성 표시
- 브라우저/OS가 설정한 Downloads 위치로 저장
- 파일명을 `Instagram_...` 접두사로 통일

웹 페이지/userscript는 브라우저가 File System Access 권한을 제공하지 않는 환경에서 임의의 로컬 폴더를 생성하거나 다운로드 경로를 강제할 수 없습니다. 이는 브라우저 sandbox 보안 제한입니다.

선택 폴더를 사용 중이어도 Instagram CDN이 CORS로 Blob fetch를 거부하면 선택 폴더 직접 쓰기가 불가능할 수 있으며, 이 경우 기본 브라우저 다운로드로 fallback합니다.

## Grid 미디어 메뉴

REEL / VIDEO:
- `영상 다운로드`
- `썸네일 다운로드`
- 저장 폴더 항목
- `링크 복사`

PHOTO:
- `이미지 다운로드`
- 저장 폴더 항목
- `링크 복사`

CAROUSEL:
- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- 저장 폴더 항목
- `링크 복사`

## 실기기 검증 항목

1. 조회수 숫자 길이가 달라도 좋아요/댓글/리포스트 위치가 움직이지 않는지
2. 2줄의 ER/24h/계정대비/날짜도 각각 같은 위치를 유지하는지
3. 값 미확보 슬롯에 `-`가 유지되는지
4. Video/Reel `썸네일 다운로드`가 현재 Grid에 보이는 해당 콘텐츠의 실제 cover인지
5. Carousel 메뉴에 확보된 slide 수가 `(N)`으로 표시되는지
6. `전체 이미지 다운로드`가 같은 shortcode의 모든 slide 이미지를 순서대로 저장하는지
7. 우리 Grid 버튼은 카드당 1개인지
8. Instagram 기본 미디어 아이콘은 그대로인지
9. 영상/이미지 다운로드가 다른 카드와 섞이지 않는지
10. 폴더 선택 지원 환경에서는 선택한 폴더로 저장되는지
11. 미지원 환경에서는 브라우저 기본 다운로드로 정상 fallback하는지
12. 숫자 깜빡임이 다시 생기지 않는지
13. 하단 앱 배너와 겹치는 카드만 RI 영역이 숨겨지는지

## 다음 개발 단계

Grid의 위 회귀를 실기기에서 확인한 뒤 v3.2 Grid 안정화를 마감합니다.

그 다음 v3.3 Content Types에서 현재의 `carouselImages` 임시 필드를 공통 `media[]` 모델로 확장합니다.

- Photo
- Feed Video
- Carousel slide media
- Caption
- Hashtags
- Mentions
- Media list

그 이후 v3.4 Research Detail UI → v3.5 Comments 순서로 진행합니다.

## 작업 규칙

- 좋아진 동작을 기능 복구 때문에 과거 방식으로 되돌리지 않습니다.
- Grid Frozen UI는 명시적 요청 없이는 크게 재설계하지 않습니다.
- 8개 지표의 **슬롯 위치는 고정**합니다.
- Video/Reel 썸네일은 현재 카드 identity와 일치하는 DOM image를 우선합니다.
- Carousel 전체 이미지는 parent shortcode의 `carousel_media[]`에서만 구성합니다.
- 검증되지 않은 media URL을 만들지 않습니다.
- 브라우저 sandbox를 우회해 임의 다운로드 폴더를 강제하지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
