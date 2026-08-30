# Instagram RI — Specification

이 문서는 Instagram RI 북마클릿의 현재 제품 규칙과 유지할 구현 원칙입니다. 과거 실험 방식과 폐기된 버전별 파일 구조는 포함하지 않습니다.

## 1. 제품 원칙
- Instagram 원래 3열 Grid와 native UI를 최대한 유지한다.
- 화면 크기·행 높이 변경이나 불필요한 flicker를 만들지 않는다.
- missing / 미확인 값은 0으로 취급하지 않는다.
- 콘텐츠 identity는 shortcode를 공통 키로 사용한다.
- 저장·지표·댓글·분석은 같은 identity를 공유한다.
- 수집과 분석을 분리한다.
- 실행 본체는 항상 `current.js` 하나만 사용한다.
- 기존 `reels-inspector`에서 이미 구현된 UI/metrics는 재설계하지 않고 검토 후 이식한다.

## 2. 실행 구조

```text
일반 실행
휴대폰 북마클릿
└─ 로컬 캐시 current.js
   └─ Blob script 실행

업데이트
RI 업데이트
└─ bridge-stable.svg
   └─ GitHub main 최신 커밋 SHA 확인
      └─ 해당 SHA의 current.js 수신
         └─ postMessage
            └─ 로컬 캐시 갱신
               └─ Blob script 실행
```

- 일반 실행에서는 외부 창을 열지 않는다.
- 업데이트 중계창은 사용자가 `RI 업데이트`를 직접 누르거나 캐시가 없을 때만 사용한다.
- 기능 업데이트는 `current.js` 내용만 교체한다.
- 버전별 실행 JS를 활성 폴더에 추가하지 않는다.

## 3. 기존 reels-inspector 재사용 기준
다음 소스를 북마클릿 UI/수치의 기준본으로 사용한다.

```text
reels-inspector/src/
├─ metrics/metrics.js
│  └─ ER / 24h / account relative
└─ ui/
   ├─ grid-metrics-renderer.js
   ├─ metric-format.js
   ├─ grid.js
   ├─ reel-overlay.js
   ├─ research-workspace.js
   └─ styles.js
```

재사용 원칙:
- 계산식과 missing 의미를 유지한다.
- Grid 8-slot 구조를 유지한다.
- Instagram native action을 침범하지 않는다.
- 기존 코드가 자동 테스트를 통과했더라도 북마클릿 Android Edge 실확인 전 PASS로 표시하지 않는다.
- Tampermonkey 전용 API/구조는 그대로 복사하지 않고 북마클릿 환경에 맞게 포팅한다.

## 4. Grid UI
Grid 역할은 발굴/비교다.

```text
Instagram 원래 3열
└─ 카드
   ├─ 콘텐츠 유형 [우측 위 · native 우선]
   ├─ 수치 1행 [하단]
   │  ├─ 조회수
   │  ├─ 좋아요
   │  ├─ 댓글
   │  └─ 재게시
   ├─ 수치 2행 [하단]
   │  ├─ ER
   │  ├─ 24h
   │  ├─ 계정대비
   │  └─ 날짜
   └─ 저장 [좌측 아래]
```

### Grid 8-slot 규칙
- 1행: `views | likes | comments | reposts`
- 2행: `ER | 24h | account | date`
- 각 행 4개 fixed slot을 유지한다.
- 숫자 길이에 따라 slot 위치가 움직이지 않는다.
- missing은 `-`.
- Photo / Carousel의 확인되지 않은 views는 `▶-`로 표시하고 임의로 생성하지 않는다.
- 같은 값이면 DOM을 불필요하게 다시 쓰지 않는 renderKey 방식으로 flicker를 줄인다.

## 5. 수치 계산 규칙

### 기본 수치
- views
- likes
- comments
- reposts
- date

실제 확인된 raw input이 없으면 수치를 만들지 않는다.

### ER
`ER = (likes + comments + reposts) / views × 100`

- views가 없으면 계산하지 않는다.
- 기본적으로 likes/comments/reposts가 모두 확인돼야 계산한다.

### 24h
- 현재 조회수와 과거 snapshot을 사용한다.
- 18~32시간 범위 안의 실제 snapshot만 후보로 사용한다.
- 24시간에 가장 가까운 snapshot을 선택한다.
- 과거 조회수가 현재 조회수보다 큰 비정상 상황이면 계산하지 않는다.

### 계정대비
- 같은 계정의 최근 게시물 조회수를 기준으로 한다.
- 현재 게시물은 표본에서 제외한다.
- 최근 최대 20개를 사용한다.
- 최소 5개 표본이 있어야 계산한다.
- 중앙값 대비 현재 조회수의 배수로 표시한다.

### 표시 형식
- 큰 숫자: `42.9만`, `1.2억`, `3.4K` 등 축약
- 퍼센트: `0.55%`, `+8.2%`
- 계정대비: `×3.7`
- 날짜: `08/26`

## 6. Reel UI
Instagram 기본 좋아요/댓글/재게시/공유 UI를 제거하거나 복제하지 않는다.

```text
Reel 영상 영역
└─ 리서치 최소 지표
   ├─ ▶ 42.9만
   ├─ ER 0.55%
   ├─ 24h +8.2%
   ├─ ×3.7
   └─ 08/26
```

- caption과 우측 native action rail을 침범하지 않는 위치를 사용한다.
- box/blur를 크게 만들지 않고 작은 텍스트 + shadow 형태를 기본으로 한다.
- missing 항목은 줄 자체를 숨긴다.
- 실기기에서 위치 확인 전 고정 좌표를 최종 승인하지 않는다.

## 7. 그리드 저장
- 카드의 `저장`을 누르면 즉시 일괄 다운로드하지 않는다.
- 해당 콘텐츠를 먼저 식별하고 선택 메뉴를 연다.

영상 / Reel:
- `영상 저장`
- `음원 저장`
- `이미지 저장`
- `3개 모두 저장`

단일 사진:
- `사진 저장`

캐러셀:
- `캐러셀 전체 저장`

- 사용자가 선택하지 않은 미디어를 자동으로 내려받지 않는다.
- 현재 저장 위치 설정을 그대로 사용한다.
- `3개 모두 저장`에서 한 항목이 실패해도 가능한 나머지는 계속한다.
- 저장 결과는 상태 UI에 PASS / PARTIAL / FAIL로 남긴다.

## 8. 미디어 저장 규칙

### 영상
- `영상 저장` = 소리 포함 정상 MP4.
- 실시간 재생·녹화·재인코딩을 사용하지 않는다.
- Instagram의 완성 MP4 직접 저장을 우선한다.
- 목표 처리 시간은 수 초, 기준 목표 약 5초다.
- 직접 저장이 불가능하면 느린 재인코딩으로 몰래 대체하지 않는다.

### 음원
- `음원 저장` = 별도 음원 파일.
- 무음 영상 트랙은 내부 처리용일 뿐 일반 UI에 노출하지 않는다.

### 이미지
- 실제 표지가 있으면 실제 표지 원본을 저장한다.
- 실제 표지가 없을 때만 영상 0.000초 첫 표시 프레임을 저장한다.
- 임의의 중간 장면/선명한 장면을 대표 이미지로 선택하지 않는다.

### 단일 사진
- 원본 사진 1개를 저장한다.

### 캐러셀
- 사진 / 영상 / 혼합을 모두 지원한다.
- 원래 순서를 유지한다.
- 영상 슬라이드는 소리 포함 영상을 저장한다.
- ZIP으로 묶지 않고 개별 파일로 저장한다.

## 9. 저장 위치
- 기본 다운로드
- 지정 폴더
- 매번 선택(브라우저 지원 시, 단일 파일용)
- 지정 폴더 핸들은 IndexedDB에 저장한다.
- 재실행 시 복원한다.
- 권한이 만료된 경우 저장 시 쓰기 권한을 다시 요청한다.
- 지정 폴더 실패 시 사용자 모르게 기본 다운로드로 fallback하지 않는다.

## 10. 파일명 규칙
shortcode 자체가 게시물 고유 식별자이므로 계정명은 파일명에서 제외한다.

- 영상: `IG_{shortcode}.mp4`
- 음원: `IG_{shortcode}_a.m4a`
- 실제 표지: `IG_{shortcode}_c.{ext}`
- 표지 없는 영상 첫 프레임: `IG_{shortcode}_f.jpg`
- 단일 사진: `IG_{shortcode}.{ext}`
- 캐러셀: `IG_{shortcode}_01.{ext}`, `IG_{shortcode}_02.{ext}` ...
- 캐러셀 영상 항목은 같은 순번에 `.mp4`를 사용한다.

한 게시물의 저장 파일은 같은 shortcode를 공유해야 한다.

## 11. Research Workspace
기존 `reels-inspector`의 Bottom Sheet 골격을 기준으로 한다.

```text
CLOSED
└─ COMPACT
   └─ EXPANDED

CONTENT
├─ 요약
├─ 콘텐츠
├─ 댓글
├─ 분석
└─ 미디어

GLOBAL
└─ RI Home / 설정 / 업데이트
```

- header/tab/footer는 고정하고 body만 스크롤한다.
- Compact는 핵심 지표와 핵심 action 중심.
- Expanded에서 상세 데이터를 보여준다.
- 콘텐츠 identity가 없을 때 빈 콘텐츠 탭을 강제로 보여주지 않는다.
- 현재 상태 패널의 진단 정보는 새 Activity/Workspace UI로 역할을 흡수하되 오류 원인 확인 기능은 유지한다.

## 12. 데이터 구조 방향

```text
Post Package
├─ identity
│  ├─ shortcode
│  ├─ URL
│  ├─ 작성자
│  ├─ 게시일
│  └─ 콘텐츠 유형
├─ media
│  ├─ video
│  ├─ audio
│  ├─ images[]
│  ├─ cover
│  └─ thumbnailSource
├─ metrics
│  ├─ views
│  ├─ likes
│  ├─ comments
│  ├─ reposts
│  ├─ engagementRate
│  ├─ growth24h
│  └─ accountMultiple
├─ text
│  ├─ caption
│  ├─ hashtags[]
│  └─ mentions[]
├─ comments
│  ├─ comment
│  └─ replies[]
├─ savedFiles
│  ├─ video
│  ├─ audio
│  ├─ image
│  ├─ carousel[]
│  └─ savedAt
└─ research
   ├─ transcript
   ├─ OCR
   └─ analysis
```

## 13. 개발 순서

```text
P0    v0.8.6 선택 저장 실기기 검증
P0.5  기존 reels-inspector UI + Metrics 이식
P1    identity / Instagram API 실패 경로 보강
P2    지정 폴더 지속성
P3    표지/0초 프레임/속도 최종 검증
P4    caption / hashtags / mentions / 댓글
P5    STT / OCR / 분석
```

P0.5는 기능을 새로 설계하는 단계가 아니라 기존 `reels-inspector`의 계산·표시·Workspace 구조를 북마클릿에 맞게 옮기는 단계다.
