# Instagram Content Research Tool — 개발 상태

이 문서는 `PROJECT_PLAN.md`의 실행 현황을 기록합니다. UI 동결 기준은 `GRID_BASELINE.md`, 회귀 기준은 `tests/README.md`도 함께 확인합니다.

## 현재 배포

- 버전: **v3.1.6**
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

## 실기기에서 확인된 v3.1.5 문제

1. Video/Reel `썸네일 다운로드`가 실제 영상 cover가 아니라 음악/앨범 이미지로 저장되는 사례가 확인됨.
2. 8개 지표가 DOM상 span으로 나뉘어 있어도 화면에서는 각자 고정된 x 위치가 충분히 드러나지 않고 왼쪽으로 몰려 보임.
3. Android Edge에서 `저장 폴더 선택`이 나타나지 않고 기본 다운로드 위치로 바로 저장됨.
4. Carousel 전체 다운로드는 ZIP이 아니라 원본 이미지들을 개별 파일로 한 번에 저장하는 흐름이 필요함.

## v3.1.6 — Grid media/slot 수정

### 1. 8개 슬롯 위치를 절대 고정

각 행을 문자열 흐름이나 일반 flex/grid 정렬에 맡기지 않고, 4개 span을 카드 폭의 정해진 구간에 **absolute positioning**으로 고정합니다.

1줄:

`조회수 | 좋아요 | 댓글 | 리포스트`

- 조회수: 0~32%
- 좋아요: 32~59%
- 댓글: 59~79%
- 리포스트: 79~100%

2줄:

`ER | 24h | 계정 대비 | 날짜`

- ER: 0~26%
- 24h: 26~51%
- 계정 대비: 51~75%
- 날짜: 75~100%

모든 셀은 가운데 정렬하고 `font-variant-numeric: tabular-nums`를 사용합니다. 다른 슬롯 값의 길이가 바뀌어도 위치는 이동하지 않습니다. 값이 없으면 기존처럼 `-`를 유지합니다.

### 2. 음악 앨범 이미지와 실제 cover 분리

v3.1.5의 문제 원인은 현재 카드 안에서 단순히 첫 번째 `img`를 선택할 수 있었던 점입니다. Instagram 카드 안에는 음악/앨범 이미지 같은 작은 보조 이미지도 존재할 수 있습니다.

v3.1.6에서는 Grid cover를 다음 순서로 결정합니다.

1. 현재 카드와 **넓게 겹치는 큰 `img`**만 후보로 사용
2. 카드 폭/높이의 약 62% 이상, 카드 면적의 약 38% 이상을 덮는 이미지 요구
3. `music/audio/album/음원/앨범/프로필` 계열 보조 이미지는 작은 경우 제외
4. 해당 `img`의 `srcset`이 있으면 가장 큰 후보 사용
5. DOM에서 확실한 큰 cover가 없으면 현재 media object의 직접 이미지에서 만든 `coverUrl` 사용
6. 마지막에만 기존 `thumbUrl` fallback

Extractor도 임의 nested image를 `thumbUrl`로 채우지 않고, shortcode를 가진 현재 media object의 `image_versions2 / display_resources / display_url` 등 직접 cover만 저장합니다.

### 3. Carousel 전체 이미지 다운로드 확대

Carousel slide 목록은 다음 두 Instagram 데이터 형태를 모두 지원합니다.

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

각 slide에서 가장 큰 이미지 후보를 선택하고 parent shortcode에 순서대로 연결합니다.

Grid 메뉴:

- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- `링크 복사`

ZIP은 사용하지 않습니다. `전체 이미지 다운로드` 한 번으로 다음처럼 **개별 파일을 순차 저장**합니다.

`Instagram_<shortcode>_slide_01.*`
`Instagram_<shortcode>_slide_02.*`
`Instagram_<shortcode>_slide_03.*`
...

저장 중에는 `1/N`, `2/N` 형태의 진행 toast를 표시합니다. 브라우저가 여러 자동 다운로드 권한을 요구하면 사용자가 해당 사이트의 여러 파일 다운로드를 허용해야 할 수 있습니다.

### 4. Android Edge 저장 폴더 제한을 UI에 명확히 표시

현재 Android Edge 실행 환경에서는 `window.showDirectoryPicker`가 노출되지 않아 userscript가 사용자가 지정한 폴더의 write handle을 받을 수 없습니다.

따라서 현재 기기에서는:

- 메뉴에 `저장 위치: 기본 Downloads` 표시
- 다운로드 시 최초 1회 `Android Edge: 폴더 지정 불가 · 기본 Downloads에 저장` 안내
- 파일명을 `Instagram_<shortcode>_...` 형태로 통일

웹 페이지/Tampermonkey가 브라우저 권한 없이 Android 파일시스템에 임의로 `Instagram/` 폴더를 생성하고 그 안에 파일을 쓰는 것은 브라우저 sandbox 때문에 할 수 없습니다.

`showDirectoryPicker()`를 제공하는 다른 환경에서는 기존처럼 사용자가 폴더를 선택할 수 있습니다.

## Grid 미디어 메뉴

### REEL / VIDEO

- `영상 다운로드`
- `썸네일 다운로드`
- 저장 위치 표시/선택(지원 환경만)
- `링크 복사`

### PHOTO

- `이미지 다운로드`
- 저장 위치 표시/선택(지원 환경만)
- `링크 복사`

### CAROUSEL

- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- 저장 위치 표시/선택(지원 환경만)
- `링크 복사`

## 현재 실기기 검증 항목

1. 8개 지표가 각 카드에서 동일한 x 위치에 고정되는지
2. 조회수/좋아요 숫자 길이가 달라도 댓글/리포스트 위치가 움직이지 않는지
3. 미확보 값이 해당 자리의 `-`로 유지되는지
4. Video/Reel 썸네일 다운로드가 음악 앨범 이미지가 아니라 실제 Grid cover인지
5. 같은 카드에서 반복 다운로드해도 다른 shortcode cover가 섞이지 않는지
6. Carousel 메뉴의 `(N)`이 실제 slide 수와 맞는지
7. `전체 이미지 다운로드`가 ZIP 없이 slide 01~N을 각각 저장하는지
8. Carousel 순서가 Instagram slide 순서와 일치하는지
9. Android Edge에서는 `저장 위치: 기본 Downloads`가 표시되는지
10. 다운로드 시 폴더 지정 불가 안내가 한 번 표시되는지
11. 기존 숫자 깜빡임이 다시 생기지 않는지
12. 우리 Grid 버튼이 카드당 1개만 유지되는지
13. Instagram 기본 미디어 아이콘이 그대로인지
14. 하단 앱 배너와 겹치는 카드만 RI 영역이 숨겨지는지

## 다음 개발 단계

위 Grid 회귀를 실기기에서 확인한 뒤 v3.2 Grid 안정화를 마감합니다.

그 다음 v3.3 Content Types에서 현재 `carouselImages`를 공통 `media[]` 모델로 확장합니다.

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
- 8개 지표의 x 위치는 각각 고정합니다.
- Video/Reel cover는 카드의 큰 본문 이미지와 현재 shortcode media object만 신뢰합니다.
- 음악/앨범/프로필 보조 이미지를 영상 cover로 사용하지 않습니다.
- Carousel 전체 이미지는 parent carousel의 slide 구조에서만 구성합니다.
- ZIP을 기본 다운로드 방식으로 사용하지 않습니다.
- 검증되지 않은 media URL을 만들지 않습니다.
- 브라우저 sandbox를 우회해 Android 로컬 폴더를 강제 생성하지 않습니다.
- hotfix `@require` 체인은 다시 만들지 않습니다.
- 각 수정 후 `STATUS.md`를 갱신합니다.
