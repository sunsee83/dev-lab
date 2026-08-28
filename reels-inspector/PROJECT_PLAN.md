# Instagram Content Research Tool — 개발 기준 문서

> 이 문서는 프로젝트 개발의 **단일 기준 문서(Single Source of Truth)** 입니다.  
> 기능을 수정하거나 추가하기 전에 이 문서와 현재 실행 파일을 먼저 확인합니다.  
> 개발 중 결정이 바뀌면 코드보다 먼저 또는 같은 커밋에서 이 문서를 갱신합니다.

## 0. 현재 상태

- 현재 실행 방식: **Android Microsoft Edge + Tampermonkey + Instagram 모바일 웹**
- 현재 배포 파일: `ri-retry.user.js`
- 현재 기준 버전: **v3.0.0**
- 배포 방식: 단일 self-contained userscript
- 과거 `@require` hotfix 체인과 구형 실행 파일은 제거 완료
- 다음 개발 목표: **v3.1 Core Stabilization**
- 현재 그리드 UI는 **동결(Frozen UI)** 상태이며 외형/정보배치는 유지한다.

### 현재 확인된 구조적 문제

1. 약 900ms 전체 polling/tick 구조
2. 동일 shortcode에 대한 중복 요청 가능
3. 현재 콘텐츠 식별이 일부 휴리스틱에 의존
4. 값의 source/confidence/status가 없는 단순 Store 병합
5. 상세 패널이 열릴 당시 데이터 스냅샷만 사용하고 이후 Store 변경을 반영하지 못함
6. 실제 `mediaType` 모델이 부족함
7. localStorage 전체 객체 write 빈도가 높음
8. 회귀 테스트용 fixture가 없음

이 문제를 해결하기 전에는 STT/OCR/AI 같은 대형 기능을 붙이지 않는다.

---

# 1. 제품 정의

이 프로젝트는 단순 Reel Downloader나 IG Sorter 복제품이 아니다.

**Instagram의 Reel·사진·캐러셀·캡션·태그·댓글·성과 데이터를 수집하고, 좋은 콘텐츠를 발견하고, 원본과 대본을 확보하며, 댓글의 소비자 니즈와 Hook/CTA까지 분석하는 콘텐츠 리서치 시스템**을 목표로 한다.

핵심 사용자 흐름:

`발굴 → 콘텐츠 확인 → 상세 조사 → 원본 확보 → 분석 → 참고 소재 저장`

지원 대상:

- Reel
- 피드 동영상
- 사진
- 캐러셀/카드뉴스
- 캡션
- 해시태그/멘션
- 댓글/답글
- 프로필/계정 단위 성과 비교

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
- 그리드 오버레이
- Reel 핵심지표 표시
- 상세 리서치 패널
- 정렬/필터
- 다운로드
- 로컬 스냅샷 저장
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

서버는 비동기 Job 구조를 사용한다.

```text
POST /analysis → jobId
GET /analysis/{jobId} → queued / processing / completed / failed
```

## 2.3 AI

AI는 원본 영상 전체를 무조건 받지 않는다.

입력:

- STT + timestamp
- OCR + timestamp + 좌표
- 정렬된 동일 문장 후보
- 중요 프레임
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
UI
```

## 절대 규칙

1. UI가 Instagram DOM을 제각각 직접 읽지 않는다.
2. Instagram을 읽는 책임은 Identity/Extractor 계층에 둔다.
3. 모든 UI는 하나의 Store만 읽는다.
4. 현재 콘텐츠가 확정되지 않으면 다른 지표를 병합하지 않는다.
5. 값이 확인되지 않으면 추측하거나 `0`으로 만들지 않는다.
6. 값이 이전과 같으면 DOM을 다시 렌더하지 않는다.
7. 동일 shortcode 중복 fetch를 막는다.
8. 하나의 기능을 고치기 위해 별도 hotfix `@require` 체인을 만들지 않는다.

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

현재 콘텐츠 식별 상태:

- `DETECTED`
- `IDENTIFYING`
- `IDENTIFIED`
- `DATA_LOADING`
- `READY`
- `FAILED`

`READY`가 아니면 검증되지 않은 분석 수치를 확정값처럼 표시하지 않는다.

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

source 예:

- `network`
- `dom`
- `permalink`
- `embedded_json`
- `derived`

낮은 신뢰도의 새 값이 높은 신뢰도의 검증값을 무조건 덮어쓰지 못하게 한다.

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
│  ├ type
│  ├ url
│  ├ thumbnail
│  ├ width
│  ├ height
│  ├ duration
│  └ slideIndex
│
└ analysis
   ├ er
   ├ growth24h
   ├ outlier
   └ rank
```

미디어 CDN URL은 영구 ID로 쓰지 않는다.

- 영구 식별: `mediaId`, `shortcode`
- 임시 접근 경로: `videoUrl`, `imageUrl`
- URL 확보 시각: `resolvedAt`

---

# 7. 지표 정의

## ER

`(좋아요 + 댓글 + 리포스트) / 조회수 × 100`

조회수가 없는 사진/캐러셀에는 조회수 기반 ER을 만들지 않는다.

## 24h 증가율

현재 조회수와 약 24시간 전 실제 저장된 snapshot을 비교한다.

- 비교 snapshot이 없으면 숨김
- 임의 추정 금지

## 계정 대비 Outlier

동일 계정 최근 약 20개 콘텐츠의 조회수 **중앙값** 대비 현재 콘텐츠 조회수 배수.

- 비교 콘텐츠 최소 5개
- 부족하면 숨김

비공개/확보 불가 지표를 임의 생성하지 않는다.

---

# 8. 현재 그리드 UI — 동결 영역

v3.1 Core 수정 중에도 아래 **외형과 사용방식은 유지한다.**

## 1줄

`조회수 / 좋아요 / 댓글 / 리포스트`

예:

```text
▶805.8만 ♥1.9만 ●157 ↻955
```

## 2줄

`ER / 24h 증가율 / 계정 대비 배수 / 게시일`

예:

```text
0.29% +5.5% ×4.2 8/21
```

유지사항:

- 썸네일 위 오버레이
- 3열 모바일 그리드 유지
- 별도의 큰 흰색/회색 정보바 금지
- 이미지/썸네일 액션 유지
- 순수 영상 액션 유지
- 사진/카드뉴스에는 검증되지 않은 조회수 미표시
- 정보가 없으면 해당 항목만 숨김

v3.1에서 변경할 것은 **데이터 공급 구조와 렌더 방식뿐**이다.

### Grid regression 기준

다음 조건을 만족해야 그리드 변경을 완료로 본다.

- 기존 배치 유지
- 숫자 깜빡임 없음
- 같은 shortcode 중복 요청 없음
- React가 카드 DOM을 재사용해도 shortcode가 섞이지 않음
- 값이 변경되지 않으면 DOM render 없음
- `/p/` 사진/카드뉴스에 잘못된 조회수 없음

---

# 9. Reel 화면 UI

Instagram 기본 좋아요/댓글/리포스트 UI는 제거하거나 중복하지 않는다.

화면에 직접 추가하는 분석값:

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
- 캡션을 가리지 않음
- 값이 없는 줄은 숨김
- Grid에서 눌러 들어간 일반 `게시물` 상세에는 반드시 표시할 필요 없음

리서치 아이콘은 Instagram `...` 근처의 접근 가능한 위치에 둔다.

---

# 10. 상세 리서치 패널

최종 탭 구조:

`요약 | 콘텐츠 | 댓글 | 분석 | 미디어`

## 요약

- 조회수
- 좋아요
- 댓글
- 리포스트
- ER
- 24h
- 계정 대비 Outlier
- 게시일

## 콘텐츠

Reel/Video:

- STT
- OCR
- 교정 대본

Photo:

- 이미지 OCR
- 캡션

Carousel:

- 슬라이드별 OCR
- 카드뉴스 구조

## 댓글

- 참고 가치 높은 댓글
- 질문
- 구매 의도
- 후기
- 불만
- 반론
- 팁
- 콘텐츠 아이디어

## 분석

- Hook
- CTA
- 강조어
- 숫자/가격
- 콘텐츠 구조
- 말하기 속도 등

## 미디어

- 순수 영상
- 영상 다운로드
- 이미지/슬라이드
- 썸네일
- 링크 복사
- 길이/해상도

패널은 Store 변경을 구독하여, 열려 있는 상태에서도 새 데이터가 들어오면 필요한 행만 갱신한다.

---

# 11. 댓글 수집/선별 설계

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

낮은 가치 예:

- 이모지 only
- `ㅋㅋㅋ` 같은 단순 반응
- 계정 태그 only
- 반복/복붙
- 광고성 댓글

높은 가치 예:

- 실제 사용 후기
- 구매 이유/구매 의도
- 질문
- 불만/문제점
- 반론/대안
- 구체적인 팁
- 가격/제품/장소 언급
- 반복되는 사용자 니즈
- 다음 콘텐츠 아이디어가 될 만한 내용

답글 thread는 보존한다. 질문과 작성자 답변을 따로 떼어 분석하지 않는다.

---

# 12. STT/OCR/AI 파이프라인

## STT

문장만이 아니라 timestamp를 저장한다.

가능하면 이후 word-level timestamp 지원.

## OCR

화면 하단 자막만 보지 않고 전체 화면을 대상으로 한다.

OCR 레코드:

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

프레임마다 같은 문장을 중복 저장하지 않는다.

병합 기준:

- 문자열 유사도
- 위치 유사도
- 시간 연속성

최종적으로는 저밀도 프레임 탐색 → 텍스트/화면 변화 구간 고밀도 분석 구조로 발전시킨다.

## STT/OCR 정렬

AI 전에 deterministic matching을 한다.

- 시간 겹침
- 문자열 유사도
- 신뢰도

을 이용해 동일 문장 후보를 만든다.

AI는 최종 교정 및 의미 분류를 담당한다.

---

# 13. 개발 소스/배포 파일 구조

## 현재 단계 — Tampermonkey MVP

개발 소스는 점차 분리하되 배포는 계속 한 파일로 한다.

```text
reels-inspector/
├─ README.md
├─ PROJECT_PLAN.md
├─ src/                 # 단계적으로 추가
│  ├─ core/
│  ├─ instagram/
│  ├─ data/
│  ├─ metrics/
│  ├─ comments/
│  ├─ media/
│  └─ ui/
└─ ri-retry.user.js     # 최종 배포 파일
```

`src/* → build → ri-retry.user.js`

Tampermonkey에는 `ri-retry.user.js` 하나만 설치한다.

## 향후 MV3 확장프로그램

브라우저 엔진이 안정된 뒤 이식한다.

```text
extension/
├─ manifest.json
├─ src/
│  ├─ content.js
│  ├─ page-hook.js
│  ├─ service-worker.js
│  └─ ...
└─ dist/
```

MV3에서는 page MAIN-world hook과 content script bridge를 분리한다. service worker의 메모리 상태를 영구 상태로 가정하지 않는다.

---

# 14. 버전별 개발 로드맵

## v3.1 — Core Stabilization

목표: **새 기능 추가 금지. 데이터 엔진 안정화.**

작업:

- ContentIdentity 확립
- 실제 mediaType 모델
- Verified Store
- provenance/source/confidence/status
- 동일 shortcode pending request dedupe
- renderKey 기반 변경된 값만 렌더
- React DOM 재사용 시 identity 재검증
- Store change event
- 상세 패널 Store 연동
- 900ms 전체 polling 축소/Observer 이벤트화
- localStorage write debounce
- 테스트 fixture 도입

완료 기준:

- 다른 게시물 데이터 혼입 재현 없음
- 현재 그리드 디자인 그대로 유지
- 그리드 숫자 깜빡임 없음
- 상세창이 데이터 도착 후 자동 갱신

## v3.2 — Grid 안정화

- 프로필/검색 그리드 회귀검증
- 정확한 공개 지표
- 스크롤/DOM 재사용 안정화
- 향후 정렬 기능의 기반 준비

## v3.3 — Content Types

- Reel
- Feed Video
- Photo
- Carousel
- Caption
- Hashtags
- Mentions
- Media list

## v3.4 — Research Detail UI

- 요약/콘텐츠/미디어 기본 탭
- 상태 표시
- 다운로드/복사
- 콘텐츠별 정보 표현

## v3.5 — Comments

- 댓글/답글 수집
- 중복/저가치 제거
- Research Score
- 참고 댓글 UI

## v3.6 — Research Features

- 조회수/ER/24h/Outlier/최신 정렬
- 현재 로드된 범위 명시
- 소재 저장
- 태그/메모
- 계정 최근 콘텐츠 비교

## v4.0 — Analysis Server

- FastAPI
- media upload
- async jobs
- job status

## v4.1 — STT

- timestamp transcript

## v4.2 — OCR

- 전체화면 OCR
- 좌표/시간
- 중복 병합

## v4.3 — Alignment

- STT/OCR deterministic matching

## v4.4 — AI Research

- 교정 대본
- Hook
- CTA
- 강조어
- 콘텐츠 구조
- 댓글 니즈/아이디어

## v5.0 — MV3 Extension

- Tampermonkey에서 검증된 엔진을 정식 확장프로그램 구조로 이식

---

# 15. 개발 중 금지사항

- 검증되지 않은 지표를 임의 숫자로 표시하지 않는다.
- 저장/도달/노출/평균 시청시간 등 공개되지 않은 값을 추정해 넣지 않는다.
- Reel UI를 고치면서 Instagram 기본 액션 버튼을 삭제하지 않는다.
- 그리드 UI를 임의로 재설계하지 않는다.
- 하나의 버그를 막기 위해 새 hotfix userscript를 계속 `@require`하지 않는다.
- UI마다 별도 데이터 파서를 만들지 않는다.
- 서버에 Instagram 로그인 쿠키를 전달하는 구조를 기본 설계로 삼지 않는다.
- AI를 deterministic extraction/정렬보다 앞에 두지 않는다.

---

# 16. 작업 절차

앞으로 코드 작업은 다음 순서를 따른다.

1. `PROJECT_PLAN.md` 확인
2. 현재 `ri-retry.user.js` 확인
3. 수정 대상 계층 식별: Identity / Extractor / Store / Metrics / UI
4. 그리드 동결영역 영향 여부 확인
5. 코드 수정
6. 문법 검사
7. 회귀 항목 확인
8. 버전 업데이트
9. GitHub 반영
10. 결정/구조가 바뀌었다면 `PROJECT_PLAN.md` 함께 갱신

## 작업 보고 시 반드시 남길 것

- 변경 버전
- 변경한 계층
- 변경한 기능
- 유지한 기능
- 알려진 미해결 문제
- 다음 개발 단계

이 문서를 기준으로 개발 맥락을 유지한다.
