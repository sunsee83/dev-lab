# Instagram Content Research Tool — 개발 기준 문서

> 이 문서는 프로젝트 개발의 **단일 기준 문서(Single Source of Truth)** 입니다.  
> 기능을 수정하거나 추가하기 전에 이 문서와 `STATUS.md`, `CODE_STRUCTURE.md`, 관련 UI baseline, 현재 실행 파일을 먼저 확인합니다.  
> 요구사항·구조·UI·우선순위가 바뀌면 기존 설계를 먼저 검토한 뒤 새 결정을 통합하며, 관련 없는 기존 설계를 무턱대고 삭제하지 않습니다.

## 0. 현재 상태

- 현재 실행 방식: **Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹**
- 현재 배포 파일: `ri-retry.user.js`
- 현재 배포 버전: **v3.2.0**
- 배포 방식: 단일 self-contained userscript
- 개발 원본: **`src/*`**
- `ri-retry.user.js`: build에서 생성되는 deployment artifact
- 과거 `@require` hotfix 체인과 구형 실행 파일은 제거 완료
- 현재 단계: **v3.2 UI/Foundation + Download migration 진행 중**
- Grid는 **Frozen UI + 누적 개선 원칙**을 적용한다.

### 현재 v3.2 구현 상태

- `src/version.js`를 버전 단일 원본으로 사용
- AppContext / capability / Settings Store / Download Manager 활성화
- migration adapter를 통해 기존 `ri311:*` Verified Store cache를 새 UI/다운로드 계층에서 읽음
- 기존 Reel 전용 RI 버튼 대신 전역 RI 버튼 활성화
- 공용 RI Panel `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` shell 활성화
- Grid 카드 저장 위치 설정을 제거하고 카드 메뉴는 콘텐츠 액션만 담당
- Grid/RI 미디어 저장은 공통 Download Manager를 사용
- 기존 Identity/Extractor/Verified merge/Metrics/Grid 정보표시 엔진은 검증된 legacy runtime을 우선 보존하며 단계적으로 이동
- 사진/썸네일의 지정 폴더 저장은 cross-origin transport 때문에 실기기 검증이 필요하며, 실패가 확인되면 UI가 아니라 media transport 계층만 교체한다.

### 이미 확보한 v3.1 개선사항 — 계속 보존

- 900ms 전체 polling 제거 및 이벤트/Observer 기반 refresh
- 동일 shortcode pending request dedupe
- renderKey 기반 변경값만 갱신
- React DOM 재사용 시 shortcode 재검증
- Verified Store의 source/confidence/status/conflict 기반
- 실제 `PHOTO / VIDEO / CAROUSEL / REEL` mediaType 기반 확대
- Grid 숫자 깜빡임 제거
- Grid 8개 지표 슬롯 고정
- Video/Reel cover와 음악/앨범 artwork 분리 강화
- Carousel 개별 이미지 일괄 다운로드 기반

---

# 1. 제품 정의

이 프로젝트는 단순 Reel Downloader나 IG Sorter가 아니다.

**Instagram의 Reel·피드 동영상·사진·캐러셀·캡션·태그·댓글·성과 데이터를 수집하고, 좋은 콘텐츠를 발견하고, 원본과 대본을 확보하며, 댓글의 소비자 니즈와 Hook/CTA까지 분석하는 콘텐츠 리서치 시스템**을 목표로 한다.

핵심 사용자 흐름:

`발굴 → 콘텐츠 확인 → 상세 조사 → 원본 확보 → 분석 → 참고 소재 저장`

지원 대상:

- Reel
- Feed Video
- Photo
- Carousel / 카드뉴스
- Caption
- Hashtags / Mentions
- Comments / Replies
- Profile / Account 단위 성과 비교
- Media download
- 향후 STT / OCR / AI 분석
- 향후 콘텐츠 소재 저장/라이브러리

---

# 2. 전체 시스템 구조

최종 구조는 3계층으로 나눈다.

```text
Instagram
   ↓
브라우저 클라이언트
   ↓
분석 서버
   ↓
STT / OCR / AI 파이프라인
```

## 2.1 브라우저 클라이언트

담당:

- 현재 콘텐츠 식별
- Reel/Video/Photo/Carousel 구분
- 공개 지표 수집
- 캡션/태그/멘션 수집
- 댓글/답글 수집
- 미디어 주소 확보
- Grid 비교 UI
- Reel 핵심지표 표시
- 전역 RI 버튼과 공용 리서치 패널
- 공용 설정
- 공통 Download Manager
- 정렬/필터
- 로컬 snapshot/history
- 분석 서버 요청/결과 표시

## 2.2 분석 서버

담당:

- 미디어 수신 및 작업 관리
- FFmpeg
- 오디오 추출
- STT
- 영상 프레임 추출
- OCR
- OCR 중복 병합
- STT/OCR 시간축 정렬
- 댓글 대량 전처리

비동기 Job 구조:

```text
POST /analysis → jobId
GET /analysis/{jobId} → queued / processing / completed / failed
```

브라우저가 분석 서버에 Instagram 로그인 쿠키를 전달하는 구조를 기본으로 사용하지 않는다.

## 2.3 AI

AI는 원본 영상 전체를 무조건 받지 않는다.

입력:

- STT + timestamp
- OCR + timestamp + 좌표
- deterministic matching 결과
- 중요 frame
- 선별된 댓글

출력:

- 교정 대본
- 실제 발화
- 화면 자막
- 화면 Hook
- 고정 제목
- CTA
- 강조어
- 숫자/금액
- 콘텐츠 구조
- 댓글 니즈/질문/불만/후기/아이디어

---

# 3. 브라우저 내부 데이터 흐름 — 반드시 지킬 규칙

모든 기능은 아래 방향으로만 데이터를 흘린다.

```text
Instagram
   ↓
Identity
   ↓
Extractor
   ↓
Normalizer
   ↓
Verified Store
   ↓
Metrics Engine
   ↓
UI / Download Manager / Analysis Request
```

## 절대 규칙

1. UI마다 Instagram DOM을 제각각 읽지 않는다.
2. Instagram을 읽는 책임은 Identity/Extractor 계층에 둔다.
3. Grid, Reel Overlay, RI Panel, Media Action은 하나의 Store를 공유한다.
4. 현재 콘텐츠가 충분히 식별되지 않으면 다른 미디어의 값과 병합하지 않는다.
5. 값이 확인되지 않으면 추측하거나 `0`으로 만들지 않는다.
6. 값이 이전과 같으면 DOM을 다시 렌더하지 않는다.
7. 동일 shortcode 중복 fetch를 막는다.
8. 하나의 기능을 고치기 위해 별도 hotfix `@require` 체인을 만들지 않는다.
9. 다운로드 위치 정책은 미디어별로 따로 구현하지 않고 공통 Download Manager에서 결정한다.
10. 지정 폴더 저장이 실패했는데 조용히 다른 폴더로 저장하여 영상/사진 위치가 섞이지 않게 한다.

---

# 4. Content Identity

가장 먼저 현재 콘텐츠의 신원을 확정한다.

```text
ContentIdentity
- shortcode
- mediaId / pk
- ownerId
- username
- mediaType
- productType
- canonicalUrl
- parentMediaId
- childMediaId
- slideIndex
```

`mediaType` 표준값:

- `REEL`
- `VIDEO`
- `PHOTO`
- `CAROUSEL`

URL의 `/reel/`, `/p/`는 보조 근거일 뿐 최종 mediaType 자체가 아니다.

Identity 상태:

- `DETECTED`
- `IDENTIFYING`
- `IDENTIFIED`
- `DATA_LOADING`
- `READY`
- `FAILED`

검증되지 않은 분석값을 `READY`인 확정값처럼 표시하지 않는다.

---

# 5. Verified Store

단순히 `views: 511000`처럼 저장하지 않는다.

각 필드는 provenance를 가진다.

```text
views:
  value: 511000
  source: network
  confidence: high
  status: verified
  updatedAt: ...
```

status:

- `unknown`
- `loading`
- `verified`
- `unavailable`
- `conflict`

source:

- `network`
- `dom`
- `permalink`
- `embedded_json`
- `derived`

낮은 신뢰도의 새 값이 높은 신뢰도의 검증값을 무조건 덮어쓰지 못하게 한다.

UI 상태 표현은 화면 목적에 따라 구분한다.

- Grid: 마지막 검증값 또는 `-`
- 상세 패널: `확인 중 / - / 사용 불가 / 검증 중`을 구분 가능

---

# 6. 공통 Post 데이터 모델

```text
Post
├ identity
│  ├ shortcode
│  ├ mediaId
│  ├ mediaType
│  ├ ownerId
│  └ username
│
├ content
│  ├ caption
│  ├ hashtags[]
│  ├ mentions[]
│  ├ collaborators[]
│  └ location
│
├ metrics
│  ├ views
│  ├ likes
│  ├ comments
│  ├ reposts
│  └ publishedAt
│
├ media[]
│  ├ mediaId
│  ├ type
│  ├ url
│  ├ thumbnail
│  ├ width
│  ├ height
│  ├ duration
│  ├ slideIndex
│  └ resolvedAt
│
└ analysis
   ├ er
   ├ growth24h
   ├ outlier
   └ rank
```

미디어 CDN URL은 영구 ID로 쓰지 않는다.

- 영구 식별: `mediaId`, `shortcode`
- 임시 접근 경로: `videoUrl`, `imageUrl`, `thumbnail`
- URL 확보 시각: `resolvedAt`

Carousel은 최종적으로 임시 `carouselImages`가 아니라 공통 `media[]`의 slide 구조로 통합한다.

---

# 7. 지표 정의

## ER

`(좋아요 + 댓글 + 리포스트) / 조회수 × 100`

가중 ER을 사용하지 않는다. 조회수가 없는 Photo/Carousel에는 조회수 기반 ER을 만들지 않는다.

## 24h 증가율

현재 조회수와 실제 저장된 약 24시간 전 snapshot을 비교한다.

- 비교 허용 범위는 대략 18~32시간
- snapshot이 없으면 숫자를 만들지 않는다.

## 계정 대비 Outlier

동일 계정 최근 약 20개 콘텐츠의 조회수 중앙값 대비 현재 콘텐츠 조회수 배수.

- 비교 콘텐츠 최소 약 5개
- 부족하면 숫자를 만들지 않는다.

## 만들지 않는 비공개 지표

확보되지 않는 다음 값은 추정하지 않는다.

- saves
- reach
- impressions
- average watch time
- completion/dropoff
- profile visits
- follow conversion

---

# 8. 전체 UI 역할 체계

UI 역할을 다음 네 가지로 고정한다.

```text
Grid = 빠른 비교/발굴
Grid ↓ = 선택 콘텐츠 빠른 저장
RI = 전체 리서치/상세 기능
설정 = 전역 공용 설정
```

화면별 구조:

| 화면 | 자동 정보 | 직접 액션 |
|---|---|---|
| 프로필/검색/탐색 Grid | 8개 고정 성과 슬롯 | 카드 미디어 버튼 + 전역 RI |
| Reel | 핵심 5개 파생지표 | 전역 RI |
| Photo/Video/Carousel 상세 | Instagram 기본 화면 | 전역 RI |
| RI Panel | 상세 조사 정보 | 탭/다운로드/설정 |

---

# 9. Grid Frozen UI

`GRID_BASELINE.md`가 세부 회귀 기준이다. 다음 원칙은 PROJECT_PLAN에서도 유지한다.

## 9.1 3열과 정보영역

- Instagram 원래 3열 Grid 폭/높이를 유지한다.
- 별도 흰색/회색 정보바를 카드 밖에 만들지 않는다.
- 썸네일 하단의 기존 오버레이/그라데이션 영역을 사용한다.
- 숫자 깜빡임 제거 구조를 유지한다.

## 9.2 8개 독립 슬롯

1줄:

`조회수 | 좋아요 | 댓글 | 리포스트`

2줄:

`ER | 24h | 계정 대비 | 게시일`

각 항목은 독립된 고정 x 영역을 사용하여 다른 숫자의 길이에 밀리지 않는다.

현재 기준 영역:

1줄:
- 조회수 `0~32%`
- 좋아요 `32~59%`
- 댓글 `59~79%`
- 리포스트 `79~100%`

2줄:
- ER `0~26%`
- 24h `26~51%`
- 계정 대비 `51~75%`
- 날짜 `75~100%`

규칙:

- 값이 없으면 슬롯 자체를 없애지 않고 `-`
- REEL/VIDEO의 검증된 조회수만 숫자 표시
- PHOTO/CAROUSEL은 `▶-`
- 모든 슬롯은 자신의 영역에서 가운데 정렬
- tabular numeric 사용

## 9.3 Grid 카드 액션

우리 액션은 카드당 **미디어 저장 메뉴 버튼 1개**만 둔다.

Instagram이 이미 media type을 표시하므로 우리 플레이 버튼은 만들지 않는다.

REEL / VIDEO:
- `영상 다운로드`
- `썸네일 다운로드`
- `링크 복사`

PHOTO:
- `이미지 다운로드`
- `링크 복사`

CAROUSEL:
- `전체 이미지 다운로드 (N)`
- `대표 이미지 다운로드`
- `링크 복사`

**저장 위치 설정은 카드 메뉴에 두지 않는다.** 카드 메뉴는 무엇을 저장할지만 선택한다.

---

# 10. Video/Reel Cover Identity

Video/Reel 썸네일은 카드 내부의 첫 번째 이미지나 음악 artwork를 사용하지 않는다.

우선순위:

1. 현재 shortcode와 연결된 media object
2. `image_versions2.candidates / display_resources / display_url / thumbnail_src` 등 직접 cover 후보
3. 현재 Grid 카드와 넓게 겹치는 큰 본문 이미지와 대조
4. 해당 `srcset`의 큰 후보
5. 마지막에만 검증된 legacy thumbnail fallback

제외 대상:

- music/audio artwork
- album cover
- avatar/profile image
- 다른 nested shortcode 이미지

해상도보다 먼저 **현재 콘텐츠 identity와 실제 cover 일치**를 보장한다.

---

# 11. Carousel 전체 미디어

Carousel slide는 parent media identity에 종속된다.

지원 구조:

- `carousel_media[]`
- `edge_sidecar_to_children.edges[].node`

규칙:

- slide 순서 유지
- 각 slide에서 가장 큰 원본 image candidate 선택
- 다른 shortcode/nested image 혼입 금지
- URL 중복 제거
- 아직 검증된 목록이 없으면 `전체 이미지 준비중`
- ZIP은 기본 방식으로 사용하지 않는다.

`전체 이미지 다운로드 (N)` 한 번으로 개별 파일을 순서대로 저장한다.

```text
Instagram_<shortcode>_slide_01.*
Instagram_<shortcode>_slide_02.*
Instagram_<shortcode>_slide_03.*
...
```

선택 폴더 쓰기가 가능한 환경에서는 향후 Carousel batch를 해당 폴더 안의 게시물별 하위 폴더로 묶는 옵션을 추가할 수 있다. ZIP보다 개별 원본 접근성을 우선한다.

Carousel 안의 video child도 최종 `media[]` 모델에서는 원본 video로 별도 처리한다.

---

# 12. 전역 RI 버튼

현재 Reel에서 사용 중인 리서치 도구 아이콘을 **전역 RI 버튼**으로 승격한다.

## 표시 범위

- 프로필
- 검색
- 탐색
- Grid
- Reel
- 일반 Post 상세
- Photo
- Video
- Carousel

## 위치

- 화면 우측 하단 안전영역의 고정 위치를 기본으로 한다.
- Instagram 하단 navigation, `앱 사용/Open app/Use app` 배너 등과 겹치면 자동으로 위로 이동한다.
- Reel에서 Instagram `...` 위치를 따라다니는 전용 배치 방식은 전역화 단계에서 제거한다.

## 역할

- 앱 전체 리서치 패널 진입
- 현재 콘텐츠 상세 조사
- 전역 설정 접근
- 향후 분석 작업 상태 접근

Grid 카드 미디어 버튼과 역할을 분리한다.

---

# 13. 공용 RI Panel

전역 RI 버튼을 누르면 하나의 공용 패널을 연다.

최종 탭 구조:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정`

## 요약

- username / mediaType / date
- views
- likes
- comments
- reposts
- ER
- 24h
- account relative/outlier

## 콘텐츠

REEL / VIDEO:
- Caption
- Hashtags / Mentions
- STT
- OCR
- corrected transcript

PHOTO:
- Caption
- Hashtags / Mentions
- image OCR

CAROUSEL:
- Caption
- Hashtags / Mentions
- slide별 OCR
- 카드뉴스 구조

## 댓글

- useful comments
- questions
- purchase intent
- reviews
- complaints/problems
- counterarguments
- tips
- content ideas

## 분석

- Hook
- fixed title
- CTA
- emphasis
- numbers/prices
- content structure
- speech rate 등

## 미디어

REEL / VIDEO:
- video
- actual cover
- duration / resolution
- video download
- cover download

PHOTO:
- original image
- resolution
- download

CAROUSEL:
- slide 1..N
- individual download
- whole batch download

## 설정

전역 저장 정책과 향후 공용 옵션을 관리한다.

패널은 Store 변경을 구독하고, 열린 상태에서도 새 데이터가 도착하면 필요한 부분만 갱신한다.

현재 v3.2.0에서는 `요약`, `미디어`, `설정`을 migration adapter/Download Manager에 먼저 연결하고, `콘텐츠`, `댓글`, `분석`은 이후 데이터 계층 migration과 함께 연결한다.

---

# 14. Reel 화면 UI

Instagram 기본 좋아요/댓글/리포스트/공유 UI를 제거하거나 중복하지 않는다.

영상 위에 직접 추가하는 값은 파생 핵심지표로 제한한다.

```text
▶ 42.9만
ER 0.55%
24h +8.2%
×3.7
08/26
```

규칙:

- 배경 박스/블러 없음
- 작은 흰색/회색 글자 + 그림자/외곽선
- 캡션과 Instagram 기본 액션을 가리지 않음
- 값이 없는 줄은 숨김
- 일반 Post 상세에서는 immersive Reel overlay가 필수는 아님
- 리서치 진입점은 별도 Reel 전용 버튼이 아니라 **전역 RI 버튼**을 사용한다.

---

# 15. 공통 Download Manager

모든 다운로드는 하나의 Download Manager를 통과한다.

```text
Grid / RI Panel
      ↓
Media Action
      ↓
Download Manager
      ↓
저장 정책
      ↓
지정 폴더 / 기본 Downloads / 매번 선택
```

## 15.1 공용 저장 정책

설정 탭에서 다음 모드를 제공한다. 실제 노출 여부는 브라우저 capability로 판단한다.

- `지정 폴더`
- `기본 Downloads`
- `매번 선택`

이 설정은 다음 모든 파일에 동일하게 적용한다.

- video
- video cover / thumbnail
- photo
- carousel slides
- 향후 STT/OCR export

## 15.2 지정 폴더

브라우저가 directory write handle을 제공할 때 사용한다.

- 한 번 선택한 폴더를 공용 저장대상으로 사용
- 가능하면 handle metadata를 IndexedDB에 저장하고 다음 실행에서 permission을 재확인
- permission이 만료되면 `저장 폴더 재연결 필요` 표시
- 영상만 지정 폴더, 사진만 Downloads처럼 미디어 종류별로 다른 정책을 사용하지 않는다.

지정 폴더 저장이 실패하면 **조용히 기본 Downloads로 보내지 않는다.** 실패 이유를 사용자에게 표시하고 재시도/기본 다운로드 선택을 명시적으로 요구한다.

## 15.3 기본 Downloads

브라우저/OS 기본 다운로드 위치를 사용한다.

- 임의 로컬 폴더를 강제 생성하지 않는다.
- 파일명은 `Instagram_<shortcode>_...` 규칙을 사용한다.

## 15.4 매번 선택

브라우저가 지원할 때만 제공한다.

- 단일 파일: 저장 액션 시 위치 선택
- Carousel batch: batch 시작 시 한 번 폴더를 선택하고 1..N 전체를 그 위치에 저장

지원하지 않는 환경에서는 기능을 허위로 표시하지 않고 이유를 설명한다.

## 15.5 capability 판단

`Android이기 때문에 안 됨`처럼 플랫폼명만으로 하드코딩하지 않는다.

실행 시 실제 API 제공 여부와 권한 상태를 검사한다.

---

# 16. 댓글 수집/선별 설계

댓글은 전부 AI에 넘기지 않는다.

```text
Instagram 댓글
   ↓
수집 + reply thread 보존
   ↓
중복 제거
   ↓
저가치 필터
   ↓
Research Score
   ↓
상위 후보
   ↓
AI 분류
```

Comment 모델:

```text
Comment
- id
- postId
- parentId
- author
- text
- likes
- replyCount
- createdAt
- flags
- research.score
- research.category
- research.reason
```

저가치 필터 예:

- emoji only
- `ㅋㅋㅋ` 같은 단순 반응
- mention only
- duplicate/copypaste
- spam/ads

높은 가치:

- 질문
- 상세 실제 경험
- 구매 의도
- 제품/가격/장소 언급
- 불만/문제점
- 반론/대안
- practical tips
- highly liked/replied
- 반복되는 needs/questions
- 콘텐츠 아이디어

AI category:

- question
- purchase intent
- positive review
- negative review
- complaint/problem
- counterargument
- tip
- additional info
- content idea

답글 thread는 보존한다. 질문과 작성자 답변을 따로 떼지 않는다.

---

# 17. STT/OCR/AI 파이프라인

## STT

문장뿐 아니라 timestamp를 저장한다. 이후 가능하면 word-level timestamp를 지원한다.

## OCR

화면 하단 자막만이 아니라 전체 화면을 대상으로 한다.

```text
text
start
end
x
y
width
height
confidence
```

중복 병합 기준:

- 문자열 유사도
- 위치 유사도
- 시간 연속성

최종적으로 저밀도 frame scan → 변화구간 고밀도 분석 구조로 발전시킨다.

## STT/OCR 정렬

AI 전에 deterministic matching을 한다.

- time overlap
- string similarity
- confidence

AI는 최종 교정과 의미 분류를 담당한다.

발화 transcript와 화면에만 존재하는 Hook/fixed title은 구분한다.

---

# 18. 개발 소스/배포 구조

실제 파일 분류·파일명·분리 기준·의존성 규칙은 **`CODE_STRUCTURE.md`를 구현 기준 문서로 사용**한다.

## 18.1 Progressive Modularization

파일 수를 늘리는 것이 목적이 아니다.

- 실제 책임이 생길 때만 파일 생성
- 빈 placeholder 폴더/파일을 미리 만들지 않음
- 책임/테스트/재사용/변경주기 경계가 명확할 때만 분리
- `old/new/final/fix/hotfix/backup/copy` 파일을 만들지 않음
- 과거 버전은 Git history로 관리

현재 v3.2 구조:

```text
reels-inspector/
├ README.md
├ PROJECT_PLAN.md
├ STATUS.md
├ GRID_BASELINE.md
├ CODE_STRUCTURE.md
├ package.json
├ tests/
├ scripts/
├ src/
│  ├ version.js
│  ├ main.js
│  ├ legacy-runtime.js
│  ├ migration/
│  │  └ legacy-store-adapter.js
│  ├ core/
│  │  ├ app.js
│  │  └ capability.js
│  ├ store/
│  │  └ settings-store.js
│  ├ media/
│  │  ├ media-resolver.js
│  │  └ download-manager.js
│  └ ui/
│     ├ grid.js
│     ├ reel-panel migration 예정
│     ├ ri-panel.js
│     ├ toast.js
│     └ styles.js
└ ri-retry.user.js
```

`reel-panel migration 예정`은 실제 파일명이 아니라 향후 책임 분리 방향을 나타낸다. 빈 파일은 만들지 않는다.

필요가 생길 때만 `instagram/identity.js`, `instagram/extractor.js`, `store/verified-store.js`, `metrics/metrics.js`, `media/transport.js`, `ui/reel.js`, panel-tab/comments/analysis 등을 추가한다.

## 18.2 Source of Truth

현재는 이미 다음 구조로 전환되었다.

```text
src/* = 개발 원본
  ↓
build / test / check
  ↓
ri-retry.user.js = generated deployment artifact
```

- root `ri-retry.user.js` 직접 수작업 수정 금지
- Tampermonkey에는 계속 `ri-retry.user.js` 하나만 설치
- `legacy-runtime.js`는 migration 임시 canonical source이며 backup이 아님
- 새 기능을 `legacy-runtime.js`에 추가하지 않음
- 기존 책임이 새 owner module로 이동하면 legacy 구현을 제거
- migration 완료 후 `legacy-runtime.js`와 `migration/legacy-store-adapter.js`를 삭제

## 18.3 Git 파일 관리

`.gitignore`로 다음 로컬 자료가 저장소에 섞이지 않게 한다.

- 다운로드한 Instagram 영상/사진
- HAR/network capture/debug dump
- `.env`/secret
- 임시 파일/log/cache
- 개인 테스트 데이터

테스트 fixture는 cookie/token/private header/개인 raw dump를 제거한 sanitized data만 commit한다.

## 18.4 향후 MV3

- content script와 MAIN-world page hook 분리
- 필요 시 bridge 사용
- service worker memory를 영구 상태로 가정하지 않음
- remote runtime JS 금지, bundle 사용
- Instagram CDN URL은 임시 접근경로로 취급
- Instagram login cookie를 분석 서버로 보내지 않음

---

# 19. 버전별 개발 로드맵

## v3.1 — Core/Grid Stabilization

v3.1.6 기준선에서 확보한 기능은 v3.2에서도 누적 보존한다.

핵심:

- ContentIdentity 기반
- mediaType
- Verified Store
- pending request dedupe
- renderKey
- React DOM identity
- event/observer refresh
- Grid 8 fixed slots
- cover identity
- carousel batch 기반

## v3.2 — UI/Foundation

기존의 단순 `Grid 안정화` 범위를 **Grid 안정화 + 전역 UI/다운로드 기반 + 단계적 소스 모듈화**로 확장한다.

현재 완료/진행:

1. `CODE_STRUCTURE.md` 기준 Foundation 소스 작성 — 완료
2. capability detection — 완료
3. 공용 Settings Store — 완료
4. 공통 Download Manager — 완료, 실기기 transport 검증 진행
5. 전역 RI 버튼 모든 Instagram 화면용 mount — v3.2.0 활성화
6. 공용 RI Panel shell — v3.2.0 활성화
7. `요약 | 콘텐츠 | 댓글 | 분석 | 미디어 | 설정` 탭 shell — 활성화
8. 카드 미디어 메뉴에서 저장 폴더 설정 제거 — 새 Grid action 경로에서 구현
9. 지정 폴더/기본 Downloads/매번 선택 정책 — 구현, 실기기 검증 필요
10. 영상·썸네일·사진·캐러셀 저장경로 공통 manager 통합 — 새 Grid/RI action에서 구현
11. 8개 Grid 고정 슬롯/cover/no-flicker — 기존 검증 runtime 보존
12. Carousel ZIP 없는 개별 batch 저장 — 공통 manager로 연결, 실기기 검증 필요
13. regression/unit/build/check — 자동 gate 구축
14. Identity/Extractor/Verified Store/Metrics/Media Resolver/Grid/Reel UI — 안정된 책임부터 단계 migration

## v3.3 — Content Types

- Reel
- Feed Video
- Photo
- Carousel + slide media
- Caption
- Hashtags
- Mentions
- collaborators/location
- 공통 `media[]`

## v3.4 — Research Detail UI

- 요약/콘텐츠/미디어 실제 데이터 연결
- 상세 상태표시
- 콘텐츠 타입별 UI
- download/copy 완성

## v3.5 — Comments

- 댓글/답글 수집
- thread 보존
- duplicate/low-value filter
- Research Score
- 참고 댓글 UI

## v3.6 — Research Features

- 조회수/ER/24h/Outlier/최신 정렬
- 현재 load 범위 명시
- 소재 저장
- 태그/메모
- 계정 최근 콘텐츠 비교

## v4.0 — Analysis Server

- Python + FastAPI
- media upload/stream
- async jobs
- job status

## v4.1 — STT

- timestamp transcript

## v4.2 — OCR

- full-screen OCR
- coordinates/time
- duplicate merge

## v4.3 — Alignment

- STT/OCR deterministic matching

## v4.4 — AI Research

- corrected transcript
- Hook
- CTA
- emphasis
- structure
- comments needs/ideas

## v5.0 — MV3 Extension

Tampermonkey에서 검증된 엔진을 정식 확장프로그램 구조로 이식한다.

---

# 20. 설계 변경 관리 원칙

이 프로젝트의 계획은 고정 문서가 아니라 **현재 결정을 반영하는 기준 문서**다.

요구사항이나 설계가 바뀔 때는 다음을 지킨다.

1. 기존 `PROJECT_PLAN.md`, `STATUS.md`, `CODE_STRUCTURE.md`, 관련 baseline/test를 먼저 읽는다.
2. 새 요구사항이 기존 제품 목표·데이터 구조·UI 역할과 충돌하는지 확인한다.
3. 기존 설계를 통째로 삭제하거나 과거 버전으로 되돌리지 않는다.
4. 유지할 결정과 바뀔 결정을 구분해서 현재 구조에 통합한다.
5. 기존 결정이 더 이상 유효하지 않으면 해당 문구를 새 결정으로 교체하고 `STATUS.md`에 변경 이유를 남긴다.
6. 구조/UI/우선순위/파일 책임이 바뀌면 코드보다 먼저 또는 같은 작업에서 관련 문서를 갱신한다.
7. 코드가 설계문서보다 앞서 장기간 표류하지 않게 한다.
8. 실기기에서 좋아졌다고 확인된 동작은 다음 설계 변경에서도 누적 보존한다.

---

# 21. 개발 중 금지사항

- 검증되지 않은 지표를 임의 숫자로 표시하지 않는다.
- 공개되지 않은 지표를 추정해 넣지 않는다.
- Reel UI를 고치면서 Instagram 기본 액션 버튼을 삭제하지 않는다.
- Grid Frozen UI를 관련 없는 기능 수정 때문에 재설계하지 않는다.
- 카드 메뉴에 전역 설정을 반복 배치하지 않는다.
- 미디어 종류별로 서로 다른 저장 위치 정책을 만들지 않는다.
- 지정 폴더 저장 실패 시 사용자에게 알리지 않고 다른 폴더로 조용히 저장하지 않는다.
- 하나의 버그를 막기 위해 새 hotfix userscript를 계속 `@require`하지 않는다.
- `old`, `backup`, `final2` 같은 보관용 소스 파일을 만들지 않는다.
- UI마다 별도 데이터 parser를 만들지 않는다.
- 서버에 Instagram login cookie를 전달하는 구조를 기본 설계로 삼지 않는다.
- AI를 deterministic extraction/정렬보다 앞에 두지 않는다.

---

# 22. 작업 절차

코드 작업은 다음 순서를 따른다.

1. `PROJECT_PLAN.md` 확인
2. `STATUS.md` 확인
3. `CODE_STRUCTURE.md` 확인
4. 관련 baseline/test 확인
5. 현재 generated `ri-retry.user.js`와 관련 `src/*` 확인
6. 수정 대상 계층 식별: Identity / Extractor / Store / Metrics / Media / UI
7. 기존 승인 기능과 회귀 위험 확인
8. 설계/파일 책임이 바뀌면 문서 먼저 또는 동시에 갱신
9. 코드 수정
10. unit/regression 검사
11. build/check + generated userscript 문법 검사
12. 의미 있는 변경이면 `src/version.js` version bump
13. GitHub 반영
14. generated artifact 확인
15. `STATUS.md`에 구현/검증/미해결/다음 단계 기록

## 작업 보고 시 반드시 남길 것

- 변경 버전
- 변경한 계층
- 변경한 기능
- 유지한 기능
- 알려진 미해결 문제
- 다음 개발 단계

이 문서를 기준으로 개발 맥락을 유지한다.
